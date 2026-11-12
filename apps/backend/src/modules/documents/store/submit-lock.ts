/** Submit-lock and FAP OCR comparison status reader/updater on crm_liugong1. */
import {pool} from '../../../core/db/pool';

export async function getSubmitLock(applicationId: string) {
  const [appRows] = await pool.query<any[]>(
    'SELECT is_fap_doc_uploaded, is_fap_form_locked FROM crm_applications WHERE id = ? LIMIT 1',
    [applicationId],
  );
  const app = appRows[0];

  const [fapFiles] = await pool.query<any[]>(
    `SELECT f.id
     FROM crm_application_document_files f
     JOIN crm_application_document_checklists c ON c.id = f.checklist_id
     JOIN crm_master_document_types dt ON dt.id = c.document_type_id
     WHERE f.application_id = ? AND dt.code = 'FAP' AND f.deleted_at IS NULL AND f.is_current_active = 1
     LIMIT 1`,
    [applicationId],
  );
  const fapDocUploaded = fapFiles.length > 0 || Boolean(app?.is_fap_doc_uploaded);
  const isFapFormLocked = Boolean(app?.is_fap_form_locked);

  const [compRows] = await pool.query<any[]>(
    `SELECT c.* FROM crm_fap_document_ocr_comparisons c
     WHERE c.application_id = ?
     ORDER BY COALESCE(c.updated_at, c.created_at) DESC
     LIMIT 1`,
    [applicationId],
  );
  const comp = compRows[0] || null;
  let diffs: any[] = [];
  if (comp) {
    const [discRows] = await pool.query<any[]>(
      `SELECT section_name, field_key, field_label, system_value, ocr_value, resolution_status
       FROM crm_fap_document_ocr_discrepancies
       WHERE comparison_id = ?
       ORDER BY created_at ASC`,
      [comp.id],
    );
    diffs = discRows.map(d => ({
      section: d.section_name,
      field: d.field_key,
      label: d.field_label,
      systemValue: d.system_value || '',
      ocrValue: d.ocr_value || '',
      status: d.resolution_status,
    }));
  }

  const ocrComparison = comp
    ? {
        id: comp.id,
        isFap: true,
        status: comp.comparison_status,
        hasDifferences: Boolean(comp.has_differences),
        diffs,
        remarks: comp.remarks || '',
        reviewedBy: comp.reviewed_by || '',
        reviewedAt: comp.reviewed_at || null,
      }
    : null;

  return {
    fapDocUploaded,
    fap_doc_uploaded: fapDocUploaded ? 1 : 0,
    isFapDocUploaded: fapDocUploaded,
    isFapFormLocked,
    is_fap_form_locked: isFapFormLocked ? 1 : 0,
    submitLocked: !fapDocUploaded,
    isLocked: !fapDocUploaded ? 1 : 0,
    fapFormRemarks: comp?.remarks || '',
    ocrComparison,
    ocr_comparison_json: ocrComparison,
  };
}

export async function syncSubmitLock(applicationId: string) {
  const [fapFiles] = await pool.query<any[]>(
    `SELECT f.id
     FROM crm_application_document_files f
     JOIN crm_application_document_checklists c ON c.id = f.checklist_id
     JOIN crm_master_document_types dt ON dt.id = c.document_type_id
     WHERE f.application_id = ? AND dt.code = 'FAP' AND f.deleted_at IS NULL AND f.is_current_active = 1
     LIMIT 1`,
    [applicationId],
  );
  const uploaded = fapFiles.length > 0 ? 1 : 0;
  await pool.execute(
    'UPDATE crm_applications SET is_fap_doc_uploaded = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
    [uploaded, applicationId],
  );
  return getSubmitLock(applicationId);
}
