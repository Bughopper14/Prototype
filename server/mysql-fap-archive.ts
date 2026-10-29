import { pool } from './mysql-store';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

export interface FapArchiveRecord {
  id: string;
  application_id: string;
  fap_registration_number: string | null;
  application_date: string | null;
  branch_code: string | null;
  customer_status: string | null;
  customer_id: string | null;
  company_name: string | null;
  company_type: string | null;
  nib: string | null;
  nib_date: string | null;
  npwp: string | null;
  skt_no: string | null;
  sppkp_no: string | null;
  establishment_act_no: string | null;
  establishment_date: string | null;
  latest_deed_no: string | null;
  latest_deed_date: string | null;
  company_address: string | null;
  rt: string | null;
  rw: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone_fax: string | null;
  email: string | null;
  website: string | null;
  main_business: string | null;
  experience_years: number | null;
  experience_months: number | null;
  location_status: string | null;
  repayment_source: string | null;
  industry_segment: string | null;
  business_role: string | null;
  asset_summary_he_liu_gong: number | null;
  asset_summary_truck_liu_gong: number | null;
  asset_summary_he_non_liu_gong: number | null;
  asset_summary_truck_non_liu_gong: number | null;
  pic_name: string | null;
  pic_position: string | null;
  pic_phone: string | null;
  pic_email: string | null;
  pic_current_address: string | null;
  pic_rt: string | null;
  pic_rw: string | null;
  pic_city: string | null;
  pic_province: string | null;
  pic_postal_code: string | null;
  pic_id_number: string | null;
  pic_gender: string | null;
  pic_birth_place: string | null;
  pic_birth_date: string | null;
  projects: any;
  stakeholders: any;
  bank_references: any;
  financing_value: number | null;
  tenor_months: number | null;
  interest_rate: number | null;
  down_payment_value: number | null;
  payment_method: string | null;
  estimated_monthly_installment: number | null;
  equipment_units: any;
  financial_statements: any;
  fap_stage_data: any;
  ocr_discrepancies: any;
  ocr_raw_data: any;
  comparison_remarks: string | null;
  ocr_document_path: string | null;
  ocr_document_filename: string | null;
  stage_at_submission: string;
  submitted_by_user_id: string | null;
  submitted_by_user_name: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export async function initializeFapArchive(): Promise<void> {
  if (!pool) return;
  try {
    // Drop freeze triggers as requested: "fap_submission_archive tidak jadi di freeze"
    try {
      await pool.query('DROP TRIGGER IF EXISTS trg_fap_archive_no_update');
      await pool.query('DROP TRIGGER IF EXISTS trg_fap_archive_no_delete');
    } catch {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fap_submission_archive (
        id CHAR(36) PRIMARY KEY,
        application_id CHAR(36) NOT NULL,
        
        -- Identitas Debitur & Header FAP
        fap_registration_number VARCHAR(80) NULL,
        application_date DATE NULL,
        branch_code VARCHAR(30) NULL,
        customer_status VARCHAR(30) NULL,
        customer_id CHAR(36) NULL,
        company_name VARCHAR(255) NULL,
        company_type VARCHAR(50) NULL,
        nib VARCHAR(32) NULL,
        nib_date DATE NULL,
        npwp VARCHAR(32) NULL,
        skt_no VARCHAR(100) NULL,
        sppkp_no VARCHAR(100) NULL,
        establishment_act_no VARCHAR(100) NULL,
        establishment_date DATE NULL,
        latest_deed_no VARCHAR(100) NULL,
        latest_deed_date DATE NULL,
        
        -- Alamat & Domisili Perusahaan
        company_address TEXT NULL,
        rt VARCHAR(10) NULL,
        rw VARCHAR(10) NULL,
        city VARCHAR(150) NULL,
        province VARCHAR(150) NULL,
        postal_code VARCHAR(20) NULL,
        phone_fax VARCHAR(50) NULL,
        email VARCHAR(255) NULL,
        website VARCHAR(255) NULL,
        
        -- Profil Usaha & Pengalaman
        main_business TEXT NULL,
        experience_years INT NULL DEFAULT 0,
        experience_months INT NULL DEFAULT 0,
        location_status VARCHAR(50) NULL,
        repayment_source TEXT NULL,
        industry_segment VARCHAR(100) NULL,
        business_role VARCHAR(100) NULL,
        
        -- Summary Asset Unit (LiuGong & Non-LiuGong)
        asset_summary_he_liu_gong INT NULL DEFAULT 0,
        asset_summary_truck_liu_gong INT NULL DEFAULT 0,
        asset_summary_he_non_liu_gong INT NULL DEFAULT 0,
        asset_summary_truck_non_liu_gong INT NULL DEFAULT 0,
        
        -- PIC (Person in Charge) Form
        pic_name VARCHAR(150) NULL,
        pic_position VARCHAR(100) NULL,
        pic_phone VARCHAR(50) NULL,
        pic_email VARCHAR(255) NULL,
        pic_current_address TEXT NULL,
        pic_rt VARCHAR(10) NULL,
        pic_rw VARCHAR(10) NULL,
        pic_city VARCHAR(150) NULL,
        pic_province VARCHAR(150) NULL,
        pic_postal_code VARCHAR(20) NULL,
        pic_id_number VARCHAR(50) NULL,
        pic_gender VARCHAR(20) NULL,
        pic_birth_place VARCHAR(100) NULL,
        pic_birth_date DATE NULL,
        
        -- Halaman 2 FAP (Proyek, Pemegang Saham, Pengajuan Pembiayaan, Fasilitas Bank, Unit)
        projects JSON NULL,
        stakeholders JSON NULL,
        bank_references JSON NULL,
        financing_value DECIMAL(20,2) NULL,
        tenor_months INT NULL,
        interest_rate DECIMAL(8,4) NULL,
        down_payment_value DECIMAL(20,2) NULL,
        payment_method VARCHAR(50) NULL,
        estimated_monthly_installment DECIMAL(20,2) NULL,
        equipment_units JSON NULL,
        financial_statements JSON NULL,
        fap_stage_data JSON NOT NULL,
        
        -- Extra Columns Sesuai Request User
        ocr_discrepancies JSON NULL,
        ocr_raw_data JSON NULL,
        comparison_remarks TEXT NULL,
        ocr_document_path VARCHAR(500) NULL,
        ocr_document_filename VARCHAR(255) NULL,
        
        -- Workflow & Audit Metadata
        stage_at_submission VARCHAR(50) NOT NULL DEFAULT 'PRE_ANALYSIS',
        submitted_by_user_id VARCHAR(100) NULL,
        submitted_by_user_name VARCHAR(150) NULL,
        submitted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        
        INDEX idx_fap_archive_app_id (application_id),
        INDEX idx_fap_archive_fap_no (fap_registration_number),
        INDEX idx_fap_archive_submitted_at (submitted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✓ fap_submission_archive table initialized with full exact FAP form columns (unfrozen)');
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
    const prof = currentApp?.profile || currentApp || {};
    const cust = currentApp?.customer || prof.customer || {};
    const pic = currentApp?.pic || prof.pic || {};
    const prop = currentApp?.proposal || prof.proposal || {};

    const fapNumber = currentApp?.fapNumber || currentApp?.fap_registration_number || prof.fapNumber || null;
    const companyName = currentApp?.companyName || currentApp?.company_name || cust.companyName || prof.companyName || null;
    const customerId = currentApp?.customerId || currentApp?.customer_id || cust.id || null;
    const appDate = currentApp?.applicationDate ? String(currentApp.applicationDate).slice(0, 10) : null;
    const branchCode = currentApp?.branchCode || prof.branchCode || null;
    const customerStatus = currentApp?.customerStatus || currentApp?.customerCategory || prof.customerCategory || 'EXISTING';
    const companyType = currentApp?.companyType || cust.companyType || prof.companyType || null;
    const nib = currentApp?.nib || cust.nib || prof.nib || null;
    const nibDate = (currentApp?.nibDate || cust.nibDate || prof.nibDate) ? String(currentApp?.nibDate || cust.nibDate || prof.nibDate).slice(0, 10) : null;
    const npwp = currentApp?.npwp || cust.npwp || prof.npwp || null;
    const sktNo = currentApp?.sktNo || cust.sktNo || prof.sktNo || null;
    const sppkpNo = currentApp?.sppkpNo || cust.sppkpNo || prof.sppkpNo || null;
    const establishmentActNo = currentApp?.establishmentActNo || cust.establishmentActNo || prof.establishmentActNo || null;
    const establishmentDate = (currentApp?.establishmentDate || cust.establishmentDate || prof.establishmentDate) ? String(currentApp?.establishmentDate || cust.establishmentDate || prof.establishmentDate).slice(0, 10) : null;
    const latestDeedNo = currentApp?.latestDeedNo || prof.latestDeedNo || null;
    const latestDeedDate = (currentApp?.latestDeedDate || prof.latestDeedDate) ? String(currentApp?.latestDeedDate || prof.latestDeedDate).slice(0, 10) : null;

    const companyAddress = currentApp?.companyAddress || cust.companyAddress || prof.companyAddress || null;
    const rt = currentApp?.rt || cust.rt || prof.rt || null;
    const rw = currentApp?.rw || cust.rw || prof.rw || null;
    const city = currentApp?.city || cust.city || prof.city || null;
    const province = currentApp?.province || cust.province || prof.province || null;
    const postalCode = currentApp?.postalCode || cust.postalCode || prof.postalCode || null;
    const phoneFax = currentApp?.phoneFax || cust.phoneFax || prof.phoneFax || null;
    const email = currentApp?.email || cust.email || prof.email || null;
    const website = currentApp?.website || cust.website || prof.website || null;

    const mainBusiness = currentApp?.mainBusiness || cust.mainBusiness || prof.mainBusiness || null;
    const experienceYears = Number(currentApp?.experienceYears ?? cust.experienceYears ?? prof.experienceYears ?? 0) || 0;
    const experienceMonths = Number(currentApp?.experienceMonths ?? cust.experienceMonths ?? prof.experienceMonths ?? 0) || 0;
    const locationStatus = currentApp?.locationStatus || cust.locationStatus || prof.locationStatus || null;
    const repaymentSource = currentApp?.repaymentSource || cust.repaymentSource || prof.repaymentSource || null;
    const industrySegment = currentApp?.industrySegment || cust.industrySegment || prof.industrySegment || null;
    const businessRole = currentApp?.businessRole || cust.businessRole || prof.businessRole || null;

    const assetHeLiuGong = Number(currentApp?.assetSummaryHeLiuGong ?? prof.assetSummaryHeLiuGong ?? 0) || 0;
    const assetTruckLiuGong = Number(currentApp?.assetSummaryTruckLiuGong ?? prof.assetSummaryTruckLiuGong ?? 0) || 0;
    const assetHeNonLiuGong = Number(currentApp?.assetSummaryHeNonLiuGong ?? prof.assetSummaryHeNonLiuGong ?? 0) || 0;
    const assetTruckNonLiuGong = Number(currentApp?.assetSummaryTruckNonLiuGong ?? prof.assetSummaryTruckNonLiuGong ?? 0) || 0;

    // PIC details
    const picName = pic.picName || pic.name || null;
    const picPosition = pic.position || null;
    const picPhone = pic.phone || pic.mobilePhone || null;
    const picEmail = pic.email || null;
    const picCurrentAddress = pic.currentAddress || pic.address || null;
    const picRt = pic.rt || null;
    const picRw = pic.rw || null;
    const picCity = pic.city || null;
    const picProvince = pic.province || null;
    const picPostalCode = pic.postalCode || null;
    const picIdNumber = pic.idNumber || pic.nik || null;
    const picGender = pic.gender || null;
    const picBirthPlace = pic.birthPlace || pic.tempatLahir || null;
    const picBirthDate = pic.birthDate || pic.tanggalLahir ? String(pic.birthDate || pic.tanggalLahir).slice(0, 10) : null;

    // Page 2 details
    const projects = currentApp?.projects || prof.projects || [];
    const stakeholders = currentApp?.stakeholders || prof.stakeholders || [];
    const bankReferences = currentApp?.bankReferences || prof.bankReferences || [];
    const financingValue = prop.financingValue ? Number(prop.financingValue) : null;
    const tenorMonths = prop.tenorMonths ? Number(prop.tenorMonths) : null;
    const interestRate = prop.interestRate ? Number(prop.interestRate) : null;
    const downPaymentValue = prop.downPaymentValue ? Number(prop.downPaymentValue) : null;
    const paymentMethod = prop.paymentMethod || null;
    const estimatedInstallment = prop.estimatedInstallment || prop.estimatedMonthlyInstallment ? Number(prop.estimatedInstallment || prop.estimatedMonthlyInstallment) : null;
    const equipmentUnits = prop.units || currentApp?.equipmentUnits || prof.equipmentUnits || [];
    const financialStatements = currentApp?.financialStatements || prof.financialStatements || [];

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
      applicationDate: appDate,
      customerCategory: customerStatus,
      branchCode,
      profile: {
        companyName,
        companyType,
        nib,
        nibDate,
        npwp,
        establishmentActNo,
        establishmentDate,
        latestDeedNo,
        latestDeedDate,
        sktNo,
        sppkpNo,
        phoneFax,
        email,
        website,
        mainBusiness,
        experienceYears,
        experienceMonths,
        locationStatus,
        repaymentSource,
        industrySegment,
        businessRole,
        companyAddress,
        rt,
        rw,
        city,
        province,
        postalCode,
        assetSummary: {
          heLiuGong: assetHeLiuGong,
          truckLiuGong: assetTruckLiuGong,
          heNonLiuGong: assetHeNonLiuGong,
          truckNonLiuGong: assetTruckNonLiuGong
        }
      },
      pic,
      legal: currentApp?.legal || prof.legal || null,
      stakeholders,
      projects,
      proposal: prop,
      bankReferences,
      equipmentUnits,
      financialStatements
    };

    const userId = actor?.id || 'system';
    const userName = actor?.name || 'System / Auto-Submit';

    await pool.query(`
      INSERT INTO fap_submission_archive (
        id,
        application_id,
        fap_registration_number,
        application_date,
        branch_code,
        customer_status,
        customer_id,
        company_name,
        company_type,
        nib,
        nib_date,
        npwp,
        skt_no,
        sppkp_no,
        establishment_act_no,
        establishment_date,
        latest_deed_no,
        latest_deed_date,
        company_address,
        rt,
        rw,
        city,
        province,
        postal_code,
        phone_fax,
        email,
        website,
        main_business,
        experience_years,
        experience_months,
        location_status,
        repayment_source,
        industry_segment,
        business_role,
        asset_summary_he_liu_gong,
        asset_summary_truck_liu_gong,
        asset_summary_he_non_liu_gong,
        asset_summary_truck_non_liu_gong,
        pic_name,
        pic_position,
        pic_phone,
        pic_email,
        pic_current_address,
        pic_rt,
        pic_rw,
        pic_city,
        pic_province,
        pic_postal_code,
        pic_id_number,
        pic_gender,
        pic_birth_place,
        pic_birth_date,
        projects,
        stakeholders,
        bank_references,
        financing_value,
        tenor_months,
        interest_rate,
        down_payment_value,
        payment_method,
        estimated_monthly_installment,
        equipment_units,
        financial_statements,
        fap_stage_data,
        ocr_discrepancies,
        ocr_raw_data,
        comparison_remarks,
        ocr_document_path,
        ocr_document_filename,
        stage_at_submission,
        submitted_by_user_id,
        submitted_by_user_name,
        submitted_at,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      )
    `, [
      archiveId,
      applicationId,
      fapNumber,
      appDate,
      branchCode,
      customerStatus,
      customerId,
      companyName,
      companyType,
      nib,
      nibDate,
      npwp,
      sktNo,
      sppkpNo,
      establishmentActNo,
      establishmentDate,
      latestDeedNo,
      latestDeedDate,
      companyAddress,
      rt,
      rw,
      city,
      province,
      postalCode,
      phoneFax,
      email,
      website,
      mainBusiness,
      experienceYears,
      experienceMonths,
      locationStatus,
      repaymentSource,
      industrySegment,
      businessRole,
      assetHeLiuGong,
      assetTruckLiuGong,
      assetHeNonLiuGong,
      assetTruckNonLiuGong,
      picName,
      picPosition,
      picPhone,
      picEmail,
      picCurrentAddress,
      picRt,
      picRw,
      picCity,
      picProvince,
      picPostalCode,
      picIdNumber,
      picGender,
      picBirthPlace,
      picBirthDate,
      JSON.stringify(projects),
      JSON.stringify(stakeholders),
      JSON.stringify(bankReferences),
      financingValue,
      tenorMonths,
      interestRate,
      downPaymentValue,
      paymentMethod,
      estimatedInstallment,
      JSON.stringify(equipmentUnits),
      JSON.stringify(financialStatements),
      JSON.stringify(fapStageSnapshot),
      JSON.stringify(ocrDiffs),
      JSON.stringify(ocrRaw),
      remarks || null,
      docPath,
      docFileName,
      'PRE_ANALYSIS',
      userId,
      userName
    ]);

    console.log(`[OK] Recorded comprehensive FAP submission archive [${archiveId}] for application [${applicationId}]`);

    return {
      id: archiveId,
      application_id: applicationId,
      fap_registration_number: fapNumber,
      application_date: appDate,
      branch_code: branchCode,
      customer_status: customerStatus,
      customer_id: customerId,
      company_name: companyName,
      company_type: companyType,
      nib,
      nib_date: nibDate,
      npwp,
      skt_no: sktNo,
      sppkp_no: sppkpNo,
      establishment_act_no: establishmentActNo,
      establishment_date: establishmentDate,
      latest_deed_no: latestDeedNo,
      latest_deed_date: latestDeedDate,
      company_address: companyAddress,
      rt,
      rw,
      city,
      province,
      postal_code: postalCode,
      phone_fax: phoneFax,
      email,
      website,
      main_business: mainBusiness,
      experience_years: experienceYears,
      experience_months: experienceMonths,
      location_status: locationStatus,
      repayment_source: repaymentSource,
      industry_segment: industrySegment,
      business_role: businessRole,
      asset_summary_he_liu_gong: assetHeLiuGong,
      asset_summary_truck_liu_gong: assetTruckLiuGong,
      asset_summary_he_non_liu_gong: assetHeNonLiuGong,
      asset_summary_truck_non_liu_gong: assetTruckNonLiuGong,
      pic_name: picName,
      pic_position: picPosition,
      pic_phone: picPhone,
      pic_email: picEmail,
      pic_current_address: picCurrentAddress,
      pic_rt: picRt,
      pic_rw: picRw,
      pic_city: picCity,
      pic_province: picProvince,
      pic_postal_code: picPostalCode,
      pic_id_number: picIdNumber,
      pic_gender: picGender,
      pic_birth_place: picBirthPlace,
      pic_birth_date: picBirthDate,
      projects,
      stakeholders,
      bank_references: bankReferences,
      financing_value: financingValue,
      tenor_months: tenorMonths,
      interest_rate: interestRate,
      down_payment_value: downPaymentValue,
      payment_method: paymentMethod,
      estimated_monthly_installment: estimatedInstallment,
      equipment_units: equipmentUnits,
      financial_statements: financialStatements,
      fap_stage_data: fapStageSnapshot,
      ocr_discrepancies: ocrDiffs,
      ocr_raw_data: ocrRaw,
      comparison_remarks: remarks || null,
      ocr_document_path: docPath,
      ocr_document_filename: docFileName,
      stage_at_submission: 'PRE_ANALYSIS',
      submitted_by_user_id: userId,
      submitted_by_user_name: userName,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
      projects: typeof r.projects === 'string' ? JSON.parse(r.projects) : r.projects,
      stakeholders: typeof r.stakeholders === 'string' ? JSON.parse(r.stakeholders) : r.stakeholders,
      bank_references: typeof r.bank_references === 'string' ? JSON.parse(r.bank_references) : r.bank_references,
      equipment_units: typeof r.equipment_units === 'string' ? JSON.parse(r.equipment_units) : r.equipment_units,
      financial_statements: typeof r.financial_statements === 'string' ? JSON.parse(r.financial_statements) : r.financial_statements,
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
      projects: typeof r.projects === 'string' ? JSON.parse(r.projects) : r.projects,
      stakeholders: typeof r.stakeholders === 'string' ? JSON.parse(r.stakeholders) : r.stakeholders,
      bank_references: typeof r.bank_references === 'string' ? JSON.parse(r.bank_references) : r.bank_references,
      equipment_units: typeof r.equipment_units === 'string' ? JSON.parse(r.equipment_units) : r.equipment_units,
      financial_statements: typeof r.financial_statements === 'string' ? JSON.parse(r.financial_statements) : r.financial_statements,
      fap_stage_data: typeof r.fap_stage_data === 'string' ? JSON.parse(r.fap_stage_data) : r.fap_stage_data,
      ocr_discrepancies: typeof r.ocr_discrepancies === 'string' ? JSON.parse(r.ocr_discrepancies) : r.ocr_discrepancies,
      ocr_raw_data: typeof r.ocr_raw_data === 'string' ? JSON.parse(r.ocr_raw_data) : r.ocr_raw_data
    };
  } catch (err) {
    console.warn('getFapSubmissionArchiveDetail error:', err);
    return null;
  }
}
