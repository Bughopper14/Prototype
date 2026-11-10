/** Reads the archived FAP submissions. */
import {pool} from '../../../core/db/pool';
import {FapArchiveRecord} from './types';

export async function getFapSubmissionArchives(applicationId: string): Promise<FapArchiveRecord[]> {
  if (!pool) return [];
  try {
    const [rows] = await pool.query<any[]>(
      `
      SELECT * FROM fap_submission_archive
      WHERE application_id = ?
      ORDER BY submitted_at DESC
    `,
      [applicationId],
    );

    return rows.map(r => ({
      ...r,
      projects: typeof r.projects === 'string' ? JSON.parse(r.projects) : r.projects,
      stakeholders: typeof r.stakeholders === 'string' ? JSON.parse(r.stakeholders) : r.stakeholders,
      bank_references:
        typeof r.bank_references === 'string' ? JSON.parse(r.bank_references) : r.bank_references,
      equipment_units:
        typeof r.equipment_units === 'string' ? JSON.parse(r.equipment_units) : r.equipment_units,
      financial_statements:
        typeof r.financial_statements === 'string'
          ? JSON.parse(r.financial_statements)
          : r.financial_statements,
      fap_stage_data: typeof r.fap_stage_data === 'string' ? JSON.parse(r.fap_stage_data) : r.fap_stage_data,
      ocr_discrepancies:
        typeof r.ocr_discrepancies === 'string' ? JSON.parse(r.ocr_discrepancies) : r.ocr_discrepancies,
      ocr_raw_data: typeof r.ocr_raw_data === 'string' ? JSON.parse(r.ocr_raw_data) : r.ocr_raw_data,
    }));
  } catch (err) {
    console.warn('getFapSubmissionArchives error:', err);
    return [];
  }
}

export async function getFapSubmissionArchiveDetail(archiveId: string): Promise<FapArchiveRecord | null> {
  if (!pool) return null;
  try {
    const [rows] = await pool.query<any[]>(
      `
      SELECT * FROM fap_submission_archive
      WHERE id = ?
      LIMIT 1
    `,
      [archiveId],
    );

    if (!rows.length) return null;
    const r = rows[0];
    return {
      ...r,
      projects: typeof r.projects === 'string' ? JSON.parse(r.projects) : r.projects,
      stakeholders: typeof r.stakeholders === 'string' ? JSON.parse(r.stakeholders) : r.stakeholders,
      bank_references:
        typeof r.bank_references === 'string' ? JSON.parse(r.bank_references) : r.bank_references,
      equipment_units:
        typeof r.equipment_units === 'string' ? JSON.parse(r.equipment_units) : r.equipment_units,
      financial_statements:
        typeof r.financial_statements === 'string'
          ? JSON.parse(r.financial_statements)
          : r.financial_statements,
      fap_stage_data: typeof r.fap_stage_data === 'string' ? JSON.parse(r.fap_stage_data) : r.fap_stage_data,
      ocr_discrepancies:
        typeof r.ocr_discrepancies === 'string' ? JSON.parse(r.ocr_discrepancies) : r.ocr_discrepancies,
      ocr_raw_data: typeof r.ocr_raw_data === 'string' ? JSON.parse(r.ocr_raw_data) : r.ocr_raw_data,
    };
  } catch (err) {
    console.warn('getFapSubmissionArchiveDetail error:', err);
    return null;
  }
}
