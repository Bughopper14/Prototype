import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {ensure} from '../../core/domain';

type Conn = Pick<PoolConnection, 'execute' | 'query'>;
type Row = Record<string, unknown>;

/** The user who freezes (frozen_by_user_id refers to users_users.id, without a foreign key). */
export type FreezeActor = {portalUserId?: number; name?: string; username?: string; role?: string; displayRole?: string};

const num = (v: unknown) => Number(v) || 0;
const pct = (part: number, total: number) => (total ? Math.round((part * 10000) / total) / 100 : 0);

async function insert(conn: Conn, table: string, row: Row) {
  const cols = Object.keys(row);
  await conn.execute(
    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
    cols.map(c => (row[c] === undefined ? null : (row[c] as any))),
  );
}

/** Joins that turn the location ids of a row (alias `x`) into literal names. */
const LOCATION_JOINS = (x: string) => `
  LEFT JOIN ${CRM.masterCountries} ${x}co ON ${x}co.id=${x}.country_id
  LEFT JOIN ${CRM.masterProvinces} ${x}pv ON ${x}pv.id=${x}.province_id
  LEFT JOIN ${CRM.masterCities} ${x}ci ON ${x}ci.id=${x}.city_id
  LEFT JOIN ${CRM.masterDistricts} ${x}di ON ${x}di.id=${x}.district_id
  LEFT JOIN ${CRM.masterVillages} ${x}vi ON ${x}vi.id=${x}.village_id
  LEFT JOIN ${CRM.masterPostalCodes} ${x}pc ON ${x}pc.id=${x}.postal_code_id`;
const LOCATION_COLUMNS = (x: string) =>
  `${x}co.code AS country_code,${x}co.name AS country_name,${x}pv.name AS province_name,${x}ci.name AS city_name,
   ${x}di.name AS district_name,${x}vi.name AS village_name,${x}pc.postal_code AS postal_code`;

/**
 * FAP freeze: an immutable copy of the FAP as submitted (crm_frozen_fap_*). Master values are stored as literal
 * codes and names, so later Master Data changes do not alter the snapshot. Every freeze is a new version; the
 * previous one stays and loses is_latest_freeze.
 */
@Injectable()
export class FapFreezeRepository {
  constructor(private readonly db: CrmDatabase) {}

