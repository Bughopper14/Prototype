/** Persist deed review workflow status, history, parties, category remarks, and snapshots relationally. */
import {randomUUID} from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {pool} from '../../../core/db/pool';

type SqlExecutor = Pick<PoolConnection, 'query' | 'execute'>;

export function mapReviewStatus(statusRaw: unknown): 'PENDING' | 'APPROVED' | 'NEEDS_REVISION' {
  const s = String(statusRaw || '').toUpperCase();
  if (s === 'APPROVED') return 'APPROVED';
  if (s === 'REJECTED' || s === 'NEEDS_CORRECTION' || s === 'NEEDS_REVISION') return 'NEEDS_REVISION';
  return 'PENDING';
}

async function upsertSnapshot(
  db: SqlExecutor,
  deedReviewId: string,
  kind: 'APPROVED' | 'COMPARISON_BEFORE',
  snap: any,
) {
  if (!snap || typeof snap !== 'object') return;
  await db.execute(
    `INSERT INTO crm_fap_legal_deed_approved_snapshots (
      id, deed_review_id, snapshot_kind, deed_type, deed_number, deed_date,
      ministerial_decree_number, ministerial_decree_date, remarks, info_added
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      deed_type = VALUES(deed_type),
      deed_number = VALUES(deed_number),
      deed_date = VALUES(deed_date),
      ministerial_decree_number = VALUES(ministerial_decree_number),
      ministerial_decree_date = VALUES(ministerial_decree_date),
      remarks = VALUES(remarks),
      info_added = VALUES(info_added)`,
    [
      randomUUID(),
      deedReviewId,
      kind,
      snap.type ?? null,
      snap.deedNumber ?? null,
      snap.deedDate ?? null,
      snap.ministerialDecreeNumber ?? null,
      snap.ministerialDecreeDate ?? null,
      snap.remarks ?? null,
      snap.infoAdded ?? null,
    ],
  );
}

