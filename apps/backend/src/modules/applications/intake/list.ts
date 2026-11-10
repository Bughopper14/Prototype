/** The application list. */
import {pool} from '../../../core/db/pool';

function listSelect() {
  return `SELECT a.application_id AS id,f.customer_id,f.customer_category,f.application_date,COALESCE(f.fap_registration_number, 'DRAFT') AS fap_number,COALESCE(f.company_name, 'No Company Name') AS company_name,f.company_type,f.nib,f.nib_date,f.npwp,f.establishment_act_no,f.establishment_date,f.branch_code,f.company_address,f.city,f.province,f.postal_code,f.experience_years,f.experience_months,COALESCE(p.application_status, 'DRAFT') AS status,COALESCE(l.stage, 'FAP_STAGE') AS lock_stage,p.skt_no,p.sppkp_no,p.phone_fax,p.email,p.website,p.main_business,p.location_status,p.repayment_source,p.latest_deed_no,p.latest_deed_date,p.industry_segment,p.business_role,p.asset_summary_he_liu_gong,p.asset_summary_truck_liu_gong,p.asset_summary_he_non_liu_gong,p.asset_summary_truck_non_liu_gong,fd.financing_value,fd.tenor_months,fd.financing_method,(SELECT COUNT(*) FROM application_document_checklist d WHERE d.application_id=a.application_id AND d.status='VERIFIED') AS verified_docs,(SELECT COUNT(*) FROM application_document_checklist d WHERE d.application_id=a.application_id) AS total_docs,a.created_at FROM all_applications a LEFT JOIN new_application_fap_stage f ON f.id_fap_stage=a.id_fap_stage LEFT JOIN new_application_pre_analisis p ON p.id_pre_analysis=a.id_pre_analysis LEFT JOIN application_submit_lock l ON l.application_id=a.application_id LEFT JOIN financing_detail fd ON fd.application_id=a.application_id AND fd.deleted_at IS NULL ORDER BY a.created_at DESC,a.application_id`;
}
export async function listIntake() {
  if (!pool) return [];
  const [rows] = await pool.query<any[]>(listSelect());
  // The list carries per-application deed review counts so the dashboard can show who has to act (no full legal data).
  const [deedRows] = await pool.query<any[]>(
    `SELECT application_id, JSON_UNQUOTE(JSON_EXTRACT(review, '$.review.status')) AS status, COUNT(*) AS n
     FROM deed_review GROUP BY application_id, status`,
  );
  const deedCounts = new Map<string, Record<string, number>>();
  for (const d of deedRows) {
    const counts = deedCounts.get(d.application_id) || {};
    counts[String(d.status)] = Number(d.n);
    deedCounts.set(d.application_id, counts);
  }
  return rows.map(r => ({
    ...r,
    deeds_pending_check: deedCounts.get(r.id)?.PENDING_CHECK || 0,
    deeds_pending_approval: deedCounts.get(r.id)?.PENDING_APPROVAL || 0,
    deeds_rejected: (deedCounts.get(r.id)?.REJECTED || 0) + (deedCounts.get(r.id)?.NEEDS_CORRECTION || 0),
    stage:
      r.lock_stage === 'PRE_ANALYSIS' ||
      [
        'SUBMITTED_TO_BS',
        'BS_VERIFIED',
        'IN_CA_LEGAL_REVIEW',
        'CREDIT_COMMITTEE_REVIEW',
        'APPROVED',
      ].includes(r.status)
        ? 'Pre-analysis'
        : 'FAP Stage',
  }));
}
