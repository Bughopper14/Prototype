import type {PoolConnection} from 'mysql2/promise';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {ensure} from '../../core/domain';
import {toCode} from '../../core/domain/code';
import {notifyHolders} from '../activity/notifications';
import type {Actor} from '../auth/session';
import {ApprovalsRepository, type AppStep, type Decision, type ScopeRef, type StepStatus, type TemplateStep} from './approvals.repository';
import {UsersNamesLookup} from './users-names.lookup';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;

export type ApprovalState = 'IN_PROGRESS' | 'IN_APPROVAL' | 'REJECTED' | 'APPROVED';
export const STATE_NAME: Record<ApprovalState, string> = {
  IN_PROGRESS: 'In progress',
  IN_APPROVAL: 'Waiting for approval',
  REJECTED: 'Rejected, needs changes',
  APPROVED: 'Approved',
};

export type Hooks = {
  /** Inside the transaction, after a step was rejected: reopen what the submit had locked. */
  onRejected?: (conn: Conn, step: AppStep) => Promise<void>;
  /** Inside the transaction, when every step of a scope is approved. */
  onScopeApproved?: (conn: Conn, scope: ScopeRef) => Promise<void>;
  /** Inside the transaction, after an approval: may throw to refuse it (the final approval checks the data and documents here). */
  afterApproved?: (conn: Conn) => Promise<void>;
};

const isAdmin = (actor: Actor) => !!actor.isAdmin || actor.role === 'ADMIN';
const holds = (actor: Actor, authority: string) => isAdmin(actor) || (actor.authorities || []).includes(authority);
const by = (actor: Actor) => actor.username || null;

const scopeOf = (s: AppStep): ScopeRef => ({type: s.scope, groupId: s.groupId, stageId: s.stageId, checklistId: s.checklistId});
const scopeKey = (s: {scope?: string; type?: string; groupId?: string | null; stageId?: string | null; checklistId?: string | null}) =>
  `${s.scope ?? s.type}:${s.groupId ?? ''}:${s.stageId ?? ''}:${s.checklistId ?? ''}`;
const OPEN: StepStatus[] = ['WAITING', 'PENDING'];

/** The steps of the newest round of every scope (a resubmit starts a new round; the older ones are history). */
export function latestRounds(steps: AppStep[]): Map<string, AppStep[]> {
  const best = new Map<string, number>();
  for (const s of steps) best.set(scopeKey(s), Math.max(best.get(scopeKey(s)) ?? 0, s.roundNo));
  const out = new Map<string, AppStep[]>();
  for (const s of steps) if (s.roundNo === best.get(scopeKey(s))) out.set(scopeKey(s), [...(out.get(scopeKey(s)) || []), s]);
  return out;
}

/**
 * What an application is, worked out from its approval rounds (there is no stored status): REJECTED while a step of the newest
 * round of any scope is rejected, IN_APPROVAL while a step still waits, APPROVED when every scope that has approval steps is
 * approved in its newest round and every stage is submitted, IN_PROGRESS otherwise. A document counts only once it has a file.
 */
export function stateOf(input: {
  templates: TemplateStep[];
  steps: AppStep[];
  stageIds: string[];
  submittedStageIds: Set<string>;
  documents: {checklistId: string; workflowStageDocumentId: string | null; fileCount: number}[];
}): ApprovalState {
  const latest = latestRounds(input.steps);
  const all = [...latest.values()].flat();
  if (all.some(s => s.status === 'REJECTED')) return 'REJECTED';
  if (all.some(s => OPEN.includes(s.status))) return 'IN_APPROVAL';
  const required = new Set<string>();
  for (const t of input.templates) {
    if (t.scope === 'GROUP') required.add(scopeKey({scope: 'GROUP', groupId: t.groupId}));
    else if (t.scope === 'STAGE') required.add(scopeKey({scope: 'STAGE', stageId: t.stageId}));
    else {
      const doc = input.documents.find(d => d.workflowStageDocumentId === t.workflowStageDocumentId);
      if (doc && doc.fileCount > 0) required.add(scopeKey({scope: 'DOCUMENT', checklistId: doc.checklistId}));
    }
  }
  for (const key of required) {
    const round = latest.get(key);
    if (!round || !round.length || round.some(s => s.status !== 'APPROVED')) return 'IN_PROGRESS';
  }
  const allSubmitted = input.stageIds.length > 0 && input.stageIds.every(id => input.submittedStageIds.has(id));
  return allSubmitted ? 'APPROVED' : 'IN_PROGRESS';
}

