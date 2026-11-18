import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {FORM_FIELDS} from '../workflows/form-fields';
import type {FapDiff} from './fap-diff';

/** Statuses of crm_fap_document_ocr_comparisons that end the review: differences are no longer recomputed. */
export const FINAL_COMPARISON = ['APPROVED', 'DISMISSED'];

/**
 * Comparison of the signed FAP document (OCR) with the system data: one header per application
 * (crm_fap_document_ocr_comparisons) and one row per differing field (crm_fap_document_ocr_discrepancies).
 */
@Injectable()
export class FapOcrRepository {
  constructor(private readonly db: CrmDatabase) {}

  async read(applicationId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.fapDocumentOcrComparisons} WHERE application_id=? ORDER BY created_at DESC LIMIT 1`,
      [applicationId],
    );
    const c = rows[0];
    if (!c) return null;
    const [diffs] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.fapDocumentOcrDiscrepancies} WHERE comparison_id=? ORDER BY created_at,id`,
      [c.id],
    );
    const open = diffs.filter(d => d.resolution_status === 'OPEN');
    const toDiff = (d: any): FapDiff => ({
      field: d.field_key,
      label: d.field_label,
      section: d.section_name,
      oldValue: d.system_value ?? '',
      newValue: d.ocr_value ?? '',
    });
    return {
      id: c.id,
      fileId: c.document_file_id,
      status: c.comparison_status,
      isFap: true,
      hasDifferences: open.length > 0,
      diffs: open.map(toDiff),
      /** What the signed document says for every field that differed (open and noted), for the document side. */
      documentValues: Object.fromEntries(diffs.map(d => [d.field_key, d.ocr_value ?? ''])),
      remarks: c.remarks ?? '',
      reviewedBy: c.reviewed_by,
      reviewedAt: c.reviewed_at,
      comparedAt: c.updated_at || c.created_at,
    };
  }

  /**
   * Stores a comparison of one FAP file: the header and the open differences (replacing earlier ones). `scanned` is
   * true for a new OCR scan; false when stored differences were only re-checked against changed data, which keeps
   * the scan time (updated_at) so the screen can tell the scan is older than the data.
   */
  async saveResult(applicationId: string, fileId: string, diffs: FapDiff[], by: string | null, scanned = true) {
    await this.db.transaction(async conn => {
      const [old] = await conn.execute<any[]>(
        `SELECT id,remarks FROM ${CRM.fapDocumentOcrComparisons} WHERE application_id=? FOR UPDATE`,
        [applicationId],
      );
      let id: string;
      const status = diffs.length ? 'HAS_DIFFERENCES' : 'MATCHED';
      if (old.length) {
        id = old[0].id;
        await conn.execute(
          `UPDATE ${CRM.fapDocumentOcrComparisons} SET document_file_id=?,comparison_status=?,has_differences=?,updated_by=?${
            scanned ? ',updated_at=CURRENT_TIMESTAMP(3)' : ',updated_at=updated_at'
          } WHERE id=?`,
          [fileId, status, diffs.length ? 1 : 0, by, id],
        );
        await conn.execute(
          `DELETE FROM ${CRM.fapDocumentOcrDiscrepancies} WHERE comparison_id=? AND resolution_status='OPEN'`,
          [id],
        );
      } else {
        id = crypto.randomUUID();
        await conn.execute(
          `INSERT INTO ${CRM.fapDocumentOcrComparisons}
             (id,application_id,document_file_id,comparison_status,has_differences,created_by) VALUES (?,?,?,?,?,?)`,
          [id, applicationId, fileId, status, diffs.length ? 1 : 0, by],
        );
      }
      for (const d of diffs)
        await conn.execute(
          `INSERT INTO ${CRM.fapDocumentOcrDiscrepancies}
             (id,comparison_id,section_name,field_key,field_label,system_value,ocr_value,resolution_status)
           VALUES (?,?,?,?,?,?,?,'OPEN')`,
          [crypto.randomUUID(), id, d.section || 'FAP', d.field, d.label, d.oldValue || null, d.newValue || null],
        );
    });
  }

  async saveRemarks(applicationId: string, remarks: string, by: string | null) {
    await this.db.pool.execute(
      `UPDATE ${CRM.fapDocumentOcrComparisons} SET remarks=?,updated_by=?,updated_at=updated_at WHERE application_id=?`,
      [remarks, by, applicationId],
    );
  }

  /**
   * Ends the review: APPROVED (FAP document accepted) or DISMISSED (differences noted, data corrected in the form).
   * Open differences are kept as NOTED, so the freeze can copy them.
   */
  async close(applicationId: string, status: 'APPROVED' | 'DISMISSED', remarks: string | undefined, by: string | null) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT id FROM ${CRM.fapDocumentOcrComparisons} WHERE application_id=?`,
      [applicationId],
    );
    if (!rows.length) return;
    await this.db.pool.execute(
      `UPDATE ${CRM.fapDocumentOcrComparisons} SET comparison_status=?,has_differences=0,
         remarks=COALESCE(?,remarks),reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP(3),updated_by=? WHERE id=?`,
      [status, remarks ?? null, by, by, rows[0].id],
    );
    await this.db.pool.execute(
      `UPDATE ${CRM.fapDocumentOcrDiscrepancies} SET resolution_status='NOTED' WHERE comparison_id=? AND resolution_status='OPEN'`,
      [rows[0].id],
    );
  }

  /** The FAP file is gone: the comparison is removed with it. */
  async clear(applicationId: string) {
    await this.db.pool.execute(
      `DELETE d FROM ${CRM.fapDocumentOcrDiscrepancies} d JOIN ${CRM.fapDocumentOcrComparisons} c ON c.id=d.comparison_id
       WHERE c.application_id=?`,
      [applicationId],
    );
    await this.db.pool.execute(`DELETE FROM ${CRM.fapDocumentOcrComparisons} WHERE application_id=?`, [applicationId]);
  }

  /**
   * Names as printed on the signed FAP: provinces and cities by id, PIC positions by code (the application stores ids
   * and codes).
   */
  async printedNames(ids: unknown[]): Promise<Map<string, string>> {
    const wanted = [...new Set(ids.filter(x => typeof x === 'string' && x))];
    if (!wanted.length) return new Map();
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT id,name FROM ${CRM.masterProvinces} WHERE id IN (?) UNION ALL SELECT id,name FROM ${CRM.masterCities} WHERE id IN (?)
       UNION ALL SELECT code,name FROM ${CRM.masterPicPositions} WHERE code IN (?)`,
      [wanted, wanted, wanted],
    );
    return new Map(rows.map(r => [r.id, r.name]));
  }

  /** Label and section of each FAP form field, by field key (the form definition, workflows/form-fields.ts). */
  async fieldRules(): Promise<Map<string, {label: string; section: string}[]>> {
    const byKey = new Map<string, {label: string; section: string}[]>();
    for (const f of FORM_FIELDS.filter(x => x.form === 'FAP-FORM')) byKey.set(f.key, [...(byKey.get(f.key) || []), {label: f.label, section: f.section}]);
    return byKey;
  }
}
