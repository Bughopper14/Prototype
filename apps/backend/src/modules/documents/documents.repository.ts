import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {ensure} from '../../core/domain';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;

/** The signed FAP form (crm_master_document_types.code); uploading it unlocks "Submit FAP stage". */
export const FAP_DOCUMENT_CODE = 'FAP';

const fileModel = (f: any) => ({
  id: f.id,
  checklistId: f.checklist_id,
  applicationId: f.application_id,
  fileName: f.file_name,
  fileKey: f.storage_key,
  storagePath: f.storage_path,
  version: f.version_number,
  isCurrent: !!f.is_current_active,
  fileSize: Number(f.file_size),
  mimeType: f.mime_type,
  uploadedBy: f.uploaded_by,
  createdAt: f.uploaded_at || f.created_at,
});

/**
 * Document checklist of an application (crm_application_document_checklists, one row per document type of Master Data)
 * and its uploaded files (crm_application_document_files, versioned, soft-deleted).
 */
@Injectable()
export class DocumentsRepository {
  constructor(private readonly db: CrmDatabase) {}

  /** Adds a checklist row for every active document type the application does not have yet. */
  async seedChecklist(conn: Conn, applicationId: string, by: string | null) {
    const [types] = await conn.query<any[]>(
      `SELECT id,department_code,is_mandatory FROM ${CRM.masterDocumentTypes} WHERE is_active=1 ORDER BY sort_order`,
    );
    for (const t of types)
      await conn.execute(
        `INSERT IGNORE INTO ${CRM.applicationDocumentChecklists}
           (id,application_id,document_type_id,assigned_role,is_mandatory,created_by) VALUES (?,?,?,?,?,?)`,
        [crypto.randomUUID(), applicationId, t.id, t.department_code, t.is_mandatory, by],
      );
  }

  /**
   * After the document types change: every application gets the new types, and untouched rows of types that are no
   * longer active (no file, no check, still pending) are removed.
   */
  async syncAllApplications(by: string | null) {
    await this.db.transaction(async conn => {
      const [apps] = await conn.query<any[]>(`SELECT id FROM ${CRM.applications} WHERE deleted_at IS NULL FOR UPDATE`);
      for (const app of apps) await this.seedChecklist(conn, app.id, by);
      await conn.query(
        `DELETE c FROM ${CRM.applicationDocumentChecklists} c
         JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
         LEFT JOIN ${CRM.applicationDocumentFiles} f ON f.checklist_id=c.id AND f.deleted_at IS NULL
         WHERE t.is_active=0 AND f.id IS NULL AND c.status='PENDING'
           AND c.checked_by_mkt=0 AND c.checked_by_bs=0 AND c.checked_by_ca=0 AND c.checked_by_legal=0`,
      );
    });
  }

  /** Checklist rows with their files, in the shape the Documents tab uses. */
  async read(applicationId: string, conn: Conn = this.db.pool) {
    const [rows] = await conn.execute<any[]>(
      `SELECT c.*,t.code,t.name,s.code AS stage_code FROM ${CRM.applicationDocumentChecklists} c
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       LEFT JOIN ${CRM.masterWorkflowStages} s ON s.id=t.stage_id
       WHERE c.application_id=? ORDER BY t.sort_order,c.created_at`,
      [applicationId],
    );
    const [files] = await conn.execute<any[]>(
      `SELECT * FROM ${CRM.applicationDocumentFiles} WHERE application_id=? AND deleted_at IS NULL
       ORDER BY version_number,uploaded_at`,
      [applicationId],
    );
    return rows.map(d => ({
      id: d.id,
      applicationId: d.application_id,
      documentCode: d.code,
      documentName: d.name,
      /** Workflow stage the document belongs to (crm_master_document_types.stage_id). */
      stageCode: d.stage_code,
      assignedRole: d.assigned_role,
      isMandatory: !!d.is_mandatory,
      status: d.status,
      checkedByMkt: !!d.checked_by_mkt,
      checkedByBs: !!d.checked_by_bs,
      checkedByCa: !!d.checked_by_ca,
      checkedByLegal: !!d.checked_by_legal,
      registrationDate: d.registration_date,
      expiredDate: d.expired_date,
      dataSummary: d.data_summary,
      notes: d.notes,
      files: files.filter(f => f.checklist_id === d.id).map(fileModel),
    }));
  }

