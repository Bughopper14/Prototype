/** Business (projects, bank facilities, financing proposal, terms, units, doc/purpose checks) on crm_liugong1. */
import {randomUUID} from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {
  cleanNullableString,
  enumOrNull,
  loadMasterRows,
  normalizeCode,
  resolveEquipmentIds,
  resolveMasterId,
} from '../../core/db/crm-lookups';
import {pool} from '../../core/db/pool';
import {cleanDecimal, cleanInt, cleanNullableInt} from './intake/helpers';

type Db = Pick<PoolConnection, 'query' | 'execute'>;

const CODE_TO_CAMEL_DOC: Record<string, string> = {
  COMPANY_PROFILE: 'companyProfile',
  LEGALITY: 'legality',
  DEED_ESTABLISHMENT: 'deedEstablishment',
  DECREE_MINISTRY_OF_LAW: 'decreeMinistryOfLaw',
  COPY_ID_BOD_SHAREHOLDER: 'copyIdBodShareholder',
  AUDITED_FINANCIAL_STATEMENTS: 'auditedFinancialStatements',
  BANK_STATEMENTS: 'bankStatements',
  BANK_FINANCING_FACILITY: 'bankFinancingFacility',
  PRODUCTION_REPORT: 'productionReport',
  LIST_OF_FIXED_ASSETS: 'listOfFixedAssets',
  PROJECT_CONTRACTS: 'projectContracts',
};

const TERM_CARDS: Array<{propKey: string; methodCode: string}> = [
  {propKey: 'termsFinancialLease', methodCode: 'FINANCIAL_LEASE'},
  {propKey: 'termsSaleAndLeaseBack', methodCode: 'SALE_AND_LEASE_BACK'},
  {propKey: 'termsInstallmentFinancing', methodCode: 'INSTALLMENT_FINANCING'},
];

export async function initializeBusiness() {
  await pool.query('SELECT 1 FROM crm_fap_financing_proposals LIMIT 1');
}