/** Is the scope approved in its newest round? A scope without approval steps has nothing to approve, so it counts as approved. */
export function scopeApproved(templates: TemplateStep[], steps: AppStep[], scope: ScopeRef): boolean {
  const has = templates.some(t =>
    scope.type === 'GROUP' ? t.scope === 'GROUP' && t.groupId === scope.groupId : t.scope === 'STAGE' && t.stageId === scope.stageId,
  );
  if (!has) return true;
  const round = latestRounds(steps).get(scopeKey(scope));
  return !!round && round.length > 0 && round.every(s => s.status === 'APPROVED');
}

/** Rounds of approval: start (on submit), decide (approve / reject), and read (what the screen shows). */
@Injectable()
export class ApprovalsService {
  constructor(
    private readonly db: CrmDatabase,
    private readonly repo: ApprovalsRepository,
    private readonly users: UsersNamesLookup,
  ) {}

  /* ---------- start ---------- */

  /**
   * Starts a new round of approval for a scope, inside the caller's transaction. The steps with the smallest sort_order are PENDING
   * (everyone holding their authority can act), the others WAIT. A scope without steps starts nothing. Refuses when a round is
   * already running or already approved. Returns the steps that became PENDING, for the notification the caller sends after commit.
   */
  async startScope(conn: Conn, app: {id: string; workflowCode: string}, scope: ScopeRef, actor: Actor, workflowStageDocumentId?: string | null) {
    const templates = await this.repo.templatesForScope(conn, app.workflowCode, scope, workflowStageDocumentId);
    if (!templates.length) return {steps: [] as AppStep[], pending: [] as AppStep[]};
    const last = await this.repo.lastRoundNo(conn, app.id, scope);
    if (last > 0) {
      const round = await this.repo.roundOf(conn, app.id, scope, last);
      ensure(!round.some(s => OPEN.includes(s.status)), 'The approval of this part is already running.', 409);
      ensure(!round.length || !round.every(s => s.status === 'APPROVED'), 'This part is already approved.', 409);
    }
    const first = Math.min(...templates.map(t => t.sortOrder));
    const steps = await this.repo.insertRound(
      conn,
      app.id,
      last + 1,
      scope,
      templates.map(t => ({template: t, status: (t.sortOrder === first ? 'PENDING' : 'WAITING') as StepStatus})),
      by(actor),
    );
    return {steps, pending: steps.filter(s => s.status === 'PENDING')};
  }

  /** The template steps and the rounds of an application (for the rules about what may be submitted next). */
  async raw(applicationId: string, workflowCode: string, conn: Conn = this.db.pool) {
    return {templates: await this.repo.templatesOf(workflowCode, conn), steps: await this.repo.stepsOf(applicationId, conn)};
  }

  /** Has this scope had a round of approval (open, approved or rejected)? */
  async hasRound(conn: Conn, applicationId: string, scope: ScopeRef) {
    return (await this.repo.lastRoundNo(conn, applicationId, scope)) > 0;
  }

  /* ---------- decide ---------- */

