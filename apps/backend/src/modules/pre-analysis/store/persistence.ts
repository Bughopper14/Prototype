/** Loading and saving normalized Pre-Analysis forms across crm_pre_analysis_forms + 12 child tables. */
import crypto from 'node:crypto';
import {pool} from '../../../core/db/pool';
import {createBlankPreAnalysisData, DEFAULT_PRE_ANALYSIS_DATA} from './defaults';
import {generatePreAnalysisNo, getAllPreAnalysisNumbers} from './numbering';

export async function initPreAnalysisStore() {
  await pool.query('SELECT 1 FROM crm_pre_analysis_forms LIMIT 1');
}

const cleanStr = (v: unknown, maxLen?: number): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v);
  if (!s.trim()) return null;
  return maxLen ? s.slice(0, maxLen) : s;
};

const toNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

async function hydratePreAnalysisForm(formRow: any): Promise<any> {
  const preId = formRow.id;
  const [
    [invPlans],
    [groupEntities],
    [groupShareholders],
    [milestones],
    [projGroups],
    [projItems],
    [units],
    [competitors],
    [slikReviews],
    [lenderExposures],
    [suggestions],
    [signatories],
  ] = await Promise.all([
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_investment_plans WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_group_entities WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
    pool.query<any[]>(
      `SELECT sh.* FROM crm_pre_analysis_group_shareholders sh
       JOIN crm_pre_analysis_group_entities ge ON ge.id = sh.group_entity_id
       WHERE ge.pre_analysis_id = ?
       ORDER BY sh.sort_order ASC`,
      [preId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_milestones WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_project_groups WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
    pool.query<any[]>(
      `SELECT pi.* FROM crm_pre_analysis_project_items pi
       JOIN crm_pre_analysis_project_groups pg ON pg.id = pi.project_group_id
       WHERE pg.pre_analysis_id = ?
       ORDER BY pi.sort_order ASC`,
      [preId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_unit_compositions WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_competitors WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_slik_reviews WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_lender_exposures WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_suggestions WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_pre_analysis_signatories WHERE pre_analysis_id = ? ORDER BY sort_order ASC',
      [preId],
    ),
  ]);

  const investmentPlanSelected: string[] = [];
  const investmentPlanRemarks: Record<string, string> = {};
  for (const p of invPlans) {
    if (Number(p.is_selected)) investmentPlanSelected.push(p.option_code);
    if (p.remarks !== null && p.remarks !== undefined && p.remarks !== '') {
      investmentPlanRemarks[p.option_code] = p.remarks;
    }
  }

  const sharesByEntity = new Map<string, any[]>();
  for (const sh of groupShareholders) {
    const list = sharesByEntity.get(sh.group_entity_id) || [];
    list.push({
      name: sh.shareholder_name || '',
      percentage: sh.percentage_text || '',
      role: sh.role_title || '',
      position: sh.position_title || '',
      shareClass: sh.share_class || '',
      numberOfShares: sh.number_of_shares || '',
      total: sh.total_shares_text || '',
    });
    sharesByEntity.set(sh.group_entity_id, list);
  }

  const mapEntity = (e: any) => ({
    name: e.entity_name || '',
    subtitle: e.subtitle || '',
    authorizedCapital: e.authorized_capital || '',
    paidUpCapital: e.paid_up_capital || '',
    management: e.management || '',
    borderColor: e.border_color || '',
    shareholders: sharesByEntity.get(e.id) || [],
  });
  const holdingRow = groupEntities.find(e => e.entity_role === 'HOLDING');
  const subsidiaryRows = groupEntities.filter(e => e.entity_role === 'SUBSIDIARY');
  const groupStructure = groupEntities.length
    ? {
        holding: holdingRow
          ? mapEntity(holdingRow)
          : {name: '', authorizedCapital: '', paidUpCapital: '', shareholders: [], management: ''},
        subsidiaries: subsidiaryRows.map(mapEntity),
      }
    : undefined;

  const itemsByGroup = new Map<string, any[]>();
  for (const it of projItems) {
    const list = itemsByGroup.get(it.project_group_id) || [];
    list.push({
      id: it.id,
      projectName: it.project_name || '',
      location: it.location || '',
      scope: it.scope || '',
    });
    itemsByGroup.set(it.project_group_id, list);
  }
  const hydrateProjects = (category: 'CURRENT' | 'HISTORY' | 'INVESTMENT_PLAN') => {
    const out: any[] = [];
    for (const g of projGroups.filter(pg => pg.category === category)) {
      const children = itemsByGroup.get(g.id) || [];
      if (g.group_code === '__FLAT__') {
        out.push(...children);
      } else {
        out.push({id: g.id, headName: g.head_name || '', projects: children});
      }
    }
    return out;
  };

  const exposuresByReview = new Map<string, any[]>();
  const topLenderExposures: any[] = [];
  for (const ex of lenderExposures) {
    const item = {
      lender: ex.lender_name || '',
      plafond: ex.plafond_text || '',
      rate: ex.rate_text || '',
      notes: ex.notes || '',
    };
    if (ex.slik_review_id) {
      const list = exposuresByReview.get(ex.slik_review_id) || [];
      list.push(item);
      exposuresByReview.set(ex.slik_review_id, list);
    } else {
      topLenderExposures.push(item);
    }
  }

  const entitySlikReviews: Record<string, any> = {};
  for (const rv of slikReviews) {
    entitySlikReviews[rv.entity_key] = {
      id: rv.id,
      entityName: rv.entity_name,
      hasRecord: Boolean(rv.has_record),
      noRecordRemarks: rv.no_record_remarks || '',
      pefindoTerms: rv.pefindo_terms || '',
      pefindoNotes: rv.pefindo_notes || '',
      lenderExposures: exposuresByReview.get(rv.id) || [],
    };
  }

  return {
    preAnalysisNo: formRow.pre_analysis_no || '',
    preAnalysisDate: formRow.pre_analysis_date || '',
    customerProjectName: formRow.customer_project_name || '',
    taxId: formRow.tax_id || '',
    fapNumber: formRow.fap_number || '',
    leadSource: formRow.lead_source || '',
    customerArea: formRow.customer_area || '',
    dealerPic: formRow.dealer_pic || '',
    lmiPic: formRow.lmi_pic || '',
    lfiPic: formRow.lfi_pic || '',
    customerPic: formRow.customer_pic || '',
    equity: formRow.equity || '',
    paidUpCapital: formRow.paid_up_capital || '',
    sourceOfRepayment: formRow.source_of_repayment || '',
    holdingGroup: formRow.holding_group || '',
    projectName: formRow.project_name || '',
    projectLocation: formRow.project_location || '',
    hasExistingProjects: Boolean(formRow.has_existing_projects),
    existingProjects: formRow.existing_projects || '',
    newProjects: formRow.new_projects || '',
    currentProjects: hydrateProjects('CURRENT'),
    historyProjects: hydrateProjects('HISTORY'),
    investmentProjectPlans: hydrateProjects('INVESTMENT_PLAN'),
    projectNameLocation: formRow.project_name_location || '',
    customerRole: formRow.customer_role || '',
    otherContractors: formRow.other_contractors || '',
    projectOwner: formRow.project_owner || '',
    bowheerInfo: formRow.bowheer_info || '',
    projectStatus: formRow.project_status || '',
    projectStatusRemarks: formRow.project_status_remarks || '',
    investmentPlan: formRow.investment_plan || '',
    investmentPlanSelected,
    investmentPlanRemarks,
    financingSchemeRequested: formRow.financing_scheme_requested || '',
    ubo: formRow.ubo || '',
    uboInfo: formRow.ubo_info || '',
    showUboInformation: Boolean(formRow.show_ubo_information),
    uboInformation: formRow.ubo_information || '',
    hasGroupStructure: Boolean(formRow.has_group_structure),
    groupStructureImage: formRow.group_structure_image || '',
    ...(groupStructure ? {groupStructure} : {}),
    companyBackground: formRow.company_background || '',
    starGroupMilestonesNarrative: formRow.star_group_milestones_narrative || '',
    businessDevBackground: formRow.business_dev_background || '',
    operationalTeamInfo: formRow.operational_team_info || '',
    milestones: milestones.map(m => ({
      year: m.milestone_year || '',
      milestone: m.milestone_title || '',
      entity: m.entity_name || '',
      description: m.description || '',
    })),
    existingFincoBackup: formRow.existing_finco_backup || '',
    equipmentJobFit: formRow.equipment_job_fit || '',
    utilizationDuration: formRow.utilization_duration || '',
    priorLiugongExperience: formRow.prior_liugong_experience || '',
    serviceAgreementFmc: formRow.service_agreement_fmc || '',
    unitComposition: units.map(u => ({
      kategoriAset: u.asset_category || '',
      brand: u.brand || '',
      type: u.unit_type || '',
      qty: Number(u.quantity || 0),
    })),
    deliveryStatus: formRow.delivery_status || '',
    deliveryDate: formRow.delivery_date || '',
    qaIlinkComment: formRow.qa_ilink_comment || '',
    qaDocumentName: formRow.qa_document_name || '',
    qaDocumentFile: formRow.qa_document_file || '',
    qaConclusion: formRow.qa_conclusion || '',
    dealerCheck: formRow.dealer_check || '',
    topDealerToCustomer: formRow.top_dealer_to_customer || '',
    topLmiToDealer: formRow.top_lmi_to_dealer || '',
    lmiArCheck: formRow.lmi_ar_check || '',
    slikPefindoHighlight: formRow.slik_pefindo_highlight || '',
    applicantPefindoCheck: formRow.applicant_pefindo_check || '',
    pefindoTerms: formRow.pefindo_terms || '',
    pefindoNotes: formRow.pefindo_notes || '',
    lenderExposures: topLenderExposures,
    entitySlikReviews,
    goodProject: Boolean(formRow.good_project),
    goodProjectNote: formRow.good_project_note || '',
    goodCustomer: Boolean(formRow.good_customer),
    goodCustomerNote: formRow.good_customer_note || '',
    recommendation: formRow.recommendation || '',
    briefNote: formRow.brief_note || '',
    suggestions: suggestions.map(s => s.suggestion_text),
    competitionNotes: formRow.competition_notes || '',
    competitionTable: competitors.map(c => ({
      finco: c.finco_name,
      rate: c.rate_text || '',
      purpose: c.purpose_text || '',
    })),
    proposedBy: formRow.proposed_by || '',
    reviewedBy: formRow.reviewed_by || '',
    approvedBy: formRow.approved_by || '',
    signatureDate: formRow.signature_date || '',
    signatories: signatories.map(s => ({
      id: s.id,
      role: s.role_label,
      name: s.signatory_name || '',
      position: s.position_title || '',
      date: s.signature_date || '',
    })),
  };
}

export async function getPreAnalysisData(appId: string, appRecord?: any): Promise<any> {
  const [rows] = await pool.query<any[]>(
    'SELECT * FROM crm_pre_analysis_forms WHERE application_id = ? AND deleted_at IS NULL LIMIT 1',
    [appId],
  );
  if (!rows.length) {
    const existingNumbers = await getAllPreAnalysisNumbers();
    const nextNo = generatePreAnalysisNo(existingNumbers, new Date());
    if (appRecord) {
      return createBlankPreAnalysisData(appId, appRecord, nextNo);
    }
    return {
      ...DEFAULT_PRE_ANALYSIS_DATA,
      preAnalysisNo: nextNo,
    };
  }

  const storedData = await hydratePreAnalysisForm(rows[0]);
  if (appRecord) {
    const companyName = appRecord.customer?.companyName || appRecord.companyName;
    if (companyName && !storedData.customerProjectName) storedData.customerProjectName = companyName;
    const npwp = appRecord.customer?.npwp || appRecord.npwp;
    if (npwp && !storedData.taxId) storedData.taxId = npwp;
    if (appRecord.fapNumber && !storedData.fapNumber) storedData.fapNumber = appRecord.fapNumber;
  }
  return storedData;
}

export async function savePreAnalysisData(appId: string, data: any, actorName = 'System'): Promise<any> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query<any[]>(
      'SELECT id, created_by FROM crm_pre_analysis_forms WHERE application_id = ? AND deleted_at IS NULL LIMIT 1',
      [appId],
    );
    const preId = existing[0]?.id || crypto.randomUUID();
    const actor = String(actorName || 'System').slice(0, 150);

    let leadSourceId: string | null = null;
    if (data.leadSource) {
      const [srcRows] = await conn.query<any[]>(
        'SELECT id FROM crm_master_application_sources WHERE UPPER(code) = UPPER(?) OR UPPER(name) = UPPER(?) LIMIT 1',
        [String(data.leadSource).trim(), String(data.leadSource).trim()],
      );
      leadSourceId = srcRows[0]?.id ?? null;
    }

    const preNo = String(data.preAnalysisNo || '').trim() || generatePreAnalysisNo([], new Date());

    if (existing[0]) {
      await conn.execute(
        `UPDATE crm_pre_analysis_forms SET
          pre_analysis_no = ?, pre_analysis_date = ?, customer_project_name = ?, tax_id = ?, fap_number = ?,
          lead_source_id = ?, lead_source = ?, customer_area = ?, dealer_pic = ?, lmi_pic = ?, lfi_pic = ?, customer_pic = ?,
          equity = ?, paid_up_capital = ?, source_of_repayment = ?, holding_group = ?, project_name = ?, project_location = ?,
          has_existing_projects = ?, existing_projects = ?, new_projects = ?, project_name_location = ?,
          customer_role = ?, other_contractors = ?, project_owner = ?, bowheer_info = ?, project_status = ?, project_status_remarks = ?,
          investment_plan = ?, financing_scheme_requested = ?, ubo = ?, ubo_info = ?, show_ubo_information = ?, ubo_information = ?,
          has_group_structure = ?, group_structure_image = ?, company_background = ?, star_group_milestones_narrative = ?,
          business_dev_background = ?, operational_team_info = ?, existing_finco_backup = ?,
          equipment_job_fit = ?, utilization_duration = ?, prior_liugong_experience = ?, service_agreement_fmc = ?,
          delivery_status = ?, delivery_date = ?, qa_ilink_comment = ?, qa_document_name = ?, qa_document_file = ?, qa_conclusion = ?,
          dealer_check = ?, top_dealer_to_customer = ?, top_lmi_to_dealer = ?, lmi_ar_check = ?,
          slik_pefindo_highlight = ?, applicant_pefindo_check = ?, pefindo_terms = ?, pefindo_notes = ?,
          good_project = ?, good_project_note = ?, good_customer = ?, good_customer_note = ?,
          recommendation = ?, brief_note = ?, competition_notes = ?,
          proposed_by = ?, reviewed_by = ?, approved_by = ?, signature_date = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP(3), updated_by = ?
         WHERE id = ?`,
        [
          preNo.slice(0, 80),
          cleanStr(data.preAnalysisDate, 50),
          cleanStr(data.customerProjectName, 255),
          cleanStr(data.taxId, 50),
          cleanStr(data.fapNumber, 80),
          leadSourceId,
          cleanStr(data.leadSource, 150),
          cleanStr(data.customerArea, 150),
          cleanStr(data.dealerPic, 150),
          cleanStr(data.lmiPic, 150),
          cleanStr(data.lfiPic, 150),
          cleanStr(data.customerPic, 150),
          cleanStr(data.equity, 150),
          cleanStr(data.paidUpCapital, 150),
          cleanStr(data.sourceOfRepayment),
          cleanStr(data.holdingGroup, 255),
          cleanStr(data.projectName, 255),
          cleanStr(data.projectLocation, 255),
          data.hasExistingProjects === false ? 0 : 1,
          cleanStr(data.existingProjects),
          cleanStr(data.newProjects),
          cleanStr(data.projectNameLocation),
          cleanStr(data.customerRole, 255),
          cleanStr(data.otherContractors),
          cleanStr(data.projectOwner, 255),
          cleanStr(data.bowheerInfo),
          cleanStr(data.projectStatus, 150),
          cleanStr(data.projectStatusRemarks),
          cleanStr(data.investmentPlan),
          cleanStr(data.financingSchemeRequested),
          cleanStr(data.ubo, 255),
          cleanStr(data.uboInfo),
          data.showUboInformation ? 1 : 0,
          cleanStr(data.uboInformation),
          data.hasGroupStructure === false ? 0 : 1,
          cleanStr(data.groupStructureImage),
          cleanStr(data.companyBackground),
          cleanStr(data.starGroupMilestonesNarrative),
          cleanStr(data.businessDevBackground),
          cleanStr(data.operationalTeamInfo),
          cleanStr(data.existingFincoBackup),
          cleanStr(data.equipmentJobFit),
          cleanStr(data.utilizationDuration),
          cleanStr(data.priorLiugongExperience),
          cleanStr(data.serviceAgreementFmc),
          cleanStr(data.deliveryStatus, 150),
          cleanStr(data.deliveryDate, 100),
          cleanStr(data.qaIlinkComment),
          cleanStr(data.qaDocumentName, 255),
          cleanStr(data.qaDocumentFile),
          cleanStr(data.qaConclusion),
          cleanStr(data.dealerCheck),
          cleanStr(data.topDealerToCustomer),
          cleanStr(data.topLmiToDealer),
          cleanStr(data.lmiArCheck),
          cleanStr(data.slikPefindoHighlight),
          cleanStr(data.applicantPefindoCheck),
          cleanStr(data.pefindoTerms),
          cleanStr(data.pefindoNotes),
          data.goodProject ? 1 : 0,
          cleanStr(data.goodProjectNote),
          data.goodCustomer ? 1 : 0,
          cleanStr(data.goodCustomerNote),
          cleanStr(data.recommendation),
          cleanStr(data.briefNote),
          cleanStr(data.competitionNotes),
          cleanStr(data.proposedBy, 150),
          cleanStr(data.reviewedBy, 150),
          cleanStr(data.approvedBy, 150),
          cleanStr(data.signatureDate, 100),
          cleanStr(data.status, 50) || 'DRAFT',
          actor,
          preId,
        ],
      );
    } else {
      await conn.execute(
        `INSERT INTO crm_pre_analysis_forms (
          id, application_id, pre_analysis_no, pre_analysis_date, customer_project_name, tax_id, fap_number,
          lead_source_id, lead_source, customer_area, dealer_pic, lmi_pic, lfi_pic, customer_pic,
          equity, paid_up_capital, source_of_repayment, holding_group, project_name, project_location,
          has_existing_projects, existing_projects, new_projects, project_name_location,
          customer_role, other_contractors, project_owner, bowheer_info, project_status, project_status_remarks,
          investment_plan, financing_scheme_requested, ubo, ubo_info, show_ubo_information, ubo_information,
          has_group_structure, group_structure_image, company_background, star_group_milestones_narrative,
          business_dev_background, operational_team_info, existing_finco_backup,
          equipment_job_fit, utilization_duration, prior_liugong_experience, service_agreement_fmc,
          delivery_status, delivery_date, qa_ilink_comment, qa_document_name, qa_document_file, qa_conclusion,
          dealer_check, top_dealer_to_customer, top_lmi_to_dealer, lmi_ar_check,
          slik_pefindo_highlight, applicant_pefindo_check, pefindo_terms, pefindo_notes,
          good_project, good_project_note, good_customer, good_customer_note,
          recommendation, brief_note, competition_notes,
          proposed_by, reviewed_by, approved_by, signature_date, status, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          preId,
          appId,
          preNo.slice(0, 80),
          cleanStr(data.preAnalysisDate, 50),
          cleanStr(data.customerProjectName, 255),
          cleanStr(data.taxId, 50),
          cleanStr(data.fapNumber, 80),
          leadSourceId,
          cleanStr(data.leadSource, 150),
          cleanStr(data.customerArea, 150),
          cleanStr(data.dealerPic, 150),
          cleanStr(data.lmiPic, 150),
          cleanStr(data.lfiPic, 150),
          cleanStr(data.customerPic, 150),
          cleanStr(data.equity, 150),
          cleanStr(data.paidUpCapital, 150),
          cleanStr(data.sourceOfRepayment),
          cleanStr(data.holdingGroup, 255),
          cleanStr(data.projectName, 255),
          cleanStr(data.projectLocation, 255),
          data.hasExistingProjects === false ? 0 : 1,
          cleanStr(data.existingProjects),
          cleanStr(data.newProjects),
          cleanStr(data.projectNameLocation),
          cleanStr(data.customerRole, 255),
          cleanStr(data.otherContractors),
          cleanStr(data.projectOwner, 255),
          cleanStr(data.bowheerInfo),
          cleanStr(data.projectStatus, 150),
          cleanStr(data.projectStatusRemarks),
          cleanStr(data.investmentPlan),
          cleanStr(data.financingSchemeRequested),
          cleanStr(data.ubo, 255),
          cleanStr(data.uboInfo),
          data.showUboInformation ? 1 : 0,
          cleanStr(data.uboInformation),
          data.hasGroupStructure === false ? 0 : 1,
          cleanStr(data.groupStructureImage),
          cleanStr(data.companyBackground),
          cleanStr(data.starGroupMilestonesNarrative),
          cleanStr(data.businessDevBackground),
          cleanStr(data.operationalTeamInfo),
          cleanStr(data.existingFincoBackup),
          cleanStr(data.equipmentJobFit),
          cleanStr(data.utilizationDuration),
          cleanStr(data.priorLiugongExperience),
          cleanStr(data.serviceAgreementFmc),
          cleanStr(data.deliveryStatus, 150),
          cleanStr(data.deliveryDate, 100),
          cleanStr(data.qaIlinkComment),
          cleanStr(data.qaDocumentName, 255),
          cleanStr(data.qaDocumentFile),
          cleanStr(data.qaConclusion),
          cleanStr(data.dealerCheck),
          cleanStr(data.topDealerToCustomer),
          cleanStr(data.topLmiToDealer),
          cleanStr(data.lmiArCheck),
          cleanStr(data.slikPefindoHighlight),
          cleanStr(data.applicantPefindoCheck),
          cleanStr(data.pefindoTerms),
          cleanStr(data.pefindoNotes),
          data.goodProject ? 1 : 0,
          cleanStr(data.goodProjectNote),
          data.goodCustomer ? 1 : 0,
          cleanStr(data.goodCustomerNote),
          cleanStr(data.recommendation),
          cleanStr(data.briefNote),
          cleanStr(data.competitionNotes),
          cleanStr(data.proposedBy, 150),
          cleanStr(data.reviewedBy, 150),
          cleanStr(data.approvedBy, 150),
          cleanStr(data.signatureDate, 100),
          cleanStr(data.status, 50) || 'DRAFT',
          actor,
          actor,
        ],
      );
    }

    // Clear child rows safely before re-inserting normalized snapshot
    await conn.execute(
      'DELETE sh FROM crm_pre_analysis_group_shareholders sh JOIN crm_pre_analysis_group_entities ge ON ge.id = sh.group_entity_id WHERE ge.pre_analysis_id = ?',
      [preId],
    );
    await conn.execute('DELETE FROM crm_pre_analysis_group_entities WHERE pre_analysis_id = ?', [preId]);
    await conn.execute(
      'DELETE pi FROM crm_pre_analysis_project_items pi JOIN crm_pre_analysis_project_groups pg ON pg.id = pi.project_group_id WHERE pg.pre_analysis_id = ?',
      [preId],
    );
    await conn.execute('DELETE FROM crm_pre_analysis_project_groups WHERE pre_analysis_id = ?', [preId]);
    await conn.execute('DELETE FROM crm_pre_analysis_lender_exposures WHERE pre_analysis_id = ?', [preId]);
    await conn.execute('DELETE FROM crm_pre_analysis_slik_reviews WHERE pre_analysis_id = ?', [preId]);
    await conn.execute('DELETE FROM crm_pre_analysis_investment_plans WHERE pre_analysis_id = ?', [preId]);
    await conn.execute('DELETE FROM crm_pre_analysis_milestones WHERE pre_analysis_id = ?', [preId]);
    await conn.execute('DELETE FROM crm_pre_analysis_unit_compositions WHERE pre_analysis_id = ?', [preId]);
    await conn.execute('DELETE FROM crm_pre_analysis_competitors WHERE pre_analysis_id = ?', [preId]);
    await conn.execute('DELETE FROM crm_pre_analysis_suggestions WHERE pre_analysis_id = ?', [preId]);
    await conn.execute('DELETE FROM crm_pre_analysis_signatories WHERE pre_analysis_id = ?', [preId]);

    // 1. Investment plans
    const selectedSet = new Set<string>(Array.isArray(data.investmentPlanSelected) ? data.investmentPlanSelected : []);
    const remarksObj: Record<string, string> =
      data.investmentPlanRemarks && typeof data.investmentPlanRemarks === 'object' ? data.investmentPlanRemarks : {};
    const allOptionCodes = [...new Set([...selectedSet, ...Object.keys(remarksObj)])];
    const [invOptRows] = await conn.query<any[]>('SELECT id, code FROM crm_master_preanalysis_investment_options');
    const invOptByCode = new Map(invOptRows.map(r => [String(r.code).toUpperCase(), r.id]));
    for (let i = 0; i < allOptionCodes.length; i++) {
      const code = String(allOptionCodes[i]);
      await conn.execute(
        `INSERT INTO crm_pre_analysis_investment_plans
          (id, pre_analysis_id, investment_option_id, option_code, is_selected, remarks, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          preId,
          invOptByCode.get(code.toUpperCase()) ?? null,
          code.slice(0, 80),
          selectedSet.has(code) ? 1 : 0,
          cleanStr(remarksObj[code]),
          i + 1,
        ],
      );
    }

    // 2. Group structure
    const insertEntity = async (role: 'HOLDING' | 'SUBSIDIARY', entity: any, order: number) => {
      if (!entity) return;
      const entId = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO crm_pre_analysis_group_entities
          (id, pre_analysis_id, entity_role, entity_name, subtitle, authorized_capital, paid_up_capital, management, border_color, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          entId,
          preId,
          role,
          String(entity.name || '').slice(0, 255),
          cleanStr(entity.subtitle, 255),
          cleanStr(entity.authorizedCapital, 150),
          cleanStr(entity.paidUpCapital, 150),
          cleanStr(entity.management),
          cleanStr(entity.borderColor, 30),
          order,
        ],
      );
      const shares = Array.isArray(entity.shareholders) ? entity.shareholders : [];
      for (let j = 0; j < shares.length; j++) {
        const sh = shares[j] || {};
        await conn.execute(
          `INSERT INTO crm_pre_analysis_group_shareholders
            (id, group_entity_id, shareholder_name, percentage_text, role_title, position_title, share_class, number_of_shares, total_shares_text, sort_order)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            crypto.randomUUID(),
            entId,
            String(sh.name || '').slice(0, 255),
            cleanStr(sh.percentage, 50),
            cleanStr(sh.role, 150),
            cleanStr(sh.position, 150),
            cleanStr(sh.shareClass, 100),
            cleanStr(sh.numberOfShares, 100),
            cleanStr(sh.total, 150),
            j + 1,
          ],
        );
      }
    };
    if (data.groupStructure) {
      let entOrder = 1;
      if (data.groupStructure.holding) await insertEntity('HOLDING', data.groupStructure.holding, entOrder++);
      for (const sub of Array.isArray(data.groupStructure.subsidiaries) ? data.groupStructure.subsidiaries : []) {
        await insertEntity('SUBSIDIARY', sub, entOrder++);
      }
    }

    // 3. Milestones
    for (let i = 0; i < (Array.isArray(data.milestones) ? data.milestones.length : 0); i++) {
      const m = data.milestones[i] || {};
      await conn.execute(
        `INSERT INTO crm_pre_analysis_milestones
          (id, pre_analysis_id, milestone_year, milestone_title, entity_name, description, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          preId,
          cleanStr(m.year, 50),
          cleanStr(m.milestone, 255),
          cleanStr(m.entity, 255),
          cleanStr(m.description),
          i + 1,
        ],
      );
    }

    // 4. Structured project groups & items
    const insertProjects = async (category: 'CURRENT' | 'HISTORY' | 'INVESTMENT_PLAN', entries: any[]) => {
      if (!Array.isArray(entries) || !entries.length) return;
      let gOrder = 1;
      let flatItems: any[] = [];
      const flushFlat = async () => {
        if (!flatItems.length) return;
        const gId = crypto.randomUUID();
        await conn.execute(
          `INSERT INTO crm_pre_analysis_project_groups
            (id, pre_analysis_id, category, group_code, head_name, sort_order)
           VALUES (?,?,?,?,?,?)`,
          [gId, preId, category, '__FLAT__', '', gOrder++],
        );
        for (let k = 0; k < flatItems.length; k++) {
          const it = flatItems[k] || {};
          await conn.execute(
            `INSERT INTO crm_pre_analysis_project_items
              (id, project_group_id, project_name, location, scope, sort_order)
             VALUES (?,?,?,?,?,?)`,
            [crypto.randomUUID(), gId, cleanStr(it.projectName, 255), cleanStr(it.location, 255), cleanStr(it.scope), k + 1],
          );
        }
        flatItems = [];
      };
      for (const entry of entries) {
        if (entry && Array.isArray(entry.projects)) {
          await flushFlat();
          const gId = crypto.randomUUID();
          await conn.execute(
            `INSERT INTO crm_pre_analysis_project_groups
              (id, pre_analysis_id, category, group_code, head_name, sort_order)
             VALUES (?,?,?,?,?,?)`,
            [gId, preId, category, 'GROUP', String(entry.headName || '').slice(0, 255), gOrder++],
          );
          for (let k = 0; k < entry.projects.length; k++) {
            const it = entry.projects[k] || {};
            await conn.execute(
              `INSERT INTO crm_pre_analysis_project_items
                (id, project_group_id, project_name, location, scope, sort_order)
               VALUES (?,?,?,?,?,?)`,
              [crypto.randomUUID(), gId, cleanStr(it.projectName, 255), cleanStr(it.location, 255), cleanStr(it.scope), k + 1],
            );
          }
        } else if (entry) {
          flatItems.push(entry);
        }
      }
      await flushFlat();
    };
    await insertProjects('CURRENT', data.currentProjects);
    await insertProjects('HISTORY', data.historyProjects);
    await insertProjects('INVESTMENT_PLAN', data.investmentProjectPlans);

    // 5. Unit composition
    for (let i = 0; i < (Array.isArray(data.unitComposition) ? data.unitComposition.length : 0); i++) {
      const u = data.unitComposition[i] || {};
      await conn.execute(
        `INSERT INTO crm_pre_analysis_unit_compositions
          (id, pre_analysis_id, asset_category, brand, unit_type, quantity, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          preId,
          cleanStr(u.kategoriAset, 100),
          cleanStr(u.brand, 150),
          cleanStr(u.type, 150),
          toNum(u.qty, 0),
          i + 1,
        ],
      );
    }

    // 6. Competitors
    for (let i = 0; i < (Array.isArray(data.competitionTable) ? data.competitionTable.length : 0); i++) {
      const c = data.competitionTable[i] || {};
      await conn.execute(
        `INSERT INTO crm_pre_analysis_competitors
          (id, pre_analysis_id, finco_name, rate_text, purpose_text, sort_order)
         VALUES (?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          preId,
          String(c.finco || '-').slice(0, 255),
          cleanStr(c.rate, 100),
          cleanStr(c.purpose, 255),
          i + 1,
        ],
      );
    }

    // 7. SLIK reviews + nested & top-level lender exposures
    for (let i = 0; i < (Array.isArray(data.lenderExposures) ? data.lenderExposures.length : 0); i++) {
      const ex = data.lenderExposures[i] || {};
      await conn.execute(
        `INSERT INTO crm_pre_analysis_lender_exposures
          (id, pre_analysis_id, slik_review_id, lender_name, plafond_text, rate_text, notes, sort_order)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          preId,
          null,
          String(ex.lender || '-').slice(0, 255),
          cleanStr(ex.plafond, 100),
          cleanStr(ex.rate, 50),
          cleanStr(ex.notes),
          i + 1,
        ],
      );
    }
    const entityMap =
      data.entitySlikReviews && typeof data.entitySlikReviews === 'object' ? Object.entries(data.entitySlikReviews) : [];
    for (let i = 0; i < entityMap.length; i++) {
      const [key, rv]: [string, any] = entityMap[i];
      if (!rv) continue;
      const reviewId = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO crm_pre_analysis_slik_reviews
          (id, pre_analysis_id, entity_key, entity_name, has_record, no_record_remarks, pefindo_terms, pefindo_notes, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          reviewId,
          preId,
          String(key).slice(0, 191),
          String(rv.entityName || key).slice(0, 255),
          rv.hasRecord ? 1 : 0,
          cleanStr(rv.noRecordRemarks),
          cleanStr(rv.pefindoTerms),
          cleanStr(rv.pefindoNotes),
          i + 1,
        ],
      );
      const exps = Array.isArray(rv.lenderExposures) ? rv.lenderExposures : [];
      for (let j = 0; j < exps.length; j++) {
        const ex = exps[j] || {};
        await conn.execute(
          `INSERT INTO crm_pre_analysis_lender_exposures
            (id, pre_analysis_id, slik_review_id, lender_name, plafond_text, rate_text, notes, sort_order)
           VALUES (?,?,?,?,?,?,?,?)`,
          [
            crypto.randomUUID(),
            preId,
            reviewId,
            String(ex.lender || '-').slice(0, 255),
            cleanStr(ex.plafond, 100),
            cleanStr(ex.rate, 50),
            cleanStr(ex.notes),
            j + 1,
          ],
        );
      }
    }

    // 8. Suggestions
    for (let i = 0; i < (Array.isArray(data.suggestions) ? data.suggestions.length : 0); i++) {
      const text = data.suggestions[i];
      if (text === undefined || text === null) continue;
      await conn.execute(
        `INSERT INTO crm_pre_analysis_suggestions (id, pre_analysis_id, suggestion_text, sort_order)
         VALUES (?,?,?,?)`,
        [crypto.randomUUID(), preId, String(text), i + 1],
      );
    }

    // 9. Signatories
    for (let i = 0; i < (Array.isArray(data.signatories) ? data.signatories.length : 0); i++) {
      const s = data.signatories[i] || {};
      await conn.execute(
        `INSERT INTO crm_pre_analysis_signatories
          (id, pre_analysis_id, role_label, signatory_name, position_title, signature_date, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          preId,
          String(s.role || 'Prepared by').slice(0, 100),
          cleanStr(s.name, 150),
          cleanStr(s.position, 150),
          cleanStr(s.date, 100),
          i + 1,
        ],
      );
    }

    await conn.commit();
    return data;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}
