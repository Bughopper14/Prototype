/** Application list query against crm_applications and master lookups on crm_liugong1. */
import {pool} from '../../../core/db/pool';
import {dateStr} from './helpers';

export async function listIntake() {
  const [rows] = await pool.query<any[]>(`
    SELECT
      a.id,
      a.fap_registration_number,
      a.application_date,
      a.customer_id,
      a.customer_category,
      a.is_fap_doc_uploaded,
      a.is_fap_form_locked,
      a.latest_freeze_version,
      a.maker_user_id,
      a.maker_name,
      a.created_at,
      a.updated_at,
      ws.code AS status_code,
      ws.name AS status_name,
      st.code AS stage_code,
      st.name AS stage_name,
      sp_pre.id AS pre_progress_id,
      p.company_name AS profile_company_name,
      p.npwp AS profile_npwp,
      p.nib AS profile_nib,
      c.company_name AS partner_company_name,
      c.npwp AS partner_npwp,
      c.nib AS partner_nib,
      bc.code AS company_type_code,
      bc.name AS company_type_name,
      br.code AS branch_code,
      br.name AS branch_name,
      fp.financing_value,
      fp.tenor_months,
      cur.code AS currency_code,
      COALESCE(doc_agg.total_docs, 0) AS total_docs,
      COALESCE(doc_agg.verified_docs, 0) AS verified_docs,
      COALESCE(deed_agg.deeds_rejected, 0) AS deeds_rejected,
      COALESCE(deed_agg.deeds_pending_check, 0) AS deeds_pending_check,
      COALESCE(deed_agg.deeds_pending_approval, 0) AS deeds_pending_approval
    FROM crm_applications a
    JOIN crm_master_workflow_statuses ws ON ws.id = a.current_status_id
    JOIN crm_master_workflow_stages st ON st.id = ws.stage_id
    LEFT JOIN crm_master_business_partners c ON c.id = a.customer_id
    LEFT JOIN crm_fap_application_profiles p ON p.application_id = a.id
    LEFT JOIN crm_master_business_categories bc ON bc.id = COALESCE(p.business_category_id, c.business_category_id)
    LEFT JOIN crm_master_branches br ON br.id = COALESCE(a.branch_id, c.branch_id)
    LEFT JOIN crm_master_workflow_stages pre_st ON pre_st.code = 'PRE_ANALYSIS'
    LEFT JOIN crm_application_stage_progress sp_pre ON sp_pre.application_id = a.id AND sp_pre.stage_id = pre_st.id
    LEFT JOIN crm_fap_financing_proposals fp ON fp.application_id = a.id AND fp.deleted_at IS NULL AND fp.is_active = 1
    LEFT JOIN crm_master_currencies cur ON cur.id = fp.currency_id
    LEFT JOIN (
      SELECT
        application_id,
        COUNT(*) AS total_docs,
        SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) AS verified_docs
      FROM crm_application_document_checklists
      GROUP BY application_id
    ) doc_agg ON doc_agg.application_id = a.id
    LEFT JOIN (
      SELECT
        dr.application_id,
        SUM(
          CASE
            WHEN dr.review_status = 'NEEDS_REVISION'
              OR UPPER(COALESCE(dr.workflow_status, '')) IN ('REJECTED', 'NEEDS_CORRECTION', 'NEEDS_REVISION')
            THEN 1 ELSE 0
          END
        ) AS deeds_rejected,
        SUM(
          CASE
            WHEN UPPER(COALESCE(dr.workflow_status, '')) IN ('PENDING_CHECK', 'PENDING_BS_CHECK')
            THEN 1 ELSE 0
          END
        ) AS deeds_pending_check,
        SUM(
          CASE
            WHEN UPPER(COALESCE(dr.workflow_status, '')) = 'PENDING_APPROVAL'
            THEN 1 ELSE 0
          END
        ) AS deeds_pending_approval
      FROM crm_fap_legal_deed_reviews dr
      JOIN crm_fap_legal_deeds ld ON ld.id = dr.deed_id AND ld.deleted_at IS NULL
      GROUP BY dr.application_id
    ) deed_agg ON deed_agg.application_id = a.id
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC
  `);

  return rows.map(r => {
    const companyName = r.profile_company_name || r.partner_company_name || '';
    const companyType = r.company_type_code || r.company_type_name || '';
    const npwp = r.profile_npwp || r.partner_npwp || '';
    const nib = r.profile_nib || r.partner_nib || '';
    const branchCode = r.branch_code || r.branch_name || '';
    const applicationDate = dateStr(r.application_date) || dateStr(r.created_at) || '';
    const financingValue =
      r.financing_value !== null && r.financing_value !== undefined ? Number(r.financing_value) : 0;
    const tenorMonths = r.tenor_months !== null && r.tenor_months !== undefined ? Number(r.tenor_months) : null;
    const totalDocs = Number(r.total_docs ?? 0);
    const verifiedDocs = Number(r.verified_docs ?? 0);
    const deedsRejected = Number(r.deeds_rejected ?? 0);
    const deedsPendingCheck = Number(r.deeds_pending_check ?? 0);
    const deedsPendingApproval = Number(r.deeds_pending_approval ?? 0);
    const stage =
      r.stage_code === 'FAP_STAGE' && r.pre_progress_id ? 'Pre-analysis' : r.stage_name || 'FAP Stage';

    return {
      id: r.id,
      fapNumber: r.fap_registration_number,
      fap_number: r.fap_registration_number,
      applicationDate,
      application_date: applicationDate,
      customerId: r.customer_id,
      customer_id: r.customer_id,
      customerCategory: r.customer_category,
      customer_category: r.customer_category,
      customerStatus: r.customer_category,
      customer_status: r.customer_category,
      companyName,
      company_name: companyName,
      companyType,
      company_type: companyType,
      npwp,
      nib,
      branchCode,
      branch_code: branchCode,
      status: r.status_code,
      statusName: r.status_name,
      status_name: r.status_name,
      stage,
      isFapDocUploaded: Boolean(r.is_fap_doc_uploaded),
      isFapFormLocked: Boolean(r.is_fap_form_locked),
      fapDocUploaded: Boolean(r.is_fap_doc_uploaded),
      fapFormLocked: Boolean(r.is_fap_form_locked),
      latestFreezeVersion: Number(r.latest_freeze_version ?? 0),
      makerUserId: r.maker_user_id,
      makerName: r.maker_name || '',
      currency: r.currency_code || 'IDR',
      financingValue,
      financing_value: financingValue,
      tenorMonths,
      tenor_months: tenorMonths,
      verifiedDocs,
      verified_docs: verifiedDocs,
      totalDocs,
      total_docs: totalDocs,
      deedsRejected,
      deeds_rejected: deedsRejected,
      deedsPendingCheck,
      deeds_pending_check: deedsPendingCheck,
      deedsPendingApproval,
      deeds_pending_approval: deedsPendingApproval,
      customer: {
        id: r.customer_id,
        companyName,
        companyType,
        npwp,
        nib,
      },
      createdAt: r.created_at,
      created_at: r.created_at,
      updatedAt: r.updated_at,
      updated_at: r.updated_at,
    };
  });
}