  /**
   * Freezes the application inside the caller's transaction. `stageCode` is the stage being submitted.
   * Returns the new freeze id and version.
   */
  async freeze(conn: Conn, applicationId: string, stageCode: string, actor: FreezeActor, remarks?: string | null) {
    const [[app]] = await conn.query<any[]>(
      `SELECT a.*,fp.latest_freeze_version,br.code AS branch_code,br.name AS branch_name
       FROM ${CRM.applications} a
       LEFT JOIN ${CRM.fapApplicationProfiles} fp ON fp.application_id=a.id
       LEFT JOIN ${CRM.masterBranches} br ON br.id=a.branch_id
       WHERE a.id=? AND a.deleted_at IS NULL FOR UPDATE`,
      [applicationId],
    );
    ensure(app, 'Application not found', 404);
    const version = num(app.latest_freeze_version) + 1;
    const freezeId = crypto.randomUUID();
    const base = {fap_freeze_id: freezeId, source_application_id: applicationId};

    const [[p = {}]] = await conn.query<any[]>(
      `SELECT p.*,bc.code AS bc_code,bc.name AS bc_name,ps.code AS ps_code,ps.name AS ps_name,
              ind.code AS ind_code,ind.name AS ind_name,ro.code AS ro_code,ro.name AS ro_name,${LOCATION_COLUMNS('p')}
       FROM ${CRM.fapApplicationProfiles} p
       LEFT JOIN ${CRM.masterBusinessCategories} bc ON bc.id=p.business_category_id
       LEFT JOIN ${CRM.masterPremiseStatuses} ps ON ps.id=p.premise_status_id
       LEFT JOIN ${CRM.masterIndustrySegments} ind ON ind.id=p.industry_segment_id
       LEFT JOIN ${CRM.masterBusinessRoles} ro ON ro.id=p.business_role_id
       ${LOCATION_JOINS('p')}
       WHERE p.application_id=?`,
      [applicationId],
    );
    // The signed FAP form: its current file and the OCR comparison of that file.
    const [[fapFile]] = await conn.query<any[]>(
      `SELECT f.id,f.file_name,COALESCE(f.storage_path,f.storage_key) AS path
       FROM ${CRM.applicationDocumentFiles} f
       JOIN ${CRM.applicationDocumentChecklists} c ON c.id=f.checklist_id
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id AND t.code='FAP'
       WHERE f.application_id=? AND f.deleted_at IS NULL AND f.is_current_active=1 LIMIT 1`,
      [applicationId],
    );
    const [[comparison]] = await conn.query<any[]>(
      `SELECT id,remarks FROM ${CRM.fapDocumentOcrComparisons} WHERE application_id=? AND document_file_id<=>? ORDER BY created_at DESC LIMIT 1`,
      [applicationId, fapFile?.id ?? null],
    );
    const [[bank]] = await conn.query<any[]>(
      `SELECT COALESCE(SUM(monthly_installment),0) AS total FROM ${CRM.fapBankFacilities}
       WHERE application_id=? AND deleted_at IS NULL`,
      [applicationId],
    );

    // Earlier freezes stay; only the newest is the latest.
    await conn.execute(
      `UPDATE ${CRM.frozenFapApplications} SET is_latest_freeze=0 WHERE source_application_id=? AND is_latest_freeze=1`,
      [applicationId],
    );
    const he = num(p.asset_he_liugong);
    const truck = num(p.asset_truck_liugong);
    const heNon = num(p.asset_he_non_liugong);
    const truckNon = num(p.asset_truck_non_liugong);
    const liugong = he + truck;
    const nonLiugong = heNon + truckNon;
    const grand = liugong + nonLiugong;
    await insert(conn, CRM.frozenFapApplications, {
      id: freezeId,
      source_application_id: applicationId,
      source_business_partner_id: app.business_partner_id,
      freeze_version: version,
      is_latest_freeze: 1,
      fap_registration_number: p.fap_registration_number,
      application_date: app.application_date,
      customer_category: app.customer_category,
      stage_code_at_freeze: stageCode,
      // an application has no stored status; the frozen copy only records that the stage was submitted
      status_code_at_freeze: 'SUBMITTED',
      uploaded_fap_file_id: fapFile?.id,
      uploaded_fap_file_name: fapFile?.file_name,
      uploaded_fap_file_path: fapFile?.path,
      // Remarks given at submit win over the comparison remarks (as in the old archive).
      comparison_remarks: remarks?.trim() ? remarks.trim() : comparison?.remarks,
      company_name: p.company_name ?? '',
      business_category_code: p.bc_code,
      business_category_name: p.bc_name,
      nib: p.nib,
      nib_date: p.nib_date,
      npwp: p.npwp,
      establishment_act_no: p.establishment_act_no,
      establishment_date: p.establishment_date,
      branch_code: app.branch_code,
      branch_name: app.branch_name,
      premise_status_code: p.ps_code,
      premise_status_name: p.ps_name,
      company_address: p.company_address,
      country_code: p.country_code,
      country_name: p.country_name,
      province_name: p.province_name,
      city_name: p.city_name,
      district_name: p.district_name,
      village_name: p.village_name,
      postal_code: p.postal_code,
      rt: p.rt,
      rw: p.rw,
      phone_fax: p.phone_fax,
      company_email: p.company_email,
      website: p.website,
      main_business: p.main_business,
      repayment_source: p.repayment_source,
      experience_years: num(p.experience_years),
      experience_months: num(p.experience_months),
      latest_deed_no: p.latest_deed_no,
      latest_deed_date: p.latest_deed_date,
      asset_he_liugong: he,
      asset_truck_liugong: truck,
      asset_total_liugong: liugong,
      asset_pct_liugong: pct(liugong, grand),
      asset_he_non_liugong: heNon,
      asset_truck_non_liugong: truckNon,
      asset_total_non_liugong: nonLiugong,
      asset_pct_non_liugong: pct(nonLiugong, grand),
      asset_grand_total_units: grand,
      industry_segment_code: p.ind_code,
      industry_segment_name: p.ind_name,
      business_role_code: p.ro_code,
      business_role_name: p.ro_name,
      reference_comments: p.reference_comments,
      // Same total as the FAP form: every listed facility.
      total_monthly_bank_installment: num(bank?.total),
      is_financial_audited: p.is_financial_audited ? 1 : 0,
      frozen_by_user_id: Number.isInteger(Number(actor.portalUserId)) && Number(actor.portalUserId) > 0 ? Number(actor.portalUserId) : null,
      frozen_by_name: String(actor.name || actor.username || 'User').slice(0, 150),
      frozen_by_role: (actor.displayRole || actor.role || null)?.slice(0, 30) ?? null,
    });

    /* Section 04: primary contact */
    const [pics] = await conn.query<any[]>(
      `SELECT c.*,pp.code AS pos_code,pp.name AS pos_name,${LOCATION_COLUMNS('c')}
       FROM ${CRM.fapPrimaryContacts} c
       LEFT JOIN ${CRM.masterPicPositions} pp ON pp.id=c.position_id
       ${LOCATION_JOINS('c')}
       WHERE c.application_id=?`,
      [applicationId],
    );
    for (const c of pics)
      await insert(conn, CRM.frozenFapPrimaryContacts, {
        id: crypto.randomUUID(),
        ...base,
        pic_name: c.pic_name,
        position_code: c.pos_code,
        position_name: c.pos_name,
        phone: c.phone,
        email: c.email,
        country_name: c.country_name,
        province_name: c.province_name,
        city_name: c.city_name,
        district_name: c.district_name,
        village_name: c.village_name,
        postal_code: c.postal_code,
        rt: c.rt,
        rw: c.rw,
        current_address: c.current_address,
      });

    /* Section 05: financing purposes (the selected options) */
    const [purposes] = await conn.query<any[]>(
      `SELECT o.code,o.param_key,o.label,o.group_label,fp.is_selected FROM ${CRM.fapFinancingPurposes} fp
       JOIN ${CRM.masterFinancingPurposeOptions} o ON o.id=fp.purpose_option_id
       WHERE fp.application_id=? AND fp.is_selected=1 ORDER BY o.sort_order`,
      [applicationId],
    );
    for (const o of purposes)
      await insert(conn, CRM.frozenFapFinancingPurposes, {
        id: crypto.randomUUID(),
        ...base,
        purpose_code: o.code,
        param_key: o.param_key,
        purpose_label: o.label,
        group_label: o.group_label ?? '',
        is_selected: 1,
      });

    /* Section 06: project contracts */
    const [projects] = await conn.query<any[]>(
      `SELECT pc.*,r.code AS role_code,r.name AS role_name FROM ${CRM.fapProjectContracts} pc
       LEFT JOIN ${CRM.masterProjectRoles} r ON r.id=pc.project_role_id
       WHERE pc.application_id=? AND pc.deleted_at IS NULL ORDER BY pc.row_position`,
      [applicationId],
    );
    for (const pc of projects)
      await insert(conn, CRM.frozenFapProjectContracts, {
        id: crypto.randomUUID(),
        ...base,
        row_position: num(pc.row_position),
        project_owner: pc.project_owner,
        project_location: pc.project_location,
        project_role_code: pc.role_code,
        project_role_name: pc.role_name,
        contract_status: pc.contract_status,
      });

    /* Section 07: bank / leasing facilities */
    const [banks] = await conn.query<any[]>(
      `SELECT b.*,fi.code AS fi_code,fi.name AS fi_name,cu.code AS cur_code FROM ${CRM.fapBankFacilities} b
       LEFT JOIN ${CRM.masterFinancialInstitutions} fi ON fi.id=b.financial_institution_id
       LEFT JOIN ${CRM.masterCurrencies} cu ON cu.id=b.currency_id
       WHERE b.application_id=? AND b.deleted_at IS NULL ORDER BY b.row_position`,
      [applicationId],
    );
    for (const b of banks)
      await insert(conn, CRM.frozenFapBankFacilities, {
        id: crypto.randomUUID(),
        ...base,
        row_position: num(b.row_position),
        institution_code: b.fi_code,
        institution_name: b.fi_name,
        currency_code: b.cur_code,
        credit_facility: b.credit_facility,
        monthly_installment: b.monthly_installment,
        year_started: b.year_started,
        interest_rate: b.interest_rate,
        payment_record: b.payment_record,
        facility_status: b.facility_status,
        comments: b.comments,
      });

    /* Section 08: financing proposal, its terms, units and document requirements */
    const [proposals] = await conn.query<any[]>(
      `SELECT fp.*,pu.code AS pu_code,pu.name AS pu_name,fm.code AS fm_code,fm.name AS fm_name,cu.code AS cur_code,
              pt.code AS pt_code,pt.name AS pt_name,src.code AS src_code,src.name AS src_name
       FROM ${CRM.fapFinancingProposals} fp
       LEFT JOIN ${CRM.masterFacilityPurposes} pu ON pu.id=fp.facility_purpose_id
       LEFT JOIN ${CRM.masterFinancingMethods} fm ON fm.id=fp.financing_method_id
       LEFT JOIN ${CRM.masterCurrencies} cu ON cu.id=fp.currency_id
       LEFT JOIN ${CRM.masterPaymentTimings} pt ON pt.id=fp.payment_timing_id
       LEFT JOIN ${CRM.masterApplicationSources} src ON src.id=fp.application_source_id
       WHERE fp.application_id=? AND fp.deleted_at IS NULL AND fp.is_active=1`,
      [applicationId],
    );
    for (const fp of proposals) {
      const units = [fp.realization_liugong_he, fp.realization_liugong_truck, fp.realization_non_liugong_he, fp.realization_non_liugong_truck].map(num);
      await insert(conn, CRM.frozenFapFinancingProposals, {
        id: crypto.randomUUID(),
        ...base,
        facility_purpose_code: fp.pu_code,
        facility_purpose_name: fp.pu_name,
        purpose_detail: fp.purpose_detail,
        financing_method_code: fp.fm_code,
        financing_method_name: fp.fm_name,
        currency_code: fp.cur_code,
        financing_value: fp.financing_value,
        financing_value_display: fp.financing_value_display,
        down_payment_value: fp.down_payment_value,
        security_deposit: fp.security_deposit,
        interest_rate: fp.interest_rate,
        tenor_months: fp.tenor_months,
        payment_timing_code: fp.pt_code,
        payment_timing_name: fp.pt_name,
        estimated_monthly_installment: fp.estimated_monthly_installment,
        application_source_code: fp.src_code,
        application_source_name: fp.src_name,
        realization_liugong_he: units[0],
        realization_liugong_truck: units[1],
        realization_non_liugong_he: units[2],
        realization_non_liugong_truck: units[3],
        realization_total_units: units.reduce((a, b) => a + b, 0),
        proposal_notes: fp.proposal_notes,
      });
    }
    const [units] = await conn.query<any[]>(
      `SELECT u.*,ca.code AS ca_code,ca.name AS ca_name,b.code AS b_code,b.name AS b_name,ty.code AS ty_code,ty.name AS ty_name,
              m.code AS m_code,m.name AS m_name,s.code AS s_code,s.name AS s_name
       FROM ${CRM.fapEquipmentUnits} u
       LEFT JOIN ${CRM.masterEquipmentCategories} ca ON ca.id=u.unit_category_id
       LEFT JOIN ${CRM.masterEquipmentBrands} b ON b.id=u.brand_id
       LEFT JOIN ${CRM.masterEquipmentTypes} ty ON ty.id=u.unit_type_id
       LEFT JOIN ${CRM.masterEquipmentModels} m ON m.id=u.model_id
       LEFT JOIN ${CRM.masterEquipmentAssets} s ON s.id=u.asset_id
       WHERE u.application_id=? AND u.deleted_at IS NULL ORDER BY u.row_position`,
      [applicationId],
    );
    for (const u of units)
      await insert(conn, CRM.frozenFapEquipmentUnits, {
        id: crypto.randomUUID(),
        ...base,
        row_position: num(u.row_position),
        unit_category_code: u.ca_code,
        unit_category_name: u.ca_name,
        brand_code: u.b_code,
        brand_name: u.b_name,
        unit_type_code: u.ty_code,
        unit_type_name: u.ty_name,
        model_code: u.m_code,
        model_name: u.m_name,
        asset_code: u.s_code,
        asset_name: u.s_name,
        class_ton: u.class_ton,
        quantity: u.quantity,
        unit_year: u.unit_year,
        specifications: u.specifications,
      });
    const [requirements] = await conn.query<any[]>(
      `SELECT r.code,r.param_key,r.label,d.is_checked FROM ${CRM.fapDocRequirements} d
       JOIN ${CRM.masterFapDocumentRequirements} r ON r.id=d.doc_requirement_id
       WHERE d.application_id=? ORDER BY r.sort_order`,
      [applicationId],
    );
    for (const r of requirements)
      await insert(conn, CRM.frozenFapDocRequirements, {
        id: crypto.randomUUID(),
        ...base,
        requirement_code: r.code,
        param_key: r.param_key,
        requirement_label: r.label,
        is_checked: r.is_checked ? 1 : 0,
      });

    /* Section 09: financial statements */
    const [statements] = await conn.query<any[]>(
      `SELECT * FROM ${CRM.fapFinancialStatements} WHERE application_id=? AND deleted_at IS NULL AND is_active=1
       ORDER BY fiscal_year`,
      [applicationId],
    );
    const amounts = [
      'current_assets', 'non_current_assets', 'total_assets', 'current_liabilities', 'non_current_liabilities',
      'total_liabilities', 'equity', 'total_liabilities_and_equity', 'revenue', 'gross_profit', 'operating_profit_ebit',
      'tax', 'net_income',
    ];
    for (const s of statements)
      await insert(conn, CRM.frozenFapFinancialStatements, {
        id: crypto.randomUUID(),
        ...base,
        fiscal_year: s.fiscal_year,
        is_audited: s.is_audited ? 1 : 0,
        ...Object.fromEntries(amounts.map(k => [k, num(s[k])])),
        is_balanced: s.is_balanced ? 1 : 0,
        current_ratio: s.current_ratio,
        debt_to_equity_ratio: s.debt_to_equity_ratio,
        net_profit_margin_pct: s.net_profit_margin_pct,
      });

    /* Legal: deeds with their review state, remark categories and stakeholders */
    const [deeds] = await conn.query<any[]>(
      `SELECT d.*,r.review_status,r.review_notes,r.approved_by,r.approved_at FROM ${CRM.fapLegalDeeds} d
       LEFT JOIN ${CRM.fapLegalDeedReviews} r ON r.deed_id=d.id
       WHERE d.application_id=? AND d.deleted_at IS NULL ORDER BY d.deed_date,d.created_at`,
      [applicationId],
    );
    for (const d of deeds) {
      const frozenDeedId = crypto.randomUUID();
      const [holders] = await conn.query<any[]>(
        `SELECT s.*,rt.code AS rt_code,rt.name AS rt_name,po.code AS po_code,po.name AS po_name,
                de.code AS de_code,de.name AS de_name,src.deed_number AS source_deed_number,${LOCATION_COLUMNS('s')}
         FROM ${CRM.fapLegalStakeholders} s
         LEFT JOIN ${CRM.masterLegalRepresentativeTypes} rt ON rt.id=s.representative_type_id
         LEFT JOIN ${CRM.masterStakeholderPositions} po ON po.id=s.position_id
         LEFT JOIN ${CRM.masterLegalDesignations} de ON de.id=s.designation_id
         LEFT JOIN ${CRM.fapLegalDeeds} src ON src.id=s.source_deed_id
         ${LOCATION_JOINS('s')}
         WHERE s.deed_id=? AND s.deleted_at IS NULL AND s.is_active=1 ORDER BY s.created_at,s.id`,
        [d.id],
      );
      const shares = holders.map(h => num(h.share_percentage));
      await insert(conn, CRM.frozenFapLegalDeeds, {
        id: frozenDeedId,
        ...base,
        source_deed_id: d.id,
        deed_type: d.deed_type,
        deed_number: d.deed_number,
        deed_date: d.deed_date,
        notary_name: d.notary_name,
        deed_status: d.deed_status,
        valid_until: d.valid_until,
        ministerial_decree_number: d.ministerial_decree_number,
        ministerial_decree_date: d.ministerial_decree_date,
        remarks: d.remarks,
        representative_note: d.representative_note,
        company_shareholder_note: d.company_shareholder_note,
        stakeholder_count: holders.length,
        shareholder_count: shares.filter(s => s > 0).length,
        total_share_percentage: Math.round(shares.reduce((a, b) => a + b, 0) * 100) / 100,
        is_selected: d.is_selected ? 1 : 0,
        is_latest_deed: d.is_latest_deed ? 1 : 0,
        review_status: d.review_status ?? 'DRAFT',
        review_notes: d.review_notes,
        approved_by: d.approved_by,
        approved_at: d.approved_at,
      });
      const [categories] = await conn.query<any[]>(
        `SELECT m.code,m.name FROM ${CRM.fapLegalDeedRemarkCategories} c
         JOIN ${CRM.masterLegalRemarkCategories} m ON m.id=c.remark_category_id WHERE c.deed_id=? ORDER BY m.sort_order`,
        [d.id],
      );
      for (const c of categories)
        await insert(conn, CRM.frozenFapLegalDeedRemarkCategories, {
          id: crypto.randomUUID(),
          fap_freeze_id: freezeId,
          frozen_deed_id: frozenDeedId,
          category_code: c.code,
          category_name: c.name,
        });
      for (const s of holders)
        await insert(conn, CRM.frozenFapLegalStakeholders, {
          id: crypto.randomUUID(),
          fap_freeze_id: freezeId,
          frozen_deed_id: frozenDeedId,
          source_application_id: applicationId,
          representative_type_code: s.rt_code,
          representative_type_name: s.rt_name,
          position_code: s.po_code,
          position_name: s.po_name,
          designation_code: s.de_code,
          designation_name: s.de_name,
          stakeholder_type: s.stakeholder_type,
          is_signatory: s.is_signatory,
          id_type: s.id_type,
          id_number: s.id_number,
          id_number_secondary: s.id_number_secondary,
          title: s.title,
          first_name: s.first_name,
          middle_name: s.middle_name,
          last_name: s.last_name,
          date_of_birth: s.date_of_birth,
          age_years: s.age_years,
          age_months: s.age_months,
          marital_status: s.marital_status,
          occupation: s.occupation,
          email: s.email,
          mobile_phone: s.mobile_phone,
          gender: s.gender,
          share_percentage: num(s.share_percentage),
          deposited_capital: num(s.deposited_capital),
          primary_capital: num(s.primary_capital),
          citizenship: s.citizenship,
          country_name: s.country_name,
          province_name: s.province_name,
          city_name: s.city_name,
          district_name: s.district_name,
          village_name: s.village_name,
          postal_code: s.postal_code,
          foreign_region_text: s.foreign_region_text,
          rt: s.rt,
          rw: s.rw,
          address: s.address,
          is_inherited: s.is_inherited ? 1 : 0,
          source_deed_number: s.source_deed_number,
        });
    }

    /* Documents: checklist state with the current file of each row */
    const [checklist] = await conn.query<any[]>(
      `SELECT c.*,t.code,t.name,f.file_name,COALESCE(f.storage_path,f.storage_key) AS file_path,f.file_size,
              f.uploaded_by,f.uploaded_at,COALESCE(o.is_mandatory,sd.is_mandatory,0) AS is_mandatory
       FROM ${CRM.applicationDocumentChecklists} c
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       LEFT JOIN ${CRM.applicationDocumentOverrides} o ON o.id=c.override_id
       LEFT JOIN ${CRM.frozenWorkflowStageDocuments} sd ON sd.workflow_freeze_id=c.workflow_freeze_id AND sd.stage_code=c.stage_code AND sd.document_code=c.document_code
       LEFT JOIN ${CRM.applicationDocumentFiles} f ON f.checklist_id=c.id AND f.is_current_active=1 AND f.deleted_at IS NULL
       WHERE c.application_id=? ORDER BY t.sort_order`,
      [applicationId],
    );
    for (const c of checklist)
      await insert(conn, CRM.frozenFapDocumentChecklists, {
        id: crypto.randomUUID(),
        ...base,
        document_code: c.code,
        document_name: c.name,
        assigned_role: c.assigned_role,
        is_mandatory: c.is_mandatory ? 1 : 0,
        status: c.status,
        active_file_name: c.file_name,
        active_file_path: c.file_path,
        active_file_size: c.file_size,
        active_file_uploaded_by: c.uploaded_by,
        active_file_uploaded_at: c.uploaded_at,
      });

    /* OCR: every difference of the latest comparison (open or noted) */
    if (comparison) {
      const [diffs] = await conn.query<any[]>(
        `SELECT * FROM ${CRM.fapDocumentOcrDiscrepancies} WHERE comparison_id=? ORDER BY created_at,id`,
        [comparison.id],
      );
      for (const x of diffs)
        await insert(conn, CRM.frozenFapOcrDiscrepancies, {
          id: crypto.randomUUID(),
          ...base,
          section_name: x.section_name,
          field_key: x.field_key,
          field_label: x.field_label,
          system_value: x.system_value,
          ocr_value: x.ocr_value,
          resolution_status: x.resolution_status,
        });
    }

    await conn.execute(`UPDATE ${CRM.fapApplicationProfiles} SET latest_freeze_version=? WHERE application_id=?`, [version, applicationId]);
    return {freezeId, version};
  }