  async readFile(fileId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.applicationDocumentFiles} WHERE id=? AND deleted_at IS NULL`,
      [fileId],
    );
    return rows[0] ? fileModel(rows[0]) : null;
  }

  /** Every file of the application's checklist (the ones the checklist lists), with its document and stage, for the ZIP. */
  async filesForZip(applicationId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT f.id,f.file_name,f.storage_key,f.version_number,t.code,t.sort_order,s.name AS stage_name
       FROM ${CRM.applicationDocumentFiles} f
       JOIN ${CRM.applicationDocumentChecklists} c ON c.id=f.checklist_id
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       LEFT JOIN ${CRM.masterWorkflowStages} s ON s.id=t.stage_id
       WHERE f.application_id=? AND f.deleted_at IS NULL
       ORDER BY t.sort_order,f.version_number,f.uploaded_at`,
      [applicationId],
    );
    return rows.map(r => ({
      id: r.id as string,
      fileName: r.file_name as string,
      fileKey: r.storage_key as string,
      version: Number(r.version_number),
      code: r.code as string,
      stageName: (r.stage_name as string | null) ?? '',
    }));
  }

  /** The checklist row by its id or by its document type code. */
  async checklistRow(conn: Conn, applicationId: string, idOrCode: string) {
    const [rows] = await conn.execute<any[]>(
      `SELECT c.*,t.code FROM ${CRM.applicationDocumentChecklists} c
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       WHERE c.application_id=? AND (c.id=? OR t.code=?) FOR UPDATE`,
      [applicationId, idOrCode, String(idOrCode).toUpperCase()],
    );
    return rows[0] || null;
  }

  /** Stores a new file version; earlier versions stay, the new one is the current one. */
  async addFile(
    conn: Conn,
    applicationId: string,
    checklistIdOrCode: string,
    file: {fileName: string; storageKey: string; storagePath: string | null; size: number; mimeType: string},
    by: string,
  ) {
    const row = await this.checklistRow(conn, applicationId, checklistIdOrCode);
    ensure(row, 'Checklist item not found', 404);
    const [[last]] = await conn.execute<any[]>(
      `SELECT COALESCE(MAX(version_number),0) AS v FROM ${CRM.applicationDocumentFiles} WHERE checklist_id=?`,
      [row.id],
    );
    await conn.execute(`UPDATE ${CRM.applicationDocumentFiles} SET is_current_active=0 WHERE checklist_id=?`, [row.id]);
    const id = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO ${CRM.applicationDocumentFiles}
         (id,checklist_id,application_id,version_number,file_name,storage_key,storage_path,file_size,mime_type,
          is_current_active,uploaded_by,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,1,?,?)`,
      [id, row.id, applicationId, Number(last.v) + 1, file.fileName, file.storageKey, file.storagePath, file.size, file.mimeType, by, by],
    );
    await conn.execute(
      `UPDATE ${CRM.applicationDocumentChecklists} SET status='UPLOADED',checked_by_mkt=1,checked_by_bs=0,checked_by_ca=0,
         checked_by_legal=0,updated_by=? WHERE id=?`,
      [by, row.id],
    );
    await this.syncFapUploaded(conn, applicationId, by);
    return {id, checklistId: row.id, documentCode: row.code};
  }

  /** Soft-deletes a file; the newest remaining version becomes current and the checklist row follows. */
  async deleteFile(conn: Conn, applicationId: string, fileId: string, by: string | null) {
    const [rows] = await conn.execute<any[]>(
      `SELECT checklist_id FROM ${CRM.applicationDocumentFiles} WHERE id=? AND application_id=? AND deleted_at IS NULL FOR UPDATE`,
      [fileId, applicationId],
    );
    ensure(rows.length, 'File not found in this application', 404);
    const checklistId = rows[0].checklist_id;
    await conn.execute(
      `UPDATE ${CRM.applicationDocumentFiles} SET deleted_at=CURRENT_TIMESTAMP(3),is_current_active=0,updated_by=? WHERE id=?`,
      [by, fileId],
    );
    const [remaining] = await conn.execute<any[]>(
      `SELECT id FROM ${CRM.applicationDocumentFiles} WHERE checklist_id=? AND deleted_at IS NULL ORDER BY version_number DESC LIMIT 1`,
      [checklistId],
    );
    if (remaining.length)
      await conn.execute(`UPDATE ${CRM.applicationDocumentFiles} SET is_current_active=1 WHERE id=?`, [remaining[0].id]);
    await conn.execute(
      `UPDATE ${CRM.applicationDocumentChecklists} SET status=?,checked_by_mkt=?,checked_by_bs=0,checked_by_ca=0,
         checked_by_legal=0,registration_date=NULL,expired_date=NULL,data_summary=NULL,notes=NULL,updated_by=? WHERE id=?`,
      [remaining.length ? 'UPLOADED' : 'PENDING', remaining.length ? 1 : 0, by, checklistId],
    );
    await this.syncFapUploaded(conn, applicationId, by);
  }

  /** One department's check of a document; the owning department's check decides VERIFIED / REJECTED. */
  async verify(
    conn: Conn,
    applicationId: string,
    checklistId: string,
    body: {department: 'BS' | 'CA' | 'LEGAL'; isVerified: boolean; registrationDate?: string | null; expiredDate?: string | null; dataSummary?: string; notes?: string},
    by: string | null,
  ) {
    const row = await this.checklistRow(conn, applicationId, checklistId);
    ensure(row, 'Checklist item not found', 404);
    const [files] = await conn.execute<any[]>(
      `SELECT id FROM ${CRM.applicationDocumentFiles} WHERE checklist_id=? AND deleted_at IS NULL LIMIT 1`,
      [row.id],
    );
    ensure(files.length, 'Upload a document before verification');
    if (body.isVerified && body.expiredDate)
      ensure(body.expiredDate >= new Date().toISOString().slice(0, 10), 'An expired document cannot be verified');
    if (body.expiredDate && body.registrationDate)
      ensure(body.expiredDate >= body.registrationDate, 'Expiry must follow registration');
    const column = {BS: 'checked_by_bs', CA: 'checked_by_ca', LEGAL: 'checked_by_legal'}[body.department];
    ensure(column, 'Invalid department');
    await conn.execute(
      `UPDATE ${CRM.applicationDocumentChecklists} SET ${column}=?,status=?,registration_date=?,expired_date=?,
         data_summary=?,notes=?,updated_by=? WHERE id=?`,
      [
        body.isVerified ? 1 : 0,
        body.department === row.assigned_role ? (body.isVerified ? 'VERIFIED' : 'REJECTED') : row.status,
        body.registrationDate ?? null,
        body.expiredDate ?? null,
        body.dataSummary ?? null,
        body.notes ?? null,
        by,
        row.id,
      ],
    );
  }

  /** crm_applications.is_fap_doc_uploaded follows whether the signed FAP form has a file. */
  async syncFapUploaded(conn: Conn, applicationId: string, by: string | null) {
    const [rows] = await conn.execute<any[]>(
      `SELECT COUNT(f.id) AS n FROM ${CRM.applicationDocumentFiles} f
       JOIN ${CRM.applicationDocumentChecklists} c ON c.id=f.checklist_id
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       WHERE f.application_id=? AND f.deleted_at IS NULL AND t.code=?`,
      [applicationId, FAP_DOCUMENT_CODE],
    );
    await conn.execute(`UPDATE ${CRM.applications} SET is_fap_doc_uploaded=?,updated_by=? WHERE id=?`, [
      Number(rows[0].n) > 0 ? 1 : 0,
      by,
      applicationId,
    ]);
  }

  /** The current file of the signed FAP form, if any. */
  async currentFapFile(applicationId: string) {
    const docs = await this.read(applicationId);
    const fap = docs.find(d => d.documentCode === FAP_DOCUMENT_CODE);
    const file = fap?.files.find(f => f.isCurrent) || fap?.files[fap.files.length - 1];
    return {fap, file};
  }

  /** Every checklist row of every application, for the Document Desk. */
  async desk() {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT c.id AS checklist_id,c.application_id,t.code AS document_code,t.name AS document_name,c.assigned_role,
              c.is_mandatory,c.status,a.fap_registration_number AS fap_number,p.company_name,
              (SELECT COUNT(*) FROM ${CRM.applicationDocumentFiles} f WHERE f.checklist_id=c.id AND f.deleted_at IS NULL) AS file_count
       FROM ${CRM.applicationDocumentChecklists} c
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       JOIN ${CRM.applications} a ON a.id=c.application_id AND a.deleted_at IS NULL
       LEFT JOIN ${CRM.fapApplicationProfiles} p ON p.application_id=a.id
       ORDER BY CASE c.status WHEN 'REJECTED' THEN 0 WHEN 'PENDING' THEN 1 WHEN 'UPLOADED' THEN 2 ELSE 3 END,
                a.created_at DESC,t.sort_order`,
    );
    return rows;
  }

  /** Verified and total checklist rows per application (application list). */
  async counts(): Promise<Map<string, {verified: number; total: number}>> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT application_id,SUM(status='VERIFIED') AS verified,COUNT(*) AS total
       FROM ${CRM.applicationDocumentChecklists} GROUP BY application_id`,
    );
    return new Map(rows.map(r => [r.application_id, {verified: Number(r.verified), total: Number(r.total)}]));
  }
}