export async function syncDeedReviewChildren(
  db: SqlExecutor,
  deedReviewId: string,
  applicationId: string,
  deedId: string,
  opts: {
    reviewHistory?: any[];
    approvedSnapshot?: any;
    comparisonBefore?: any;
    parties?: any;
    categoryRemarks?: Record<string, any> | null;
  },
) {
  if (Array.isArray(opts.reviewHistory)) {
    await db.execute('DELETE FROM crm_fap_legal_deed_review_histories WHERE deed_review_id = ?', [deedReviewId]);
    for (let i = 0; i < opts.reviewHistory.length; i++) {
      const h = opts.reviewHistory[i] || {};
      await db.execute(
        `INSERT INTO crm_fap_legal_deed_review_histories (
          id, deed_review_id, application_id, deed_id, revision, action, status_code,
          actor_name, actor_role, acted_at, comments, document_id, sort_order
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          randomUUID(),
          deedReviewId,
          applicationId,
          deedId,
          Number(h.revision || 1),
          String(h.action || 'SUBMIT').slice(0, 30),
          String(h.status || 'DRAFT').slice(0, 30),
          h.actor ? String(h.actor).slice(0, 150) : null,
          h.role ? String(h.role).slice(0, 50) : null,
          h.at ? String(h.at).slice(0, 40) : null,
          h.comments ?? null,
          h.documentId ? String(h.documentId).slice(0, 100) : null,
          i,
        ],
      );
    }
  }

  if (opts.approvedSnapshot !== undefined) {
    await upsertSnapshot(db, deedReviewId, 'APPROVED', opts.approvedSnapshot);
  }
  if (opts.comparisonBefore !== undefined && opts.comparisonBefore !== null) {
    await upsertSnapshot(db, deedReviewId, 'COMPARISON_BEFORE', opts.comparisonBefore);
  }

  if (opts.parties !== undefined && opts.parties !== null && typeof opts.parties === 'object') {
    await db.execute('DELETE FROM crm_fap_legal_deed_parties WHERE deed_review_id = ?', [deedReviewId]);
    let idx = 0;
    const rep = opts.parties.representative ? String(opts.parties.representative).trim() : '';
    if (rep) {
      await db.execute(
        'INSERT INTO crm_fap_legal_deed_parties (id, deed_review_id, party_role, party_name, sort_order) VALUES (?,?,?,?,?)',
        [randomUUID(), deedReviewId, 'REPRESENTATIVE', rep.slice(0, 255), idx++],
      );
    }
    const shareholders = Array.isArray(opts.parties.shareholders)
      ? opts.parties.shareholders
      : opts.parties.shareholder
        ? [opts.parties.shareholder]
        : [];
    for (const sh of shareholders) {
      const name = String(sh || '').trim();
      if (!name) continue;
      await db.execute(
        'INSERT INTO crm_fap_legal_deed_parties (id, deed_review_id, party_role, party_name, sort_order) VALUES (?,?,?,?,?)',
        [randomUUID(), deedReviewId, 'SHAREHOLDER', name.slice(0, 255), idx++],
      );
    }
  }

  if (opts.categoryRemarks !== undefined && opts.categoryRemarks !== null && typeof opts.categoryRemarks === 'object') {
    await db.execute('DELETE FROM crm_fap_legal_deed_category_remarks WHERE deed_review_id = ?', [deedReviewId]);
    for (const [catCode, text] of Object.entries(opts.categoryRemarks)) {
      const cleanCode = String(catCode || '').trim().slice(0, 100);
      if (!cleanCode) continue;
      await db.execute(
        'INSERT INTO crm_fap_legal_deed_category_remarks (id, deed_review_id, category_code, remark_text) VALUES (?,?,?,?)',
        [randomUUID(), deedReviewId, cleanCode, text !== undefined && text !== null ? String(text) : null],
      );
    }
  }
}

export async function saveDeedReviewState(
  applicationId: string,
  deedId: string,
  state: {review?: any; reviewHistory?: any[]; approvedSnapshot?: any; approvedAt?: string | null; meta?: any},
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>(
      'SELECT * FROM crm_fap_legal_deed_reviews WHERE application_id = ? AND deed_id = ? LIMIT 1',
      [applicationId, deedId],
    );
    const existing = rows[0] || null;
    const rev = state.review || {};
    const workflowStatus = String(rev.status || existing?.workflow_status || 'DRAFT').slice(0, 30);
    const reviewStatus = mapReviewStatus(workflowStatus);
    const revision = Number(rev.revision ?? existing?.revision ?? 1);
    const lastHistory = Array.isArray(state.reviewHistory)
      ? state.reviewHistory[state.reviewHistory.length - 1]
      : null;
    const approvedBy =
      rev.approvedBy ||
      (reviewStatus === 'APPROVED'
        ? String(lastHistory?.actor || 'Legal Approver').slice(0, 150)
        : existing?.approved_by ?? null);
    const approvedAt = state.approvedAt
      ? new Date(state.approvedAt)
      : reviewStatus === 'APPROVED'
        ? existing?.approved_at || new Date()
        : existing?.approved_at ?? null;

    const deedReviewId = existing?.id || randomUUID();
    await conn.execute(
      `INSERT INTO crm_fap_legal_deed_reviews (
        id, application_id, deed_id, review_status, source, deed_created_at,
        workflow_status, revision, document_id,
        submitted_by_id, submitted_by, submitted_at,
        checked_by_id, checked_by, checked_at,
        rejected_by, rejected_at, rejection_reason,
        correction_by, correction_at, correction_note,
        info_added, approved_by, approved_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        review_status = VALUES(review_status),
        source = VALUES(source),
        deed_created_at = COALESCE(VALUES(deed_created_at), deed_created_at),
        workflow_status = VALUES(workflow_status),
        revision = VALUES(revision),
        document_id = VALUES(document_id),
        submitted_by_id = VALUES(submitted_by_id),
        submitted_by = VALUES(submitted_by),
        submitted_at = VALUES(submitted_at),
        checked_by_id = VALUES(checked_by_id),
        checked_by = VALUES(checked_by),
        checked_at = VALUES(checked_at),
        rejected_by = VALUES(rejected_by),
        rejected_at = VALUES(rejected_at),
        rejection_reason = VALUES(rejection_reason),
        correction_by = VALUES(correction_by),
        correction_at = VALUES(correction_at),
        correction_note = VALUES(correction_note),
        info_added = COALESCE(VALUES(info_added), info_added),
        approved_by = VALUES(approved_by),
        approved_at = VALUES(approved_at),
        updated_at = CURRENT_TIMESTAMP(3)`,
      [
        deedReviewId,
        applicationId,
        deedId,
        reviewStatus,
        state.meta?.source || existing?.source || 'manual',
        state.meta?.createdAt || existing?.deed_created_at || null,
        workflowStatus,
        revision,
        rev.documentId ?? existing?.document_id ?? null,
        rev.submittedById ?? existing?.submitted_by_id ?? null,
        rev.submittedBy ?? existing?.submitted_by ?? null,
        rev.submittedAt ?? existing?.submitted_at ?? null,
        rev.checkedById !== undefined ? rev.checkedById : existing?.checked_by_id ?? null,
        rev.checkedBy !== undefined ? rev.checkedBy : existing?.checked_by ?? null,
        rev.checkedAt !== undefined ? rev.checkedAt : existing?.checked_at ?? null,
        rev.rejectedBy !== undefined ? rev.rejectedBy : existing?.rejected_by ?? null,
        rev.rejectedAt !== undefined ? rev.rejectedAt : existing?.rejected_at ?? null,
        rev.rejectionReason !== undefined ? rev.rejectionReason : existing?.rejection_reason ?? null,
        rev.correctionBy !== undefined ? rev.correctionBy : existing?.correction_by ?? null,
        rev.correctionAt !== undefined ? rev.correctionAt : existing?.correction_at ?? null,
        rev.correctionNote !== undefined ? rev.correctionNote : existing?.correction_note ?? null,
        state.meta?.infoAdded !== undefined ? state.meta.infoAdded : existing?.info_added ?? null,
        approvedBy,
        approvedAt,
      ],
    );

    await syncDeedReviewChildren(conn, deedReviewId, applicationId, deedId, {
      reviewHistory: state.reviewHistory,
      approvedSnapshot: state.approvedSnapshot,
      comparisonBefore: rev.comparisonBefore,
      parties: state.meta?.parties,
      categoryRemarks: state.meta?.categoryRemarks,
    });

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
