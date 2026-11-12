/** Persist FAP document OCR comparison and discrepancies into crm_fap_document_ocr_comparisons / _discrepancies. */
import {randomUUID} from 'node:crypto';
import {cleanNullableString} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';

async function findActiveFapFileId(applicationId: string): Promise<string | null> {
  const [fapRows] = await pool.query<any[]>(
    `SELECT f.id
     FROM crm_application_document_files f
     JOIN crm_application_document_checklists c ON c.id = f.checklist_id
     JOIN crm_master_document_types dt ON dt.id = c.document_type_id
     WHERE f.application_id = ? AND f.deleted_at IS NULL AND f.is_current_active = 1
     ORDER BY CASE WHEN dt.code = 'FAP' THEN 0 ELSE 1 END, f.uploaded_at DESC
     LIMIT 1`,
    [applicationId],
  );
  return fapRows[0]?.id ?? null;
}

export async function saveFapComparison(applicationId: string, comparison: any) {
  const [existing] = await pool.query<any[]>(
    'SELECT * FROM crm_fap_document_ocr_comparisons WHERE application_id = ? ORDER BY created_at DESC LIMIT 1',
    [applicationId],
  );
  const compRow = existing[0] || null;
  const docFileId = compRow?.document_file_id || (await findActiveFapFileId(applicationId));
  if (!docFileId) return null;

  const hasDiffs = comparison?.hasDifferences ? 1 : 0;
  const rawStatus = String(comparison?.status || (hasDiffs ? 'HAS_DIFFERENCES' : 'MATCHED')).toUpperCase();
  const status = ['PENDING', 'MATCHED', 'HAS_DIFFERENCES', 'APPROVED', 'DISMISSED'].includes(rawStatus)
    ? rawStatus
    : hasDiffs
      ? 'HAS_DIFFERENCES'
      : 'MATCHED';
  const remarks =
    comparison?.remarks !== undefined
      ? cleanNullableString(comparison.remarks)
      : compRow?.remarks ?? null;
  const reviewedBy = cleanNullableString(comparison?.reviewedBy) ?? compRow?.reviewed_by ?? null;

  const compId = compRow?.id || randomUUID();
  if (compRow) {
    await pool.execute(
      `UPDATE crm_fap_document_ocr_comparisons
       SET document_file_id = ?, comparison_status = ?, has_differences = ?, remarks = ?,
           reviewed_by = ?, reviewed_at = COALESCE(?, reviewed_at), updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      [docFileId, status, hasDiffs, remarks, reviewedBy, comparison?.reviewedAt ? new Date() : null, compId],
    );
  } else {
    await pool.execute(
      `INSERT INTO crm_fap_document_ocr_comparisons
        (id, application_id, document_file_id, comparison_status, has_differences, remarks, reviewed_by, reviewed_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [compId, applicationId, docFileId, status, hasDiffs, remarks, reviewedBy, reviewedBy ? new Date() : null],
    );
  }

  if (Array.isArray(comparison?.diffs)) {
    await pool.execute('DELETE FROM crm_fap_document_ocr_discrepancies WHERE comparison_id = ?', [compId]);
    for (const d of comparison.diffs) {
      if (!d) continue;
      const resStatus = ['OPEN', 'ACCEPTED_SYSTEM', 'OVERRIDDEN_OCR', 'NOTED'].includes(
        String(d.status || '').toUpperCase(),
      )
        ? String(d.status).toUpperCase()
        : 'OPEN';
      await pool.execute(
        `INSERT INTO crm_fap_document_ocr_discrepancies
          (id, comparison_id, section_name, field_key, field_label, system_value, ocr_value, resolution_status)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          randomUUID(),
          compId,
          String(d.section || 'FAP').slice(0, 100),
          String(d.field || 'unknown').slice(0, 100),
          String(d.label || d.field || 'Field').slice(0, 150),
          d.systemValue !== undefined ? String(d.systemValue) : null,
          d.ocrValue !== undefined ? String(d.ocrValue) : null,
          resStatus,
        ],
      );
    }
  }
  return compId;
}

export async function saveFapRemarks(applicationId: string, remarks: string) {
  const [existing] = await pool.query<any[]>(
    'SELECT id FROM crm_fap_document_ocr_comparisons WHERE application_id = ? ORDER BY created_at DESC LIMIT 1',
    [applicationId],
  );
  if (existing[0]) {
    await pool.execute(
      'UPDATE crm_fap_document_ocr_comparisons SET remarks = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [cleanNullableString(remarks), existing[0].id],
    );
    return;
  }
  const docFileId = await findActiveFapFileId(applicationId);
  if (!docFileId) return;
  await pool.execute(
    `INSERT INTO crm_fap_document_ocr_comparisons
      (id, application_id, document_file_id, comparison_status, has_differences, remarks)
     VALUES (?,?,?,'PENDING',0,?)`,
    [randomUUID(), applicationId, docFileId, cleanNullableString(remarks)],
  );
}
