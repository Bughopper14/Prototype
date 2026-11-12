/** Writes a normalized frozen FAP snapshot across crm_frozen_fap_applications + 14 child tables. */
import crypto from 'node:crypto';
import path from 'node:path';
import {pool} from '../../../core/db/pool';
import {documentsDir} from '../../../core/storage';
import {getSubmitLock} from '../../documents/documents.repository';
import {extractArchiveFields} from './extract-fields';
import {findFapDocumentPath} from './find-document';
import {FapArchiveRecord} from './types';

const toIsoDate = (val: unknown): string | null => {
  if (!val) return null;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val.toISOString().slice(0, 10);
  const s = String(val).trim();
  return s ? s.slice(0, 10) : null;
};

const toNum = (val: unknown, fallback = 0): number => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const toNullableNum = (val: unknown): number | null => {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

export async function recordFapSubmissionArchive(
  applicationId: string,
  currentApp: any,
  actor?: {id?: string; name?: string; role?: string},
  explicitRemarks?: string,
): Promise<FapArchiveRecord | null> {
  if (!pool) return null;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const freezeId = crypto.randomUUID();
    const extracted = extractArchiveFields(currentApp);

    const [appRows] = await conn.query<any[]>(
      `SELECT a.id, a.fap_registration_number, a.application_date, a.customer_id, a.customer_category,
              b.code AS branch_code, b.name AS branch_name,
              st.code AS status_code, sg.code AS stage_code
       FROM crm_applications a
       LEFT JOIN crm_master_branches b ON b.id = a.branch_id
       LEFT JOIN crm_master_workflow_statuses st ON st.id = a.current_status_id
       LEFT JOIN crm_master_workflow_stages sg ON sg.id = st.stage_id
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId],
    );
    const appRow = appRows[0];
    if (!appRow) {
      await conn.rollback();
      return null;
    }

    const [profileRows] = await conn.query<any[]>(
      `SELECT p.*,
              bc.code AS business_category_code, bc.name AS business_category_name,
              ps.code AS premise_status_code, ps.name AS premise_status_name,
              co.code AS country_code, co.name AS country_name,
              pv.name AS province_name,
              ct.name AS city_name,
              dt.name AS district_name,
              vl.name AS village_name,
              pc.code AS postal_code,
              ig.code AS industry_segment_code, ig.name AS industry_segment_name,
              br.code AS business_role_code, br.name AS business_role_name
       FROM crm_fap_application_profiles p
       LEFT JOIN crm_master_business_categories bc ON bc.id = p.business_category_id
       LEFT JOIN crm_master_premise_statuses ps ON ps.id = p.premise_status_id
       LEFT JOIN crm_master_countries co ON co.id = p.country_id
       LEFT JOIN crm_master_provinces pv ON pv.id = p.province_id
       LEFT JOIN crm_master_cities ct ON ct.id = p.city_id
       LEFT JOIN crm_master_districts dt ON dt.id = p.district_id
       LEFT JOIN crm_master_villages vl ON vl.id = p.village_id
       LEFT JOIN crm_master_postal_codes pc ON pc.id = p.postal_code_id
       LEFT JOIN crm_master_industry_segments ig ON ig.id = p.industry_segment_id
       LEFT JOIN crm_master_business_roles br ON br.id = p.business_role_id
       WHERE p.application_id = ?
       LIMIT 1`,
      [applicationId],
    );
    const profRow = profileRows[0] || {};

    const [verRows] = await conn.query<any[]>(
      'SELECT COALESCE(MAX(freeze_version), 0) AS max_ver FROM crm_frozen_fap_applications WHERE source_application_id = ?',
      [applicationId],
    );
    const freezeVersion = Number(verRows[0]?.max_ver || 0) + 1;

    await conn.execute(
      'UPDATE crm_frozen_fap_applications SET is_latest_freeze = 0 WHERE source_application_id = ? AND is_latest_freeze = 1',
      [applicationId],
    );

    const lock = await getSubmitLock(applicationId);
    const docInfo = await findFapDocumentPath(applicationId);
    const remarks =
      explicitRemarks !== undefined && explicitRemarks !== null
        ? String(explicitRemarks).trim()
        : lock.fapFormRemarks || '';

    const heLiu = Math.max(0, Math.trunc(toNum(profRow.asset_he_liugong, extracted.assetHeLiuGong)));
    const truckLiu = Math.max(0, Math.trunc(toNum(profRow.asset_truck_liugong, extracted.assetTruckLiuGong)));
    const totLiu = heLiu + truckLiu;
    const heNon = Math.max(0, Math.trunc(toNum(profRow.asset_he_non_liugong, extracted.assetHeNonLiuGong)));
    const truckNon = Math.max(0, Math.trunc(toNum(profRow.asset_truck_non_liugong, extracted.assetTruckNonLiuGong)));
    const totNon = heNon + truckNon;
    const grandTotal = totLiu + totNon;
    const pctLiu = grandTotal > 0 ? Number(((totLiu / grandTotal) * 100).toFixed(2)) : 0;
    const pctNon = grandTotal > 0 ? Number(((totNon / grandTotal) * 100).toFixed(2)) : 0;

    const [bankRows] = await conn.query<any[]>(
      `SELECT bf.*, fi.code AS institution_code, fi.name AS institution_name, cur.code AS currency_code
       FROM crm_fap_bank_facilities bf
       LEFT JOIN crm_master_financial_institutions fi ON fi.id = bf.financial_institution_id
       LEFT JOIN crm_master_currencies cur ON cur.id = bf.currency_id
       WHERE bf.application_id = ? AND bf.deleted_at IS NULL
       ORDER BY bf.row_position ASC`,
      [applicationId],
    );
    const totalMonthlyBankInstallment = bankRows.reduce(
      (sum, b) => sum + toNum(b.monthly_installment, 0),
      0,
    );

    const [finRows] = await conn.query<any[]>(
      `SELECT * FROM crm_fap_financial_statements
       WHERE application_id = ? AND deleted_at IS NULL AND COALESCE(is_active, 1) = 1
       ORDER BY fiscal_year DESC`,
      [applicationId],
    );
    const isFinancialAudited = profRow.is_financial_audited
      ? 1
      : finRows.some(f => Number(f.is_audited) === 1)
        ? 1
        : 0;

    const actorUserId = Number.isInteger(Number(actor?.id)) && Number(actor?.id) > 0 ? Number(actor?.id) : null;
    const actorName = String(actor?.name || 'System / Auto-Submit').slice(0, 150);
    const actorRole = actor?.role ? String(actor.role).slice(0, 30) : null;

    await conn.execute(
      `INSERT INTO crm_frozen_fap_applications (
        id, source_application_id, source_customer_id, freeze_version, is_latest_freeze,
        fap_registration_number, application_date, customer_category, stage_code_at_freeze, status_code_at_freeze,
        uploaded_fap_file_id, uploaded_fap_file_name, uploaded_fap_file_path, comparison_remarks,
        company_name, business_category_code, business_category_name, nib, nib_date, npwp,
        establishment_act_no, establishment_date, branch_code, branch_name, premise_status_code, premise_status_name,
        company_address, country_code, country_name, province_name, city_name, district_name, village_name,
        postal_code, rt, rw, phone_fax, company_email, website, main_business, repayment_source,
        experience_years, experience_months, latest_deed_no, latest_deed_date,
        asset_he_liugong, asset_truck_liugong, asset_total_liugong, asset_pct_liugong,
        asset_he_non_liugong, asset_truck_non_liugong, asset_total_non_liugong, asset_pct_non_liugong,
        asset_grand_total_units,
        industry_segment_code, industry_segment_name, business_role_code, business_role_name,
        reference_comments, total_monthly_bank_installment, is_financial_audited,
        frozen_by_user_id, frozen_by_name, frozen_by_role, frozen_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP(3))`,
      [
        freezeId,
        applicationId,
        appRow.customer_id,
        freezeVersion,
        1,
        String(appRow.fap_registration_number || extracted.fapNumber || applicationId).slice(0, 80),
        toIsoDate(appRow.application_date) || extracted.appDate || new Date().toISOString().slice(0, 10),
        String(appRow.customer_category || extracted.customerStatus || 'NEW').slice(0, 30),
        String(appRow.stage_code || 'PRE_ANALYSIS').slice(0, 50),
        String(appRow.status_code || 'BS_VERIFIED').slice(0, 60),
        docInfo.fileId,
        docInfo.fileName,
        docInfo.filePath || (docInfo.fileName ? path.join(documentsDir, docInfo.fileName) : null),
        remarks || null,
        String(profRow.company_name || extracted.companyName || '-').slice(0, 255),
        profRow.business_category_code || extracted.companyType || null,
        profRow.business_category_name || null,
        profRow.nib || extracted.nib || null,
        toIsoDate(profRow.nib_date) || extracted.nibDate || null,
        profRow.npwp || extracted.npwp || null,
        profRow.establishment_act_no || extracted.establishmentActNo || null,
        toIsoDate(profRow.establishment_date) || extracted.establishmentDate || null,
        appRow.branch_code || extracted.branchCode || null,
        appRow.branch_name || null,
        profRow.premise_status_code || extracted.locationStatus || null,
        profRow.premise_status_name || null,
        profRow.company_address || extracted.companyAddress || null,
        profRow.country_code || null,
        profRow.country_name || null,
        profRow.province_name || extracted.province || null,
        profRow.city_name || extracted.city || null,
        profRow.district_name || null,
        profRow.village_name || null,
        profRow.postal_code || extracted.postalCode || null,
        profRow.rt || extracted.rt || null,
        profRow.rw || extracted.rw || null,
        profRow.phone_fax || extracted.phoneFax || null,
        profRow.company_email || extracted.email || null,
        profRow.website || extracted.website || null,
        profRow.main_business || extracted.mainBusiness || null,
        profRow.repayment_source || extracted.repaymentSource || null,
        Math.max(0, Math.trunc(toNum(profRow.experience_years, extracted.experienceYears))),
        Math.max(0, Math.min(11, Math.trunc(toNum(profRow.experience_months, extracted.experienceMonths)))),
        profRow.latest_deed_no || extracted.latestDeedNo || null,
        toIsoDate(profRow.latest_deed_date) || extracted.latestDeedDate || null,
        heLiu,
        truckLiu,
        totLiu,
        pctLiu,
        heNon,
        truckNon,
        totNon,
        pctNon,
        grandTotal,
        profRow.industry_segment_code || extracted.industrySegment || null,
        profRow.industry_segment_name || null,
        profRow.business_role_code || extracted.businessRole || null,
        profRow.business_role_name || null,
        profRow.reference_comments || null,
        totalMonthlyBankInstallment,
        isFinancialAudited,
        actorUserId,
        actorName,
        actorRole,
      ],
    );

    // 1. Primary contacts
    const [picRows] = await conn.query<any[]>(
      `SELECT pc.*, pos.code AS position_code, pos.name AS position_name,
              co.name AS country_name, pv.name AS province_name, ct.name AS city_name,
              dt.name AS district_name, vl.name AS village_name, pcd.code AS postal_code
       FROM crm_fap_primary_contacts pc
       LEFT JOIN crm_master_pic_positions pos ON pos.id = pc.position_id
       LEFT JOIN crm_master_countries co ON co.id = pc.country_id
       LEFT JOIN crm_master_provinces pv ON pv.id = pc.province_id
       LEFT JOIN crm_master_cities ct ON ct.id = pc.city_id
       LEFT JOIN crm_master_districts dt ON dt.id = pc.district_id
       LEFT JOIN crm_master_villages vl ON vl.id = pc.village_id
       LEFT JOIN crm_master_postal_codes pcd ON pcd.id = pc.postal_code_id
       WHERE pc.application_id = ?`,
      [applicationId],
    );
    for (const pic of picRows) {
      await conn.execute(
        `INSERT INTO crm_frozen_fap_primary_contacts (
          id, freeze_id, source_application_id, pic_name, position_code, position_name,
          phone, email, country_name, province_name, city_name, district_name, village_name,
          postal_code, rt, rw, current_address
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          pic.pic_name || null,
          pic.position_code || null,
          pic.position_name || null,
          pic.phone || null,
          pic.email || null,
          pic.country_name || null,
          pic.province_name || null,
          pic.city_name || null,
          pic.district_name || null,
          pic.village_name || null,
          pic.postal_code || null,
          pic.rt || null,
          pic.rw || null,
          pic.current_address || null,
        ],
      );
    }

    // 2. Financing purposes
    const [purpRows] = await conn.query<any[]>(
      `SELECT fp.is_selected, opt.code AS purpose_code, opt.param_key, opt.label AS purpose_label, opt.group_label
       FROM crm_fap_financing_purposes fp
       JOIN crm_master_financing_purpose_options opt ON opt.id = fp.purpose_option_id
       WHERE fp.application_id = ?`,
      [applicationId],
    );
    for (const p of purpRows) {
      await conn.execute(
        `INSERT INTO crm_frozen_fap_financing_purposes (
          id, freeze_id, source_application_id, purpose_code, param_key, purpose_label, group_label, is_selected
        ) VALUES (?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          p.purpose_code,
          p.param_key,
          p.purpose_label,
          p.group_label || '',
          Number(p.is_selected) ? 1 : 0,
        ],
      );
    }

    // 3. Project contracts
    const [projRows] = await conn.query<any[]>(
      `SELECT pr.*, role.code AS project_role_code, role.name AS project_role_name
       FROM crm_fap_project_contracts pr
       LEFT JOIN crm_master_project_roles role ON role.id = pr.project_role_id
       WHERE pr.application_id = ? AND pr.deleted_at IS NULL
       ORDER BY pr.row_position ASC`,
      [applicationId],
    );
    for (const pr of projRows) {
      await conn.execute(
        `INSERT INTO crm_frozen_fap_project_contracts (
          id, freeze_id, source_application_id, row_position, project_owner, project_location,
          project_role_code, project_role_name, contract_status
        ) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          toNum(pr.row_position, 1),
          pr.project_owner || null,
          pr.project_location || null,
          pr.project_role_code || null,
          pr.project_role_name || null,
          pr.contract_status || null,
        ],
      );
    }

    // 4. Bank facilities
    for (const bf of bankRows) {
      await conn.execute(
        `INSERT INTO crm_frozen_fap_bank_facilities (
          id, freeze_id, source_application_id, row_position, institution_code, institution_name,
          currency_code, credit_facility, monthly_installment, year_started, interest_rate,
          payment_record, facility_status, comments
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          toNum(bf.row_position, 1),
          bf.institution_code || null,
          bf.institution_name || null,
          bf.currency_code || null,
          toNullableNum(bf.credit_facility),
          toNullableNum(bf.monthly_installment),
          toNullableNum(bf.year_started),
          toNullableNum(bf.interest_rate),
          bf.payment_record || null,
          bf.facility_status || null,
          bf.comments || null,
        ],
      );
    }

    // 5. Financing proposals
    const [propRows] = await conn.query<any[]>(
      `SELECT fp.*, purp.code AS facility_purpose_code, purp.name AS facility_purpose_name,
              fm.code AS financing_method_code, fm.name AS financing_method_name,
              cur.code AS currency_code,
              pt.code AS payment_timing_code, pt.name AS payment_timing_name,
              src.code AS application_source_code, src.name AS application_source_name
       FROM crm_fap_financing_proposals fp
       LEFT JOIN crm_master_facility_purposes purp ON purp.id = fp.facility_purpose_id
       LEFT JOIN crm_master_financing_methods fm ON fm.id = fp.financing_method_id
       LEFT JOIN crm_master_currencies cur ON cur.id = fp.currency_id
       LEFT JOIN crm_master_payment_timings pt ON pt.id = fp.payment_timing_id
       LEFT JOIN crm_master_application_sources src ON src.id = fp.application_source_id
       WHERE fp.application_id = ? AND fp.deleted_at IS NULL AND COALESCE(fp.is_active, 1) = 1`,
      [applicationId],
    );
    for (const fp of propRows) {
      const rHeL = Math.max(0, Math.trunc(toNum(fp.realization_liugong_he, 0)));
      const rTrL = Math.max(0, Math.trunc(toNum(fp.realization_liugong_truck, 0)));
      const rHeN = Math.max(0, Math.trunc(toNum(fp.realization_non_liugong_he, 0)));
      const rTrN = Math.max(0, Math.trunc(toNum(fp.realization_non_liugong_truck, 0)));
      await conn.execute(
        `INSERT INTO crm_frozen_fap_financing_proposals (
          id, freeze_id, source_application_id,
          facility_purpose_code, facility_purpose_name, purpose_detail,
          financing_method_code, financing_method_name, currency_code,
          financing_value, financing_value_display, down_payment_value, security_deposit,
          interest_rate, tenor_months, payment_timing_code, payment_timing_name,
          estimated_monthly_installment, application_source_code, application_source_name,
          realization_liugong_he, realization_liugong_truck,
          realization_non_liugong_he, realization_non_liugong_truck,
          realization_total_units, proposal_notes
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          fp.facility_purpose_code || null,
          fp.facility_purpose_name || null,
          fp.purpose_detail || null,
          fp.financing_method_code || null,
          fp.financing_method_name || null,
          fp.currency_code || null,
          toNullableNum(fp.financing_value),
          fp.financing_value_display || null,
          toNullableNum(fp.down_payment_value),
          toNullableNum(fp.security_deposit),
          toNullableNum(fp.interest_rate),
          toNullableNum(fp.tenor_months),
          fp.payment_timing_code || null,
          fp.payment_timing_name || null,
          toNullableNum(fp.estimated_monthly_installment),
          fp.application_source_code || null,
          fp.application_source_name || null,
          rHeL,
          rTrL,
          rHeN,
          rTrN,
          rHeL + rTrL + rHeN + rTrN,
          fp.proposal_notes || null,
        ],
      );
    }

    // 6. Proposal terms
    const [termRows] = await conn.query<any[]>(
      `SELECT t.*, fm.code AS financing_method_code, fm.name AS financing_method_name
       FROM crm_fap_proposal_terms t
       JOIN crm_master_financing_methods fm ON fm.id = t.financing_method_id
       WHERE t.application_id = ?`,
      [applicationId],
    );
    for (const t of termRows) {
      await conn.execute(
        `INSERT INTO crm_frozen_fap_proposal_terms (
          id, freeze_id, source_application_id, financing_method_code, financing_method_name,
          purpose_text, currency_text, security_deposit_amount, security_deposit_text,
          down_payment_amount, down_payment_text, interest_rate_pct, interest_rate_text,
          tenor_months, tenor_text, payment_method_text
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          t.financing_method_code,
          t.financing_method_name,
          t.purpose_text || null,
          t.currency_text || null,
          toNullableNum(t.security_deposit_amount),
          t.security_deposit_text || null,
          toNullableNum(t.down_payment_amount),
          t.down_payment_text || null,
          toNullableNum(t.interest_rate_pct),
          t.interest_rate_text || null,
          toNullableNum(t.tenor_months),
          t.tenor_text || null,
          t.payment_method_text || null,
        ],
      );
    }

    // 7. Equipment units
    const [unitRows] = await conn.query<any[]>(
      `SELECT u.*, cat.code AS unit_category_code, cat.name AS unit_category_name,
              br.code AS brand_code, br.name AS brand_name,
              tp.code AS unit_type_code, tp.name AS unit_type_name,
              md.code AS model_code, md.name AS model_name,
              ast.code AS asset_code, ast.name AS asset_name
       FROM crm_fap_equipment_units u
       LEFT JOIN crm_master_equipment_categories cat ON cat.id = u.unit_category_id
       LEFT JOIN crm_master_equipment_brands br ON br.id = u.brand_id
       LEFT JOIN crm_master_equipment_types tp ON tp.id = u.unit_type_id
       LEFT JOIN crm_master_equipment_models md ON md.id = u.model_id
       LEFT JOIN crm_master_equipment_assets ast ON ast.id = u.asset_id
       WHERE u.application_id = ? AND u.deleted_at IS NULL
       ORDER BY u.row_position ASC`,
      [applicationId],
    );
    for (const u of unitRows) {
      await conn.execute(
        `INSERT INTO crm_frozen_fap_equipment_units (
          id, freeze_id, source_application_id, row_position,
          unit_category_code, unit_category_name, brand_code, brand_name,
          unit_type_code, unit_type_name, model_code, model_name, asset_code, asset_name,
          class_ton, quantity, unit_year, specifications
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          toNum(u.row_position, 1),
          u.unit_category_code || null,
          u.unit_category_name || null,
          u.brand_code || null,
          u.brand_name || null,
          u.unit_type_code || null,
          u.unit_type_name || null,
          u.model_code || null,
          u.model_name || null,
          u.asset_code || null,
          u.asset_name || null,
          toNullableNum(u.class_ton),
          toNullableNum(u.quantity),
          toNullableNum(u.unit_year),
          u.specifications || null,
        ],
      );
    }

    // 8. Document requirements
    const [reqRows] = await conn.query<any[]>(
      `SELECT dr.is_checked, req.code AS requirement_code, req.param_key, req.label AS requirement_label
       FROM crm_fap_doc_requirements dr
       JOIN crm_master_fap_document_requirements req ON req.id = dr.doc_requirement_id
       WHERE dr.application_id = ?`,
      [applicationId],
    );
    for (const r of reqRows) {
      await conn.execute(
        `INSERT INTO crm_frozen_fap_doc_requirements (
          id, freeze_id, source_application_id, requirement_code, param_key, requirement_label, is_checked
        ) VALUES (?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          r.requirement_code,
          r.param_key,
          r.requirement_label,
          Number(r.is_checked) ? 1 : 0,
        ],
      );
    }

    // 9. Financial statements
    for (const fsRow of finRows) {
      await conn.execute(
        `INSERT INTO crm_frozen_fap_financial_statements (
          id, freeze_id, source_application_id, fiscal_year, is_audited,
          current_assets, non_current_assets, total_assets,
          current_liabilities, non_current_liabilities, total_liabilities,
          equity, total_liabilities_and_equity,
          revenue, gross_profit, operating_profit_ebit, tax, net_income,
          is_balanced, current_ratio, debt_to_equity_ratio, net_profit_margin_pct
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          toNum(fsRow.fiscal_year, new Date().getFullYear()),
          Number(fsRow.is_audited) ? 1 : 0,
          toNum(fsRow.current_assets),
          toNum(fsRow.non_current_assets),
          toNum(fsRow.total_assets),
          toNum(fsRow.current_liabilities),
          toNum(fsRow.non_current_liabilities),
          toNum(fsRow.total_liabilities),
          toNum(fsRow.equity),
          toNum(fsRow.total_liabilities_and_equity),
          toNum(fsRow.revenue),
          toNum(fsRow.gross_profit),
          toNum(fsRow.operating_profit_ebit),
          toNum(fsRow.tax),
          toNum(fsRow.net_income),
          Number(fsRow.is_balanced) ? 1 : 0,
          toNullableNum(fsRow.current_ratio),
          toNullableNum(fsRow.debt_to_equity_ratio),
          toNullableNum(fsRow.net_profit_margin_pct),
        ],
      );
    }

    // 10. Legal deeds + remark categories + stakeholders
    const [deedRows] = await conn.query<any[]>(
      `SELECT d.*, rv.review_status, rv.workflow_status, rv.rejection_reason, rv.correction_note, rv.approved_by, rv.approved_at
       FROM crm_fap_legal_deeds d
       LEFT JOIN crm_fap_legal_deed_reviews rv ON rv.deed_id = d.id AND rv.application_id = d.application_id
       WHERE d.application_id = ? AND d.deleted_at IS NULL
       ORDER BY d.deed_date ASC, d.created_at ASC`,
      [applicationId],
    );
    const [stakeRows] = await conn.query<any[]>(
      `SELECT s.*,
              rt.code AS representative_type_code, rt.name AS representative_type_name,
              pos.code AS position_code, pos.name AS position_name,
              des.code AS designation_code, des.name AS designation_name,
              co.name AS country_name, pv.name AS province_name, ct.name AS city_name,
              dt.name AS district_name, vl.name AS village_name, pcd.code AS postal_code,
              src.deed_number AS source_deed_number
       FROM crm_fap_legal_stakeholders s
       LEFT JOIN crm_master_legal_representative_types rt ON rt.id = s.representative_type_id
       LEFT JOIN crm_master_stakeholder_positions pos ON pos.id = s.position_id
       LEFT JOIN crm_master_legal_designations des ON des.id = s.designation_id
       LEFT JOIN crm_master_countries co ON co.id = s.country_id
       LEFT JOIN crm_master_provinces pv ON pv.id = s.province_id
       LEFT JOIN crm_master_cities ct ON ct.id = s.city_id
       LEFT JOIN crm_master_districts dt ON dt.id = s.district_id
       LEFT JOIN crm_master_villages vl ON vl.id = s.village_id
       LEFT JOIN crm_master_postal_codes pcd ON pcd.id = s.postal_code_id
       LEFT JOIN crm_fap_legal_deeds src ON src.id = s.source_deed_id
       WHERE s.application_id = ? AND s.deleted_at IS NULL AND COALESCE(s.is_active, 1) = 1`,
      [applicationId],
    );
    const [catRows] = await conn.query<any[]>(
      `SELECT rc.deed_id, cat.code AS category_code, cat.name AS category_name
       FROM crm_fap_legal_deed_remark_categories rc
       JOIN crm_master_legal_remark_categories cat ON cat.id = rc.remark_category_id
       JOIN crm_fap_legal_deeds d ON d.id = rc.deed_id
       WHERE d.application_id = ? AND d.deleted_at IS NULL`,
      [applicationId],
    );

    const stakesByDeed = new Map<string, any[]>();
    for (const s of stakeRows) {
      const list = stakesByDeed.get(s.deed_id) || [];
      list.push(s);
      stakesByDeed.set(s.deed_id, list);
    }
    const catsByDeed = new Map<string, any[]>();
    for (const c of catRows) {
      const list = catsByDeed.get(c.deed_id) || [];
      list.push(c);
      catsByDeed.set(c.deed_id, list);
    }

    for (const d of deedRows) {
      const frozenDeedId = crypto.randomUUID();
      const dStakes = stakesByDeed.get(d.id) || [];
      const shareholderCount = dStakes.filter(
        s => String(s.stakeholder_type || '').toUpperCase().includes('SHAREHOLDER'),
      ).length;
      const totalSharePct = dStakes.reduce((sum, s) => sum + toNum(s.share_percentage, 0), 0);

      await conn.execute(
        `INSERT INTO crm_frozen_fap_legal_deeds (
          id, freeze_id, source_application_id, source_deed_id,
          deed_type, deed_number, deed_date, notary_name, deed_status, valid_until,
          ministerial_decree_number, ministerial_decree_date, remarks,
          representative_note, company_shareholder_note,
          stakeholder_count, shareholder_count, total_share_percentage,
          is_selected, is_latest_deed, review_status, review_notes, approved_by, approved_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          frozenDeedId,
          freezeId,
          applicationId,
          d.id,
          d.deed_type || 'AMENDMENT',
          d.deed_number || '-',
          toIsoDate(d.deed_date) || new Date().toISOString().slice(0, 10),
          d.notary_name || null,
          d.deed_status || 'ACTIVE',
          toIsoDate(d.valid_until),
          d.ministerial_decree_number || null,
          toIsoDate(d.ministerial_decree_date),
          d.remarks || null,
          d.representative_note || null,
          d.company_shareholder_note || null,
          dStakes.length,
          shareholderCount,
          Number(totalSharePct.toFixed(2)),
          Number(d.is_selected) ? 1 : 0,
          Number(d.is_latest_deed) ? 1 : 0,
          d.review_status || null,
          d.rejection_reason || d.correction_note || d.workflow_status || null,
          d.approved_by || null,
          d.approved_at || null,
        ],
      );

      for (const c of catsByDeed.get(d.id) || []) {
        await conn.execute(
          `INSERT INTO crm_frozen_fap_legal_deed_remark_categories (
            id, freeze_id, frozen_deed_id, category_code, category_name
          ) VALUES (?,?,?,?,?)`,
          [crypto.randomUUID(), freezeId, frozenDeedId, c.category_code, c.category_name],
        );
      }

      for (const s of dStakes) {
        await conn.execute(
          `INSERT INTO crm_frozen_fap_legal_stakeholders (
            id, freeze_id, frozen_deed_id, source_application_id,
            representative_type_code, representative_type_name, position_code, position_name,
            designation_code, designation_name, stakeholder_type, is_signatory,
            id_type, id_number, id_number_secondary, title, first_name, middle_name, last_name,
            date_of_birth, age_years, age_months, marital_status, occupation, email, mobile_phone,
            gender, share_percentage, deposited_capital, primary_capital, citizenship,
            country_name, province_name, city_name, district_name, village_name, postal_code,
            foreign_region_text, rt, rw, address, is_inherited, source_deed_number
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            crypto.randomUUID(),
            freezeId,
            frozenDeedId,
            applicationId,
            s.representative_type_code || null,
            s.representative_type_name || null,
            s.position_code || null,
            s.position_name || null,
            s.designation_code || null,
            s.designation_name || null,
            s.stakeholder_type || 'INDIVIDUAL',
            s.is_signatory === null || s.is_signatory === undefined ? null : Number(s.is_signatory) ? 1 : 0,
            s.id_type || null,
            s.id_number || null,
            s.id_number_secondary || null,
            s.title || null,
            s.first_name || null,
            s.middle_name || null,
            s.last_name || null,
            toIsoDate(s.date_of_birth),
            toNullableNum(s.age_years),
            toNullableNum(s.age_months),
            s.marital_status || null,
            s.occupation || null,
            s.email || null,
            s.mobile_phone || null,
            s.gender || null,
            toNum(s.share_percentage, 0),
            toNullableNum(s.deposited_capital),
            toNullableNum(s.primary_capital),
            s.citizenship || 'WNI',
            s.country_name || null,
            s.province_name || null,
            s.city_name || null,
            s.district_name || null,
            s.village_name || null,
            s.postal_code || null,
            s.foreign_region_text || null,
            s.rt || null,
            s.rw || null,
            s.address || null,
            Number(s.is_inherited) ? 1 : 0,
            s.source_deed_number || null,
          ],
        );
      }
    }

    // 11. Document checklists
    const [chkRows] = await conn.query<any[]>(
      `SELECT chk.*, dt.code AS document_code, dt.name AS document_name,
              f.file_name AS active_file_name, COALESCE(f.storage_path, f.storage_key) AS active_file_path,
              f.file_size AS active_file_size, f.uploaded_by AS active_file_uploaded_by,
              f.uploaded_at AS active_file_uploaded_at
       FROM crm_application_document_checklists chk
       JOIN crm_master_document_types dt ON dt.id = chk.document_type_id
       LEFT JOIN crm_application_document_files f
         ON f.checklist_id = chk.id AND f.is_current_active = 1 AND f.deleted_at IS NULL
       WHERE chk.application_id = ?`,
      [applicationId],
    );
    for (const c of chkRows) {
      await conn.execute(
        `INSERT INTO crm_frozen_fap_document_checklists (
          id, freeze_id, source_application_id, document_code, document_name,
          assigned_role, is_mandatory, status,
          checked_by_mkt, checked_by_bs, checked_by_ca, checked_by_legal,
          registration_date, expired_date, data_summary, notes,
          active_file_name, active_file_path, active_file_size,
          active_file_uploaded_by, active_file_uploaded_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          c.document_code,
          c.document_name,
          c.assigned_role || 'MKT',
          Number(c.is_mandatory) ? 1 : 0,
          c.status || 'PENDING',
          Number(c.checked_by_mkt) ? 1 : 0,
          Number(c.checked_by_bs) ? 1 : 0,
          Number(c.checked_by_ca) ? 1 : 0,
          Number(c.checked_by_legal) ? 1 : 0,
          toIsoDate(c.registration_date),
          toIsoDate(c.expired_date),
          c.data_summary || null,
          c.notes || null,
          c.active_file_name || null,
          c.active_file_path || null,
          toNullableNum(c.active_file_size),
          c.active_file_uploaded_by || null,
          c.active_file_uploaded_at || null,
        ],
      );
    }

    // 12. OCR discrepancies
    const diffs = Array.isArray(lock.ocrComparison?.diffs) ? lock.ocrComparison.diffs : [];
    for (const d of diffs) {
      const resStatus = ['OPEN', 'ACCEPTED_SYSTEM', 'OVERRIDDEN_OCR', 'NOTED'].includes(
        String(d.status || '').toUpperCase(),
      )
        ? String(d.status).toUpperCase()
        : 'OPEN';
      await conn.execute(
        `INSERT INTO crm_frozen_fap_ocr_discrepancies (
          id, freeze_id, source_application_id, section_name, field_key, field_label,
          system_value, ocr_value, resolution_status
        ) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          crypto.randomUUID(),
          freezeId,
          applicationId,
          String(d.section || 'FAP').slice(0, 100),
          String(d.field || 'unknown').slice(0, 100),
          String(d.label || d.field || 'Field').slice(0, 150),
          d.systemValue ?? d.oldValue ?? null,
          d.ocrValue ?? d.newValue ?? null,
          resStatus,
        ],
      );
    }

    await conn.execute(
      'UPDATE crm_applications SET latest_freeze_version = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [freezeVersion, applicationId],
    );

    await conn.commit();
    console.log(
      `[OK] Recorded normalized frozen FAP snapshot v${freezeVersion} [${freezeId}] for application [${applicationId}]`,
    );

    const now = new Date().toISOString();
    return {
      id: freezeId,
      application_id: applicationId,
      freeze_version: freezeVersion,
      is_latest_freeze: true,
      fap_registration_number: appRow.fap_registration_number,
      application_date: toIsoDate(appRow.application_date),
      branch_code: appRow.branch_code,
      customer_status: appRow.customer_category,
      customer_id: appRow.customer_id,
      company_name: profRow.company_name || extracted.companyName,
      company_type: profRow.business_category_code || extracted.companyType,
      nib: profRow.nib || extracted.nib,
      nib_date: toIsoDate(profRow.nib_date) || extracted.nibDate,
      npwp: profRow.npwp || extracted.npwp,
      establishment_act_no: profRow.establishment_act_no || extracted.establishmentActNo,
      establishment_date: toIsoDate(profRow.establishment_date) || extracted.establishmentDate,
      latest_deed_no: profRow.latest_deed_no || extracted.latestDeedNo,
      latest_deed_date: toIsoDate(profRow.latest_deed_date) || extracted.latestDeedDate,
      company_address: profRow.company_address || extracted.companyAddress,
      rt: profRow.rt || extracted.rt,
      rw: profRow.rw || extracted.rw,
      city: profRow.city_name || extracted.city,
      province: profRow.province_name || extracted.province,
      postal_code: profRow.postal_code || extracted.postalCode,
      phone_fax: profRow.phone_fax || extracted.phoneFax,
      email: profRow.company_email || extracted.email,
      website: profRow.website || extracted.website,
      main_business: profRow.main_business || extracted.mainBusiness,
      experience_years: Math.max(0, Math.trunc(toNum(profRow.experience_years, extracted.experienceYears))),
      experience_months: Math.max(0, Math.trunc(toNum(profRow.experience_months, extracted.experienceMonths))),
      location_status: profRow.premise_status_code || extracted.locationStatus,
      repayment_source: profRow.repayment_source || extracted.repaymentSource,
      industry_segment: profRow.industry_segment_code || extracted.industrySegment,
      business_role: profRow.business_role_code || extracted.businessRole,
      asset_summary_he_liu_gong: heLiu,
      asset_summary_truck_liu_gong: truckLiu,
      asset_summary_he_non_liugong: heNon,
      asset_summary_truck_non_liugong: truckNon,
      pic_name: extracted.picName,
      pic_position: extracted.picPosition,
      pic_phone: extracted.picPhone,
      pic_email: extracted.picEmail,
      pic_current_address: extracted.picCurrentAddress,
      pic_rt: extracted.picRt,
      pic_rw: extracted.picRw,
      pic_city: extracted.picCity,
      pic_province: extracted.picProvince,
      pic_postal_code: extracted.picPostalCode,
      projects: extracted.projects,
      stakeholders: extracted.stakeholders,
      bank_references: extracted.bankReferences,
      financing_value: extracted.financingValue,
      tenor_months: extracted.tenorMonths,
      interest_rate: extracted.interestRate,
      down_payment_value: extracted.downPaymentValue,
      payment_method: extracted.paymentMethod,
      estimated_monthly_installment: extracted.estimatedInstallment,
      equipment_units: extracted.equipmentUnits,
      financial_statements: extracted.financialStatements,
      fap_stage_data: extracted.fapStageSnapshot,
      ocr_discrepancies: diffs,
      ocr_raw_data: null,
      comparison_remarks: remarks || null,
      ocr_document_path: docInfo.filePath,
      ocr_document_filename: docInfo.fileName,
      stage_at_submission: appRow.stage_code || 'PRE_ANALYSIS',
      status_at_submission: appRow.status_code || 'BS_VERIFIED',
      submitted_by_user_id: actorUserId !== null ? String(actorUserId) : actor?.id || null,
      submitted_by_user_name: actorName,
      submitted_at: now,
      created_at: now,
      updated_at: now,
    };
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('recordFapSubmissionArchive error:', err);
    return null;
  } finally {
    conn.release();
  }
}