  /**
   * One person's decision on a PENDING step. Anyone holding the step's authority may act (administrators always); one approval
   * completes the step, one rejection rejects it (remarks required). Everything is written in one transaction; the hooks run inside
   * it. Returns what changed so the caller can notify and log.
   */
  async decide(
    applicationId: string,
    stepId: string,
    actor: Actor,
    input: {decision: 'APPROVED' | 'REJECTED'; remarks?: string | null; via?: 'WEB' | 'LARK'},
    hooks: Hooks = {},
  ) {
    const remarks = String(input.remarks ?? '').trim();
    if (input.decision === 'REJECTED') ensure(remarks.length > 0, 'A reason (remarks) is required to reject.', 422);
    let step!: AppStep;
    let nextPending: AppStep[] = [];
    let scopeApproved = false;
    await this.db.transaction(async conn => {
      const found = await this.repo.stepOf(conn, applicationId, stepId, true);
      ensure(found, 'Approval step not found', 404);
      step = found;
      ensure(step.status === 'PENDING', 'This step is not waiting for a decision.', 409);
      ensure(holds(actor, step.authorityName), 'Akun ini tidak memiliki wewenang untuk aksi ini.', 403);
      ensure(Number.isInteger(actor.portalUserId), 'The decision needs a signed-in user.', 401);
      ensure(!(await this.repo.hasDecided(conn, step.id, actor.portalUserId)), 'You already decided on this step.', 409);
      await this.repo.insertDecision(conn, {code: `${step.code}-R${step.roundNo}-${toCode(actor.username || actor.portalUserId)}`.slice(0, 150), stepId: step.id, userId: actor.portalUserId, decision: input.decision, remarks: remarks || null, via: input.via ?? 'WEB'}, by(actor));
      const scope = scopeOf(step);
      const round = await this.repo.roundOf(conn, applicationId, scope, step.roundNo);
      if (input.decision === 'REJECTED') {
        await this.repo.setStatus(conn, [step.id], 'REJECTED', by(actor));
        await this.repo.setStatus(conn, round.filter(s => s.id !== step.id && OPEN.includes(s.status)).map(s => s.id), 'CANCELLED', by(actor));
        await hooks.onRejected?.(conn, step);
        return;
      }
      await this.repo.setStatus(conn, [step.id], 'APPROVED', by(actor));
      const after = round.map(s => (s.id === step.id ? {...s, status: 'APPROVED' as StepStatus} : s));
      const sameOrder = after.filter(s => s.sortOrder === step.sortOrder);
      if (sameOrder.every(s => s.status === 'APPROVED')) {
        const waiting = after.filter(s => s.status === 'WAITING');
        if (waiting.length) {
          const nextOrder = Math.min(...waiting.map(s => s.sortOrder));
          nextPending = waiting.filter(s => s.sortOrder === nextOrder);
          await this.repo.setStatus(conn, nextPending.map(s => s.id), 'PENDING', by(actor));
        } else if (after.every(s => s.status === 'APPROVED')) {
          scopeApproved = true;
          await hooks.onScopeApproved?.(conn, scope);
        }
      }
      await hooks.afterApproved?.(conn);
    });
    return {step, nextPending, scopeApproved, rejected: input.decision === 'REJECTED'};
  }

  /** Tells everyone holding the authority of each step that it waits for them (never fails the action). */
  async notifyPending(steps: AppStep[], actor: Actor, text: {applicationId: string; company: string}) {
    for (const s of steps)
      await notifyHolders([s.authorityName], {portalUserId: actor.portalUserId, username: actor.username, name: actor.name} as any, {
        applicationId: text.applicationId,
        type: 'WORKFLOW_ACTION',
        title: `Waiting for your approval: ${s.name}`,
        message: `${text.company ? text.company + ' · ' : ''}${s.name} needs your approval (${s.authorityName}).`,
      });
  }

  /* ---------- read ---------- */

  /** The state of an application, from its rounds. `conn` is optional so a hook can read inside its transaction. */
  async stateFor(applicationId: string, workflowCode: string, conn: Conn = this.db.pool): Promise<ApprovalState> {
    const [templates, steps, [stages], [progress], [docs]] = await Promise.all([
      this.repo.templatesOf(workflowCode, conn),
      this.repo.stepsOf(applicationId, conn),
      conn.query<any[]>(`SELECT id FROM ${CRM.workflowStages} WHERE workflow_code=?`, [workflowCode]),
      conn.query<any[]>(`SELECT stage_id FROM ${CRM.applicationStageProgress} WHERE application_id=? AND submitted_at IS NOT NULL`, [applicationId]),
      conn.query<any[]>(
        `SELECT c.id,c.workflow_stage_document_id,
                (SELECT COUNT(*) FROM ${CRM.applicationDocumentFiles} f WHERE f.checklist_id=c.id AND f.deleted_at IS NULL) AS n
         FROM ${CRM.applicationDocumentChecklists} c WHERE c.application_id=? AND c.workflow_stage_document_id IS NOT NULL`,
        [applicationId],
      ),
    ]);
    return stateOf({
      templates,
      steps,
      stageIds: stages.map((r: any) => r.id),
      submittedStageIds: new Set(progress.map((r: any) => r.stage_id)),
      documents: docs.map((r: any) => ({checklistId: r.id, workflowStageDocumentId: r.workflow_stage_document_id, fileCount: Number(r.n)})),
    });
  }

