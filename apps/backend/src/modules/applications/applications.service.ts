import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {businessToday, DEED_SECTION, deedData, formatCompanyName, screenOfForm} from '@liugong/shared';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {USER_TABLES} from '../../core/db/user-tables';
import {Problem, ensure} from '../../core/domain';
import {activityFeed, deedHistory, logActivity, recordActivity} from '../activity/activity-log';
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
import {MktPicLookup} from './mkt-pic.lookup';
import {mandatoryGaps} from './workflow/mandatory-check';
import {groupsOf, stagesOf, WorkflowConfigRepository, type WorkflowConfig} from './workflow/workflow-config.repository';
import {ApprovalsService, lowerOpen, scopeApproved, STATE_NAME} from '../approvals/approvals.service';
import type {AppStep, ScopeRef} from '../approvals/approvals.repository';

type Actor = SessionActor;
const by = (actor: Actor) => actor.username || null;

/** The table that holds the rows of each repeating section (is_repeating in crm_master_form_sections): one approval round per row. */
const REPEATING_ROWS: Record<string, string> = {[DEED_SECTION]: CRM.fapLegalDeeds};

/** Regex extract department / role code from authority name (e.g. CRM_FAP-FORM_CA_APPROVE -> CA). */
function getDeptFromAuthority(authName?: string | null, isPicMarketing?: boolean): string {
  if (isPicMarketing || !authName || authName.toLowerCase() === 'pic marketing') {
    return 'PIC Marketing';
  }
  const auth = authName.trim();
  const m = auth.match(/_([A-Za-z0-9]+)_(?:APPROVE|REVIEW|VERIFY)$/i) || auth.match(/_([A-Za-z0-9]+)$/i);
  if (m && m[1]) {
    const code = m[1].toUpperCase();
    if (code === 'LEGAL') return 'Legal';
    if (code === 'MANAGEMENT') return 'Management';
    if (code === 'CREDIT' || code === 'CA') return 'CA';
    if (code === 'BP' || code === 'PARTNER') return 'BP';
    if (code === 'BS' || code === 'SUPPORT') return 'BS';
    if (code === 'RISK') return 'Risk';
    return code;
  }
  const text = auth.toUpperCase();
  if (text.includes('MANAGEMENT')) return 'Management';
  if (text.includes('LEGAL')) return 'Legal';
  if (text.includes('CA') || text.includes('CREDIT')) return 'CA';
  if (text.includes('BP') || text.includes('BUSINESS PARTNER')) return 'BP';
  if (text.includes('BS') || text.includes('BUSINESS SUPPORT')) return 'BS';
  if (text.includes('RISK')) return 'Risk';
  return auth;
}

