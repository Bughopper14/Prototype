import { pool } from './mysql-store';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

export interface FapArchiveRecord {
  id: string;
  application_id: string;
  fap_registration_number: string | null;
  company_name: string | null;
  customer_id: string | null;
  stage_at_submission: string;
  fap_stage_data: any;
  ocr_discrepancies: any;
  ocr_raw_data: any;
  comparison_remarks: string | null;
  ocr_document_path: string | null;
  ocr_document_filename: string | null;
  submitted_by_user_id: string | null;
  submitted_by_user_name: string | null;
  submitted_at: string;
  created_at: string;
}

export async function initializeFapArchive(): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fap_submission_archive (
        id CHAR(36) PRIMARY KEY,
        application_id CHAR(36) NOT NULL,
        fap_registration_number VARCHAR(100) NULL,
        company_name VARCHAR(255) NULL,
        customer_id CHAR(36) NULL,
        stage_at_submission VARCHAR(50) NOT NULL DEFAULT 'PRE_ANALYSIS',
        fap_stage_data JSON NOT NULL,
        ocr_discrepancies JSON NULL,
        ocr_raw_data JSON NULL,
        comparison_remarks TEXT NULL,
        ocr_document_path VARCHAR(500) NULL,
        ocr_document_filename VARCHAR(255) NULL,
        submitted_by_user_id VARCHAR(100) NULL,
        submitted_by_user_name VARCHAR(150) NULL,
        submitted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_fap_archive_app_id (application_id),
        INDEX idx_fap_archive_fap_no (fap_registration_number),
        INDEX idx_fap_archive_submitted_at (submitted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Enforce immutability via database triggers:
    // Any UPDATE or DELETE statement directly on fap_submission_archive is rejected
    try {
      await pool.query('DROP TRIGGER IF EXISTS trg_fap_archive_no_update');
      await pool.query(`
        CREATE TRIGGER trg_fap_archive_no_update
        BEFORE UPDATE ON fap_submission_archive
        FOR EACH ROW
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Data arsip FAP submission bersifat permanen dan tidak dapat diubah (immutable).'
      `);
    } catch (e: any) {
      console.warn('Could not register trg_fap_archive_no_update trigger:', e?.message || e);
    }

    try {
      await pool.query('DROP TRIGGER IF EXISTS trg_fap_archive_no_delete');
      await pool.query(`
        CREATE TRIGGER trg_fap_archive_no_delete
        BEFORE DELETE ON fap_submission_archive
        FOR EACH ROW
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Data arsip FAP submission bersifat permanen dan tidak dapat dihapus (immutable).'
      `);
    } catch (e: any) {
      console.warn('Could not register trg_fap_archive_no_delete trigger:', e?.message || e);
    }

    console.log('✓ fap_submission_archive table and immutability triggers initialized');
  } catch (err) {
    console.warn('initializeFapArchive error:', err);
  }
}

export async function findFapDocumentPath(applicationId: string): Promise<{ filePath: string | null; fileName: string | null }> {
  if (!pool) return { filePath: null, fileName: null };
  try {
    const [rows] = await pool.query<any[]>(`
      SELECT f.id, f.file_name, f.file_key, c.document_code, c.document_name
      FROM application_document_file f
      JOIN application_document_checklist c ON c.id = f.checklist_id
      WHERE c.application_id = ?
        AND (UPPER(c.document_code) = 'FAP' OR LOWER(c.document_name) LIKE '%fap%')
      ORDER BY f.created_at DESC
      LIMIT 1
    `, [applicationId]);

    if (!rows.length) return { filePath: null, fileName: null };
    const row = rows[0];
    const fileName = row.file_name || null;
    const fileKey = row.file_key || row.id || null;

    const possibleDirs = [
      path.resolve('Documents'),
      path.resolve('prototype-src/Documents'),
      path.resolve('../LiugongApps_Clean/CRM_Dashboard/Documents'),
      path.resolve('LiugongApps_Clean/CRM_Dashboard/Documents'),
      path.resolve('.data/files'),
      path.resolve('prototype-src/.data/files'),
      path.resolve('database/files')
    ];

    if (fileName) {
      for (const d of possibleDirs) {
        const full = path.join(d, fileName);
        if (fs.existsSync(full)) {
          return { filePath: path.resolve(full), fileName };
        }
      }

      // Try clean prefix matching if suffixed with hash
      const clean = fileName.split('_[')[0];
      for (const d of possibleDirs) {
        try {
          if (fs.existsSync(d)) {
            const list = fs.readdirSync(d);
            const match = list.find(f => f.startsWith(clean));
            if (match) {
              return { filePath: path.resolve(path.join(d, match)), fileName: match };
            }
          }
        } catch {}
      }
    }

    if (fileKey) {
      for (const d of possibleDirs) {
        const full = path.join(d, fileKey);
        if (fs.existsSync(full)) {
          return { filePath: path.resolve(full), fileName: fileName || fileKey };
        }
      }
    }

    return { filePath: fileName ? path.resolve('Documents', fileName) : null, fileName };
  } catch (e) {
    console.warn('findFapDocumentPath error:', e);
    return { filePath: null, fileName: null };
  }
}