export async function readBusiness(id: string, db: Db = pool) {
  const [projectsRows] = await db.query<any[]>(
    `SELECT pc.*, pr.code AS project_role_code, pr.name AS project_role_name
     FROM crm_fap_project_contracts pc
     LEFT JOIN crm_master_project_roles pr ON pr.id = pc.project_role_id
     WHERE pc.application_id = ? AND pc.deleted_at IS NULL
     ORDER BY pc.row_position ASC, pc.created_at ASC`,
    [id],
  );
  const projects = projectsRows.map(r => ({
    id: r.id,
    projectOwner: r.project_owner || '',
    projectLocation: r.project_location || '',
    projectRole: r.project_role_code || r.project_role_name || '',
    contractStatus: r.contract_status || '',
  }));

  const [bankRows] = await db.query<any[]>(
    `SELECT bf.*, fi.code AS fi_code, fi.name AS fi_name, cur.code AS cur_code, cur.name AS cur_name
     FROM crm_fap_bank_facilities bf
     LEFT JOIN crm_master_financial_institutions fi ON fi.id = bf.financial_institution_id
     LEFT JOIN crm_master_currencies cur ON cur.id = bf.currency_id
     WHERE bf.application_id = ? AND bf.deleted_at IS NULL
     ORDER BY bf.row_position ASC, bf.created_at ASC`,
    [id],
  );
  const bankReferences = bankRows.map(r => ({
    id: r.id,
    bankOrFinInstitution: r.fi_code || r.fi_name || '',
    currency: r.cur_code || r.cur_name || 'IDR',
    creditFacility: r.credit_facility !== null ? Number(r.credit_facility) : '',
    monthlyInstallment: r.monthly_installment !== null ? Number(r.monthly_installment) : '',
    yearStarted: r.year_started ?? '',
    interestRate: r.interest_rate !== null ? Number(r.interest_rate) : '',
    paymentRecord: r.payment_record || '',
    facilityStatus: r.facility_status || '',
    comments: r.comments || '',
  }));

  const [propRows] = await db.query<any[]>(
    `SELECT fp.*,
            pur.code AS purpose_code, pur.name AS purpose_name,
            fm.code AS method_code, fm.name AS method_name,
            cur.code AS cur_code, cur.name AS cur_name,
            pt.code AS timing_code, pt.name AS timing_name,
            src.code AS source_code, src.name AS source_name
     FROM crm_fap_financing_proposals fp
     LEFT JOIN crm_master_facility_purposes pur ON pur.id = fp.facility_purpose_id
     LEFT JOIN crm_master_financing_methods fm ON fm.id = fp.financing_method_id
     LEFT JOIN crm_master_currencies cur ON cur.id = fp.currency_id
     LEFT JOIN crm_master_payment_timings pt ON pt.id = fp.payment_timing_id
     LEFT JOIN crm_master_application_sources src ON src.id = fp.application_source_id
     WHERE fp.application_id = ? AND fp.deleted_at IS NULL AND fp.is_active = 1
     LIMIT 1`,
    [id],
  );
  const propRow = propRows[0] || null;

  const [termRows] = propRow
    ? await db.query<any[]>(
        `SELECT t.*, fm.code AS method_code, pur.code AS purpose_code, cur.code AS cur_code, pt.code AS timing_code, pt.name AS timing_name
         FROM crm_fap_proposal_terms t
         JOIN crm_master_financing_methods fm ON fm.id = t.financing_method_id
         LEFT JOIN crm_master_facility_purposes pur ON pur.id = t.facility_purpose_id
         LEFT JOIN crm_master_currencies cur ON cur.id = t.currency_id
         LEFT JOIN crm_master_payment_timings pt ON pt.id = t.payment_timing_id
         WHERE t.proposal_id = ?`,
        [propRow.id],
      )
    : [[]];

  const [unitRows] = await db.query<any[]>(
    `SELECT u.*,
            uc.code AS cat_code, uc.name AS cat_name,
            eb.name AS brand_name, eb.code AS brand_code,
            et.name AS type_name, et.code AS type_code,
            em.name AS model_name, em.code AS model_code,
            ea.name AS asset_name, ea.code AS asset_code
     FROM crm_fap_equipment_units u
     LEFT JOIN crm_master_equipment_categories uc ON uc.id = u.unit_category_id
     LEFT JOIN crm_master_equipment_brands eb ON eb.id = u.brand_id
     LEFT JOIN crm_master_equipment_types et ON et.id = u.unit_type_id
     LEFT JOIN crm_master_equipment_models em ON em.id = u.model_id
     LEFT JOIN crm_master_equipment_assets ea ON ea.id = u.asset_id
     WHERE u.application_id = ? AND u.deleted_at IS NULL
     ORDER BY u.row_position ASC, u.created_at ASC`,
    [id],
  );
  const units = unitRows.map(u => ({
    id: u.id,
    unitCategory: u.cat_code || u.cat_name || '',
    brand: u.brand_name || u.brand_code || '',
    unitType: u.type_name || u.type_code || '',
    modelName: u.model_name || u.model_code || '',
    assetName: u.asset_name || u.asset_code || '',
    classTon: u.class_ton !== null ? Number(u.class_ton) : '',
    quantity: u.quantity ?? 1,
    unitYear: u.unit_year ?? '',
    specifications: u.specifications || '',
  }));

  const [docReqRows] = await db.query<any[]>(
    `SELECT r.is_checked, m.code
     FROM crm_fap_doc_requirements r
     JOIN crm_master_fap_document_requirements m ON m.id = r.doc_requirement_id
     WHERE r.application_id = ?`,
    [id],
  );
  const documentRequirements: Record<string, boolean> = {};
  for (const r of docReqRows) {
    const key = CODE_TO_CAMEL_DOC[r.code];
    if (key) documentRequirements[key] = Boolean(r.is_checked);
  }

  const [purposeRows] = await db.query<any[]>(
    `SELECT p.is_selected, m.code
     FROM crm_fap_financing_purposes p
     JOIN crm_master_financing_purpose_options m ON m.id = p.purpose_option_id
     WHERE p.application_id = ? AND p.is_selected = 1
     ORDER BY m.sort_order ASC`,
    [id],
  );
  const selectedPurposes = purposeRows.map(r => r.code).filter(Boolean);
  const financingPurposeDetail =
    selectedPurposes.length > 0 ? selectedPurposes.join(',') : propRow?.purpose_detail || '';

  const proposal = propRow
    ? {
        id: propRow.id,
        facilityPurpose: propRow.purpose_code || propRow.purpose_name || '',
        financingMethod: propRow.method_code || propRow.method_name || 'FINANCIAL_LEASE',
        currency: propRow.cur_code || propRow.cur_name || 'IDR',
        financingValue: propRow.financing_value !== null ? Number(propRow.financing_value) : '',
        financingValueDisplay: propRow.financing_value_display || '',
        downPaymentValue: propRow.down_payment_value !== null ? Number(propRow.down_payment_value) : '',
        securityDeposit: propRow.security_deposit !== null ? Number(propRow.security_deposit) : '',
        interestRate: propRow.interest_rate !== null ? Number(propRow.interest_rate) : '',
        tenorMonths: propRow.tenor_months ?? '',
        paymentMethod: propRow.timing_name || propRow.timing_code || 'In Arrear',
        estimatedMonthlyInstallment:
          propRow.estimated_monthly_installment !== null
            ? Number(propRow.estimated_monthly_installment)
            : null,
        applicationSource: propRow.source_code || propRow.source_name || '',
        termsNotes: propRow.proposal_notes || '',
        units,
        documentRequirements,
      }
    : {
        facilityPurpose: '',
        financingMethod: 'FINANCIAL_LEASE',
        currency: 'IDR',
        financingValue: '',
        downPaymentValue: '',
        securityDeposit: '',
        interestRate: '',
        tenorMonths: '',
        paymentMethod: 'In Arrear',
        applicationSource: '',
        termsNotes: '',
        units,
        documentRequirements,
      };

  const termToForm = (t: any) => ({
    workingCapitalInvestment: t.purpose_text || t.purpose_code || '',
    currency: t.currency_text || t.cur_code || 'IDR',
    securityDeposit:
      t.security_deposit_text ||
      (t.security_deposit_amount !== null && t.security_deposit_amount !== undefined
        ? String(Number(t.security_deposit_amount))
        : ''),
    downPayment:
      t.down_payment_text ||
      (t.down_payment_amount !== null && t.down_payment_amount !== undefined
        ? String(Number(t.down_payment_amount))
        : ''),
    interestRate:
      t.interest_rate_text ||
      (t.interest_rate_pct !== null && t.interest_rate_pct !== undefined
        ? String(Number(t.interest_rate_pct))
        : ''),
    tenor: t.tenor_text || (t.tenor_months !== null && t.tenor_months !== undefined ? String(t.tenor_months) : ''),
    paymentMethod: t.payment_method_text || t.timing_name || t.timing_code || '',
  });

  const termByMethod = new Map<string, any>();
  for (const t of termRows as any[]) termByMethod.set(t.method_code, termToForm(t));

  const fallbackTerm = {
    workingCapitalInvestment: proposal.facilityPurpose || '',
    currency: proposal.currency || 'IDR',
    securityDeposit: proposal.securityDeposit !== '' ? String(proposal.securityDeposit) : '',
    downPayment: proposal.downPaymentValue !== '' ? String(proposal.downPaymentValue) : '',
    interestRate: proposal.interestRate !== '' ? String(proposal.interestRate) : '',
    tenor: proposal.tenorMonths !== '' ? String(proposal.tenorMonths) : '',
    paymentMethod: proposal.paymentMethod || '',
  };

  const financingProposal = {
    facilityProposed: {
      financingMethod: proposal.financingMethod || '',
      currencyChoice: proposal.currency || 'IDR',
      financingValue: propRow?.financing_value_display || (proposal.financingValue !== '' ? String(proposal.financingValue) : ''),
      applicationSource: proposal.applicationSource || '',
    },
    realizationPlan: {
      lgHe: propRow ? String(propRow.realization_liugong_he ?? '') : '',
      lgTruck: propRow ? String(propRow.realization_liugong_truck ?? '') : '',
      nlgHe: propRow ? String(propRow.realization_non_liugong_he ?? '') : '',
      nlgTruck: propRow ? String(propRow.realization_non_liugong_truck ?? '') : '',
    },
    termsFinancialLease:
      termByMethod.get('FINANCIAL_LEASE') ||
      (proposal.financingMethod === 'FINANCIAL_LEASE' ? fallbackTerm : undefined),
    termsSaleAndLeaseBack:
      termByMethod.get('SALE_AND_LEASE_BACK') ||
      (proposal.financingMethod === 'SALE_AND_LEASE_BACK' ? fallbackTerm : undefined),
    termsInstallmentFinancing:
      termByMethod.get('INSTALLMENT_FINANCING') ||
      (proposal.financingMethod === 'INSTALLMENT_FINANCING' ? fallbackTerm : undefined),
    documentRequirements,
    notes: proposal.termsNotes || '',
  };

  return {
    projects,
    bankReferences,
    proposal,
    financingProposal,
    financingProposalJson: JSON.stringify(financingProposal),
    financingPurposeDetail,
    documentRequirements,
    purposes: selectedPurposes,
  };
}

