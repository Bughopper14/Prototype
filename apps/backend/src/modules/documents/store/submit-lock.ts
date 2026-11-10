/** Whether the FAP can be submitted (signed document present). */
import {pool} from '../../../core/db/pool';

export async function syncSubmitLock(applicationId: string) {
  if (!pool) return {isLocked: 1, fapDocUploaded: 0, stage: 'FAP_STAGE', ocrComparison: null, remarks: null};
  try {
    const [rows] = await pool.execute<any[]>(
      `
   SELECT COUNT(f.id) AS file_count
   FROM application_document_checklist d
   JOIN application_document_file f ON f.checklist_id = d.id
   WHERE d.application_id = ?
     AND (UPPER(d.document_code) = 'FAP' OR LOWER(d.document_name) LIKE '%fap%')
  `,
      [applicationId],
    );
    const hasUploaded = Number(rows[0]?.file_count || 0) > 0;
    const isLocked = hasUploaded ? 0 : 1;
    const [appCheck] = await pool.execute<any[]>(
      'SELECT application_id FROM all_applications WHERE application_id = ?',
      [applicationId],
    );
    if (!appCheck.length)
      return {
        isLocked,
        fapDocUploaded: hasUploaded ? 1 : 0,
        stage: 'FAP_STAGE',
        ocrComparison: null,
        remarks: null,
      };
    await pool.execute(
      `
   INSERT INTO application_submit_lock (application_id, is_locked, stage, fap_doc_uploaded, unlocked_at)
   VALUES (?, ?, 'FAP_STAGE', ?, ?)
   ON DUPLICATE KEY UPDATE
     is_locked = VALUES(is_locked),
     fap_doc_uploaded = VALUES(fap_doc_uploaded),
     ocr_comparison_json = IF(VALUES(fap_doc_uploaded) = 0, NULL, ocr_comparison_json),
     unlocked_at = IF(VALUES(is_locked) = 0, COALESCE(unlocked_at, CURRENT_TIMESTAMP(3)), NULL),
     updated_at = CURRENT_TIMESTAMP(3)
  `,
      [applicationId, isLocked, hasUploaded ? 1 : 0, hasUploaded ? new Date() : null],
    );
    return {
      isLocked,
      fapDocUploaded: hasUploaded ? 1 : 0,
      stage: 'FAP_STAGE',
      ocrComparison: null,
      remarks: null,
    };
  } catch (err) {
    console.warn('syncSubmitLock error:', err);
    return {isLocked: 1, fapDocUploaded: 0, stage: 'FAP_STAGE', ocrComparison: null, remarks: null};
  }
}

export async function getSubmitLock(applicationId: string) {
  if (!pool) return {isLocked: 1, fapDocUploaded: 0, stage: 'FAP_STAGE', ocrComparison: null, remarks: null};
  try {
    const [rows] = await pool.execute<any[]>('SELECT * FROM application_submit_lock WHERE application_id=?', [
      applicationId,
    ]);
    if (!rows.length) return await syncSubmitLock(applicationId);
    let ocrComparison = null;
    if (rows[0].ocr_comparison_json) {
      try {
        ocrComparison = JSON.parse(rows[0].ocr_comparison_json);
      } catch {}
    }
    const remarks = rows[0].remarks || ocrComparison?.remarks || null;
    if (ocrComparison) {
      ocrComparison.remarks = remarks || '';
    }
    return {
      isLocked: Number(rows[0].is_locked),
      fapDocUploaded: Number(rows[0].fap_doc_uploaded),
      stage: rows[0].stage || 'FAP_STAGE',
      ocrComparison,
      remarks,
    };
  } catch {
    return {isLocked: 1, fapDocUploaded: 0, stage: 'FAP_STAGE', ocrComparison: null, remarks: null};
  }
}
