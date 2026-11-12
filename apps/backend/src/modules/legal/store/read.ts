/** Hydrates legal deeds, remark categories, review history, and stakeholders from crm_liugong1. */
import {pool} from '../../../core/db/pool';
import {dateStr} from '../../applications/intake/helpers';
import {readStakeholderIdentityDocs} from '../../identity-documents/identity-documents.store';
import {mapStakeholder} from './helpers';

export async function readLegal(applicationId: string) {
  const [
    [deedRows],
    [remarkRows],
    [reviewRows],
    [historyRows],
    [snapshotRows],
    [partyRows],
    [catRemarkRows],
    [stakeholderRows],
  ] = await Promise.all([
    pool.query<any[]>(
      `SELECT * FROM crm_fap_legal_deeds
       WHERE application_id = ? AND deleted_at IS NULL
       ORDER BY CASE WHEN deed_type = 'ESTABLISHMENT' THEN 0 ELSE 1 END, deed_date ASC, created_at ASC`,
      [applicationId],
    ),
    pool.query<any[]>(
      `SELECT rc.deed_id, m.code, m.name
       FROM crm_fap_legal_deed_remark_categories rc
       JOIN crm_master_legal_remark_categories m ON m.id = rc.remark_category_id
       JOIN crm_fap_legal_deeds d ON d.id = rc.deed_id
       WHERE d.application_id = ? AND d.deleted_at IS NULL`,
      [applicationId],
    ),
    pool.query<any[]>(
      'SELECT * FROM crm_fap_legal_deed_reviews WHERE application_id = ?',
      [applicationId],
    ),
    pool.query<any[]>(
      `SELECT h.*
       FROM crm_fap_legal_deed_review_histories h
       JOIN crm_fap_legal_deed_reviews r ON r.id = h.deed_review_id
       WHERE r.application_id = ?
       ORDER BY h.sort_order ASC, h.created_at ASC`,
      [applicationId],
    ),
    pool.query<any[]>(
      `SELECT s.*
       FROM crm_fap_legal_deed_approved_snapshots s
       JOIN crm_fap_legal_deed_reviews r ON r.id = s.deed_review_id
       WHERE r.application_id = ?`,
      [applicationId],
    ),
    pool.query<any[]>(
      `SELECT p.*
       FROM crm_fap_legal_deed_parties p
       JOIN crm_fap_legal_deed_reviews r ON r.id = p.deed_review_id
       WHERE r.application_id = ?
       ORDER BY p.sort_order ASC`,
      [applicationId],
    ),
    pool.query<any[]>(
      `SELECT c.*
       FROM crm_fap_legal_deed_category_remarks c
       JOIN crm_fap_legal_deed_reviews r ON r.id = c.deed_review_id
       WHERE r.application_id = ?`,
      [applicationId],
    ),
    pool.query<any[]>(
      `SELECT * FROM crm_fap_legal_stakeholders
       WHERE application_id = ? AND deleted_at IS NULL AND is_active = 1
       ORDER BY share_percentage DESC, created_at ASC`,
      [applicationId],
    ),
  ]);

  const remarksByDeed = new Map<string, string[]>();
  for (const r of remarkRows) {
    const arr = remarksByDeed.get(r.deed_id) || [];
    arr.push(r.code);
    remarksByDeed.set(r.deed_id, arr);
  }

  const reviewByDeed = new Map<string, any>();
  for (const r of reviewRows) reviewByDeed.set(r.deed_id, r);

  const historyByReview = new Map<string, any[]>();
  for (const h of historyRows) {
    const arr = historyByReview.get(h.deed_review_id) || [];
    arr.push({
      action: h.action,
      status: h.status_code,
      actor: h.actor_name || '',
      role: h.actor_role || '',
      at: h.acted_at || '',
      comments: h.comments || '',
      ...(h.document_id ? {documentId: h.document_id} : {}),
      revision: Number(h.revision || 1),
    });
    historyByReview.set(h.deed_review_id, arr);
  }

  const snapshotByReview = new Map<string, {APPROVED?: any; COMPARISON_BEFORE?: any}>();
  for (const s of snapshotRows) {
    const entry = snapshotByReview.get(s.deed_review_id) || {};
    entry[s.snapshot_kind as 'APPROVED' | 'COMPARISON_BEFORE'] = {
      type: s.deed_type || undefined,
      deedNumber: s.deed_number || undefined,
      deedDate: s.deed_date || undefined,
      ministerialDecreeNumber: s.ministerial_decree_number || undefined,
      ministerialDecreeDate: s.ministerial_decree_date || undefined,
      remarks: s.remarks || undefined,
      infoAdded: s.info_added || undefined,
    };
    snapshotByReview.set(s.deed_review_id, entry);
  }

  const partiesByReview = new Map<string, {representative?: string; shareholders?: string[]}>();
  for (const p of partyRows) {
    const entry = partiesByReview.get(p.deed_review_id) || {};
    if (p.party_role === 'REPRESENTATIVE') {
      entry.representative = p.party_name;
    } else if (p.party_role === 'SHAREHOLDER') {
      entry.shareholders = [...(entry.shareholders || []), p.party_name];
    }
    partiesByReview.set(p.deed_review_id, entry);
  }

  const catRemarksByReview = new Map<string, Record<string, string>>();
  for (const c of catRemarkRows) {
    const entry = catRemarksByReview.get(c.deed_review_id) || {};
    entry[c.category_code] = c.remark_text || '';
    catRemarksByReview.set(c.deed_review_id, entry);
  }

  const stakeholderIds = stakeholderRows.map(s => s.id);
  const ocrMap = await readStakeholderIdentityDocs(stakeholderIds);

  const mappedStakeholders = await Promise.all(
    stakeholderRows.map(r => mapStakeholder(r, undefined, ocrMap.get(r.id) || null)),
  );
  const stakeholdersByDeed = new Map<string, any[]>();
  for (const st of mappedStakeholders) {
    const arr = stakeholdersByDeed.get(st.deedId) || [];
    arr.push(st);
    stakeholdersByDeed.set(st.deedId, arr);
  }

  const deeds = deedRows.map(d => {
    const revRow = reviewByDeed.get(d.id);
    const cats = remarksByDeed.get(d.id) || [];
    const defaultReviewStatus =
      revRow?.review_status === 'APPROVED'
        ? 'APPROVED'
        : revRow?.review_status === 'NEEDS_REVISION'
          ? 'NEEDS_CORRECTION'
          : 'DRAFT';
    const snaps = revRow ? snapshotByReview.get(revRow.id) : undefined;
    const parties = revRow ? partiesByReview.get(revRow.id) : undefined;
    const categoryRemarks = revRow ? catRemarksByReview.get(revRow.id) : undefined;

    const review: any = revRow
      ? {
          status: revRow.workflow_status || defaultReviewStatus,
          revision: Number(revRow.revision || 1),
          ...(revRow.document_id ? {documentId: revRow.document_id} : {}),
          ...(revRow.submitted_by_id ? {submittedById: revRow.submitted_by_id} : {}),
          ...(revRow.submitted_by ? {submittedBy: revRow.submitted_by} : {}),
          ...(revRow.submitted_at ? {submittedAt: revRow.submitted_at} : {}),
          ...(revRow.checked_by_id ? {checkedById: revRow.checked_by_id} : {}),
          ...(revRow.checked_by ? {checkedBy: revRow.checked_by} : {}),
          ...(revRow.checked_at ? {checkedAt: revRow.checked_at} : {}),
          ...(revRow.approved_by ? {approvedBy: revRow.approved_by} : {}),
          ...(revRow.approved_at ? {approvedAt: revRow.approved_at} : {}),
          ...(revRow.rejected_by ? {rejectedBy: revRow.rejected_by} : {}),
          ...(revRow.rejected_at ? {rejectedAt: revRow.rejected_at} : {}),
          ...(revRow.rejection_reason ? {rejectionReason: revRow.rejection_reason} : {}),
          ...(revRow.correction_by ? {correctionBy: revRow.correction_by} : {}),
          ...(revRow.correction_at ? {correctionAt: revRow.correction_at} : {}),
          ...(revRow.correction_note ? {correctionNote: revRow.correction_note} : {}),
          ...(snaps?.COMPARISON_BEFORE ? {comparisonBefore: snaps.COMPARISON_BEFORE} : {}),
        }
      : {status: defaultReviewStatus, revision: 1};

    return {
      id: d.id,
      type: d.deed_type === 'ESTABLISHMENT' ? 'establishment' : 'amendment',
      source: revRow?.source || 'manual',
      createdAt:
        revRow?.deed_created_at ||
        (d.created_at instanceof Date ? d.created_at.toISOString() : d.created_at),
      deedNumber: d.deed_number || '',
      deedDate: dateStr(d.deed_date) || '',
      notaryName: d.notary_name || '',
      deedStatus: d.deed_status || 'ACTIVE',
      validUntil: dateStr(d.valid_until) || '',
      ministerialDecreeNumber: d.ministerial_decree_number || '',
      ministerialDecreeDate: dateStr(d.ministerial_decree_date) || '',
      remarks: d.remarks || '',
      remarkCategoryId: cats[0] || '',
      remarkCategoryIds: cats,
      categoryRemarks: categoryRemarks || undefined,
      infoAdded: revRow?.info_added || undefined,
      parties: parties || undefined,
      isSelected: Boolean(d.is_selected),
      isLatestDeed: Boolean(d.is_latest_deed),
      stakeholders: stakeholdersByDeed.get(d.id) || [],
      review,
      reviewHistory: revRow ? historyByReview.get(revRow.id) || [] : [],
      ...(snaps?.APPROVED ? {approvedSnapshot: snaps.APPROVED, approvedAt: revRow?.approved_at || null} : {}),
    };
  });

  const selected = deeds.find(d => d.isSelected) || deeds[0];
  const selectedType = selected?.type || 'establishment';
  const activeStakeholders = selected?.stakeholders || [];

  return {
    selectedDeedId: selected?.id || '',
    selectedDeed: selectedType,
    deeds,
    stakeholders: activeStakeholders,
  };
}

export async function readLegalForApplication(applicationId: string) {
  const legal = await readLegal(applicationId);
  return {legal, stakeholders: legal.stakeholders};
}