  /** The state of many applications at once (the list): a handful of queries, not a handful per application. */
  async statesFor(apps: {id: string; workflow_code: string}[]): Promise<Map<string, ApprovalState>> {
    const out = new Map<string, ApprovalState>();
    if (!apps.length) return out;
    const ids = apps.map(a => a.id);
    const codes = [...new Set(apps.map(a => a.workflow_code))];
    const marks = (n: number) => Array(n).fill('?').join(',');
    const [steps, [stages], [progress], [docs]] = await Promise.all([
      this.repo.stepsOfMany(ids),
      this.db.pool.query<any[]>(`SELECT id,workflow_code FROM ${CRM.workflowStages} WHERE workflow_code IN (${marks(codes.length)})`, codes),
      this.db.pool.query<any[]>(`SELECT application_id,stage_id FROM ${CRM.applicationStageProgress} WHERE submitted_at IS NOT NULL AND application_id IN (${marks(ids.length)})`, ids),
      this.db.pool.query<any[]>(
        `SELECT c.application_id,c.id,c.workflow_stage_document_id,
                (SELECT COUNT(*) FROM ${CRM.applicationDocumentFiles} f WHERE f.checklist_id=c.id AND f.deleted_at IS NULL) AS n
         FROM ${CRM.applicationDocumentChecklists} c WHERE c.workflow_stage_document_id IS NOT NULL AND c.application_id IN (${marks(ids.length)})`,
        ids,
      ),
    ]);
    const templates = new Map<string, TemplateStep[]>();
    for (const code of codes) templates.set(code, await this.repo.templatesOf(code));
    for (const a of apps)
      out.set(
        a.id,
        stateOf({
          templates: templates.get(a.workflow_code) || [],
          steps: steps.filter(s => s.applicationId === a.id),
          stageIds: stages.filter((r: any) => r.workflow_code === a.workflow_code).map((r: any) => r.id),
          submittedStageIds: new Set(progress.filter((r: any) => r.application_id === a.id).map((r: any) => r.stage_id)),
          documents: docs.filter((r: any) => r.application_id === a.id).map((r: any) => ({checklistId: r.id, workflowStageDocumentId: r.workflow_stage_document_id, fileCount: Number(r.n)})),
        }),
      );
    return out;
  }

  /** What the application screen shows: the state, the newest round of every scope with who can act, and the older rounds as history. */
  async view(applicationId: string, workflowCode: string, actor?: Actor, labelOf?: (s: ScopeRef) => string) {
    const steps = await this.repo.stepsOf(applicationId);
    const decisions = await this.repo.decisionsOf(steps.map(s => s.id));
    const names = await this.users.names(decisions.map(d => d.userId));
    const state = await this.stateFor(applicationId, workflowCode);
    const byStep = new Map<string, Decision[]>();
    for (const d of decisions) byStep.set(d.stepId, [...(byStep.get(d.stepId) || []), d]);
    const latest = latestRounds(steps);
    const latestIds = new Set([...latest.values()].flat().map(s => s.id));
    const stepView = (s: AppStep) => {
      const ds = byStep.get(s.id) || [];
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        status: s.status,
        authorityName: s.authorityName,
        sortOrder: s.sortOrder,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        canAct: !!actor && s.status === 'PENDING' && holds(actor, s.authorityName) && !ds.some(d => d.userId === actor.portalUserId),
        decisions: ds.map(d => ({by: names.get(d.userId) ?? `User ${d.userId}`, decision: d.decision, remarks: d.remarks, decidedAt: d.decidedAt, via: d.via})),
      };
    };
    const scopeView = (list: AppStep[]) => ({
      scope: list[0].scope,
      scopeName: labelOf ? labelOf({type: list[0].scope, groupId: list[0].groupId, stageId: list[0].stageId, checklistId: list[0].checklistId}) : '',
      groupId: list[0].groupId,
      stageId: list[0].stageId,
      checklistId: list[0].checklistId,
      roundNo: list[0].roundNo,
      steps: list.map(stepView),
    });
    const old = new Map<string, AppStep[]>();
    for (const s of steps) if (!latestIds.has(s.id)) old.set(`${scopeKey(s)}#${s.roundNo}`, [...(old.get(`${scopeKey(s)}#${s.roundNo}`) || []), s]);
    const current = [...latest.values()].map(scopeView);
    return {
      state,
      stateName: STATE_NAME[state],
      current,
      history: [...old.values()].map(scopeView),
      /** True when the signed-in person has something to approve or reject on this application. */
      actionable: current.some(c => c.steps.some(s => s.canAct)),
    };
  }

  /** What waits for this person: PENDING steps of the authorities they hold (administrators: every pending step). */
  async inbox(actor: Actor) {
    if (isAdmin(actor)) {
      const [rows] = await this.db.pool.query<any[]>(`SELECT application_id,id,name,authority_name FROM ${CRM.applicationApprovalSteps} WHERE status='PENDING' ORDER BY started_at`);
      return rows.map(r => ({applicationId: r.application_id, stepId: r.id, name: r.name, authorityName: r.authority_name}));
    }
    return this.repo.pendingFor(actor.authorities || []);
  }
}