  /** Every freeze of an application, newest first, each with its sections. */
  async list(applicationId: string) {
    const [heads] = await this.db.pool.query<any[]>(
      `SELECT * FROM ${CRM.frozenFapApplications} WHERE source_application_id=? ORDER BY freeze_version DESC`,
      [applicationId],
    );
    return Promise.all(heads.map(h => this.assemble(h)));
  }

  private async assemble(head: any) {
    const rows = async (table: string, order = 'id') => {
      const [r] = await this.db.pool.query<any[]>(`SELECT * FROM ${table} WHERE fap_freeze_id=? ORDER BY ${order}`, [head.id]);
      return r.map(({fap_freeze_id, source_application_id, ...rest}: any) => rest);
    };
    const [
      primaryContacts, financingPurposes, projectContracts, bankFacilities, financingProposals,
      equipmentUnits, docRequirements, financialStatements, deeds, remarkCategories, stakeholders, documentChecklists,
      discrepancies,
    ] = await Promise.all([
      rows(CRM.frozenFapPrimaryContacts),
      rows(CRM.frozenFapFinancingPurposes),
      rows(CRM.frozenFapProjectContracts, 'row_position'),
      rows(CRM.frozenFapBankFacilities, 'row_position'),
      rows(CRM.frozenFapFinancingProposals),
      rows(CRM.frozenFapEquipmentUnits, 'row_position'),
      rows(CRM.frozenFapDocRequirements),
      rows(CRM.frozenFapFinancialStatements, 'fiscal_year'),
      rows(CRM.frozenFapLegalDeeds, 'deed_date'),
      rows(CRM.frozenFapLegalDeedRemarkCategories),
      rows(CRM.frozenFapLegalStakeholders),
      rows(CRM.frozenFapDocumentChecklists),
      rows(CRM.frozenFapOcrDiscrepancies),
    ]);
    return {
      id: head.id,
      freezeVersion: head.freeze_version,
      isLatest: !!head.is_latest_freeze,
      frozenAt: head.frozen_at,
      frozenByName: head.frozen_by_name,
      frozenByRole: head.frozen_by_role,
      stageCode: head.stage_code_at_freeze,
      statusCode: head.status_code_at_freeze,
      comparisonRemarks: head.comparison_remarks,
      fapFile: head.uploaded_fap_file_name
        ? {id: head.uploaded_fap_file_id, name: head.uploaded_fap_file_name, path: head.uploaded_fap_file_path}
        : null,
      discrepancies: discrepancies.map((x: any) => ({
        section: x.section_name,
        field: x.field_key,
        label: x.field_label,
        systemValue: x.system_value,
        ocrValue: x.ocr_value,
        resolution: x.resolution_status,
      })),
      snapshot: {
        application: head,
        primaryContacts,
        financingPurposes,
        projectContracts,
        bankFacilities,
        financingProposals,
        equipmentUnits,
        docRequirements,
        financialStatements,
        deeds: deeds.map((d: any) => ({
          ...d,
          remarkCategories: remarkCategories.filter((c: any) => c.frozen_deed_id === d.id),
          stakeholders: stakeholders.filter((s: any) => s.frozen_deed_id === d.id),
        })),
        documentChecklists,
      },
    };
  }
}
