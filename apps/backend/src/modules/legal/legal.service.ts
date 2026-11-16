import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {
  DEED_APPROVE_AUTHORITY,
  canEditLegal,
  deedTransition,
  mergeLegal,
  reviewStatus,
  saveSingleDeed,
} from '@liugong/shared';
import {CrmDatabase} from '../../core/db/crm-database';
import {ensure} from '../../core/domain';
import {recordActivity} from '../activity/activity-log';
import {notifyHolders, notifyUsers} from '../activity/notifications';
import type {Actor} from '../auth/session';
import {ApplicationsService} from '../applications/applications.service';
import {LegalRepository} from './legal.repository';

const by = (actor: Actor) => actor.username || null;

/** Legal tab: deeds with their stakeholders, and the deed review (submit → approve, or sent back for revision). */
@Injectable()
export class LegalService {
  constructor(
    private readonly db: CrmDatabase,
    private readonly applications: ApplicationsService,
    private readonly legal: LegalRepository,
  ) {}

  /**
   * Validates the incoming deeds against the stored ones (shared mergeLegal: a pending deed cannot change, dates in
   * order) and stores them. A changed deed that was approved goes back to NEEDS_REVISION.
   */
  private async store(id: string, previous: any, incoming: any, actor: Actor) {
    for (const d of incoming.deeds || []) if (!d.id) d.id = crypto.randomUUID();
    const merged = mergeLegal(previous, incoming);
    await this.db.transaction(async conn => {
      await this.legal.save(conn, id, merged, by(actor));
      for (const d of merged.deeds) {
        const before = (previous.deeds || []).find((x: any) => x.id === d.id);
        if (before && reviewStatus(before) === 'APPROVED' && reviewStatus(d) === 'NEEDS_REVISION')
          await this.legal.markChanged(conn, id, d.id, by(actor));
      }
    });
  }

  /** Whole legal tab (deeds and the stakeholders of the selected deed). */
  async saveDraft(id: string, body: any, actor: Actor) {
    const existing = await this.applications.detailOr404(id, actor);
    ensure(canEditLegal(actor, existing), 'Legal information is locked at this workflow stage', 403);
    const legal = structuredClone(body.legal || (body.deeds ? body : Array.isArray(body) ? {deeds: body} : {deeds: []}));
    if (body.stakeholders && Array.isArray(legal.deeds)) {
      const selected = legal.selectedDeedId || legal.deeds[0]?.id;
      const target = legal.deeds.find((d: any) => d.id === selected) || legal.deeds[0];
      if (target) target.stakeholders = body.stakeholders;
    }
    await this.store(id, existing.legal || {deeds: []}, legal, actor);
    return this.applications.detailOr404(id, actor);
  }

  /** One deed from the review dialog; deeds can be changed in every stage except the last. */
  async saveDeed(id: string, deedId: string, deed: any, actor: Actor) {
    const a = await this.applications.detailOr404(id, actor);
    const legal = a.legal || {deeds: []};
    ensure(canEditLegal(actor, a), 'Akun/tahap ini tidak dapat mengubah akta.', 403);
    await this.store(id, legal, saveSingleDeed(legal, deedId, deed), actor);
    await recordActivity(
      {
        applicationId: id,
        stageCode: a.workflowStage?.code,
        section: 'Legal',
        tabIndex: 5,
        actionType: 'UPDATE',
        title: `Akta ${deed?.deedNumber || ''} saved for review`,
        previousStatus: a.status,
        newStatus: a.status,
      },
      actor,
    );
    return this.applications.detailOr404(id, actor);
  }

  /** SUBMIT / APPROVE / REJECT / REMARKS on one deed. */
  async review(id: string, deedId: string, body: {action: string; revision: number; comments: string}, actor: Actor) {
    const a = await this.applications.detailOr404(id, actor);
    const deed = (a.legal?.deeds || []).find((d: any) => d.id === deedId);
    ensure(deed, 'Simpan akta terlebih dahulu sebelum mengajukan.', 404);
    const isAdmin = actor.isAdmin || actor.role === 'ADMIN';
    ensure(isAdmin || !a.workflowFlags?.lastStage, 'Approval akta terkunci pada tahap aplikasi ini.', 409);
    if (body.action === 'SUBMIT') ensure(canEditLegal(actor, a), 'Pengajuan akta tidak tersedia pada tahap ini.', 403);
    const updated = deedTransition(deed, body.action, actor, {revision: body.revision, comments: body.comments});
    await this.db.transaction(conn => this.legal.saveReview(conn, id, updated, by(actor)));
    const status = updated.review?.status;
    await recordActivity(
      {
        applicationId: id,
        stageCode: a.workflowStage?.code,
        section: 'Legal',
        tabIndex: 5,
        actionType: `DEED_${body.action}`,
        title: `Akta ${deed.deedNumber} — ${body.action}`,
        details: body.comments || '',
        previousStatus: a.status,
        newStatus: a.status,
        // Read back as the deed's review history.
        changes: {deedId, deedNumber: deed.deedNumber, action: body.action, status, comments: body.comments || ''},
      },
      actor,
    );
    const where = `${a.fapNumber} · ${a.companyName || ''} · Akta ${deed.deedNumber}`;
    if (body.action === 'SUBMIT')
      await notifyHolders([DEED_APPROVE_AUTHORITY], actor, {
        applicationId: id,
        deedId,
        type: 'DEED_REVIEW',
        title: 'Akta menunggu approval',
        message: `${where} diajukan oleh ${actor.name}.`,
      });
    // The deed was reviewed: the user who submitted it acts next.
    else if (deed.review?.submittedBy)
      await notifyUsers([deed.review.submittedBy], actor, {
        applicationId: id,
        deedId,
        type: 'DEED_REVIEW',
        title: status === 'APPROVED' ? 'Akta disetujui' : 'Akta dikembalikan untuk revisi',
        message: `${where} ${status === 'APPROVED' ? 'disetujui' : 'dikembalikan'} oleh ${actor.name}.${body.comments ? ' ' + body.comments : ''}`,
      });
    return this.applications.detailOr404(id, actor);
  }
}
