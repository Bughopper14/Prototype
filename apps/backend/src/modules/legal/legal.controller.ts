import {canEditLegal, deedBaseline, deedTransition, reviewStatus, saveSingleDeed} from '@liugong/shared';
import {Controller, Post, Put, Res} from '@nestjs/common';
import {z} from 'zod';
import {ensure} from '../../core/domain';
import {detailOr404} from '../applications/application-detail';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {logActivity} from '../activity/activity-log';
import {intakeDetail} from '../applications/intake.repository';
import {readApplicationDocuments} from '../documents/documents.repository';
import {saveDeedReviewState, saveLegal} from './legal.repository';
import {newNotification, notifyLegalApprovers} from '../activity/notifications';

@Controller(API_PREFIX)
export class LegalController {
  @Put(['applications/:id/legal/draft', 'applications/:id/page-legal'])
  async saveLegalDraft(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const id = req.params.id;
    const existing = await detailOr404(id);
    ensure(canEditLegal(req.actor, existing), 'Legal information is locked at this workflow stage', 403);
    const b = req.body || {};
    const legal = b.legal || (b.deeds ? b : Array.isArray(b) ? {deeds: b} : {});
    if (b.stakeholders && Array.isArray(legal?.deeds)) {
      const selected = legal.selectedDeedId || legal.deeds[0]?.id;
      const target = legal.deeds.find((d: any) => d.id === selected) || legal.deeds[0];
      if (target) {
        target.stakeholders = b.stakeholders;
        target._stakeholdersPassed = true;
      }
    }
    await saveLegal(id, legal, false);
    await logActivity(req.actor, id, existing.status, existing.status, 'Legal information updated');
    return intakeDetail(id);
  }

  @Put('applications/:id/deeds/:deedId/draft')
  async saveDeedDraft(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
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
  }

  @Post('applications/:id/deeds/:deedId/review')
  async reviewDeed(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
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
        `${a.fapNumber} · Akta ${deed.deedNumber} disetujui oleh ${req.actor.name}. Data shareholder sudah ditampilkan di Stakeholders.${body.comments ? ` Catatan: ${body.comments}` : ''}`,
      );
    }
    if (body.action === 'SUBMIT' || body.action === 'CHECK') {
      await notifyLegalApprovers(
        req.actor.id,
        id,
        deedId,
        body.action === 'SUBMIT' ? 'Akta menunggu pemeriksaan' : 'Akta menunggu approval',
        `${a.fapNumber} · Akta ${deed.deedNumber} ${body.action === 'SUBMIT' ? 'diajukan' : 'lolos pemeriksaan'} oleh ${req.actor.name}.`,
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
  }
}
