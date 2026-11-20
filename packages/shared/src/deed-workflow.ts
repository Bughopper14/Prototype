import {validateInput} from './input-validation';
/**
 * Deed review states of crm_fap_legal_deed_reviews.review_status. DRAFT means the deed has no review row yet (never
 * submitted). NEEDS_REVISION covers both a rejected deed and a deed returned with remarks, and an approved deed that
 * was changed afterwards: it has to be submitted again.
 */
export const deedReviewLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending Legal Approval',
  APPROVED: 'Approved',
  NEEDS_REVISION: 'Needs revision',
};
/** The authority that edits deeds (managed in user management, stored in the DB). */
/**
 * RETIRED: the authority CRM_DEED_APPROVE no longer exists (a deed is approved by the approval of its section in the workflow). The name is kept only
 * because modules/users/users.repository.ts (another developer's) still imports it; nothing in the CRM uses it.
 */
export const DEED_APPROVE_AUTHORITY = 'CRM_DEED_APPROVE';
export const DEED_EDIT_AUTHORITY = 'CRM_LEGAL_EDIT';
type DeedActor = {
  id?: string;
  name?: string;
  username?: string;
  role?: string;
  isAdmin?: boolean;
  authorities?: string[];
};
const isAdminActor = (actor: DeedActor | null | undefined) =>
  Boolean(actor?.isAdmin || actor?.role === 'ADMIN');
/** True when the actor holds the authority (from the DB roles); administrators hold every authority. */
export const actorCan = (actor: DeedActor | null | undefined, authority: string) =>
  Boolean(actor) && (isAdminActor(actor) || (actor!.authorities || []).includes(authority));
export class DeedWorkflowError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}
const assert = (ok: unknown, message: string, status = 422) => {
  if (!ok) throw new DeedWorkflowError(message, status);
};
const fields = [
  'id',
  'type',
  'source',
  'createdAt',
  'deedNumber',
  'deedDate',
  'notaryName',
  'ministerialDecreeNumber',
  'ministerialDecreeDate',
  'remarks',
  'remarkCategoryId',
  'remarkCategoryIds',
  'categoryRemarks',
  'infoAdded',
  'parties',
  'stakeholders',
];
export function deedData(deed: any) {
  return Object.fromEntries(
    fields.filter(key => deed[key] !== undefined).map(key => [key, structuredClone(deed[key])]),
  );
}
export function reviewStatus(deed: any) {
  return deed?.review?.status || 'DRAFT';
}
export function deedStatusLabel(deed: any) {
  const status = reviewStatus(deed);
  return deedReviewLabels[status] || status;
}
/** A deed given back to the submitter (rejected, remarks, or changed after approval): change it and submit again. */
export const deedPending = (deed: any) => reviewStatus(deed) === 'PENDING';
export function publishedDeeds(legal: any) {
  return (legal?.deeds || [])
    .filter((d: any) => d.approvedSnapshot)
    .map((d: any) => ({...d.approvedSnapshot, id: d.id, approvedAt: d.approvedAt}));
}
export function mergeLegal(previous: any, incoming: any) {
  const prior = Array.isArray(previous?.deeds) ? previous.deeds : [],
    ids = new Set<string>();
  const deeds = (incoming.deeds || []).map((input: any) => {
    assert(input.id && typeof input.id === 'string', 'Setiap akta wajib memiliki ID.');
    assert(!ids.has(input.id), 'ID akta tidak boleh duplikat.');
    ids.add(input.id);
    const old = prior.find((d: any) => d.id === input.id),
      data = deedData(input);
    if (!old) return {...data, review: {status: 'DRAFT', revision: 1}};
    const changed = JSON.stringify(deedData(old)) !== JSON.stringify(data);
    assert(
      !changed || !deedPending(old),
      'Akta sedang diperiksa. Tunggu hasil pemeriksaan sebelum mengubah data.',
      409,
    );
    // A changed deed that was ever submitted must be submitted again; a deed never submitted stays a draft.
    const review = old.review || {status: 'DRAFT', revision: 1};
    return {
      ...data,
      review: changed && reviewStatus(old) !== 'DRAFT' ? {...review, status: 'NEEDS_REVISION'} : review,
      ...(old.approvedSnapshot ? {approvedSnapshot: old.approvedSnapshot, approvedAt: old.approvedAt} : {}),
    };
  });
  for (const old of prior)
    assert(
      ids.has(old.id) || (!deedPending(old) && !old.approvedSnapshot),
      'Akta dalam proses approval atau sudah disetujui tidak boleh dihapus. Buat perubahan dan ajukan ulang.',
      409,
    );
  const est = deeds.find((d: any) => d.type === 'establishment');
  if (est?.deedDate) {
    for (const d of deeds) {
      if (d.type === 'amendment' && d.deedDate)
        assert(
          String(d.deedDate).slice(0, 10) >= String(est.deedDate).slice(0, 10),
          `Tanggal akta perubahan (${d.deedDate}) tidak boleh sebelum tanggal akta pendirian (${est.deedDate}).`,
        );
    }
  }
  return {...incoming, deeds};
}
/**
 * One review action on a deed: SUBMIT (draft or needs revision → PENDING), APPROVE (PENDING → APPROVED, by someone
 * other than the submitter), REJECT or REMARKS (PENDING → NEEDS_REVISION, with the reason). Returns the deed with its
 * new review; the caller stores it.
 */
