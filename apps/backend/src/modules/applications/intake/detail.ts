/** Hydrates complete application detail from normalized crm_liugong1 tables. */
import {resolveLocationNames, resolveMasterCodeOrName} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';
import {readChecklistForApplication} from '../../documents/store/read';
import {getSubmitLock} from '../../documents/store/submit-lock';
import {readLegalForApplication} from '../../legal/store/read';
import {readBusiness} from '../business.repository';
import {readFinancialStatements} from '../financial-statements.repository';
import {getBusinessPartnerById} from './customers';
import {dateStr} from './helpers';

export async function intakeDetail(id: string) {
  const [appRows] = await pool.query<any[]>(
    `SELECT a.*,
            ws.code AS status_code, ws.name AS status_name,
            st.code AS stage_code, st.name AS stage_name,
            br.code AS branch_code, br.name AS branch_name
     FROM crm_applications a
     JOIN crm_master_workflow_statuses ws ON ws.id = a.current_status_id
     JOIN crm_master_workflow_stages st ON st.id = ws.stage_id
     LEFT JOIN crm_master_branches br ON br.id = a.branch_id
     WHERE a.id = ? AND a.deleted_at IS NULL
     LIMIT 1`,
    [id],
  );
  const app = appRows[0];
  if (!app) return null;

  const [
    [profRows],
    [picRows],
    [progressRows],
    [signoffRows],
    [transRows],
    customer,
    business,
    financialStatements,
    documentChecks,
    legalBundle,
    submitLock,
  ] = await Promise.all([
    pool.query<any[]>('SELECT * FROM crm_fap_application_profiles WHERE application_id = ? LIMIT 1', [id]),
    pool.query<any[]>('SELECT * FROM crm_fap_primary_contacts WHERE application_id = ? LIMIT 1', [id]),
    pool.query<any[]>(
      `SELECT sp.*, st.code AS stage_code, st.name AS stage_name
       FROM crm_application_stage_progress sp
       JOIN crm_master_workflow_stages st ON st.id = sp.stage_id
       WHERE sp.application_id = ?`,
      [id],
    ),
    pool.query<any[]>(
      `SELECT s.*, st.code AS stage_code, st.name AS stage_name
       FROM crm_application_signoffs s
       JOIN crm_master_workflow_stages st ON st.id = s.stage_id
       WHERE s.application_id = ?
       ORDER BY s.signed_at ASC`,
      [id],
    ),
    pool.query<any[]>(
      `SELECT t.*, fs.code AS from_code, ts.code AS to_code, ts.name AS to_name
       FROM crm_application_stage_transitions t
       LEFT JOIN crm_master_workflow_statuses fs ON fs.id = t.from_status_id
       JOIN crm_master_workflow_statuses ts ON ts.id = t.to_status_id
       WHERE t.application_id = ?
       ORDER BY t.transitioned_at ASC`,
      [id],
    ),
    getBusinessPartnerById(app.customer_id),
    readBusiness(id),
    readFinancialStatements(id),
    readChecklistForApplication(id),
    readLegalForApplication(id),
    getSubmitLock(id),
  ]);

  const prof = profRows[0] || {};
  const picRow = picRows[0] || null;

  const [
    profLoc,
    picLoc,
    companyType,
    locationStatus,
    industrySegment,
    businessRole,
    picPosition,
  ] = await Promise.all([
    resolveLocationNames(prof),
    picRow ? resolveLocationNames(picRow) : Promise.resolve({country: 'Indonesia', province: '', city: '', district: '', village: '', postalCode: ''}),
    resolveMasterCodeOrName('crm_master_business_categories', prof.business_category_id, 'code'),
    resolveMasterCodeOrName('crm_master_premise_statuses', prof.premise_status_id, 'code'),
    resolveMasterCodeOrName('crm_master_industry_segments', prof.industry_segment_id, 'code'),
    resolveMasterCodeOrName('crm_master_business_roles', prof.business_role_id, 'code'),
    picRow ? resolveMasterCodeOrName('crm_master_pic_positions', picRow.position_id, 'code') : Promise.resolve(''),
  ]);

  const hasPreProgress = progressRows.some(r => r.stage_code === 'PRE_ANALYSIS');
  const stage =
    app.stage_code === 'FAP_STAGE' && hasPreProgress ? 'Pre-analysis' : app.stage_name || 'FAP Stage';

  const pic = picRow
    ? {
        id: picRow.id,
        picName: picRow.pic_name || '',
        position: picPosition || '',
        phone: picRow.phone || '',
        email: picRow.email || '',
        country: picLoc.country || 'Indonesia',
        province: picLoc.province || '',
        city: picLoc.city || '',
        district: picLoc.district || '',
        village: picLoc.village || '',
        postalCode: picLoc.postalCode || '',
        rt: picRow.rt || '',
        rw: picRow.rw || '',
        currentAddress: picRow.current_address || '',
      }
    : {
        picName: '',
        position: '',
        phone: '',
        email: '',
        country: 'Indonesia',
        province: '',
        city: '',
        district: '',
        village: '',
        postalCode: '',
        rt: '',
        rw: '',
        currentAddress: '',
      };

  const signoffs = signoffRows.map(s => ({
    id: s.id,
    stage: s.stage_name || s.stage_code,
    role: s.role_code,
    actorUserId: s.actor_user_id,
    actorName: s.actor_name,
    decision: s.decision,
    remarks: s.remarks || '',
    signedAt: s.signed_at,
  }));

  const approvalLogs = transRows.map(t => ({
    id: t.id,
    action: t.action_code,
    fromStatus: t.from_code || '',
    previousStatus: t.from_code || '',
    toStatus: t.to_code,
    newStatus: t.to_code,
    toStatusName: t.to_name,
    comments: t.comments || '',
    actorUserId: t.actor_user_id,
    actorName: t.actor_name,
    actionBy: t.actor_name,
    actorRole: t.actor_role,
    userRole: t.actor_role,
    createdAt: t.transitioned_at,
    actionTimestamp: t.transitioned_at,
  }));

  const latestSt = financialStatements[financialStatements.length - 1];
  const ratios = latestSt
    ? {
        currentRatio: latestSt.currentRatio,
        debtToEquity: latestSt.debtToEquityRatio,
        netProfitMargin: latestSt.netProfitMarginPct,
      }
    : null;

  const companyName = prof.company_name || customer?.companyName || '';
  const nib = prof.nib || customer?.nib || '';
  const npwp = prof.npwp || customer?.npwp || '';

  return {
    id: app.id,
    fapNumber: app.fap_registration_number,
    applicationDate: dateStr(app.application_date) || '',
    customerId: app.customer_id,
    customerCategory: app.customer_category,
    customerStatus: app.customer_category,
    status: app.status_code,
    statusName: app.status_name,
    stage,
    isFapDocUploaded: Boolean(app.is_fap_doc_uploaded),
    isFapFormLocked: Boolean(app.is_fap_form_locked),
    fapDocUploaded: Boolean(app.is_fap_doc_uploaded),
    fapFormLocked: Boolean(app.is_fap_form_locked),
    latestFreezeVersion: Number(app.latest_freeze_version ?? 0),
    makerUserId: app.maker_user_id,
    makerName: app.maker_name || '',
    branchCode: app.branch_code || app.branch_name || customer?.branchCode || '',
    companyName,
    companyType: companyType || customer?.companyType || '',
    nib,
    nibDate: dateStr(prof.nib_date) || customer?.nibDate || '',
    npwp,
    establishmentActNo: prof.establishment_act_no || customer?.establishmentActNo || '',
    establishmentDate: dateStr(prof.establishment_date) || customer?.establishmentDate || '',
    latestDeedNo: prof.latest_deed_no || customer?.latestDeedNo || '',
    latestDeedDate: dateStr(prof.latest_deed_date) || customer?.latestDeedDate || '',
    locationStatus: locationStatus || customer?.locationStatus || '',
    companyAddress: prof.company_address || customer?.companyAddress || '',
    country: profLoc.country || 'Indonesia',
    province: profLoc.province || customer?.province || '',
    city: profLoc.city || customer?.city || '',
    district: profLoc.district || customer?.district || '',
    village: profLoc.village || customer?.village || '',
    postalCode: profLoc.postalCode || customer?.postalCode || '',
    rt: prof.rt ?? customer?.rt ?? '',
    rw: prof.rw ?? customer?.rw ?? '',
    phoneFax: prof.phone_fax || customer?.phoneFax || '',
    email: prof.company_email || customer?.email || '',
    website: prof.website || customer?.website || '',
    mainBusiness: prof.main_business || customer?.mainBusiness || '',
    repaymentSource: prof.repayment_source || customer?.repaymentSource || '',
    experienceYears: Number(prof.experience_years ?? customer?.experienceYears ?? 0),
    experienceMonths: Number(prof.experience_months ?? customer?.experienceMonths ?? 0),
    assetSummaryHeLiuGong: Number(prof.asset_he_liugong ?? customer?.assetSummaryHeLiuGong ?? 0),
    assetSummaryTruckLiuGong: Number(prof.asset_truck_liugong ?? customer?.assetSummaryTruckLiuGong ?? 0),
    assetSummaryHeNonLiuGong: Number(prof.asset_he_non_liugong ?? customer?.assetSummaryHeNonLiuGong ?? 0),
    assetSummaryTruckNonLiuGong: Number(prof.asset_truck_non_liugong ?? customer?.assetSummaryTruckNonLiuGong ?? 0),
    industrySegment: industrySegment || customer?.industrySegment || '',
    businessRole: businessRole || customer?.businessRole || '',
    referenceComments: prof.reference_comments || business.bankReferences[0]?.comments || '',
    financialAudited: Boolean(prof.is_financial_audited),
    customer: customer || {
      id: app.customer_id,
      companyName,
      companyType,
      nib,
      npwp,
    },
    pic,
    projects: business.projects,
    bankReferences: business.bankReferences,
    proposal: business.proposal,
    financingProposal: business.financingProposal,
    financingProposalJson: business.financingProposalJson,
    financingPurposeDetail: business.financingPurposeDetail,
    documentRequirements: business.documentRequirements,
    financingPurposes: business.purposes,
    financialStatements,
    ratios,
    documentChecks,
    legal: legalBundle.legal,
    stakeholders: legalBundle.stakeholders,
    submitLock,
    signoffs,
    approvalLogs,
    createdAt: app.created_at,
    updatedAt: app.updated_at,
  };
}