export async function recordFapSubmissionArchive(
  applicationId: string,
  currentApp: any,
  actor?: { id?: string; name?: string; role?: string },
  explicitRemarks?: string
): Promise<FapArchiveRecord | null> {
  if (!pool) return null;
  try {
    const archiveId = crypto.randomUUID();
    const fapNumber = currentApp?.fapNumber || currentApp?.fap_registration_number || null;
    const companyName = currentApp?.companyName || currentApp?.company_name || currentApp?.customer?.companyName || null;
    const customerId = currentApp?.customerId || currentApp?.customer_id || currentApp?.customer?.id || null;

    // Retrieve latest OCR comparison & remarks from submit lock
    const [lockRows] = await pool.query<any[]>(
      'SELECT ocr_comparison_json, remarks FROM application_submit_lock WHERE application_id = ?',
      [applicationId]
    );

    let comparisonData: any = null;
    if (lockRows?.[0]?.ocr_comparison_json) {
      try {
        comparisonData = typeof lockRows[0].ocr_comparison_json === 'string'
          ? JSON.parse(lockRows[0].ocr_comparison_json)
          : lockRows[0].ocr_comparison_json;
      } catch {}
    }

    const remarks = explicitRemarks !== undefined && explicitRemarks !== null
      ? String(explicitRemarks).trim()
      : (lockRows?.[0]?.remarks || comparisonData?.remarks || '');

    const ocrDiffs = comparisonData?.diffs || [];
    const ocrRaw = comparisonData?.extractedData || null;

    // Locate the physical FAP document storage location
    const docInfo = await findFapDocumentPath(applicationId);
    const docPath = docInfo.filePath || (comparisonData?.fileName ? path.resolve('Documents', comparisonData.fileName) : null);
    const docFileName = docInfo.fileName || comparisonData?.fileName || null;

    // Build comprehensive system FAP stage snapshot
    const fapStageSnapshot = {
      capturedAt: new Date().toISOString(),
      fapNumber,
      companyName,
      customerId,
      applicationDate: currentApp?.applicationDate,
      customerCategory: currentApp?.customerCategory,
      branchCode: currentApp?.branchCode,
      profile: {
        companyName: currentApp?.companyName,
        companyType: currentApp?.companyType,
        nib: currentApp?.nib,
        nibDate: currentApp?.nibDate,
        npwp: currentApp?.npwp,
        establishmentActNo: currentApp?.establishmentActNo,
        establishmentDate: currentApp?.establishmentDate,
        latestDeedNo: currentApp?.latestDeedNo,
        latestDeedDate: currentApp?.latestDeedDate,
        sktNo: currentApp?.sktNo,
        sppkpNo: currentApp?.sppkpNo,
        phoneFax: currentApp?.phoneFax,
        email: currentApp?.email,
        website: currentApp?.website,
        mainBusiness: currentApp?.mainBusiness,
        experienceYears: currentApp?.experienceYears,
        experienceMonths: currentApp?.experienceMonths,
        locationStatus: currentApp?.locationStatus,
        repaymentSource: currentApp?.repaymentSource,
        industrySegment: currentApp?.industrySegment,
        businessRole: currentApp?.businessRole,
        companyAddress: currentApp?.companyAddress,
        rt: currentApp?.rt,
        rw: currentApp?.rw,
        city: currentApp?.city,
        province: currentApp?.province,
        postalCode: currentApp?.postalCode,
        assetSummary: {
          heLiuGong: currentApp?.assetSummaryHeLiuGong,
          truckLiuGong: currentApp?.assetSummaryTruckLiuGong,
          heNonLiuGong: currentApp?.assetSummaryHeNonLiuGong,
          truckNonLiuGong: currentApp?.assetSummaryTruckNonLiuGong
        }
      },
      pic: currentApp?.pic || null,
      legal: currentApp?.legal || null,
      stakeholders: currentApp?.stakeholders || [],
      proposal: currentApp?.proposal || null,
      bankReferences: currentApp?.bankReferences || [],
      financialStatements: currentApp?.financialStatements || [],
      documentChecksSummary: Array.isArray(currentApp?.documentChecks)
        ? currentApp.documentChecks.map((d: any) => ({
            code: d.documentCode,
            name: d.documentName,
            status: d.status,
            filesCount: d.files?.length || 0,
            notes: d.notes || null
          }))
        : []
    };

    const userId = actor?.id || 'system';
    const userName = actor?.name || 'System / Auto-Submit';

    await pool.query(`
      INSERT INTO fap_submission_archive (
        id,
        application_id,
        fap_registration_number,
        company_name,
        customer_id,
        stage_at_submission,
        fap_stage_data,
        ocr_discrepancies,
        ocr_raw_data,
        comparison_remarks,
        ocr_document_path,
        ocr_document_filename,
        submitted_by_user_id,
        submitted_by_user_name,
        submitted_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, 'PRE_ANALYSIS', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    `, [
      archiveId,
      applicationId,
      fapNumber,
      companyName,
      customerId,
      JSON.stringify(fapStageSnapshot),
      JSON.stringify(ocrDiffs),
      JSON.stringify(ocrRaw),
      remarks || null,
      docPath,
      docFileName,
      userId,
      userName
    ]);

    console.log(`✓ Recorded immutable FAP submission archive [${archiveId}] for application [${applicationId}]`);

    return {
      id: archiveId,
      application_id: applicationId,
      fap_registration_number: fapNumber,
      company_name: companyName,
      customer_id: customerId,
      stage_at_submission: 'PRE_ANALYSIS',
      fap_stage_data: fapStageSnapshot,
      ocr_discrepancies: ocrDiffs,
      ocr_raw_data: ocrRaw,
      comparison_remarks: remarks || null,
      ocr_document_path: docPath,
      ocr_document_filename: docFileName,
      submitted_by_user_id: userId,
      submitted_by_user_name: userName,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  } catch (err: any) {
    console.error('recordFapSubmissionArchive error:', err);
    return null;
  }
}

export async function getFapSubmissionArchives(applicationId: string): Promise<FapArchiveRecord[]> {
  if (!pool) return [];
  try {
    const [rows] = await pool.query<any[]>(`
      SELECT * FROM fap_submission_archive
      WHERE application_id = ?
      ORDER BY submitted_at DESC
    `, [applicationId]);

    return rows.map(r => ({
      ...r,
      fap_stage_data: typeof r.fap_stage_data === 'string' ? JSON.parse(r.fap_stage_data) : r.fap_stage_data,
      ocr_discrepancies: typeof r.ocr_discrepancies === 'string' ? JSON.parse(r.ocr_discrepancies) : r.ocr_discrepancies,
      ocr_raw_data: typeof r.ocr_raw_data === 'string' ? JSON.parse(r.ocr_raw_data) : r.ocr_raw_data
    }));
  } catch (err) {
    console.warn('getFapSubmissionArchives error:', err);
    return [];
  }
}

export async function getFapSubmissionArchiveDetail(archiveId: string): Promise<FapArchiveRecord | null> {
  if (!pool) return null;
  try {
    const [rows] = await pool.query<any[]>(`
      SELECT * FROM fap_submission_archive
      WHERE id = ?
      LIMIT 1
    `, [archiveId]);

    if (!rows.length) return null;
    const r = rows[0];
    return {
      ...r,
      fap_stage_data: typeof r.fap_stage_data === 'string' ? JSON.parse(r.fap_stage_data) : r.fap_stage_data,
      ocr_discrepancies: typeof r.ocr_discrepancies === 'string' ? JSON.parse(r.ocr_discrepancies) : r.ocr_discrepancies,
      ocr_raw_data: typeof r.ocr_raw_data === 'string' ? JSON.parse(r.ocr_raw_data) : r.ocr_raw_data
    };
  } catch (err) {
    console.warn('getFapSubmissionArchiveDetail error:', err);
    return null;
  }
}
