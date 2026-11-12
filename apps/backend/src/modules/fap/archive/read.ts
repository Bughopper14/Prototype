/** Reads frozen FAP submission archives hydrated from crm_frozen_fap_applications + 14 child tables. */
import {pool} from '../../../core/db/pool';
import {FapArchiveRecord} from './types';

async function hydrateFrozenRecord(r: any): Promise<FapArchiveRecord> {
  const freezeId = r.id;
  const [
    [pics],
    [purposes],
    [projects],
    [banks],
    [proposals],
    [proposalTerms],
    [units],
    [docReqs],
    [financials],
    [deeds],
    [remarkCats],
    [stakeholders],
    [checklists],
    [discrepancies],
  ] = await Promise.all([
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_primary_contacts WHERE freeze_id = ?', [freezeId]),
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_financing_purposes WHERE freeze_id = ?', [freezeId]),
    pool.query<any[]>(
      'SELECT * FROM crm_frozen_fap_project_contracts WHERE freeze_id = ? ORDER BY row_position ASC',
      [freezeId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_frozen_fap_bank_facilities WHERE freeze_id = ? ORDER BY row_position ASC',
      [freezeId],
    ),
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_financing_proposals WHERE freeze_id = ?', [freezeId]),
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_proposal_terms WHERE freeze_id = ?', [freezeId]),
    pool.query<any[]>(
      'SELECT * FROM crm_frozen_fap_equipment_units WHERE freeze_id = ? ORDER BY row_position ASC',
      [freezeId],
    ),
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_doc_requirements WHERE freeze_id = ?', [freezeId]),
    pool.query<any[]>(
      'SELECT * FROM crm_frozen_fap_financial_statements WHERE freeze_id = ? ORDER BY fiscal_year DESC',
      [freezeId],
    ),
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_legal_deeds WHERE freeze_id = ?', [freezeId]),
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_legal_deed_remark_categories WHERE freeze_id = ?', [freezeId]),
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_legal_stakeholders WHERE freeze_id = ?', [freezeId]),
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_document_checklists WHERE freeze_id = ?', [freezeId]),
    pool.query<any[]>('SELECT * FROM crm_frozen_fap_ocr_discrepancies WHERE freeze_id = ?', [freezeId]),
  ]);

  const pic = pics[0] || {};
  const prop = proposals[0] || {};
  const mappedDiffs = discrepancies.map(d => ({
    section: d.section_name,
    field: d.field_key,
    label: d.field_label,
    oldValue: d.system_value || '',
    newValue: d.ocr_value || '',
    systemValue: d.system_value || '',
    ocrValue: d.ocr_value || '',
    status: d.resolution_status,
  }));

  const catsByDeed = new Map<string, any[]>();
  for (const c of remarkCats) {
    const list = catsByDeed.get(c.frozen_deed_id) || [];
    list.push({code: c.category_code, name: c.category_name});
    catsByDeed.set(c.frozen_deed_id, list);
  }
  const stakesByDeed = new Map<string, any[]>();
  for (const s of stakeholders) {
    const list = stakesByDeed.get(s.frozen_deed_id) || [];
    list.push(s);
    stakesByDeed.set(s.frozen_deed_id, list);
  }

  const hydratedDeeds = deeds.map(d => ({
    ...d,
    remarkCategories: catsByDeed.get(d.id) || [],
    stakeholders: stakesByDeed.get(d.id) || [],
  }));

  const fapStageData = {
    capturedAt: r.frozen_at,
    freezeVersion: r.freeze_version,
    isLatestFreeze: Boolean(r.is_latest_freeze),
    fapNumber: r.fap_registration_number,
    companyName: r.company_name,
    customerId: r.source_customer_id,
    applicationDate: r.application_date,
    customerCategory: r.customer_category,
    branchCode: r.branch_code,
    stageAtFreeze: r.stage_code_at_freeze,
    statusAtFreeze: r.status_code_at_freeze,
    profile: {
      companyName: r.company_name,
      companyType: r.business_category_code,
      nib: r.nib,
      nibDate: r.nib_date,
      npwp: r.npwp,
      establishmentActNo: r.establishment_act_no,
      establishmentDate: r.establishment_date,
      latestDeedNo: r.latest_deed_no,
      latestDeedDate: r.latest_deed_date,
      phoneFax: r.phone_fax,
      email: r.company_email,
      website: r.website,
      mainBusiness: r.main_business,
      experienceYears: r.experience_years,
      experienceMonths: r.experience_months,
      locationStatus: r.premise_status_code,
      repaymentSource: r.repayment_source,
      industrySegment: r.industry_segment_code,
      businessRole: r.business_role_code,
      companyAddress: r.company_address,
      rt: r.rt,
      rw: r.rw,
      city: r.city_name,
      province: r.province_name,
      postalCode: r.postal_code,
      assetSummary: {
        heLiuGong: r.asset_he_liugong,
        truckLiuGong: r.asset_truck_liugong,
        heNonLiuGong: r.asset_he_non_liugong,
        truckNonLiuGong: r.asset_truck_non_liugong,
      },
    },
    pic: pics[0] || null,
    purposes,
    projects,
    bankReferences: banks,
    proposal: proposals[0] || null,
    proposalTerms,
    equipmentUnits: units,
    docRequirements: docReqs,
    financialStatements: financials,
    deeds: hydratedDeeds,
    stakeholders,
    documentChecklists: checklists,
  };

  return {
    id: r.id,
    application_id: r.source_application_id,
    freeze_version: Number(r.freeze_version || 1),
    is_latest_freeze: Boolean(r.is_latest_freeze),
    fap_registration_number: r.fap_registration_number,
    application_date: r.application_date,
    branch_code: r.branch_code,
    customer_status: r.customer_category,
    customer_id: r.source_customer_id,
    company_name: r.company_name,
    company_type: r.business_category_code,
    nib: r.nib,
    nib_date: r.nib_date,
    npwp: r.npwp,
    establishment_act_no: r.establishment_act_no,
    establishment_date: r.establishment_date,
    latest_deed_no: r.latest_deed_no,
    latest_deed_date: r.latest_deed_date,
    company_address: r.company_address,
    rt: r.rt,
    rw: r.rw,
    city: r.city_name,
    province: r.province_name,
    postal_code: r.postal_code,
    phone_fax: r.phone_fax,
    email: r.company_email,
    website: r.website,
    main_business: r.main_business,
    experience_years: r.experience_years,
    experience_months: r.experience_months,
    location_status: r.premise_status_code,
    repayment_source: r.repayment_source,
    industry_segment: r.industry_segment_code,
    business_role: r.business_role_code,
    asset_summary_he_liu_gong: r.asset_he_liugong,
    asset_summary_truck_liu_gong: r.asset_truck_liugong,
    asset_summary_he_non_liugong: r.asset_he_non_liugong,
    asset_summary_truck_non_liugong: r.asset_truck_non_liugong,
    pic_name: pic.pic_name || null,
    pic_position: pic.position_code || pic.position_name || null,
    pic_phone: pic.phone || null,
    pic_email: pic.email || null,
    pic_current_address: pic.current_address || null,
    pic_rt: pic.rt || null,
    pic_rw: pic.rw || null,
    pic_city: pic.city_name || null,
    pic_province: pic.province_name || null,
    pic_postal_code: pic.postal_code || null,
    projects,
    stakeholders,
    bank_references: banks,
    financing_value: prop.financing_value !== undefined ? Number(prop.financing_value) : null,
    tenor_months: prop.tenor_months !== undefined ? Number(prop.tenor_months) : null,
    interest_rate: prop.interest_rate !== undefined ? Number(prop.interest_rate) : null,
    down_payment_value: prop.down_payment_value !== undefined ? Number(prop.down_payment_value) : null,
    payment_method: prop.financing_method_code || prop.payment_timing_code || null,
    estimated_monthly_installment:
      prop.estimated_monthly_installment !== undefined ? Number(prop.estimated_monthly_installment) : null,
    equipment_units: units,
    financial_statements: financials,
    fap_stage_data: fapStageData,
    ocr_discrepancies: mappedDiffs,
    ocr_raw_data: null,
    comparison_remarks: r.comparison_remarks,
    ocr_document_path: r.uploaded_fap_file_path,
    ocr_document_filename: r.uploaded_fap_file_name,
    stage_at_submission: r.stage_code_at_freeze,
    status_at_submission: r.status_code_at_freeze,
    submitted_by_user_id: r.frozen_by_user_id ? String(r.frozen_by_user_id) : null,
    submitted_by_user_name: r.frozen_by_name,
    submitted_at: r.frozen_at,
    created_at: r.frozen_at,
    updated_at: r.frozen_at,
  };
}

export async function getFapSubmissionArchives(applicationId: string): Promise<FapArchiveRecord[]> {
  if (!pool) return [];
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM crm_frozen_fap_applications
       WHERE source_application_id = ?
       ORDER BY freeze_version DESC, frozen_at DESC`,
      [applicationId],
    );
    return Promise.all(rows.map(hydrateFrozenRecord));
  } catch (err) {
    console.warn('getFapSubmissionArchives error:', err);
    return [];
  }
}

export async function getFapSubmissionArchiveDetail(archiveId: string): Promise<FapArchiveRecord | null> {
  if (!pool) return null;
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM crm_frozen_fap_applications
       WHERE id = ?
       LIMIT 1`,
      [archiveId],
    );
    if (!rows.length) return null;
    return hydrateFrozenRecord(rows[0]);
  } catch (err) {
    console.warn('getFapSubmissionArchiveDetail error:', err);
    return null;
  }
}
