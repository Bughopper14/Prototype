/** FAP comparison result and remarks. */
import {pool} from '../../../core/db/pool';

export async function saveFapComparison(applicationId: string, comparison: any) {
  if (!pool) return;
  const jsonStr = comparison ? JSON.stringify(comparison) : null;
  const remarks = comparison?.remarks !== undefined ? comparison.remarks : null;
  try {
    const [appCheck] = await pool.execute<any[]>(
      'SELECT application_id FROM all_applications WHERE application_id=?',
      [applicationId],
    );
    if (!appCheck.length) return;
    if (remarks !== null) {
      await pool.execute(
        'UPDATE application_submit_lock SET ocr_comparison_json=?, remarks=?, updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?',
        [jsonStr, remarks, applicationId],
      );
    } else {
      await pool.execute(
        'UPDATE application_submit_lock SET ocr_comparison_json=?, updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?',
        [jsonStr, applicationId],
      );
    }
  } catch (e) {
    console.warn('saveFapComparison error:', e);
  }
}

export async function saveFapRemarks(applicationId: string, remarks: string) {
  if (!pool) return;
  try {
    const [appCheck] = await pool.execute<any[]>(
      'SELECT application_id FROM all_applications WHERE application_id=?',
      [applicationId],
    );
    if (!appCheck.length) return;
    await pool.execute(
      'UPDATE application_submit_lock SET remarks=?, updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?',
      [remarks, applicationId],
    );
    const [rows] = await pool.execute<any[]>(
      'SELECT ocr_comparison_json FROM application_submit_lock WHERE application_id=?',
      [applicationId],
    );
    if (rows[0]?.ocr_comparison_json) {
      try {
        const comp = JSON.parse(rows[0].ocr_comparison_json);
        comp.remarks = remarks;
        await pool.execute(
          'UPDATE application_submit_lock SET ocr_comparison_json=?, updated_at=CURRENT_TIMESTAMP(3) WHERE application_id=?',
          [JSON.stringify(comp), applicationId],
        );
      } catch {}
    }
    await pool.execute(
      `
    UPDATE application_document_checklist 
    SET notes = ?, updated_at = CURRENT_TIMESTAMP(3) 
    WHERE application_id = ? AND (UPPER(document_code) = 'FAP' OR LOWER(document_name) LIKE '%fap%')
  `,
      [remarks, applicationId],
    );
  } catch (e) {
    console.warn('saveFapRemarks error:', e);
  }
}
