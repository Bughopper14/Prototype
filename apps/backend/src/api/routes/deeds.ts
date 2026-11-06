import {z} from 'zod';
import {ensure} from '../../domain';
import {
  canEditLegal,
  deedBaseline,
  deedTransition,
  reviewStatus,
  saveSingleDeed,
} from '@liugong/shared';
import {intakeDetail} from '../../db/repositories/intake';
import {saveDeedReviewState, saveLegal} from '../../db/repositories/legal';
import {readApplicationDocuments} from '../../db/repositories/documents';
import {post, put} from '../router';
import {logActivity} from '../activity';
import {newNotification} from './system';

const detailOr404 = async (id: string) => {
  const application = await intakeDetail(id);
  ensure(application, 'Application not found', 404);
  return application;
};

put('/applications/:id/deeds/:deedId/draft', async req => {
  const {id, deedId} = req.params;
  const a = await detailOr404(id);
  const legal = a.legal || {};
  const isAdmin = req.actor.isAdmin || req.actor.role === 'ADMIN';
  ensure(canEditLegal(req.actor, a), 'Akun/tahap ini tidak dapat mengubah akta.', 403);
  ensure(
    isAdmin ||
      ['DRAFT', 'RETURNED'].includes(a.status) ||
      reviewStatus((legal.deeds || []).find((d: any) => d.id === deedId)) === 'REJECTED',
    'MKT hanya boleh memperbaiki akta yang ditolak.',
    409,
  );
  await saveLegal(id, saveSingleDeed(legal, deedId, req.body.deed), false);
  await logActivity(req.actor, id, a.status, a.status, `Akta ${req.body.deed.deedNumber} saved for review`);
  return detailOr404(id);
});

post('/applications/:id/deeds/:deedId/review', async req => {
  const {id, deedId} = req.params;
  const body = z
    .object({
      action: z.enum(['SUBMIT', 'CHECK', 'APPROVE', 'REJECT']),
      revision: z.number().int().positive(),
      documentId: z.string().max(100).optional(),
      comments: z.string().trim().max(10000).default(''),
    })
    .parse(req.body);

  const a = await detailOr404(id);
  const legal = a.legal || {};
  const deed = (legal.deeds || []).find((d: any) => d.id === deedId);
  ensure(deed, 'Simpan akta terlebih dahulu sebelum mengajukan.', 404);
  const isAdmin = req.actor.isAdmin || req.actor.role === 'ADMIN';
  ensure(
    isAdmin || !['APPROVED', 'REJECTED', 'CREDIT_COMMITTEE_REVIEW'].includes(a.status),
    'Approval akta terkunci pada tahap aplikasi ini.',
    409,
  );

  if (body.action === 'SUBMIT') {
    ensure(canEditLegal(req.actor, a), 'Pengajuan akta tidak tersedia pada tahap ini.', 403);
    if (body.documentId) {
      const checklist = (await readApplicationDocuments(id)).find(
        (d: any) => String(d.documentCode).toUpperCase() === 'DEED',
      );
      ensure(checklist, 'Checklist dokumen akta belum tersedia.');
      ensure(
        (checklist.files || []).some((f: any) => f.id === body.documentId),
        'Pilih dokumen akta yang diupload pada aplikasi ini.',
      );
    }
  }

  const updated = deedTransition(deed, body.action, req.actor, {
    ...body,
    ...(body.action === 'SUBMIT' ? {beforeSnapshot: deedBaseline(legal, deed)} : {}),
  });
  await saveDeedReviewState(id, deedId, {
    review: updated.review,
    reviewHistory: updated.reviewHistory,
    approvedSnapshot: updated.approvedSnapshot,
    approvedAt: updated.approvedAt,
  });

  const submitter = deed.review?.submittedById;
  if (submitter && body.action === 'REJECT') {
    await newNotification(
      submitter,
      id,
      deedId,
      'Akta ditolak — perlu diperbaiki',
      `${a.fapNumber} · Akta ${deed.deedNumber} ditolak oleh ${req.actor.name}. Alasan: ${body.comments}`,
    );
  }
  if (submitter && body.action === 'APPROVE') {
    await newNotification(
      submitter,
      id,
      deedId,
      'Akta disetujui',
      `${a.fapNumber} · Akta ${deed.deedNumber} disetujui oleh ${req.actor.name}. Data shareholder sudah ditampilkan di Stakeholders.`,
    );
  }
  await logActivity(
    req.actor,
    id,
    a.status,
    a.status,
    `Akta ${deed.deedNumber} — ${body.action}${body.comments ? ': ' + body.comments : ''}`,
  );
  return detailOr404(id);
});