/**
 * Applications on the crm_liugong design: header (crm_applications), FAP profile and primary contact, the customer
 * golden record, and the approval of its stages. Each application points at a workflow (crm_applications.workflow_freeze_id) that says
 * which stages it has, which fields and documents each stage requires, and which approval steps a stage, a group or a document has
 * (modules/approvals). An application has no stored status: what it is comes from its approval rounds.
 */
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly db: CrmDatabase,
    private readonly apps: ApplicationsRepository,
    private readonly profiles: ApplicationProfileRepository,
    private readonly partners: BusinessPartnersRepository,
    private readonly approvals: ApprovalsService,
    private readonly config: WorkflowConfigRepository,
    private readonly ids: MasterIdLookup,
    private readonly fap: FapSectionsRepository,
    private readonly statements: FinancialStatementsRepository,
    private readonly legalData: LegalRepository,
    private readonly documents: DocumentsRepository,
    private readonly fapOcr: FapOcrRepository,
    private readonly freezes: FapFreezeRepository,
    private readonly mktPics: MktPicLookup,
  ) {}

  /* ---------- stages ---------- */

  /**
   * The stage view the workspace shows. The workspace has two views: the first stage, and (once the first stage is submitted and
   * locked, where work continues in parallel) the second one.
   */
  private viewStage(cfg: WorkflowConfig, progress: any[]) {
    const [first, second] = cfg.stages;
    if (!first) return undefined;
    const firstLocked = progress.some(p => p.stage_code === first.code && p.is_locked);
    return firstLocked && second ? second : first;
  }

  /**
   * Why a stage cannot be submitted yet, or null when it can. The workflow runs left to right: a stage waits until the groups of the
   * earlier steps are done (every stage done and the group's own approval approved) and until the stages of its group with a smaller
   * order are done. A stage that is already submitted cannot be submitted again.
   */
  private submitGate(cfg: WorkflowConfig, progress: any[], templates: any[], steps: AppStep[], stage: WorkflowConfig['stages'][number]): string | null {
    const row = (code: string) => progress.find((p: any) => p.stage_code === code);
    if (row(stage.code)?.submitted_at) return `${stage.name} is already submitted.`;
    for (const other of cfg.stages) {
      if (other.groupCode === stage.groupCode) {
        if (other.order < stage.order && !row(other.code)?.completed_at) return `Finish ${other.name} first.`;
        continue;
      }
      if (other.groupOrder >= stage.groupOrder) continue;
      if (!row(other.code)?.completed_at) return `Finish ${other.groupName} first.`;
    }
    for (const gcode of new Set(cfg.stages.filter(o => o.groupOrder < stage.groupOrder).map(o => o.groupCode)))
      if (!scopeApproved(templates, steps, {type: 'GROUP', groupCode: gcode})) return `${cfg.stages.find(o => o.groupCode === gcode)?.groupName} still waits for its approval.`;
    return null;
  }

  /** Application id and company name, for activity and notification texts. */
  private async label(id: string) {
    const saved = await this.profiles.getProfile(id);
    const company = saved?.customer?.companyName ?? '';
    return {applicationId: id, company};
  }

  /* ---------- reads ---------- */

  /** The active users, for the PIC Marketing dropdown. */
  mktPicCandidates() {
    return this.mktPics.candidates();
  }

  async list(actor?: Actor) {
    const [rows, branches, categories, premises, segments, roles, financing, deedReviews, docCounts] = await Promise.all([
      this.apps.list(),
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
            `SELECT application_id,stage_code,is_locked FROM ${CRM.applicationStageProgress}`,
          )
        )[0]
      : [];
    // grouped once: a filter per application over every progress row is quadratic (1.3 s at 5,000 applications, 19 s at 20,000)
    const progressOf = new Map<string, any[]>();
    for (const p of progress as any[]) progressOf.set(p.application_id, [...(progressOf.get(p.application_id) ?? []), p]);
    const states = await this.approvals.statesFor(rows.map((r: any) => ({id: r.id, workflow_freeze_id: r.workflow_freeze_id})));
    const picNames = await this.mktPics.names(rows.map((r: any) => r.mkt_pic_id));
    const mine = new Set((actor ? await this.approvals.inbox(actor) : []).map((x: any) => x.applicationId));
    const activeFreezeId = await this.config.activeFreezeId().catch(() => null);
    const configs = new Map<string, WorkflowConfig>();
    for (const code of new Set<string>(rows.map((r: any) => r.workflow_freeze_id).filter(Boolean))) {
      try {
        configs.set(code, await this.config.load(code));
      } catch {
        // Safe fallback for list view
      }
    }
    if (activeFreezeId && !configs.has(activeFreezeId)) {
      try {
        configs.set(activeFreezeId, await this.config.load(activeFreezeId));
      } catch {}
    }
    return rows.map(r => {
      const state = states.get(r.id) ?? 'IN_PROGRESS';
      const cfg = configs.get(r.workflow_freeze_id) ?? (activeFreezeId ? configs.get(activeFreezeId) : null);
      const view = cfg
        ? this.viewStage(cfg, progressOf.get(r.id) ?? [])
        : null;
      return {
        id: r.id,
        application_number: r.application_number ?? null,
        applicationNumber: r.application_number ?? null,
        business_partner_id: r.business_partner_id,
        customer_category: r.customer_category,
        application_date: r.application_date,
        fap_number: r.fap_registration_number ?? null,
        has_fap_number: !!r.fap_registration_number,
        company_name: r.company_name,
        company_type: categories.get(r.business_category_id) ?? null,
        nib: r.nib,
        nib_date: r.nib_date,
        npwp: r.npwp,
        establishment_act_no: r.establishment_act_no,
        establishment_date: r.establishment_date,
        branch_code: branches.get(r.branch_id) ?? null,
        mkt_pic_id: r.mkt_pic_id ?? null,
        mkt_pic_name: picNames.get(Number(r.mkt_pic_id))?.name ?? r.mkt_pic_name ?? r.mkt_pic_username ?? null,
        mktPicId: r.mkt_pic_id ?? null,
        mktPicName: picNames.get(Number(r.mkt_pic_id))?.name ?? r.mkt_pic_name ?? r.mkt_pic_username ?? null,
        company_full_address: r.company_full_address,
        companyFullAddress: r.company_full_address,
        company_address: r.company_address,
        companyAddress: r.company_address,
        city: r.city_id,
        province: r.province_id,
        experience_years: r.experience_years,
        experience_months: r.experience_months,
        status: state,
        status_name: STATE_NAME[state],
        workflow_stage: view?.code ?? null,
        pending_for_me: mine.has(r.id),
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
    const [cfg, saved, pic, progress, documentChecks, raw] = await Promise.all([
      this.config.load(app.workflow_freeze_id),
      this.profiles.getProfile(id),
      this.profiles.getContact(id),
      this.apps.stageProgress(id),
      this.documents.read(id),
      this.approvals.raw(id, app.workflow_freeze_id),
    ]);
    // names of what an approval is about (a group, a stage, a section and its row, a document), for the approval panel
    const [sectionRows] = await this.db.pool.query<any[]>(`SELECT code,name FROM ${CRM.masterFormSections}`);
    const sectionNames = new Map<string, string>(sectionRows.map(r => [r.code, r.name]));
    const [deedRows] = await this.db.pool.query<any[]>(`SELECT id,deed_number FROM ${CRM.fapLegalDeeds} WHERE application_id=?`, [id]);
    const rowNames = new Map<string, string>(deedRows.map(r => [r.id, `Deed ${r.deed_number}`]));
    const scopeName = (sc: ScopeRef) =>
      sc.type === 'GROUP'
        ? `Group ${cfg.stages.find(x => x.groupCode === sc.groupCode)?.groupName ?? ''}`.trim()
        : sc.type === 'STAGE'
          ? `Stage ${cfg.stages.find(x => x.code === sc.stageCode)?.name ?? ''}`.trim()
          : sc.type === 'SECTION'
            ? `Section ${sectionNames.get(sc.sectionCode ?? '') ?? sc.sectionCode ?? ''}${sc.subjectId ? ` · ${rowNames.get(sc.subjectId) ?? 'row'}` : ''}`.trim()
            : `Document ${(documentChecks as any[]).find(d => d.id === sc.checklistId)?.documentName ?? ''}`.trim();
    const approval = await this.approvals.view(id, app.workflow_freeze_id, actor, scopeName, g => cfg.stages.filter(x => x.groupCode === g).map(x => x.code));
    // A document the workflow wants approved: how far its approval is, and whether it can be asked for now (it needs a file).
    const documentsWithApproval = (documentChecks as any[]).map(d => {
      const wanted = raw.templates.filter(t => t.scope === 'DOCUMENT' && !!d.documentCode && t.stageCode === d.stageCode && t.documentCode === d.documentCode);
      if (!wanted.length) return {...d, approval: null};
      const round = approval.current.find(c => c.scope === 'DOCUMENT' && c.checklistId === d.id);
      const shownStatus = (x?: {status: string; reopened: boolean}) => (!x ? 'NOT_REQUESTED' : x.reopened ? 'REOPENED' : x.status);
      // The checklist document is one bundle: a file added after its approval makes it UPLOADED again, and the finished round no longer counts (it needs approval again).
      const again = !!round && d.status !== 'VERIFIED' && round.steps.every(x => x.status === 'APPROVED');
      const state = !round || again ? 'NOT_REQUESTED' : round.steps.some(x => x.status === 'REJECTED' && !x.reopened) ? 'REJECTED' : round.steps.some(x => x.reopened) ? 'REOPENED' : round.steps.every(x => x.status === 'APPROVED') ? 'APPROVED' : 'PENDING';
      const steps = wanted.map(t => {
        const matched = again ? undefined : round?.steps.find(x => x.code === t.code);
        return {
          id: matched?.id || t.id,
          code: t.code,
          name: t.name,
          authority: t.authorityName,
          authorityName: t.authorityName,
          order: t.sortOrder,
          status: shownStatus(matched),
          decisions: matched?.decisions || [],
        };
      });
      return {...d, approval: {steps, state, again, canRequest: (d.files || []).length > 0 && (state === 'NOT_REQUESTED' || state === 'REJECTED' || state === 'REOPENED')}};
    });
    const view = this.viewStage(cfg, progress);
    const customer: Record<string, any> = {...(saved?.customer || {}), id: app.business_partner_id};
    const profile = {
      ...(saved?.profile || {}),
      branchCode: await this.ids.codeOf('branch', app.branch_id),
      customerStatus: app.customer_category,
      customerCategory: app.customer_category,
    };
    const legal = await this.legalData.read(id);
    // Review history of each deed comes from the activity log (DEED_* rows).
    const history = await deedHistory(id);
    for (const d of legal.deeds as any[]) d.reviewHistory = history.get(d.id) || [];
    const firstStage = cfg.stages[0];
    const firstLocked = progress.some((p: any) => p.stage_code === firstStage?.code && p.is_locked);
    const ocrComparison = await this.fapOcr.read(id);
    return {
      ...profile,
      id: app.id,
      applicationNumber: app.application_number ?? null,
      application_number: app.application_number ?? null,
      companyName: customer.companyName ?? null,
      customerId: app.business_partner_id,
      customer,
      establishmentActNo: customer.establishmentActNo ?? null,
      establishmentDate: customer.establishmentDate ?? null,
      nibDate: customer.nibDate ?? null,
      fapNumber: app.fap_registration_number ?? null,
      mktPicId: app.mkt_pic_id ?? null,
      mktPicName: app.mkt_pic_name || app.mkt_pic_username || null,
      applicationDate: app.application_date,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
      status: approval.state,
      statusName: approval.stateName,
      stage: view?.code ?? null,
      stageName: view?.name ?? null,
      // The workflow (stages, required fields, documents) this application runs in; fixed when it was created.
      workflow: {id: cfg.id, name: cfg.name, freezeVersion: cfg.freezeVersion, groups: groupsOf(cfg), stages: stagesOf(cfg)},
      workflowStage: view ? {code: view.code, name: view.name} : null,
      workflowFlags: {
        lastStage: !!view && view.code === cfg.stages[cfg.stages.length - 1]?.code,
      },
      // The approval layer: the state, the newest round of every group / stage / document with who can act, and the older rounds.
      approval,
      // The places of this application that have an approval in the workflow (a section, a document...): a screen that shows one of them
      // (an ApprovalSlot) looks itself up here by its code.
      approvalPlaces: await this.approvalPlaces(app.workflow_freeze_id),
      // who the PIC Marketing is (name from the users module), for the heading of the application
      fapFormLocked:
        !!Number(app.is_fap_form_locked) ||
        documentsWithApproval.some(
          d =>
            d.documentCode === 'FAP' &&
            (d.approval?.state === 'PENDING' ||
              d.approval?.state === 'APPROVED' ||
              d.approval_status === 'IN_APPROVAL' ||
              d.approval_status === 'APPROVED'),
        ),
      mktPic: app.mkt_pic_id ? {id: Number(app.mkt_pic_id), ...((await this.mktPics.names([app.mkt_pic_id])).get(Number(app.mkt_pic_id)) ?? {name: '', username: ''})} : null,
      createdBy: app.created_by ?? null,
      legal,
      pic,
      stakeholders:
        legal.deeds.find((d: any) => d.id === legal.selectedDeedId)?.stakeholders || legal.deeds[0]?.stakeholders || [],
      ...(await this.fap.read(id)),
      ...(await this.statements.read(id)),
      documentChecks: documentsWithApproval,
      // Every stage with where it stands and whether it can be submitted now (and if not, why).
      stageProgress: cfg.stages.map(st => {
        const p = progress.find((x: any) => x.stage_code === st.code);
        const blocked = this.submitGate(cfg, progress, raw.templates, raw.steps, st);
        return {stage: st.code, name: st.name, group: st.groupName, groupCode: st.groupCode, locked: !!p?.is_locked, submitted: !!p?.submitted_at, completed: !!p?.completed_at, canSubmit: blocked === null, blockedReason: blocked};
      }),
      submitLock: {
        ocrComparison,
        remarks: ocrComparison?.remarks ?? null,
        isLocked: app.is_fap_doc_uploaded ? 0 : 1,
        fapDocUploaded: app.is_fap_doc_uploaded ? 1 : 0,
        stage: firstLocked && cfg.stages[1] ? cfg.stages[1].code : firstStage?.code,
      },
      // Every decision of every round, oldest first (the Activity / approval history of the screen).
      approvalLogs: [...approval.history, ...approval.current]
        .flatMap(c => c.steps.flatMap(st => st.decisions.map(d => ({id: `${st.id}-${d.by}`, actionTimestamp: d.decidedAt, actionBy: d.by, action: d.decision, step: st.name, round: c.roundNo, comments: d.remarks, via: d.via}))))
        .sort((x, y) => new Date(x.actionTimestamp).getTime() - new Date(y.actionTimestamp).getTime()),
    };
  }

  async detailOr404(id: string, actor?: Actor): Promise<any> {
    const application = await this.detail(id, actor);
    ensure(application, 'Application not found', 404);
    return application;
  }

  async marketingPics() {
    const [rows] = await this.apps.pool.query<any[]>(
      `SELECT u.id, u.username, u.full_name, d.department_name, d.department_code
       FROM ${USER_TABLES.users} u
       LEFT JOIN ${USER_TABLES.departments} d ON d.dept_id = u.dept_id
       WHERE u.is_active = 1
       ORDER BY u.full_name, u.username`,
    );
    return rows.map((u: any) => ({
      id: Number(u.id),
      username: u.username,
      fullName: u.full_name || null,
      departmentName: u.department_name || null,
      departmentCode: u.department_code || null,
    }));
  }

  /* ---------- writes ---------- */

  /**
   * Where this workflow has an approval (a document, a section, a stage, a group), with the name of the approval and its levels (who approves,
   * in order; rows of one level approve together). The screens show it before anything is submitted.
   */
  private async approvalPlaces(workflowFreezeId: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT a.id,a.scope_type,a.stage_code,a.group_code,a.section_code,a.document_code,a.approval_code,f.name AS approval_name,l.level_no,l.authority_name,l.is_pic_marketing
       FROM ${CRM.frozenWorkflowApprovalAssignments} a
       LEFT JOIN ${CRM.frozenApprovals} f ON f.id=a.approval_freeze_id
       LEFT JOIN ${CRM.frozenApprovalLevels} l ON l.approval_freeze_id=a.approval_freeze_id
       WHERE a.workflow_freeze_id=? ORDER BY a.scope_type,a.code,l.level_no,l.authority_name`,
      [workflowFreezeId],
    );
    const places = new Map<string, any>();
    for (const r of rows) {
      const place =
        places.get(r.id) ??
        places
          .set(r.id, {
            scope: r.scope_type,
            stageCode: r.stage_code,
            groupCode: r.group_code,
            sectionCode: r.section_code,
            documentCode: r.document_code,
            approvalCode: r.approval_code,
            approvalName: r.approval_name,
            levels: [] as {levelNo: number; authorityName: string; isPicMarketing: boolean}[],
          })
          .get(r.id);
      if (r.level_no !== null) place.levels.push({levelNo: Number(r.level_no), authorityName: r.authority_name || '', isPicMarketing: !!r.is_pic_marketing});
    }
    return [...places.values()];
  }

  async create(body: Record<string, any>, actor: Actor) {
    const customerId: string | null = body.customerId ? String(body.customerId) : null;
    const existing = customerId ? await this.partners.get(customerId) : null;
    ensure(!customerId || existing, 'Customer not found', 404);
    const customer = {...(existing?.customer || {}), ...(body.customer || {})};
    if (body.companyName && !customer.companyName) customer.companyName = body.companyName;
    if (customer.companyName) customer.companyName = formatCompanyName(String(customer.companyName).trim());
    ensure(String(customer.companyName || '').trim(), 'Company name is required');
    // The PIC Marketing is the account that enters the application unless another user is chosen (see mktPicId below); a PIC that cannot be found is refused when the first approval starts.
    const profile = {...(existing?.profile || {}), ...body};
    const asked = String(body.customerCategory || body.customerStatus || (customerId ? 'EXISTING' : 'NEW')).trim().toUpperCase();
    // a category that is neither NEW nor EXISTING is refused (it used to become NEW without a word)
    ensure(asked === 'NEW' || asked === 'EXISTING', 'The customer category must be NEW or EXISTING', 422);
    const category: 'NEW' | 'EXISTING' = asked === 'EXISTING' ? 'EXISTING' : 'NEW';
    const workflowFreezeId = await this.config.activeFreezeId();
    const stage = (await this.config.load(workflowFreezeId)).stages[0];
    ensure(stage, 'The active workflow has no stage yet.', 500);
    const id = crypto.randomUUID();
    const partnerId = customerId || crypto.randomUUID();
    const today = businessToday();
    // No FAP number is made here: Pre-analysis can run first, and the number is generated on demand (generateFapNumber).
    let applicationNumber = '';
    // The number is taken under a named lock, held until the application is stored, so two users never get the same one.
    const lockConn = await this.db.pool.getConnection();
    try {
      const [lock] = await lockConn.query<any[]>('SELECT GET_LOCK(?, 10) AS ok', ['crm_application_number']);
      ensure(Number(lock[0]?.ok) === 1, 'Another application is being created. Try again.', 409);
      try {
    await this.db.transaction(async conn => {
      await this.partners.saveFromApplication(conn, partnerId, customer, profile, by(actor));
      applicationNumber = await this.apps.nextApplicationNumber(conn, today, await this.partners.customerNo(conn, partnerId));
      await this.apps.insert(
        conn,
        {
          id,
          applicationNumber,
          applicationDate: today,
          customerId: partnerId,
          customerCategory: category,
          branchId: await this.ids.idOf('branch', profile.branchCode, conn),
          workflowFreezeId,
          // the PIC Marketing is the account that enters the application, unless another user is chosen
          mktPicId: Number.isInteger(Number(body.mktPicId)) && Number(body.mktPicId) > 0 ? Number(body.mktPicId) : Number(actor.portalUserId) > 0 ? Number(actor.portalUserId) : null,
        },
        actor,
      );
      await this.profiles.saveProfile(conn, id, customer, profile, by(actor));
      await this.apps.saveStageProgress(conn, id, stage.code, {}, actor);
      await this.documents.seedChecklist(conn, id, workflowFreezeId, by(actor));
    });
      } finally {
        await lockConn.query('SELECT RELEASE_LOCK(?)', ['crm_application_number']);
      }
    } finally {
      lockConn.release();
    }
    const company = String(customer.companyName).trim();
    const categoryName = category === 'EXISTING' ? 'Existing Customer' : 'New Customer';
    await recordActivity(
      {
        applicationId: id,
        stageCode: stage.code,
        section: 'Customer & PIC',
        tabIndex: 0,
        actionType: 'CREATE',
        title: `Created new application ${applicationNumber} for ${company}`,
        details: `Initiated ${stage.name}, Category: ${categoryName}. Application Number: ${applicationNumber}. Ready for data entry.`,
        changes: [
          {label: 'Application Number', newValue: applicationNumber},
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

  /** Submitting the stage that shows the FAP form locks the form (the frozen copy is made at that moment); a rejection of the stage opens it again. */
  private async assertFapFormOpen(app: any, conn?: any) {
    if (Number(app.is_fap_form_locked)) {
      throw new Problem(409, 'The FAP form is locked because it was submitted for approval. It opens again if rejected.');
    }
    const db = conn || this.db.pool;
    const [rows] = await db.query(
      `SELECT approval_status FROM ${CRM.applicationDocumentChecklists} WHERE application_id=? AND document_code='FAP'`,
      [app.id],
    );
    if (rows && rows.length > 0 && (rows[0].approval_status === 'IN_APPROVAL' || rows[0].approval_status === 'APPROVED')) {
      throw new Problem(409, 'The FAP form is locked because it was submitted for approval. It opens again if rejected.');
    }
  }

  async saveCustomerAndContact(id: string, body: Record<string, any>, actor: Actor, expectedUpdatedAt?: unknown) {
    const current = await this.detailOr404(id, actor);
    const customer = {...(current.customer || {}), ...(body.customer || {})};
    const profile = {...current, ...(body.profile || {})};
    const category: 'NEW' | 'EXISTING' = profile.customerStatus === 'EXISTING' ? 'EXISTING' : 'NEW';
    await this.db.transaction(async conn => {
      const app = await this.apps.get(id, conn, true);
      ensure(app, 'Application not found', 404);
      await this.assertFapFormOpen(app, conn);
      this.assertFresh(app, expectedUpdatedAt, actor);
      let changed = await this.profiles.saveProfile(conn, id, customer, profile, by(actor));
      changed = (await this.partners.saveFromApplication(conn, app.business_partner_id, customer, profile, by(actor))) || changed;
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
    const editStatements = Array.isArray(body.financialStatements);
    await this.db.transaction(async conn => {
      const app = await this.apps.get(id, conn, true);
      ensure(app, 'Application not found', 404);
      // sections 05-08 belong to the FAP form and are locked with it; the financial statements (09) have their own rule below
      if (Array.isArray(body.projects) || Array.isArray(body.bankReferences) || body.proposal || financingProposal || (profile.financingPurposeDetail ?? body.financingPurposeDetail) !== undefined) await this.assertFapFormOpen(app, conn);
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
      if (editStatements) {
        ensure(
          await this.canEditStatements(app, actor),
          'Financial statements are locked at this workflow stage',
          403,
        );
        await this.statements.save(conn, id, body.financialStatements, by(actor));
      }
      await this.apps.touch(conn, id, by(actor));
    });
  }

  /** Financial statements can be edited until the application is approved (administrators always can). */
  private async canEditStatements(app: any, actor: Actor) {
    if (actor.isAdmin || actor.role === 'ADMIN') return true;
    if (!(actor.authorities || []).includes('CRM_FINANCIAL_EDIT')) return false;
    return (await this.approvals.stateFor(app.id, app.workflow_freeze_id)) !== 'APPROVED';
  }

  /**
   * Generates the FAP number of an application that has none (the next free one of the year). A named lock, on its own
   * connection, is held until the number is stored, so two users never get the same number.
   */
  async generateFapNumber(id: string, actor: Actor) {
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const cfg = await this.config.load(app.workflow_freeze_id);
    ensure(!app.fap_registration_number, 'This application already has a FAP number.', 409);
    const today = businessToday();
    const lockName = `crm_fap_number_${today.slice(0, 4)}`;
    let fapNumber = '';
    const lockConn = await this.db.pool.getConnection();
    try {
      const [lock] = await lockConn.query<any[]>('SELECT GET_LOCK(?, 10) AS ok', [lockName]);
      ensure(Number(lock[0]?.ok) === 1, 'Another FAP number is being generated. Try again.', 409);
      try {
        await this.db.transaction(async conn => {
          fapNumber = await this.apps.nextFapNumber(conn, today);
          ensure(await this.apps.setFapNumber(conn, id, fapNumber, actor), 'This application already has a FAP number.', 409);
        });
      } finally {
        await lockConn.query('SELECT RELEASE_LOCK(?)', [lockName]);
      }
    } finally {
      lockConn.release();
    }
    await recordActivity(
      {
        applicationId: id,
        stageCode: cfg.stages[0]?.code,
        section: 'FAP',
        tabIndex: 0,
        actionType: 'UPDATE',
        title: `FAP number generated: ${fapNumber}`,
        details: 'The FAP number was generated on request.',
        changes: [{label: 'FAP Number', newValue: fapNumber}],
      },
      actor,
    );
    return this.detailOr404(id, actor);
  }

  /**
   * Submits a stage: locks it (and the FAP form when the stage shows it, with a frozen copy), then starts the approval of the stage,
   * and of its group once every stage of the group is submitted. A stage without approval steps is simply done. After a rejection
   * the stage is open again and this is the resubmit: a new round of approval starts from its first step.
   */
  async submitStage(id: string, stageCode: string, actor: Actor, remarks?: string) {
    const app0 = await this.apps.get(id);
    ensure(app0, 'Application not found', 404);
    const cfg = await this.config.load(app0.workflow_freeze_id);
    const stage = cfg.stageByCode.get(stageCode);
    ensure(stage, `Stage ${stageCode} is not in this application's workflow.`, 404);
    const shows = (st: {formCode: string | null}) => screenOfForm(st.formCode) === 'FAP';
    let pending: AppStep[] = [];
    // What this stage still lacks (its required fields, mandatory documents, and the deeds when they belong to it), read before the transaction
    const gaps = await this.approvalGaps(id, app0, stage.code);
    // The FAP number is no longer a precondition of any stage. Submitting the stage that shows the FAP form makes the number when the application has none yet
    // (the frozen FAP needs one); it can also be generated earlier with the button of the FAP form.
    if (shows(stage) && !app0.fap_registration_number && !gaps.length) await this.generateFapNumber(id, actor);
    await this.db.transaction(async conn => {
      const app = await this.apps.get(id, conn, true);
      ensure(app, 'Application not found', 404);
      const progress = await this.apps.stageProgress(id, conn);
      const raw = await this.approvals.raw(id, app.workflow_freeze_id, conn);
      const blocked = this.submitGate(cfg, progress, raw.templates, raw.steps, stage);
      ensure(blocked === null, blocked ?? '', 409);
      if (gaps.length) throw new Problem(422, `${stage.name} is not complete yet (${gaps.length}): ${gaps.map(g => g.label).join('; ')}`, [], gaps);
      // Submitting the stage that shows the FAP form accepts the signed FAP document: the differences stay recorded in its remarks and the review closes
      // (inside this transaction, before the freeze copies the differences: a refused submit leaves the review as it was).
      if (shows(stage)) await this.closeFapReview(conn, id, remarks, actor);
      await this.apps.saveStageProgress(conn, id, stage.code, {isLocked: true, submitted: true, clearCompleted: true}, actor);
      if (shows(stage)) await this.apps.updateFap(conn, id, {is_fap_form_locked: 1}, by(actor));
      const scopes: ScopeRef[] = [{type: 'STAGE', stageCode: stage.code}];
      const siblings = cfg.stages.filter(st => st.groupCode === stage.groupCode);
      const nowProgress = await this.apps.stageProgress(id, conn);
      if (siblings.every(st => nowProgress.some((p: any) => p.stage_code === st.code && p.submitted_at))) scopes.push({type: 'GROUP', groupCode: stage.groupCode});
      for (const scope of scopes) {
        const started = await this.startIfIdle(conn, app, scope, actor);
        pending = pending.concat(started);
        if (started.length) {
          if (scope.type === 'STAGE') await this.apps.setStageApproval(conn, id, stage.code, 'IN_APPROVAL', by(actor));
          else await this.apps.setGroupApproval(conn, id, app.workflow_freeze_id, scope.groupCode!, 'IN_APPROVAL', by(actor));
        }
        // no approval step on this stage: it is done as soon as it is submitted, but its mandatory documents that have an approval must be verified first
        if (scope.type === 'STAGE' && !started.length && !(await this.approvals.hasRound(conn, id, scope))) {
          await this.assertMandatoryDocumentsVerified(conn, id, stage.code);
          await this.apps.saveStageProgress(conn, id, stage.code, {completed: true}, actor);
          await this.apps.setStageApproval(conn, id, stage.code, 'APPROVED', by(actor));
          await this.settleGroupWithoutApproval(conn, id, app.workflow_freeze_id, cfg, stage.groupCode, actor);
        }
      }
      // The submitted FAP is frozen in the same transaction: a submitted stage always has its snapshot. After the loop, so it holds the approval that just started.
      if (shows(stage)) await this.freezes.freeze(conn, id, stage.code, actor, remarks);
      await this.assertReadyIfFinished(conn, id, app);
    });
    const label = await this.label(id);
    await this.approvals.notifyPending(pending, actor, {applicationId: id, company: label.company});
    await recordActivity(
      {
        applicationId: id,
        stageCode: stage.code,
        section: shows(stage) ? 'Documents' : 'Workflow',
        tabIndex: shows(stage) ? 6 : undefined,
        actionType: 'SUBMIT',
        title: `${stage.name} submitted for ${label.company || ''}`,
        details: (pending.length ? `Waiting for approval: ${pending.map(p => p.name).join(', ')}.` : 'No approval step: the stage is done.') + (remarks ? ` Remarks: ${remarks}` : ''),
      },
      actor,
    );
    return {success: true, stage: stage.code, waitingFor: pending.map(p => ({step: p.name, authority: p.authorityName}))};
  }

  /** Closes the OCR review of the current signed FAP file as APPROVED: open differences are kept as NOTED, the remarks (when given) replace the saved ones. */
  private async closeFapReview(conn: any, id: string, remarks: string | undefined, actor: Actor) {
    // the current file first, then its review: an earlier file's review is history and never changes
    const [rows] = await conn.query(
      `SELECT c.id FROM ${CRM.fapDocumentOcrComparisons} c
       WHERE c.application_id=? AND c.comparison_status IN ('HAS_DIFFERENCES','MATCHED') AND c.document_file_id=(
         SELECT f.id FROM ${CRM.applicationDocumentFiles} f
         JOIN ${CRM.applicationDocumentChecklists} k ON k.id=f.checklist_id
         JOIN ${CRM.masterDocumentTypes} t ON t.id=k.document_type_id AND t.code='FAP'
         WHERE f.application_id=? AND f.deleted_at IS NULL ORDER BY f.uploaded_at DESC,f.created_at DESC,f.id DESC LIMIT 1
       )`,
      [id, id],
    );
    for (const r of rows as any[]) {
      await conn.query(
        `UPDATE ${CRM.fapDocumentOcrComparisons} SET comparison_status='APPROVED',has_differences=0,remarks=COALESCE(?,remarks),reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP(3),updated_by=? WHERE id=?`,
        [remarks?.trim() ? remarks : null, by(actor), by(actor), r.id],
      );
      await conn.query(`UPDATE ${CRM.fapDocumentOcrDiscrepancies} SET resolution_status='NOTED' WHERE comparison_id=? AND resolution_status='OPEN'`, [r.id]);
    }
  }

  /** "Submit FAP stage": submits the first stage of the application's workflow. */
  async submitFirstStage(id: string, actor: Actor, remarks?: string) {
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const first = (await this.config.load(app.workflow_freeze_id)).stages[0];
    ensure(first, 'The workflow has no stage.', 500);
    return this.submitStage(id, first.code, actor, remarks);
  }

  /**
   * The mandatory documents of a stage: a document that has an approval in the workflow must be APPROVED (its approval is finished), a document without
   * approval only needs a file. Refuses (422) with the list.
   */
  private async assertMandatoryDocumentsVerified(conn: any, id: string, stageCode: string) {
    const [rows] = await conn.query(
      `SELECT c.id,c.status,c.approval_status,c.document_code,t.name,
              (SELECT COUNT(*) FROM ${CRM.applicationDocumentFiles} f WHERE f.checklist_id=c.id AND f.deleted_at IS NULL) AS files,
              (SELECT COUNT(*) FROM ${CRM.frozenWorkflowApprovalAssignments} a WHERE a.workflow_freeze_id=sd.workflow_freeze_id AND a.stage_code=sd.stage_code AND a.document_code=sd.document_code) AS approvals
       FROM ${CRM.applicationDocumentChecklists} c
       JOIN ${CRM.frozenWorkflowStageDocuments} sd ON sd.workflow_freeze_id=c.workflow_freeze_id AND sd.stage_code=c.stage_code AND sd.document_code=c.document_code
       JOIN ${CRM.masterDocumentTypes} t ON t.id=c.document_type_id
       WHERE c.application_id=? AND c.stage_code=? AND sd.is_mandatory=1`,
      [id, stageCode],
    );
    const pending = (rows as any[]).filter(r => (Number(r.approvals) > 0 ? r.approval_status !== 'APPROVED' : Number(r.files) === 0));
    if (pending.length) {
      const pendingIds = pending.map(r => r.id);
      const [stepRows] = await conn.query(
        `SELECT document_checklist_id, round_no, sort_order, authority_name, is_pic_marketing, status
         FROM ${CRM.applicationApprovalSteps}
         WHERE application_id=? AND scope_type='DOCUMENT' AND document_checklist_id IN (?)
         ORDER BY document_checklist_id, round_no, sort_order`,
        [id, pendingIds.length ? pendingIds : ['']],
      );
      const [templateRows] = await conn.query(
        `SELECT a.document_code, l.level_no, l.authority_name, l.is_pic_marketing
         FROM ${CRM.frozenWorkflowApprovalAssignments} a
         JOIN ${CRM.frozenApprovalLevels} l ON l.approval_freeze_id=a.approval_freeze_id
         JOIN ${CRM.applicationDocumentChecklists} c ON c.application_id=? AND c.stage_code=? AND c.document_code=a.document_code
         WHERE a.workflow_freeze_id=c.workflow_freeze_id AND a.scope_type='DOCUMENT' AND a.stage_code=?
         ORDER BY a.document_code, l.level_no`,
        [id, stageCode, stageCode],
      );

      const gaps = pending.map(r => {
        let detail = 'Not uploaded yet';
        if (Number(r.approvals) > 0) {
          const docSteps = (stepRows as any[]).filter(s => s.document_checklist_id === r.id);
          let depts: string[] = [];
          if (docSteps.length > 0) {
            const maxRound = Math.max(...docSteps.map(s => Number(s.round_no)));
            const currentRound = docSteps.filter(s => Number(s.round_no) === maxRound);
            const unapproved = currentRound.filter(s => s.status !== 'APPROVED');
            depts = [...new Set(unapproved.map(s => getDeptFromAuthority(s.authority_name, Boolean(s.is_pic_marketing))))].filter(Boolean);
          } else {
            const docTemplates = (templateRows as any[]).filter(t => t.document_code === r.document_code);
            depts = [...new Set(docTemplates.map(t => getDeptFromAuthority(t.authority_name, Boolean(t.is_pic_marketing))))].filter(Boolean);
          }
          const deptStr = depts.join(', ');
          detail = deptStr ? `Haven't approved yet by ${deptStr}` : "Haven't approved yet";
        }
        return {target: 'DOCUMENTS', label: r.name, detail};
      });
      throw new Problem(422, `Dokumen wajib belum selesai (${gaps.length}): ${gaps.map(g => `${g.label} (${g.detail})`).join('; ')}`, [], gaps);
    }
  }

  /**
   * A stage cannot be approved before its mandatory documents are done: every document the workflow marks mandatory in that stage must be
   * approved (when the workflow has an approval for that document) or at least uploaded (when it has none). Refuses with the list.
   */
  private async assertGroupStagesDone(conn: any, id: string, step: AppStep, verb: 'disetujui' | 'ditolak') {
    // A group is decided only after every stage in it is approved (a stage without approval is done once it is submitted).
    if (step.scope !== 'GROUP' || !step.groupCode) return;
    const [open] = await conn.query(
      `SELECT s.name FROM ${CRM.frozenWorkflowStages} s
       LEFT JOIN ${CRM.applicationStageProgress} p ON p.stage_code=s.code AND p.application_id=?
       WHERE s.workflow_freeze_id=? AND s.group_code=? AND p.completed_at IS NULL`,
      [id, step.workflowFreezeId, step.groupCode],
    );
    if ((open as any[]).length)
      throw new Problem(422, `Group belum bisa ${verb}: stage berikut belum disetujui (${(open as any[]).map(r => r.name).join(', ')}).`);
  }

  /**
   * A deed can only be sent for approval, and approved, while it is complete as it is STORED: the establishment deed has at least one stakeholder and
   * the shares of a deed that has stakeholders add up to exactly 100%. Read from the database, never from what the screen shows, so a stakeholder deleted
   * on screen but not saved yet (or in the meantime) cannot slip through.
   */
  private async assertDeedComplete(db: any, id: string, deedId: string) {
    const [rows] = await db.query(
      `SELECT d.deed_type,d.deed_number,(SELECT COUNT(*) FROM ${CRM.fapLegalStakeholders} s WHERE s.deed_id=d.id AND s.deleted_at IS NULL AND s.is_active=1) AS n,
              (SELECT COALESCE(SUM(s.share_percentage),0) FROM ${CRM.fapLegalStakeholders} s WHERE s.deed_id=d.id AND s.deleted_at IS NULL AND s.is_active=1) AS total
       FROM ${CRM.fapLegalDeeds} d WHERE d.id=? AND d.application_id=?`,
      [deedId, id],
    );
    const d = (rows as any[])[0];
    if (!d) return;
    const name = d.deed_number ? ` ${d.deed_number}` : '';
    if (!Number(d.n)) {
      ensure(d.deed_type !== 'ESTABLISHMENT', `Deed${name} has no stakeholder in the database. Add at least one stakeholder and save, then try again.`, 422);
      return;
    }
    ensure(Math.abs(Number(d.total) - 100) <= 0.01, `The shares of deed${name} add up to ${Number(d.total).toFixed(2)}%, not 100%. Correct the stakeholders and save, then try again.`, 422);
  }

  private async assertMandatoryDocumentsDone(conn: any, id: string, step: AppStep) {
    await this.assertGroupStagesDone(conn, id, step, 'disetujui');
    if (step.scope !== 'STAGE' || !step.stageCode) return;
    await this.assertMandatoryDocumentsVerified(conn, id, step.stageCode);
    // The rows of a repeating section with an approval in this stage (the deeds): every row that was submitted for approval must be approved
    // (a waiting or rejected one holds the stage back; a row never submitted is ignored), and at least one must be approved.
    const [places] = await conn.query(
      `SELECT DISTINCT section_code FROM ${CRM.frozenWorkflowApprovalAssignments} WHERE workflow_freeze_id=? AND stage_code=? AND scope_type='SECTION'`,
      [step.workflowFreezeId, step.stageCode],
    );
    const open: {target: string; label: string; detail: string}[] = [];
    for (const {section_code: sectionCode} of places as any[]) {
      const table = REPEATING_ROWS[sectionCode];
      if (!table) continue;
      const [subjects] = await conn.query(`SELECT id,deed_number FROM ${table} WHERE application_id=?`, [id]);
      const [steps] = await conn.query(`SELECT subject_id,round_no,status FROM ${CRM.applicationApprovalSteps} WHERE application_id=? AND scope_type='SECTION' AND section_code=?`, [id, sectionCode]);
      let approved = 0;
      for (const s of subjects as any[]) {
        const mine = (steps as any[]).filter(x => x.subject_id === s.id);
        const last = Math.max(0, ...mine.map(x => Number(x.round_no)));
        if (!last) continue;
        const unapproved = mine.filter(x => Number(x.round_no) === last && x.status !== 'APPROVED');
        const depts = [...new Set(unapproved.map(x => getDeptFromAuthority(x.authority_name, Boolean(x.is_pic_marketing))))].filter(Boolean);
        const isRej = mine.some(x => Number(x.round_no) === last && x.status === 'REJECTED');
        const state = isRej
          ? 'Rejected'
          : unapproved.length === 0
          ? ''
          : depts.length
          ? `Haven't approved yet by ${depts.join(', ')}`
          : "Haven't approved yet";
        if (state) open.push({target: 'LEGAL', label: `Akta ${s.deed_number || ''}`.trim(), detail: state});
        else approved++;
      }
      if (!open.length && !approved) open.push({target: 'LEGAL', label: 'Akta', detail: 'Belum ada akta yang disetujui (minimal satu)'});
    }
    if (open.length) throw new Problem(422, `Akta belum disetujui (${open.length}): ${open.map(g => `${g.label} (${g.detail})`).join('; ')}`, [], open);
  }

  /** When what just happened finishes the whole application, the data, documents and deeds must be complete: otherwise it is refused. */
  private async assertReadyIfFinished(conn: any, id: string, app: any) {
    if ((await this.approvals.stateFor(id, app.workflow_freeze_id, conn)) !== 'APPROVED') return;
    const gaps = await this.approvalGaps(id, app);
    if (gaps.length) throw new Problem(422, `Data dan dokumen wajib belum lengkap (${gaps.length}): ${gaps.map(g => g.label).join('; ')}`, [], gaps);
  }

  /** A group that has no approval of its own is approved as soon as every stage in it is approved (a group with an approval is decided by it). */
  private async settleGroupWithoutApproval(conn: any, id: string, workflowFreezeId: string, cfg: WorkflowConfig, groupCode: string, actor: Actor) {
    const {templates} = await this.approvals.raw(id, workflowFreezeId, conn);
    if (templates.some(t => t.scope === 'GROUP' && t.groupCode === groupCode)) return;
    const progress = await this.apps.stageProgress(id, conn);
    const codes = cfg.stages.filter(s => s.groupCode === groupCode).map(s => s.code);
    if (codes.length && codes.every(c => progress.some((p: any) => p.stage_code === c && p.approval_status === 'APPROVED')))
      await this.apps.setGroupApproval(conn, id, workflowFreezeId, groupCode, 'APPROVED', by(actor));
  }

  /** Starts a round for a scope unless one is already running or approved (a repeated submit must not duplicate). */
  private async startIfIdle(conn: any, app: any, scope: ScopeRef, actor: Actor): Promise<AppStep[]> {
    try {
      return (await this.approvals.startScope(conn, {id: app.id, workflowFreezeId: app.workflow_freeze_id}, scope, actor)).pending;
    } catch (e: any) {
      if (e?.status === 409 || e?.statusCode === 409) return [];
      throw e;
    }
  }

  /**
   * Asks for the approval of one document of the application (a document with a step of its own in the workflow). The document needs
   * a file. After a rejection this is the resubmit.
   */
  async submitDocumentApproval(id: string, checklistId: string, actor: Actor) {
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const row = await this.documents.approvalRow(id, checklistId);
    ensure(row, 'Document not found', 404);
    ensure(row.fileCount > 0, 'Upload the document before asking for its approval.', 422);
    let pending: AppStep[] = [];
    await this.db.transaction(async conn => {
      pending = (await this.approvals.startScope(conn, {id, workflowFreezeId: app.workflow_freeze_id}, {type: 'DOCUMENT', checklistId, stageCode: row.stageCode, documentCode: row.documentCode}, actor)).pending;
      if (pending.length) {
        await this.documents.setApproval(conn, checklistId, 'IN_APPROVAL', by(actor));
        if (row.documentCode === 'FAP') {
          await this.apps.updateFap(conn, id, {is_fap_form_locked: 1}, by(actor));
        }
      }
    });
    ensure(pending.length, 'This document has no approval step in the workflow.', 422);
    const label = await this.label(id);
    await this.approvals.notifyPending(pending, actor, {applicationId: id, company: label.company});
    return this.detailOr404(id, actor);
  }

  /**
   * The deed has ONE approval: the master approval round of its section. The approval state the Legal tab and the rest of the CRM read
   * (crm_fap_legal_deeds.approval_status ...) follows that round: IN_APPROVAL when it is asked, APPROVED when every level approved it (with the
   * snapshot of the deed), REJECTED when a level rejected it.
   */
  private async syncDeedReview(conn: any, applicationId: string, deedId: string, status: 'IN_APPROVAL' | 'APPROVED' | 'REJECTED', actor: Actor, notes?: string | null) {
    let snapshot: string | null = null;
    if (status === 'APPROVED') {
      const detail: any = await this.detailOr404(applicationId);
      const deed = (detail.legal?.deeds || []).find((d: any) => d.id === deedId);
      snapshot = JSON.stringify(deedData(deed ?? {}));
    }
    const decided = status !== 'IN_APPROVAL';
    await this.legalData.setApproval(conn, applicationId, deedId, status, {
      remarks: decided ? notes ?? null : null,
      snapshot,
      decidedBy: decided ? actor.username || null : null,
      decidedAt: decided ? new Date() : null,
      by: by(actor),
    });
  }

  /**
   * Asks for the approval of ONE ROW of a repeating section (a deed of the Legal Deeds & Amendments section): the round belongs to that
   * row, so two deeds have two rounds. The section must have an approval in the workflow, and it also is the resubmit after a reject.
   */
  async submitSectionApproval(id: string, sectionCode: string, subjectId: string, actor: Actor) {
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const [sections] = await this.db.pool.query<any[]>(`SELECT is_repeating FROM ${CRM.masterFormSections} WHERE code=?`, [sectionCode]);
    ensure(sections[0], 'Section not found', 404);
    ensure(sections[0].is_repeating, 'This section is approved as a whole, not row by row.', 422);
    const rows = REPEATING_ROWS[sectionCode];
    ensure(rows, 'This section has no rows to approve.', 422);
    const [subject] = await this.db.pool.query<any[]>(`SELECT id FROM ${rows} WHERE id=? AND application_id=?`, [subjectId, id]);
    ensure(subject[0], 'This row is not saved yet. Save the form first (Save button at the bottom), then request its approval.', 404);
    const [places] = await this.db.pool.query<any[]>(
      `SELECT stage_code FROM ${CRM.frozenWorkflowApprovalAssignments} WHERE workflow_freeze_id=? AND scope_type='SECTION' AND section_code=?`,
      [app.workflow_freeze_id, sectionCode],
    );
    ensure(places[0], 'This section has no approval in the workflow.', 422);
    if (sectionCode === DEED_SECTION) await this.assertDeedComplete(this.db.pool, id, subjectId);
    let pending: AppStep[] = [];
    await this.db.transaction(async conn => {
      pending = (await this.approvals.startScope(conn, {id, workflowFreezeId: app.workflow_freeze_id}, {type: 'SECTION', stageCode: places[0].stage_code, sectionCode, subjectId}, actor)).pending;
      if (pending.length && sectionCode === DEED_SECTION) await this.syncDeedReview(conn, id, subjectId, 'IN_APPROVAL', actor);
    });
    ensure(pending.length, 'This section has no approval level in the workflow.', 422);
    const label = await this.label(id);
    await this.approvals.notifyPending(pending, actor, {applicationId: id, company: label.company});
    return this.detailOr404(id, actor);
  }

  /** What this stage still lacks before it can be submitted: the same list the Submit refuses with, shown before the button is pressed. */
  async stageCheck(id: string, stageCode: string) {
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const cfg = await this.config.load(app.workflow_freeze_id);
    ensure(cfg.stageByCode.get(stageCode), `Stage ${stageCode} is not in this application's workflow.`, 404);
    return {missing: await this.approvalGaps(id, app, stageCode)};
  }

  /** What would stop the final approval right now: the same list the last Approve refuses with. */
  async approvalCheck(id: string) {
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    return {missing: await this.approvalGaps(id, app)};
  }

  /**
   * One person's Approve or Reject on a step. Anyone holding the step's authority may decide (the service checks); a reject needs
   * remarks and opens the failed stage / group again for a resubmit. The approval that would finish the whole application is
   * refused while data, documents or deeds are still missing.
   */
  async decide(id: string, stepId: string, actor: Actor, input: {decision: 'APPROVED' | 'REJECTED'; remarks?: string | null; via?: 'WEB' | 'LARK'; reopenStages?: string[]; keepApproved?: {documents: string[]; deeds: string[]}; reopenItems?: {documents: string[]; deeds: string[]}}) {
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const cfg = await this.config.load(app.workflow_freeze_id);
    // Rejecting a group opens the stages the approver chose (all of the group when none were chosen) and what hangs under them.
    const reopenOf = (step: AppStep) => {
      const inGroup = cfg.stages.filter(s => s.groupCode === step.groupCode).map(s => s.code);
      const chosen = input.reopenStages;
      if (!chosen) return inGroup;
      ensure(chosen.length > 0 && chosen.every(code => inGroup.includes(code)), 'Choose at least one stage of this group to open again.', 422);
      return [...new Set(chosen)];
    };
    // When the approval of a stage that shows the FAP form is decided (by its own steps or by its group), the outcome is frozen too: one new version per decision.
    const freezeDecision = async (conn: any, stageCodes: string[], outcome: 'APPROVED' | 'REJECTED') => {
      const stageCode = stageCodes.find(code => screenOfForm(cfg.stages.find(s => s.code === code)?.formCode ?? null) === 'FAP');
      if (stageCode) await this.freezes.freeze(conn, id, stageCode, actor, null, outcome);
    };
    const result = await this.approvals.decide(id, stepId, actor, input, {
      onRejected: async (conn, step) => {
        if (step.scope === 'SECTION' && step.sectionCode === DEED_SECTION && step.subjectId)
          await this.syncDeedReview(conn, id, step.subjectId, 'REJECTED', actor, String(input.remarks ?? '').trim() || null);
        const why = String(input.remarks ?? '').trim() || null;
        if (step.scope === 'DOCUMENT' && step.checklistId) {
          await this.documents.setApproval(conn, step.checklistId, 'REJECTED', by(actor), why);
          const docRow = await this.documents.approvalRow(id, step.checklistId);
          if (docRow?.documentCode === 'FAP') {
            await this.apps.updateFap(conn, id, {is_fap_form_locked: 0}, by(actor));
          }
        }
        const stageCodes = step.scope === 'STAGE' ? [step.stageCode!] : step.scope === 'GROUP' ? reopenOf(step) : [];
        if (step.scope === 'GROUP' && step.groupCode) await this.apps.setGroupApproval(conn, id, app.workflow_freeze_id, step.groupCode, 'REJECTED', by(actor), why);
        for (const stageCode of stageCodes) {
          await this.apps.setStageApproval(conn, id, stageCode, 'REJECTED', by(actor), why);
          await this.apps.saveStageProgress(conn, id, stageCode, {isLocked: false, clearSubmitted: true, clearCompleted: true}, actor);
          if (screenOfForm(cfg.stages.find(s => s.code === stageCode)?.formCode) === 'FAP') await this.apps.updateFap(conn, id, {is_fap_form_locked: 0}, by(actor));
        }
        const chosen = input.reopenItems;
        const stageOnly = step.scope === 'STAGE' && !!chosen && (chosen.documents.length > 0 || chosen.deeds.length > 0);
        if (step.scope === 'GROUP' || stageOnly) {
          // a group: the stages come back with their documents and deeds, all asked for approval again from the first step (the deeds' state follows their approval: see legal/deed-review.ts)
          // a stage: only the documents and deeds the approver chose open again with it (the problem may be the stage alone)
          const under = await this.approvals.reopenUnder(conn, id, stageCodes, actor, step.scope === 'GROUP' ? input.keepApproved : undefined, stageOnly ? chosen : undefined);
          for (const checklistId of under.documents) await this.documents.setApproval(conn, checklistId, 'REJECTED', by(actor), why);
          for (const row of under.rows)
            if (row.sectionCode === DEED_SECTION) await this.syncDeedReview(conn, id, row.subjectId, 'REJECTED', actor, String(input.remarks ?? '').trim() || null);
        }
        await freezeDecision(conn, stageCodes, 'REJECTED');
      },
      onScopeApproved: async (conn, scope) => {
        if (scope.type === 'SECTION' && scope.sectionCode === DEED_SECTION && scope.subjectId) await this.syncDeedReview(conn, id, scope.subjectId, 'APPROVED', actor);
        const note = String(input.remarks ?? '').trim() || null;
        if (scope.type === 'DOCUMENT' && scope.checklistId) {
          await this.documents.setApproval(conn, scope.checklistId, 'APPROVED', by(actor), note);
          const docRow = await this.documents.approvalRow(id, scope.checklistId);
          if (docRow?.documentCode === 'FAP') {
            await this.apps.updateFap(conn, id, {is_fap_form_locked: 1}, by(actor));
          }
        }
        const stageCodes = scope.type === 'STAGE' ? [scope.stageCode!] : scope.type === 'GROUP' ? cfg.stages.filter(s => s.groupCode === scope.groupCode).map(s => s.code) : [];
        if (scope.type === 'GROUP' && scope.groupCode) await this.apps.setGroupApproval(conn, id, app.workflow_freeze_id, scope.groupCode, 'APPROVED', by(actor), note);
        for (const stageCode of stageCodes) {
          await this.apps.saveStageProgress(conn, id, stageCode, {completed: true}, actor);
          await this.apps.setStageApproval(conn, id, stageCode, 'APPROVED', by(actor), note);
        }
        if (scope.type === 'STAGE' && scope.stageCode) {
          const groupCode = cfg.stageByCode.get(scope.stageCode)?.groupCode;
          if (groupCode) await this.settleGroupWithoutApproval(conn, id, app.workflow_freeze_id, cfg, groupCode, actor);
        }
        await freezeDecision(conn, stageCodes, 'APPROVED');
      },
      // the group / stage rules are checked BEFORE the approval marks stages as completed (otherwise a group approval completes its stages first and then finds nothing open)
      beforeApproved: async (conn, step) => {
        if (step.scope === 'SECTION' && step.sectionCode === DEED_SECTION && step.subjectId) await this.assertDeedComplete(conn, id, step.subjectId);
        // the checks that name what is missing come first (documents, deeds, stages of the group) ...
        await this.assertMandatoryDocumentsDone(conn, id, step);
        // ... then the general rule: a stage is decided after the deeds and documents under it, a group after its stages (the screen only shows it then)
        if (lowerOpen((await this.approvals.raw(id, app.workflow_freeze_id, conn)).steps, step, cfg.stages.filter(x => x.groupCode === step.groupCode).map(x => x.code)))
          throw new Problem(409, 'Persetujuan ini baru bisa diputuskan setelah semua yang ada di bawahnya (akta, dokumen, stage) disetujui.');
      },
      // a group cannot be rejected either while a stage under it is still not approved
      beforeRejected: async (conn, step) => {
        await this.assertGroupStagesDone(conn, id, step, 'ditolak');
        if (step.scope === 'GROUP') reopenOf(step); // refuses an empty or foreign choice before anything is written
      },
      afterApproved: async conn => {
        await this.assertReadyIfFinished(conn, id, app);
      },
    });
    const label = await this.label(id);
    await this.approvals.notifyPending(result.nextPending, actor, {applicationId: id, company: label.company});
    const verb = result.rejected ? 'rejected' : 'approved';
    await recordActivity(
      {
        applicationId: id,
        stageCode: result.step.scope === 'STAGE' || result.step.scope === 'SECTION' ? (result.step.stageCode ?? undefined) : undefined,
        section: 'Workflow',
        actionType: result.rejected ? 'REJECT' : 'APPROVE',
        title: `${result.step.name} ${verb}${input.via === 'LARK' ? ' (from Lark)' : ''}`,
        details: String(input.remarks ?? '').trim() || (result.scopeApproved ? 'Every step of this part is approved.' : ''),
      },
      actor,
    );
    return this.detailOr404(id, actor);
  }

  /** Pending approval steps of the authorities the person holds. */
  inbox(actor: Actor) {
    return this.approvals.inbox(actor);
  }

  /** Activity of one application, newest first. */
  async activityOf(id: string) {
    ensure(await this.apps.get(id), 'Application not found', 404);
    return activityFeed({applicationId: id, limit: 500});
  }

  /** A field-level change list recorded by the workspace after a save (always an UPDATE; the actor is the session). */
  async recordClientActivity(
    id: string,
    entry: {section: string; tabIndex?: number | null; title: string; details?: string; changes?: unknown[]},
    actor: Actor,
  ) {
    const app = await this.apps.get(id);
    ensure(app, 'Application not found', 404);
    const view = this.viewStage(await this.config.load(app.workflow_freeze_id), await this.apps.stageProgress(id));
    await logActivity(
      {
        applicationId: id,
        stageCode: view?.code,
        section: entry.section,
        tabIndex: entry.tabIndex ?? null,
        actionType: 'UPDATE',
        title: entry.title,
        details: entry.details ?? '',
        changes: entry.changes?.length ? entry.changes : null,
      },
      actor,
    );
    return {ok: true};
  }

  /**
   * What stops the final approval, for every stage: the workflow's required fields and minimum item counts
   * (crm_workflow_stage_fields), mandatory documents of the checklist without a file, the signed FAP form,
   * and deeds whose shares do not add up to exactly 100%. `target` tells the screen which part to open.
   */
  private async approvalGaps(id: string, app: any, onlyStage?: string) {
    const detail: any = await this.detailOr404(id);
    // The Pre-Analysis form is a document of its own: its required fields are checked against it
    const [paRows] = await this.apps.pool.query<any[]>(`SELECT form_data FROM ${CRM.prototypePreanalysis} WHERE application_id=?`, [id]);
    try {
      detail.preAnalysis = paRows[0] ? JSON.parse(paRows[0].form_data) : {};
    } catch {
      detail.preAnalysis = {};
    }
    const cfg = await this.config.load(app.workflow_freeze_id);
    const [rules] = await this.apps.pool.query<any[]>(
      `SELECT st.code AS stage_code,ff.form_code,fs.code AS section_code,fs.name AS section_name,ff.code,ff.field_key,ff.label,ff.is_enforceable
       FROM ${CRM.frozenWorkflowStageFields} sf
       JOIN ${CRM.masterFormFields} ff ON ff.code=sf.form_field_code
       JOIN ${CRM.masterFormSections} fs ON fs.code=ff.section_code
       JOIN ${CRM.frozenWorkflowStages} st ON st.workflow_freeze_id=sf.workflow_freeze_id AND st.code=sf.stage_code
       WHERE sf.workflow_freeze_id=? AND sf.is_mandatory=1${onlyStage ? ' AND st.code=?' : ''}`,
      onlyStage ? [cfg.id, onlyStage] : [cfg.id],
    );
    const stageName = (code: string) => cfg.stageByCode.get(code)?.name;
    const gaps: {target: string; label: string; detail?: string}[] = mandatoryGaps(
      detail,
      // the key the form data uses and the label come from the master field
      rules.map(r => ({stageCode: r.stage_code, formCode: r.form_code, sectionCode: r.section_code, section: r.section_name, fieldKey: r.field_key, fieldLabel: r.label, enforceable: !!r.is_enforceable})),
      stageName,
    );
    const checks: any[] = detail.documentChecks || [];
    const missingDocs = checks.filter((d: any) => d.isMandatory && !(d.files || []).length && (!onlyStage || d.stageCode === onlyStage));
    // The deeds are filled in the stage whose workflow has the approval of the deed section; without one, in the first stage.
    const [deedPlace] = await this.apps.pool.query<any[]>(
      `SELECT stage_code FROM ${CRM.frozenWorkflowApprovalAssignments} WHERE workflow_freeze_id=? AND scope_type='SECTION' AND section_code=? LIMIT 1`,
      [cfg.id, DEED_SECTION],
    );
    const deedStage: string | undefined = deedPlace[0]?.stage_code ?? cfg.stages[0]?.code;
    for (const d of missingDocs)
      gaps.push({target: 'DOCUMENTS', label: `Dokumen ${d.documentName}`, detail: stageName(d.stageCode)});
    if (!onlyStage && checks.some(d => d.documentCode === 'FAP') && !app.is_fap_doc_uploaded && !missingDocs.some((d: any) => d.documentCode === 'FAP'))
      gaps.push({target: 'DOCUMENTS', label: 'Dokumen FAP bertanda tangan', detail: cfg.stages[0]?.name});
    // Always on, whatever the workflow's rules say: an application needs at least one deed, and its establishment deed at least one stakeholder.
    const deedsHere = onlyStage && onlyStage !== deedStage ? [] : detail.legal?.deeds || [];
    if (!onlyStage || onlyStage === deedStage) {
      if (!(detail.legal?.deeds || []).length && !gaps.some(g => g.target === 'LEGAL' && g.label.startsWith('Minimal satu data di')))
        gaps.push({target: 'LEGAL', label: 'Minimal satu akta', detail: 'Tambahkan akta pendirian beserta pemegang saham / pengurusnya di tab Legal'});
    }
    for (const d of deedsHere) {
      if (!(d.stakeholders || []).length) {
        // Only the establishment deed must have stakeholders; an amendment deed may have none (its shares are then not checked).
        if (d.type === 'establishment')
          gaps.push({target: 'LEGAL', label: `Akta pendirian ${d.deedNumber || ''} belum punya stakeholder`, detail: 'Akta pendirian minimal punya satu pemegang saham / pengurus'});
        continue;
      }
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
