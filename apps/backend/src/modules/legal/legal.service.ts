import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {
  canEditLegal,
  DEED_SECTION,
  deedTransition,
  mergeLegal,
  saveSingleDeed,
} from '@liugong/shared';
import {CrmDatabase} from '../../core/db/crm-database';
import {ensure} from '../../core/domain';
import {recordActivity} from '../activity/activity-log';
import {notifyUsers} from '../activity/notifications';
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
   * order) and stores them. An approved deed is locked: it only changes after its stage or group is rejected.
   */
  private async store(id: string, previous: any, incoming: any, actor: Actor) {
    ensure(incoming && typeof incoming === 'object' && !Array.isArray(incoming), 'Format data legal tidak valid.', 422);
    if (incoming.deeds !== undefined) {
      ensure(Array.isArray(incoming.deeds), 'Daftar akta harus berupa array.', 422);
      for (const d of incoming.deeds) {
        ensure(d && typeof d === 'object' && !Array.isArray(d), 'Setiap item akta harus berupa objek.', 422);
        if (!d.id) d.id = crypto.randomUUID();
      }
    }
    const merged = mergeLegal(previous, incoming);
    await this.db.transaction(conn => this.legal.save(conn, id, merged, by(actor)));
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

  /** SUBMIT / APPROVE / REJECT / REMARKS on one deed. Stored in crm_fap_legal_deed_reviews. */
  async review(id: string, deedId: string, body: {action: string; revision: number; comments: string}, actor: Actor) {
    const a = await this.applications.detailOr404(id, actor);
    const deed = (a.legal?.deeds || []).find((d: any) => d.id === deedId);
    ensure(deed, 'Simpan akta terlebih dahulu sebelum mengajukan.', 404);
    // One deed, one approval: when the workflow has an approval for the deed section, only that approval decides (submit-approval and its decisions), never this old review.
    ensure(
      !((a.approvalPlaces || []) as any[]).some(p => p.scope === 'SECTION' && p.sectionCode === DEED_SECTION),
      'Akta ini disetujui lewat approval section akta pada workflow, bukan lewat review ini.',
      409,
    );
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
    const where = [a.companyName, `Akta ${deed.deedNumber}`].filter(Boolean).join(' · ');
    // The deed was reviewed: the user who submitted it acts next.
    if (body.action !== 'SUBMIT' && deed.review?.submittedBy)
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
