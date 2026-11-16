import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {businessToday, customerFields, picFields, profileFields} from '@liugong/shared';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {Problem, ensure} from '../../core/domain';
import {ActivityService} from '../activity/activity.service';
import type {Actor as SessionActor} from '../auth/session';
import {BusinessPartnersRepository} from '../customers/business-partners.repository';
import {DocumentsRepository} from '../documents/documents.repository';
import {FapOcrRepository} from '../fap/fap-ocr.repository';
import {FapFreezeRepository} from '../fap/fap-freeze.repository';
import {LegalRepository} from '../legal/legal.repository';
import {FapSectionsRepository} from './repositories/fap-sections.repository';
import {FinancialStatementsRepository} from './repositories/financial-statements.repository';
import {ApplicationProfileRepository} from './repositories/application-profile.repository';
import {ApplicationsRepository} from './repositories/applications.repository';
import {MasterIdLookup} from './repositories/master-ids';
import {availableActions, WorkflowRepository, type Workflow} from './workflow/workflow.repository';

type Actor = SessionActor;
const by = (actor: Actor) => actor.username || null;

/**
 * Applications on the crm_liugong design: header (crm_applications), FAP profile and primary contact, the customer
 * golden record, and the workflow driven by crm_master_workflow.
 */
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly db: CrmDatabase,
    private readonly apps: ApplicationsRepository,
    private readonly profiles: ApplicationProfileRepository,
    private readonly partners: BusinessPartnersRepository,
    private readonly workflow: WorkflowRepository,
    private readonly ids: MasterIdLookup,
    private readonly fap: FapSectionsRepository,
    private readonly statements: FinancialStatementsRepository,
    private readonly legalData: LegalRepository,
    private readonly documents: DocumentsRepository,
    private readonly fapOcr: FapOcrRepository,
    private readonly activity: ActivityService,
    private readonly freezes: FapFreezeRepository,
  ) {}

  /* ---------- stages ---------- */

  /** The workflow's first stage and its first status (where every new application starts). */
  private initialStatus(wf: Workflow) {
    const stage = wf.stages[0];
    const status = wf.statuses.find(s => s.stageId === stage?.id);
    ensure(stage && status, 'Workflow master data is missing (crm_master_workflow_stages / statuses).', 500);
    return {stage, status};
  }

  /**
   * The stage view the workspace shows. It is the stage of the current status, except that a submitted (locked) first
   * stage already shows the second stage, where work continues in parallel. The workspace has two views, so later
   * stages show the second one.
   */
  private viewStage(wf: Workflow, statusId: string, progress: any[]) {
    const current = wf.stageById.get(wf.statusById.get(statusId)?.stageId || '');
    const [first, second] = wf.stages;
    if (!current || !first) return {view: first, current};
    const firstLocked = progress.some(p => p.stage_id === first.id && p.is_locked);
    if (current.id === first.id) return {view: firstLocked && second ? second : first, current};
    return {view: second || current, current};
  }

  /** FAP number and company name, for activity and notification texts. */
  private async label(id: string) {
    const [app, saved] = await Promise.all([this.apps.get(id), this.profiles.getProfile(id)]);
    return {fapNumber: app?.fap_registration_number ?? '', company: saved?.customer?.companyName ?? ''};
  }

  /* ---------- reads ---------- */

  async list(actor?: Actor) {
    const [rows, wf, branches, categories, premises, segments, roles, financing, deedReviews, docCounts] = await Promise.all([
      this.apps.list(),
      this.workflow.load(),
      this.ids.codes('branch'),
      this.ids.codes('businessCategory'),
      this.ids.codes('premiseStatus'),
      this.ids.codes('industrySegment'),
      this.ids.codes('businessRole'),
      this.fap.financingSummary(),
      this.legalData.reviewCounts(),
      this.documents.counts(),
    ]);
    const progress = rows.length
      ? (
          await this.apps.pool.query<any[]>(
            `SELECT application_id,stage_id,is_locked FROM ${CRM.applicationStageProgress}`,
          )
        )[0]
      : [];
    return rows.map(r => {
      const status = wf.statusById.get(r.current_status_id);
      const {view} = this.viewStage(
        wf,
        r.current_status_id,
        progress.filter((p: any) => p.application_id === r.id),
      );
      return {
        id: r.id,
        customer_id: r.customer_id,
        customer_category: r.customer_category,
        application_date: r.application_date,
        fap_number: r.fap_registration_number,
        company_name: r.company_name,
        company_type: categories.get(r.business_category_id) ?? null,
        nib: r.nib,
        nib_date: r.nib_date,
        npwp: r.npwp,
        establishment_act_no: r.establishment_act_no,
        establishment_date: r.establishment_date,
        branch_code: branches.get(r.branch_id) ?? null,
        company_address: r.company_address,
        city: r.city_id,
        province: r.province_id,
        experience_years: r.experience_years,
        experience_months: r.experience_months,
        status: status?.code ?? null,
        status_name: status?.name ?? null,
        workflow_stage: wf.stageById.get(status?.stageId || '')?.code ?? null,
        available_actions: actor ? availableActions(wf, r.current_status_id, actor) : [],
        phone_fax: r.phone_fax,
        email: r.company_email,
        website: r.website,
        main_business: r.main_business,
        location_status: premises.get(r.premise_status_id) ?? null,
        repayment_source: r.repayment_source,
        latest_deed_no: r.latest_deed_no,
        latest_deed_date: r.latest_deed_date,
        industry_segment: segments.get(r.industry_segment_id) ?? null,
        business_role: roles.get(r.business_role_id) ?? null,
        asset_summary_he_liu_gong: r.asset_he_liugong,
        asset_summary_truck_liu_gong: r.asset_truck_liugong,
        asset_summary_he_non_liu_gong: r.asset_he_non_liugong,
        asset_summary_truck_non_liu_gong: r.asset_truck_non_liugong,
        created_at: r.created_at,
        updated_at: r.updated_at,
        stage: view?.code ?? null,
        stage_name: view?.name ?? null,
        financing_value: financing.get(r.id)?.financingValue ?? null,
        tenor_months: financing.get(r.id)?.tenorMonths ?? null,
        financing_method: financing.get(r.id)?.financingMethod ?? null,
        // Deeds waiting for legal approval and deeds sent back for revision
        deeds_pending: deedReviews.get(r.id)?.pending ?? 0,
        deeds_sent_back: deedReviews.get(r.id)?.sentBack ?? 0,
        verified_docs: docCounts.get(r.id)?.verified ?? 0,
        total_docs: docCounts.get(r.id)?.total ?? 0,
      };
    });
  }

  // Typed loosely on purpose: the legal / documents / fap modules read many nested fields of it.
  async detail(id: string, actor?: Actor): Promise<any> {
    const app = await this.apps.get(id);
    if (!app) return null;
    const [wf, saved, pic, progress, transitions, signoffs] = await Promise.all([
      this.workflow.load(),
      this.profiles.getProfile(id),
      this.profiles.getContact(id),
      this.apps.stageProgress(id),
      this.apps.transitions(id),
      this.apps.signoffs(id),
    ]);
    const status = wf.statusById.get(app.current_status_id);
    const {view, current} = this.viewStage(wf, app.current_status_id, progress);
    const customer: Record<string, any> = {...(saved?.customer || {}), id: app.customer_id};
    const profile = {
      ...(saved?.profile || {}),
      branchCode: await this.ids.codeOf('branch', app.branch_id),
      customerStatus: app.customer_category,
      customerCategory: app.customer_category,
    };
    const legal = await this.legalData.read(id);
    // Review history of each deed comes from the activity log (DEED_* rows).
    const deedHistory = await this.activity.activity.deedHistory(id);
    for (const d of legal.deeds as any[]) d.reviewHistory = deedHistory.get(d.id) || [];
    const firstStage = wf.stages[0];
    const firstLocked = progress.some((p: any) => p.stage_id === firstStage?.id && p.is_locked);
    const ocrComparison = await this.fapOcr.read(id);
    return {
      ...profile,
      id: app.id,
      companyName: customer.companyName ?? null,
      customerId: app.customer_id,
      customer,
      establishmentActNo: customer.establishmentActNo ?? null,
      establishmentDate: customer.establishmentDate ?? null,
      nibDate: customer.nibDate ?? null,
      fapNumber: app.fap_registration_number,
      applicationDate: app.application_date,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
      status: status?.code ?? null,
      statusName: status?.name ?? null,
      stage: view?.code ?? null,
      stageName: view?.name ?? null,
      workflowStage: current ? {code: current.code, name: current.name} : null,
      // Where the current status sits in the workflow (crm_master_workflow_stages), for edit locks.
      workflowFlags: {
        lastStage: !!current && current.id === wf.stages[wf.stages.length - 1]?.id,
      },
      availableActions: actor ? availableActions(wf, app.current_status_id, actor) : [],
      makerName: app.maker_name,
      legal,
      pic,
      stakeholders:
        legal.deeds.find((d: any) => d.id === legal.selectedDeedId)?.stakeholders || legal.deeds[0]?.stakeholders || [],
      ...(await this.fap.read(id)),
      ...(await this.statements.read(id)),
      documentChecks: await this.documents.read(id),
      submitLock: {
        ocrComparison,
        remarks: ocrComparison?.remarks ?? null,
        isLocked: app.is_fap_doc_uploaded ? 0 : 1,
        fapDocUploaded: app.is_fap_doc_uploaded ? 1 : 0,
        stage: firstLocked && wf.stages[1] ? wf.stages[1].code : firstStage?.code,
      },
      approvalLogs: transitions.map((t: any) => ({
        id: t.id,
        actionTimestamp: t.transitioned_at,
        actionBy: t.actor_name,
        action: t.action_code,
        previousStatus: wf.statusById.get(t.from_status_id)?.code ?? null,
        newStatus: wf.statusById.get(t.to_status_id)?.code ?? null,
        comments: t.comments,
      })),
      signoffs: signoffs.map((s: any) => ({
        role: s.role_code,
        actor: s.actor_name,
        decision: s.decision,
        remarks: s.remarks,
        signed_at: s.signed_at,
      })),
    };
  }

  async detailOr404(id: string, actor?: Actor): Promise<any> {
    const application = await this.detail(id, actor);
    ensure(application, 'Application not found', 404);
    return application;
  }

  /* ---------- writes ---------- */

  async create(body: Record<string, any>, actor: Actor) {
    const customerId: string | null = body.customerId ? String(body.customerId) : null;
    const existing = customerId ? await this.partners.get(customerId) : null;
    ensure(!customerId || existing, 'Customer not found', 404);
    const customer = {...(existing?.customer || {}), ...(body.customer || {})};
    if (body.companyName && !customer.companyName) customer.companyName = body.companyName;
    ensure(String(customer.companyName || '').trim(), 'Company name is required');
    const profile = {...(existing?.profile || {}), ...body};
    const category: 'NEW' | 'EXISTING' =
      (body.customerCategory || body.customerStatus || (existing?.relationship ?? (customerId ? 'EXISTING' : 'NEW'))) ===
      'EXISTING'
        ? 'EXISTING'
        : 'NEW';
    const wf = await this.workflow.load();
    const {stage, status} = this.initialStatus(wf);
    const id = crypto.randomUUID();
    const partnerId = customerId || crypto.randomUUID();
    const today = businessToday();
    const lockName = `crm_fap_number_${today.slice(0, 4)}`;
    let fapNumber = '';

    // The FAP number is the next free one of the year: a named lock, on its own connection, is held until the new
    // application is committed, so two users creating at the same moment never get the same number.
    const lockConn = await this.db.pool.getConnection();
    try {
      const [lock] = await lockConn.query<any[]>('SELECT GET_LOCK(?, 10) AS ok', [lockName]);
      ensure(Number(lock[0]?.ok) === 1, 'Another application is being created. Try again.', 409);
      try {
        await this.db.transaction(async conn => {
          await this.partners.saveFromApplication(conn, partnerId, customer, profile, category, by(actor));
          await this.apps.insert(
            conn,
            {
              id,
              fapNumber: (fapNumber = await this.apps.nextFapNumber(conn, today)),
              applicationDate: today,
              customerId: partnerId,
              customerCategory: category,
              branchId: await this.ids.idOf('branch', profile.branchCode, conn),
              statusId: status.id,
            },
            actor,
          );
          await this.profiles.saveProfile(conn, id, customer, profile, by(actor));
          await this.apps.saveStageProgress(conn, id, stage.id, {statusId: status.id}, actor);
          await this.documents.seedChecklist(conn, id, by(actor));
        });
      } finally {
        await lockConn.query('SELECT RELEASE_LOCK(?)', [lockName]);
      }
    } finally {
      lockConn.release();
    }
    const company = String(customer.companyName).trim();
    const categoryName = category === 'EXISTING' ? 'Existing Customer' : 'New Customer';
    await this.activity.record(
      {
        applicationId: id,
        stageCode: stage.code,
        section: 'Customer & PIC',
        tabIndex: 0,
        actionType: 'CREATE',
        title: `Created new application for ${company}`,
        details: `Initiated ${stage.name} (${fapNumber}), Category: ${categoryName}. Ready for data entry.`,
        newStatus: status.code,
        changes: [
          {label: 'Application Number', newValue: fapNumber},
          {label: 'Customer Category', newValue: categoryName},
          {label: 'Company Name', newValue: company},
          {label: 'Initial Stage', newValue: stage.name},
        ],
      },
      actor,
    );
    return this.detailOr404(id, actor);
  }

  /** Customer, FAP profile and primary contact (page 1). Fields not sent keep their saved value. */
  /**
   * A save made from a view of the application that is older than the stored one is refused (409), so one user does
   * not silently overwrite what another user saved meanwhile. `expected` is the `updatedAt` the screen loaded; without
   * it nothing is checked. It only counts as a conflict when someone else made the last change: the user's own actions
   * (upload, status change, a save from another tab) also move `updated_at` and must not block their next save.
   */
  private assertFresh(app: any, expected: unknown, actor: Actor) {
    if (expected === undefined || expected === null || expected === '') return;
    const seen = (expected instanceof Date ? expected : new Date(String(expected))).getTime();
    ensure(Number.isFinite(seen), 'expectedUpdatedAt tidak valid.', 422);
    const same = seen === new Date(app.updated_at).getTime() || app.updated_by === by(actor);
    const time = new Date(app.updated_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'});
    if (!same)
      throw new Problem(
        409,
        `Aplikasi ini sudah diubah oleh ${app.updated_by || 'pengguna lain'} pada pukul ${time}. Perubahan Anda belum tersimpan; salin isian yang perlu, lalu muat ulang halaman untuk melihat data terbaru.`,
      );
  }

  async saveCustomerAndContact(id: string, body: Record<string, any>, actor: Actor, expectedUpdatedAt?: unknown) {
    const current = await this.detailOr404(id, actor);
    const customer = {...(current.customer || {}), ...(body.customer || {})};
    const profile = {...current, ...(body.profile || {})};
    const category: 'NEW' | 'EXISTING' = profile.customerStatus === 'EXISTING' ? 'EXISTING' : 'NEW';
    await this.db.transaction(async conn => {
      const app = await this.apps.get(id, conn, true);
      ensure(app, 'Application not found', 404);
      this.assertFresh(app, expectedUpdatedAt, actor);
      let changed = await this.profiles.saveProfile(conn, id, customer, profile, by(actor));
      changed = (await this.partners.saveFromApplication(conn, app.customer_id, customer, profile, category, by(actor))) || changed;
      if (body.pic) changed = (await this.profiles.saveContact(conn, id, body.pic, by(actor))) || changed;
      const branchId = await this.ids.idOf('branch', profile.branchCode, conn);
      if (branchId !== app.branch_id || category !== app.customer_category) {
        await this.apps.update(conn, id, {branch_id: branchId, customer_category: category}, by(actor));
        changed = true;
      }
      if (changed) await this.apps.touch(conn, id, by(actor));
    });
  }

  /**
   * FAP sections 05–09 (financing purposes, projects, bank facilities, financing proposal with units and terms,
   * document requirements, financial statements). Only the sections present in the body are written.
   */
  async saveFapSections(id: string, body: Record<string, any>, actor: Actor, expectedUpdatedAt?: unknown) {
    const profile = body.profile || {};
    let financingProposal = body.financingProposal;
    if (financingProposal === undefined && profile.financingProposalJson !== undefined) {
      try {
        financingProposal =
          typeof profile.financingProposalJson === 'string'
            ? JSON.parse(profile.financingProposalJson || '{}')
            : profile.financingProposalJson;
      } catch {
        ensure(false, 'Financing proposal is not valid JSON.', 422);
      }
    }
    const wf = Array.isArray(body.financialStatements) ? await this.workflow.load() : null;
    await this.db.transaction(async conn => {
      const app = await this.apps.get(id, conn, true);
      ensure(app, 'Application not found', 404);
      this.assertFresh(app, expectedUpdatedAt, actor);
      await this.fap.save(
        conn,
        id,
        {
          projects: Array.isArray(body.projects) ? body.projects : undefined,
          bankReferences: Array.isArray(body.bankReferences) ? body.bankReferences : undefined,
          proposal: body.proposal ?? undefined,
          financingProposal: financingProposal ?? undefined,
          financingPurposeDetail: profile.financingPurposeDetail ?? body.financingPurposeDetail,
        },
        by(actor),
      );
      if (wf) {
        ensure(
          this.canEditStatements(wf, app.current_status_id, actor),
          'Financial statements are locked at this workflow stage',
          403,
        );
        await this.statements.save(conn, id, body.financialStatements, by(actor));
      }
      await this.apps.touch(conn, id, by(actor));
    });
  }

  /** Financial statements can be edited in every workflow stage except the last (the stages run in parallel). */
  private canEditStatements(wf: Workflow, statusId: string, actor: Actor) {
    if (actor.isAdmin || actor.role === 'ADMIN') return true;
    if (!(actor.authorities || []).includes('crm_edit_app_financial')) return false;
    return wf.statusById.get(statusId)?.stageId !== wf.stages[wf.stages.length - 1]?.id;
  }

  /**
   * One department's check of a document. A department checks while the workflow offers it its review action on the
   * current status: BS with document verification, CA with the credit recommendation, Legal with the legal one.
   */
  async verifyDocument(id: string, checklistId: string, body: any, actor: Actor) {
    const wf = await this.workflow.load();
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const authority = {BS: 'crm_workflow_verify_documents', CA: 'crm_workflow_recommend_credit', LEGAL: 'crm_workflow_recommend_legal'}[
      body.department as 'BS' | 'CA' | 'LEGAL'
    ];
    const isAdmin = actor.isAdmin || actor.role === 'ADMIN';
    ensure(
      isAdmin || wf.rules.some(r => r.beforeStatusId === app.current_status_id && r.authority === authority),
      'Verification is unavailable at this workflow stage',
      409,
    );
    let code = '';
    await this.db.transaction(async conn => {
      code = (await this.documents.checklistRow(conn, id, checklistId))?.code ?? '';
      await this.documents.verify(conn, id, checklistId, body, by(actor));
    });
    const status = wf.statusById.get(app.current_status_id);
    await this.activity.record(
      {
        applicationId: id,
        stageCode: wf.stageById.get(status?.stageId || '')?.code,
        section: 'Documents',
        tabIndex: 6,
        actionType: body.isVerified ? 'VERIFY' : 'REJECT',
        title: `Document ${code} ${body.isVerified ? 'verified' : 'rejected'} by ${body.department}`,
        details: body.notes || '',
        previousStatus: status?.code,
        newStatus: status?.code,
      },
      actor,
    );
  }

  /**
   * "Submit FAP stage": locks the first stage and the FAP form (the signed FAP document is not required). The status
   * does not change; the next stage can be worked on in parallel and is submitted with its own workflow action.
   */
  async submitFirstStage(id: string, actor: Actor, remarks?: string) {
    const wf = await this.workflow.load();
    const first = wf.stages[0];
    await this.db.transaction(async conn => {
      const app = await this.apps.get(id, conn, true);
      ensure(app, 'Application not found', 404);
      await this.apps.saveStageProgress(
        conn,
        id,
        first.id,
        {statusId: app.current_status_id, isLocked: true, submitted: true},
        actor,
      );
      await this.apps.update(conn, id, {is_fap_form_locked: 1}, by(actor));
      // The submitted FAP is frozen in the same transaction: a submitted stage always has its snapshot.
      await this.freezes.freeze(conn, id, first.code, actor, remarks);
    });
    const submitted = await this.detail(id, actor);
    const next = wf.stages[1];
    await this.activity.record(
      {
        applicationId: id,
        stageCode: first.code,
        section: 'Documents',
        tabIndex: 6,
        actionType: 'SUBMIT',
        title: `${first.name} submitted for ${submitted?.companyName || submitted?.fapNumber || ''}`,
        details:
          `Signed FAP document uploaded. FAP form and Customer & PIC locked${next ? `; work continues in ${next.name}` : ''}.` +
          (remarks ? ` Remarks: ${remarks}` : ''),
        previousStatus: submitted?.status,
        newStatus: submitted?.status,
      },
      actor,
    );
    return {success: true, stage: wf.stages[1]?.code ?? first.code};
  }

  /** What would stop the final approval right now: the same list the Approve action refuses with. */
  async approvalCheck(id: string) {
    const wf = await this.workflow.load();
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    return {missing: await this.approvalGaps(id, wf, app)};
  }

  /** Runs one crm_master_workflow action from the application's current status. */
  async transition(id: string, action: string, actor: Actor, comments = '') {
    const wf = await this.workflow.load();
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const from = wf.statusById.get(app.current_status_id);
    const candidates = wf.rules.filter(r => r.beforeStatusId === app.current_status_id && r.action === action);
    ensure(candidates.length, `Action ${action} is not available from status ${from?.code ?? '?'}.`, 409);
    const isAdmin = !!actor.isAdmin || actor.role === 'ADMIN';
    const rule = candidates.find(r => isAdmin || (actor.authorities || []).includes(r.authority));
    ensure(rule, 'Akun ini tidak memiliki wewenang untuk aksi ini.', 403);
    const to = wf.statusById.get(rule.afterStatusId)!;
    const fromStage = wf.stageById.get(from?.stageId || '');
    const toStage = wf.stageById.get(to.stageId)!;
    // Stages run in parallel: moving on never waits for another stage to be complete. Everything (every stage's
    // mandatory data, documents and deeds, and the signed FAP form) is checked once, at the final approval.
    if (to.isTerminal && to.code === 'APPROVED') {
      const gaps = await this.approvalGaps(id, wf, app);
      if (gaps.length)
        throw new Problem(
          422,
          `Data dan dokumen wajib belum lengkap (${gaps.length}): ${gaps.map(g => g.label).join('; ')}`,
          [],
          gaps,
        );
    }

    await this.db.transaction(async conn => {
      const locked = await this.apps.get(id, conn, true);
      ensure(locked.current_status_id === app.current_status_id, 'Status aplikasi telah berubah. Muat ulang.', 409);
      await this.apps.update(conn, id, {current_status_id: to.id}, by(actor));
      // Leaving a stage completes it; entering a stage (again) opens it with the new status.
      if (fromStage && fromStage.id !== toStage.id)
        await this.apps.saveStageProgress(
          conn,
          id,
          fromStage.id,
          {statusId: app.current_status_id, isLocked: true, submitted: true, completed: true},
          actor,
        );
      const returningToEarlierStage = fromStage && toStage.sequence < fromStage.sequence;
      await this.apps.saveStageProgress(
        conn,
        id,
        toStage.id,
        {statusId: to.id, isLocked: returningToEarlierStage ? false : undefined, completed: to.isTerminal},
        actor,
      );
      if (returningToEarlierStage) await this.apps.update(conn, id, {is_fap_form_locked: 0}, by(actor));
      await this.apps.addTransition(
        conn,
        {applicationId: id, workflowId: rule.id, fromStatusId: app.current_status_id, toStatusId: to.id, action, comments},
        actor,
      );
      // A move into a later stage or to a final status is a sign-off of the stage being left.
      if (fromStage && (toStage.sequence > fromStage.sequence || to.isTerminal))
        await this.apps.addSignoff(
          conn,
          {
            applicationId: id,
            stageId: fromStage.id,
            roleCode: String(actor.role || 'USER').slice(0, 30),
            decision: ['APPROVED', 'REJECTED'].includes(to.code) ? (to.code as 'APPROVED' | 'REJECTED') : 'SIGNED',
            remarks: comments,
          },
          actor,
        );
    });
    const {fapNumber, company} = await this.label(id);
    await this.activity.record(
      {
        applicationId: id,
        stageCode: toStage.code,
        section: 'Workflow',
        actionType: action,
        title: `${action.replaceAll('_', ' ')}: ${from?.name ?? '?'} → ${to.name}`,
        details: comments || `Application moved to ${to.name}.`,
        previousStatus: from?.code ?? null,
        newStatus: to.code,
      },
      actor,
    );
    // Whoever may act on the new status (crm_master_workflow) is told the application waits for them.
    await this.activity.notifyHolders(
      wf.rules.filter(r => r.beforeStatusId === to.id).map(r => r.authority),
      actor,
      {
        applicationId: id,
        type: 'WORKFLOW_ACTION',
        title: `Aplikasi menunggu tindakan: ${to.name}`,
        message: `${fapNumber} · ${company} dipindahkan ke ${to.name} oleh ${actor.name}.${comments ? ' ' + comments : ''}`,
      },
    );
    return this.detailOr404(id, actor);
  }

  /** Activity of one application, newest first. */
  async activityOf(id: string) {
    ensure(await this.apps.get(id), 'Application not found', 404);
    return this.activity.activity.feed({applicationId: id, limit: 500});
  }

  /** A field-level change list recorded by the workspace after a save (always an UPDATE; the actor is the session). */
  async recordClientActivity(
    id: string,
    entry: {section: string; tabIndex?: number | null; title: string; details?: string; changes?: unknown[]},
    actor: Actor,
  ) {
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const wf = await this.workflow.load();
    const status = wf.statusById.get(app.current_status_id);
    await this.activity.activity.log(
      {
        applicationId: id,
        stageCode: wf.stageById.get(status?.stageId || '')?.code,
        section: entry.section,
        tabIndex: entry.tabIndex ?? null,
        actionType: 'UPDATE',
        title: entry.title,
        details: entry.details ?? '',
        previousStatus: status?.code,
        newStatus: status?.code,
        changes: entry.changes?.length ? entry.changes : null,
      },
      actor,
    );
    return {ok: true};
  }

  /**
   * What stops the final approval, for every stage: unfilled mandatory rules (crm_master_field_mandatory_rules), mandatory
   * documents without a file (crm_master_document_types), the signed FAP form, a missing deed and deeds that do not hold
   * exactly 100% of the shares. `target` tells the screen which part to open.
   */
  private async approvalGaps(id: string, wf: Workflow, app: any) {
    const detail: any = await this.detailOr404(id);
    const gaps: {target: string; label: string; detail?: string}[] = [];
    const [rules] = await this.apps.pool.query<any[]>(
      `SELECT s.code AS stage_code,r.section_name,r.field_key,r.field_label FROM ${CRM.masterFieldMandatoryRules} r
       JOIN ${CRM.masterWorkflowStages} s ON s.id=r.stage_id
       WHERE r.is_mandatory=1 AND r.is_active=1`,
    );
    // Only rules on the application's own fields (customer, profile, contact) are checked here; rows of other sections
    // (banks, statements, proposal, deeds, stakeholders) are checked by their modules.
    const ownKeys = new Set([...customerFields, ...profileFields, ...picFields].map(f => f.key).concat('customerCategory'));
    // The contact section is the one whose rules include the contact name; its fields are read from the contact.
    const contactSection = rules.find(r => r.field_key === 'picName')?.section_name;
    const sources = (section: string) =>
      section === contactSection ? [detail.pic || {}] : [detail.customer || {}, detail];
    for (const r of rules.filter(x => ownKeys.has(x.field_key))) {
      const values = sources(r.section_name).map((src: any) => src[r.field_key]);
      if (!values.some((v: any) => v !== undefined && v !== null && String(v).trim() !== ''))
        gaps.push({target: 'FAP_FORM', label: r.field_label, detail: r.section_name});
    }
    const stageName = (code: string) => wf.stages.find(s => s.code === code)?.name;
    const missingDocs = (detail.documentChecks || []).filter((d: any) => d.isMandatory && !(d.files || []).length);
    for (const d of missingDocs)
      gaps.push({target: 'DOCUMENTS', label: `Dokumen ${d.documentName}`, detail: stageName(d.stageCode)});
    if (!app.is_fap_doc_uploaded && !missingDocs.some((d: any) => d.documentCode === 'FAP'))
      gaps.push({target: 'DOCUMENTS', label: 'Dokumen FAP bertanda tangan', detail: stageName(wf.stages[0]?.code)});
    const deeds = detail.legal?.deeds || [];
    if (!deeds.length) gaps.push({target: 'LEGAL', label: 'Akta pendirian (minimal 1 akta)'});
    for (const d of deeds) {
      const total = (d.stakeholders || []).reduce((sum: number, x: any) => sum + Number(x.sharePercentage || 0), 0);
      if (Math.abs(total - 100) > 0.01)
        gaps.push({
          target: 'LEGAL',
          label: `Saham pada akta ${d.deedNumber || ''} harus tepat 100%`,
          detail: `Saat ini ${total.toFixed(2)}%`,
        });
    }
    return gaps;
  }
}