export function deedTransition(
  deed: any,
  action: string,
  actor: DeedActor & {id: string; name: string; role: string},
  options: {revision: number; comments?: string},
  now = new Date(),
) {
  assert(deed, 'Akta tidak ditemukan.', 404);
  assert(
    options.revision === (deed.review?.revision || 1),
    'Akta telah berubah. Buka ulang sebelum melanjutkan.',
    409,
  );
  const status = reviewStatus(deed),
    comments = String(options.comments || '').trim(),
    date = now.toISOString();
  assert(comments.length <= 10000, 'Catatan maksimal 10.000 karakter.');
  const review: any = {...deed.review};
  if (action === 'SUBMIT') {
    assert(actorCan(actor, DEED_EDIT_AUTHORITY), 'Akun ini tidak memiliki hak untuk mengajukan akta.', 403);
    assert(['DRAFT', 'NEEDS_REVISION'].includes(status), 'Akta sudah diajukan atau disetujui.', 409);
    for (const key of ['deedNumber', 'deedDate', 'ministerialDecreeNumber', 'ministerialDecreeDate'])
      assert(String(deed[key] || '').trim(), `${key} wajib diisi sebelum mengajukan akta.`);
    assert(['establishment', 'amendment'].includes(deed.type), 'Pilih jenis akta.');
    if (deed.type === 'amendment')
      assert(
        deed.remarkCategoryId || (Array.isArray(deed.remarkCategoryIds) && deed.remarkCategoryIds.length),
        'Kategori akta perubahan wajib dipilih.',
      );
    assert(
      Array.isArray(deed.stakeholders) && deed.stakeholders.length,
      'Tambahkan stakeholder/shareholder sebelum mengajukan akta.',
    );
    validateInput(deedData(deed), now, false);
    for (const r of deed.stakeholders) {
      validateInput({...r, nationalityType: r.citizenship === 'FOREIGN' ? 'WNA' : 'WNI'}, now);
      assert(
        [r.firstName, r.lastName, r.name].some(x => String(x || '').trim()),
        'Nama stakeholder wajib diisi.',
      );
      for (const key of ['email', 'mobilePhone', 'primaryCapital', 'idNumber'])
        assert(String(r[key] ?? '').trim(), `${key} stakeholder wajib diisi.`);
    }
    Object.assign(review, {status: 'PENDING', notes: null, submittedBy: actor.username || actor.name, submittedAt: date});
  } else if (action === 'APPROVE') {
    assert(isAdminActor(actor), 'Akta disetujui lewat approval section akta pada workflow.', 403);
    assert(status === 'PENDING', 'Akta belum diajukan untuk approval.', 409);
    if (!isAdminActor(actor))
      assert(review.submittedBy !== (actor.username || actor.name), 'Pengaju dan approver harus berbeda.', 403);
    Object.assign(review, {status: 'APPROVED', notes: comments || null, approvedBy: actor.name, approvedAt: date});
  } else if (action === 'REJECT' || action === 'REMARKS') {
    assert(
      isAdminActor(actor) && status === 'PENDING',
      'Pengembalian akta tidak tersedia untuk akun/status ini.',
      403,
    );
    assert(comments, action === 'REJECT' ? 'Alasan penolakan wajib diisi.' : 'Remarks wajib diisi.');
    Object.assign(review, {status: 'NEEDS_REVISION', notes: comments});
  } else throw new DeedWorkflowError('Aksi approval tidak valid.');
  return {
    ...deed,
    review,
    ...(action === 'APPROVE' ? {approvedSnapshot: deedData(deed), approvedAt: date} : {}),
  };
}

/**
 * Legal data can be edited in every workflow stage except the last one (stages run in parallel).
 * application.workflowFlags comes from the backend (crm_master_workflow_stages).
 */
export function canEditLegal(actor: any, application: any) {
  if (!actor) return false;
  if (isAdminActor(actor)) return true;
  if (!actorCan(actor, DEED_EDIT_AUTHORITY)) return false;
  return !application?.workflowFlags?.lastStage;
}

export function saveSingleDeed(previous: any, deedId: string, input: any) {
  assert(input?.id === deedId, 'ID akta tidak sesuai.');
  const data = deedData(input);
  try {
    validateInput({deeds: [data]});
  } catch (e) {}
  const prior = Array.isArray(previous?.deeds) ? previous.deeds : [];
  const target = mergeLegal({deeds: prior.filter((d: any) => d.id === deedId)}, {deeds: [data]}).deeds[0];
  return {
    ...previous,
    deeds: prior.some((d: any) => d.id === deedId)
      ? prior.map((d: any) => (d.id === deedId ? target : d))
      : [...prior, target],
    selectedDeedId: deedId,
  };
}

export function deedBaseline(legal: any, deed: any) {
  if (deed.approvedSnapshot) return structuredClone(deed.approvedSnapshot);
  const prior = (legal?.deeds || [])
    .filter(
      (d: any) =>
        d.id !== deed.id &&
        d.approvedSnapshot &&
        (!deed.deedDate || String(d.approvedSnapshot.deedDate || '') <= String(deed.deedDate)),
    )
    .sort(
      (a: any, b: any) =>
        String(b.approvedSnapshot.deedDate || '').localeCompare(String(a.approvedSnapshot.deedDate || '')) ||
        String(b.approvedAt || '').localeCompare(String(a.approvedAt || '')),
    );
  return prior.length ? structuredClone(prior[0].approvedSnapshot) : null;
}

/** The master form section that holds the deeds (crm_master_form_sections.code): a repeating section whose rows are the deeds, approved one by one. */
export const DEED_SECTION = 'LEGAL-DEEDS-AMENDMENTS';