export async function saveBusiness(id: string, body: any, conn?: Db, actorName = 'System') {
  const db: Db = conn || pool;

  // 1. Project contracts
  if (Array.isArray(body?.projects)) {
    await db.execute(
      'UPDATE crm_fap_project_contracts SET deleted_at = CURRENT_TIMESTAMP(3), updated_by = ? WHERE application_id = ? AND deleted_at IS NULL',
      [actorName, id],
    );
    let pos = 1;
    for (const p of body.projects) {
      if (!p) continue;
      const hasAny = [p.projectOwner, p.projectLocation, p.projectRole, p.contractStatus].some(
        v => v !== undefined && v !== null && String(v).trim() !== '',
      );
      if (!hasAny) continue;
      const roleId = await resolveMasterId('crm_master_project_roles', p.projectRole, undefined, db as any);
      await db.execute(
        `INSERT INTO crm_fap_project_contracts
          (id, application_id, row_position, project_owner, project_location, project_role_id, contract_status, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          randomUUID(),
          id,
          pos++,
          cleanNullableString(p.projectOwner),
          cleanNullableString(p.projectLocation),
          roleId,
          enumOrNull(p.contractStatus, ['EXISTING', 'NEW']),
          actorName,
          actorName,
        ],
      );
    }
  }

  // 2. Bank facilities + reference comments
  if (Array.isArray(body?.bankReferences)) {
    await db.execute(
      'UPDATE crm_fap_bank_facilities SET deleted_at = CURRENT_TIMESTAMP(3), updated_by = ? WHERE application_id = ? AND deleted_at IS NULL',
      [actorName, id],
    );
    let pos = 1;
    for (const b of body.bankReferences) {
      if (!b) continue;
      const hasAny = [
        b.bankOrFinInstitution,
        b.creditFacility,
        b.monthlyInstallment,
        b.yearStarted,
        b.interestRate,
        b.paymentRecord,
        b.facilityStatus,
        b.comments,
      ].some(v => v !== undefined && v !== null && String(v).trim() !== '');
      if (!hasAny) continue;
      const [fiId, curId] = await Promise.all([
        resolveMasterId('crm_master_financial_institutions', b.bankOrFinInstitution, undefined, db as any),
        resolveMasterId('crm_master_currencies', b.currency || 'IDR', undefined, db as any),
      ]);
      await db.execute(
        `INSERT INTO crm_fap_bank_facilities
          (id, application_id, row_position, financial_institution_id, currency_id, credit_facility, monthly_installment,
           year_started, interest_rate, payment_record, facility_status, comments, created_by, updated_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          randomUUID(),
          id,
          pos++,
          fiId,
          curId,
          cleanDecimal(b.creditFacility),
          cleanDecimal(b.monthlyInstallment),
          cleanNullableInt(b.yearStarted),
          cleanDecimal(b.interestRate),
          cleanNullableString(b.paymentRecord)?.slice(0, 150) ?? null,
          enumOrNull(b.facilityStatus, ['ACTIVE', 'SETTLED']),
          cleanNullableString(b.comments),
          actorName,
          actorName,
        ],
      );
    }
  }

  const refComments =
    body?.profile?.referenceComments ??
    body?.referenceComments ??
    body?.bankReferences?.[0]?.comments;
  if (refComments !== undefined) {
    await db.execute(
      'UPDATE crm_fap_application_profiles SET reference_comments = ?, updated_at = CURRENT_TIMESTAMP(3), updated_by = ? WHERE application_id = ?',
      [cleanNullableString(refComments), actorName, id],
    );
  }

  // 3. Financing proposal, terms, units
  let fpJson: any = body?.financingProposal ?? body?.profile?.financingProposal;
  if (!fpJson && typeof body?.profile?.financingProposalJson === 'string') {
    try {
      fpJson = JSON.parse(body.profile.financingProposalJson);
    } catch {
      fpJson = undefined;
    }
  }

  const prop = body?.proposal;
  const purposeDetailRaw =
    body?.financingPurposeDetail ??
    body?.profile?.financingPurposeDetail ??
    prop?.facilityPurpose;

  const hasProposalSave = Boolean(prop || fpJson || body?.profile?.assetSummaryHeLiuGong !== undefined);
  let proposalId: string | null = null;

  if (hasProposalSave || purposeDetailRaw !== undefined) {
    const [existingPropRows] = await db.query<any[]>(
      'SELECT * FROM crm_fap_financing_proposals WHERE application_id = ? AND deleted_at IS NULL AND is_active = 1 LIMIT 1',
      [id],
    );
    const existingProp = existingPropRows[0] || null;
    proposalId = existingProp?.id ?? null;

    const srcCodeRaw =
      fpJson?.facilityProposed?.applicationSource || prop?.applicationSource;
    const normalizedSrc =
      normalizeCode(srcCodeRaw) === 'DIRECT_SALES' ? 'DIRECT' : srcCodeRaw;

    const [purposeId, methodId, currencyId, timingId, sourceId] = await Promise.all([
      resolveMasterId(
        'crm_master_facility_purposes',
        prop?.facilityPurpose || fpJson?.termsFinancialLease?.workingCapitalInvestment,
        undefined,
        db as any,
      ),
      resolveMasterId(
        'crm_master_financing_methods',
        fpJson?.facilityProposed?.financingMethod || prop?.financingMethod || 'FINANCIAL_LEASE',
        undefined,
        db as any,
      ),
      resolveMasterId(
        'crm_master_currencies',
        fpJson?.facilityProposed?.currencyChoice || prop?.currency || 'IDR',
        undefined,
        db as any,
      ),
      resolveMasterId(
        'crm_master_payment_timings',
        prop?.paymentMethod || fpJson?.termsFinancialLease?.paymentMethod || 'In Arrear',
        undefined,
        db as any,
      ),
      resolveMasterId('crm_master_application_sources', normalizedSrc, undefined, db as any),
    ]);

    const real = fpJson?.realizationPlan || {};
    const finValDisplay = cleanNullableString(
      fpJson?.facilityProposed?.financingValue ?? prop?.financingValueDisplay ?? prop?.financingValue,
    );
    const vals = {
      facility_purpose_id: purposeId ?? existingProp?.facility_purpose_id ?? null,
      purpose_detail:
        purposeDetailRaw !== undefined
          ? cleanNullableString(purposeDetailRaw)?.slice(0, 255) ?? null
          : existingProp?.purpose_detail ?? null,
      financing_method_id: methodId ?? existingProp?.financing_method_id ?? null,
      currency_id: currencyId ?? existingProp?.currency_id ?? null,
      financing_value: cleanDecimal(prop?.financingValue ?? fpJson?.facilityProposed?.financingValue) ?? existingProp?.financing_value ?? null,
      financing_value_display: finValDisplay?.slice(0, 100) ?? existingProp?.financing_value_display ?? null,
      down_payment_value: cleanDecimal(prop?.downPaymentValue) ?? existingProp?.down_payment_value ?? null,
      security_deposit: cleanDecimal(prop?.securityDeposit) ?? existingProp?.security_deposit ?? null,
      interest_rate: cleanDecimal(prop?.interestRate) ?? existingProp?.interest_rate ?? null,
      tenor_months: cleanNullableInt(prop?.tenorMonths) ?? existingProp?.tenor_months ?? null,
      payment_timing_id: timingId ?? existingProp?.payment_timing_id ?? null,
      estimated_monthly_installment:
        cleanDecimal(prop?.estimatedMonthlyInstallment) ?? existingProp?.estimated_monthly_installment ?? null,
      application_source_id: sourceId ?? existingProp?.application_source_id ?? null,
      realization_liugong_he: cleanInt(real.lgHe, existingProp?.realization_liugong_he ?? 0),
      realization_liugong_truck: cleanInt(real.lgTruck, existingProp?.realization_liugong_truck ?? 0),
      realization_non_liugong_he: cleanInt(real.nlgHe, existingProp?.realization_non_liugong_he ?? 0),
      realization_non_liugong_truck: cleanInt(real.nlgTruck, existingProp?.realization_non_liugong_truck ?? 0),
      proposal_notes:
        fpJson?.notes !== undefined || prop?.termsNotes !== undefined
          ? cleanNullableString(fpJson?.notes ?? prop?.termsNotes)
          : existingProp?.proposal_notes ?? null,
    };

    if (existingProp) {
      await db.execute(
        `UPDATE crm_fap_financing_proposals SET
          facility_purpose_id=?, purpose_detail=?, financing_method_id=?, currency_id=?,
          financing_value=?, financing_value_display=?, down_payment_value=?, security_deposit=?,
          interest_rate=?, tenor_months=?, payment_timing_id=?, estimated_monthly_installment=?,
          application_source_id=?, realization_liugong_he=?, realization_liugong_truck=?,
          realization_non_liugong_he=?, realization_non_liugong_truck=?, proposal_notes=?,
          updated_at=CURRENT_TIMESTAMP(3), updated_by=?
        WHERE id=?`,
        [
          vals.facility_purpose_id,
          vals.purpose_detail,
          vals.financing_method_id,
          vals.currency_id,
          vals.financing_value,
          vals.financing_value_display,
          vals.down_payment_value,
          vals.security_deposit,
          vals.interest_rate,
          vals.tenor_months,
          vals.payment_timing_id,
          vals.estimated_monthly_installment,
          vals.application_source_id,
          vals.realization_liugong_he,
          vals.realization_liugong_truck,
          vals.realization_non_liugong_he,
          vals.realization_non_liugong_truck,
          vals.proposal_notes,
          actorName,
          existingProp.id,
        ],
      );
    } else {
      proposalId = randomUUID();
      await db.execute(
        `INSERT INTO crm_fap_financing_proposals (
          id, application_id, facility_purpose_id, purpose_detail, financing_method_id, currency_id,
          financing_value, financing_value_display, down_payment_value, security_deposit,
          interest_rate, tenor_months, payment_timing_id, estimated_monthly_installment,
          application_source_id, realization_liugong_he, realization_liugong_truck,
          realization_non_liugong_he, realization_non_liugong_truck, proposal_notes,
          is_active, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
        [
          proposalId,
          id,
          vals.facility_purpose_id,
          vals.purpose_detail,
          vals.financing_method_id,
          vals.currency_id,
          vals.financing_value,
          vals.financing_value_display,
          vals.down_payment_value,
          vals.security_deposit,
          vals.interest_rate,
          vals.tenor_months,
          vals.payment_timing_id,
          vals.estimated_monthly_installment,
          vals.application_source_id,
          vals.realization_liugong_he,
          vals.realization_liugong_truck,
          vals.realization_non_liugong_he,
          vals.realization_non_liugong_truck,
          vals.proposal_notes,
          actorName,
          actorName,
        ],
      );
    }

    // 3b. Proposal Terms cards
    if (fpJson && proposalId) {
      for (const card of TERM_CARDS) {
        const term = fpJson[card.propKey];
        if (!term || typeof term !== 'object') continue;
        const mId = await resolveMasterId('crm_master_financing_methods', card.methodCode, undefined, db as any);
        if (!mId) continue;
        const [tPurId, tCurId, tPayId] = await Promise.all([
          resolveMasterId('crm_master_facility_purposes', term.workingCapitalInvestment, undefined, db as any),
          resolveMasterId('crm_master_currencies', term.currency || 'IDR', undefined, db as any),
          resolveMasterId('crm_master_payment_timings', term.paymentMethod, undefined, db as any),
        ]);
        await db.execute(
          `INSERT INTO crm_fap_proposal_terms (
            id, proposal_id, application_id, financing_method_id, facility_purpose_id, purpose_text,
            currency_id, currency_text, security_deposit_amount, security_deposit_text,
            down_payment_amount, down_payment_text, interest_rate_pct, interest_rate_text,
            tenor_months, tenor_text, payment_timing_id, payment_method_text, created_by, updated_by
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON DUPLICATE KEY UPDATE
            facility_purpose_id=VALUES(facility_purpose_id), purpose_text=VALUES(purpose_text),
            currency_id=VALUES(currency_id), currency_text=VALUES(currency_text),
            security_deposit_amount=VALUES(security_deposit_amount), security_deposit_text=VALUES(security_deposit_text),
            down_payment_amount=VALUES(down_payment_amount), down_payment_text=VALUES(down_payment_text),
            interest_rate_pct=VALUES(interest_rate_pct), interest_rate_text=VALUES(interest_rate_text),
            tenor_months=VALUES(tenor_months), tenor_text=VALUES(tenor_text),
            payment_timing_id=VALUES(payment_timing_id), payment_method_text=VALUES(payment_method_text),
            updated_at=CURRENT_TIMESTAMP(3), updated_by=VALUES(updated_by)`,
          [
            randomUUID(),
            proposalId,
            id,
            mId,
            tPurId,
            cleanNullableString(term.workingCapitalInvestment)?.slice(0, 150) ?? null,
            tCurId,
            cleanNullableString(term.currency)?.slice(0, 50) ?? null,
            cleanDecimal(term.securityDeposit),
            cleanNullableString(term.securityDeposit)?.slice(0, 100) ?? null,
            cleanDecimal(term.downPayment),
            cleanNullableString(term.downPayment)?.slice(0, 100) ?? null,
            cleanDecimal(term.interestRate),
            cleanNullableString(term.interestRate)?.slice(0, 100) ?? null,
            cleanNullableInt(term.tenor),
            cleanNullableString(term.tenor)?.slice(0, 100) ?? null,
            tPayId,
            cleanNullableString(term.paymentMethod)?.slice(0, 100) ?? null,
            actorName,
            actorName,
          ],
        );
      }
    }

    // 3c. Equipment Units
    if (Array.isArray(prop?.units) && proposalId) {
      await db.execute(
        'UPDATE crm_fap_equipment_units SET deleted_at = CURRENT_TIMESTAMP(3), updated_by = ? WHERE application_id = ? AND deleted_at IS NULL',
        [actorName, id],
      );
      let pos = 1;
      for (const u of prop.units) {
        if (!u) continue;
        const eq = await resolveEquipmentIds(u, db as any);
        await db.execute(
          `INSERT INTO crm_fap_equipment_units (
            id, application_id, proposal_id, row_position, unit_category_id, brand_id, unit_type_id,
            model_id, asset_id, class_ton, quantity, unit_year, specifications, created_by, updated_by
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            randomUUID(),
            id,
            proposalId,
            pos++,
            eq.categoryId,
            eq.brandId,
            eq.typeId,
            eq.modelId,
            eq.assetId,
            cleanDecimal(u.classTon),
            cleanNullableInt(u.quantity) ?? 1,
            cleanNullableInt(u.unitYear),
            cleanNullableString(u.specifications),
            actorName,
            actorName,
          ],
        );
      }
    }
  }

  // 4. Document requirement checkboxes
  const docReqObj =
    fpJson?.documentRequirements ??
    prop?.documentRequirements ??
    body?.documentRequirements ??
    body?.profile?.documentRequirements;
  if (docReqObj && typeof docReqObj === 'object') {
    const masterDocs = await loadMasterRows('crm_master_fap_document_requirements', db as any);
    for (const [k, checked] of Object.entries(docReqObj)) {
      const code = normalizeCode(k.replace(/([a-z0-9])([A-Z])/g, '$1_$2'));
      const master = masterDocs.find(m => m.code === code || normalizeCode(m.code) === code);
      if (!master) continue;
      await db.execute(
        `INSERT INTO crm_fap_doc_requirements (id, application_id, doc_requirement_id, is_checked, created_by, updated_by)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE is_checked = VALUES(is_checked), updated_at = CURRENT_TIMESTAMP(3), updated_by = VALUES(updated_by)`,
        [randomUUID(), id, master.id, checked ? 1 : 0, actorName, actorName],
      );
    }
  }

  // 5. Financing purpose checkboxes
  if (purposeDetailRaw !== undefined) {
    const codes = Array.isArray(purposeDetailRaw)
      ? purposeDetailRaw.map(s => normalizeCode(s))
      : String(purposeDetailRaw || '')
          .split(',')
          .map(s => normalizeCode(s))
          .filter(Boolean);
    const masterPurposes = await loadMasterRows('crm_master_financing_purpose_options', db as any);
    for (const m of masterPurposes) {
      const selected = codes.includes(normalizeCode(m.code)) ? 1 : 0;
      await db.execute(
        `INSERT INTO crm_fap_financing_purposes (id, application_id, purpose_option_id, is_selected, created_by, updated_by)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE is_selected = VALUES(is_selected), updated_at = CURRENT_TIMESTAMP(3), updated_by = VALUES(updated_by)`,
        [randomUUID(), id, m.id, selected, actorName, actorName],
      );
    }
  }
}
