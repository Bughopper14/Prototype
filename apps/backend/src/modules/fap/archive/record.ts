/** Writes an immutable archive of a FAP submission (data, OCR comparison and documents). */
import {pool} from '../../../core/db/pool';
import crypto from 'node:crypto';
import path from 'node:path';
import {documentsDir} from '../../../core/storage';
import {FapArchiveRecord} from './types';
import {extractArchiveFields} from './extract-fields';
import {findFapDocumentPath} from './find-document';

export async function recordFapSubmissionArchive(
  applicationId: string,
  currentApp: any,
  actor?: {id?: string; name?: string; role?: string},
  explicitRemarks?: string,
): Promise<FapArchiveRecord | null> {
  if (!pool) return null;
  try {
    const archiveId = crypto.randomUUID();
    const {
      appDate,
      assetHeLiuGong,
      assetHeNonLiuGong,
      assetTruckLiuGong,
      assetTruckNonLiuGong,
      bankReferences,
      branchCode,
      businessRole,
      city,
      companyAddress,
      companyName,
      companyType,
      customerId,
      customerStatus,
      downPaymentValue,
      email,
      equipmentUnits,
      establishmentActNo,
      establishmentDate,
      estimatedInstallment,
      experienceMonths,
      experienceYears,
      fapNumber,
      fapStageSnapshot,
      financialStatements,
      financingValue,
      industrySegment,
      interestRate,
      latestDeedDate,
      latestDeedNo,
      locationStatus,
      mainBusiness,
      nib,
      nibDate,
      npwp,
      paymentMethod,
      phoneFax,
      picBirthDate,
      picBirthPlace,
      picCity,
      picCurrentAddress,
      picEmail,
      picGender,
      picIdNumber,
      picName,
      picPhone,
      picPosition,
      picPostalCode,
      picProvince,
      picRt,
      picRw,
      postalCode,
      projects,
      province,
      repaymentSource,
      rt,
      rw,
      sktNo,
      sppkpNo,
      stakeholders,
      tenorMonths,
      website,
    } = extractArchiveFields(currentApp);

    // Retrieve latest OCR comparison & remarks from submit lock
    const [lockRows] = await pool.query<any[]>(
      'SELECT ocr_comparison_json, remarks FROM application_submit_lock WHERE application_id = ?',
      [applicationId],
    );

    let comparisonData: any = null;
    if (lockRows?.[0]?.ocr_comparison_json) {
      try {
        comparisonData =
          typeof lockRows[0].ocr_comparison_json === 'string'
            ? JSON.parse(lockRows[0].ocr_comparison_json)
            : lockRows[0].ocr_comparison_json;
      } catch {}
    }

    const remarks =
      explicitRemarks !== undefined && explicitRemarks !== null
        ? String(explicitRemarks).trim()
        : lockRows?.[0]?.remarks || comparisonData?.remarks || '';

    const ocrDiffs = comparisonData?.diffs || [];
    const ocrRaw = comparisonData?.extractedData || null;

    // Locate the physical FAP document storage location
    const docInfo = await findFapDocumentPath(applicationId);
    const docPath =
      docInfo.filePath ||
      (comparisonData?.fileName ? path.join(documentsDir, comparisonData.fileName) : null);
    const docFileName = docInfo.fileName || comparisonData?.fileName || null;

    const userId = actor?.id || 'system';
    const userName = actor?.name || 'System / Auto-Submit';

    // [column, value, stored as JSON text]; the returned record uses the same columns
    const entries: [string, unknown, boolean?][] = [
      ['id', archiveId],
      ['application_id', applicationId],
      ['fap_registration_number', fapNumber],
      ['application_date', appDate],
      ['branch_code', branchCode],
      ['customer_status', customerStatus],
      ['customer_id', customerId],
      ['company_name', companyName],
      ['company_type', companyType],
      ['nib', nib],
      ['nib_date', nibDate],
      ['npwp', npwp],
      ['skt_no', sktNo],
      ['sppkp_no', sppkpNo],
      ['establishment_act_no', establishmentActNo],
      ['establishment_date', establishmentDate],
      ['latest_deed_no', latestDeedNo],
      ['latest_deed_date', latestDeedDate],
      ['company_address', companyAddress],
      ['rt', rt],
      ['rw', rw],
      ['city', city],
      ['province', province],
      ['postal_code', postalCode],
      ['phone_fax', phoneFax],
      ['email', email],
      ['website', website],
      ['main_business', mainBusiness],
      ['experience_years', experienceYears],
      ['experience_months', experienceMonths],
      ['location_status', locationStatus],
      ['repayment_source', repaymentSource],
      ['industry_segment', industrySegment],
      ['business_role', businessRole],
      ['asset_summary_he_liu_gong', assetHeLiuGong],
      ['asset_summary_truck_liu_gong', assetTruckLiuGong],
      ['asset_summary_he_non_liu_gong', assetHeNonLiuGong],
      ['asset_summary_truck_non_liu_gong', assetTruckNonLiuGong],
      ['pic_name', picName],
      ['pic_position', picPosition],
      ['pic_phone', picPhone],
      ['pic_email', picEmail],
      ['pic_current_address', picCurrentAddress],
      ['pic_rt', picRt],
      ['pic_rw', picRw],
      ['pic_city', picCity],
      ['pic_province', picProvince],
      ['pic_postal_code', picPostalCode],
      ['pic_id_number', picIdNumber],
      ['pic_gender', picGender],
      ['pic_birth_place', picBirthPlace],
      ['pic_birth_date', picBirthDate],
      ['projects', projects, true],
      ['stakeholders', stakeholders, true],
      ['bank_references', bankReferences, true],
      ['financing_value', financingValue],
      ['tenor_months', tenorMonths],
      ['interest_rate', interestRate],
      ['down_payment_value', downPaymentValue],
      ['payment_method', paymentMethod],
      ['estimated_monthly_installment', estimatedInstallment],
      ['equipment_units', equipmentUnits, true],
      ['financial_statements', financialStatements, true],
      ['fap_stage_data', fapStageSnapshot, true],
      ['ocr_discrepancies', ocrDiffs, true],
      ['ocr_raw_data', ocrRaw, true],
      ['comparison_remarks', remarks || null],
      ['ocr_document_path', docPath],
      ['ocr_document_filename', docFileName],
      ['stage_at_submission', 'PRE_ANALYSIS'],
      ['submitted_by_user_id', userId],
      ['submitted_by_user_name', userName],
    ];
    const columns = entries.map(([column]) => column);
    const timestamps = ['submitted_at', 'created_at', 'updated_at'];

    await pool.query(
      `INSERT INTO fap_submission_archive (${[...columns, ...timestamps].join(', ')}) VALUES (${[
        ...columns.map(() => '?'),
        ...timestamps.map(() => 'CURRENT_TIMESTAMP(3)'),
      ].join(', ')})`,
      entries.map(([, value, asJson]) => (asJson ? JSON.stringify(value) : value)),
    );

    console.log(
      `[OK] Recorded comprehensive FAP submission archive [${archiveId}] for application [${applicationId}]`,
    );

    const now = new Date().toISOString();
    return {
      ...Object.fromEntries(entries.map(([column, value]) => [column, value])),
      submitted_at: now,
      created_at: now,
      updated_at: now,
    } as unknown as FapArchiveRecord;
  } catch (err: any) {
    console.error('recordFapSubmissionArchive error:', err);
    return null;
  }
}
