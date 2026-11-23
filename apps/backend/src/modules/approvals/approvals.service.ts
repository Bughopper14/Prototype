import type {PoolConnection} from 'mysql2/promise';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {ensure} from '../../core/domain';
import {newNotification, notifyHolders} from '../activity/notifications';
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
  /** Runs before anything is written for an Approve: a rule that must hold BEFORE the approval changes the state of stages (it can refuse). */
  beforeApproved?: (conn: Conn, step: AppStep) => Promise<void>;
  beforeRejected?: (conn: Conn, step: AppStep) => Promise<void>;
  afterApproved?: (conn: Conn, step: AppStep) => Promise<void>;
};

const isAdmin = (actor: Actor) => !!actor.isAdmin || actor.role === 'ADMIN';
/** May this person act on the step: the PIC Marketing step belongs to one user; any other step to whoever holds its authority. Administrators always. */
const canActOn = (actor: Actor, s: {isPicMarketing: boolean; approverUserId: number | null; authorityName: string}) =>
  isAdmin(actor) || (s.isPicMarketing ? Number.isInteger(actor.portalUserId) && actor.portalUserId === s.approverUserId : (actor.authorities || []).includes(s.authorityName));
const by = (actor: Actor) => actor.username || null;

const scopeOf = (s: AppStep): ScopeRef => ({type: s.scope, groupCode: s.groupCode, stageCode: s.stageCode, documentCode: s.documentCode, checklistId: s.checklistId, sectionCode: s.sectionCode, subjectId: s.subjectId});
/** One key per place: only the columns that name that kind of place count (a row keeps the codes of its whole path, a scope ref only its own). */
const scopeKey = (s: {scope?: string; type?: string; groupCode?: string | null; stageCode?: string | null; checklistId?: string | null; sectionCode?: string | null; subjectId?: string | null}) => {
  const type = s.scope ?? s.type;
  if (type === 'GROUP') return `GROUP:${s.groupCode ?? ''}`;
  if (type === 'STAGE') return `STAGE:${s.stageCode ?? ''}`;
  if (type === 'SECTION') return `SECTION:${s.stageCode ?? ''}:${s.sectionCode ?? ''}:${s.subjectId ?? ''}`;
  return `DOCUMENT:${s.checklistId ?? ''}`;
};
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
  stageCodes: string[];
  submittedStageCodes: Set<string>;
  documents: {checklistId: string; stageCode: string; documentCode: string | null; fileCount: number}[];
}): ApprovalState {
  const latest = latestRounds(input.steps);
  const all = [...latest.values()].flat();
  if (all.some(s => s.status === 'REJECTED')) return 'REJECTED';
  if (all.some(s => OPEN.includes(s.status))) return 'IN_APPROVAL';
  const required = new Set<string>();
  for (const t of input.templates) {
    if (t.scope === 'GROUP') required.add(scopeKey({scope: 'GROUP', groupCode: t.groupCode}));
    else if (t.scope === 'STAGE') required.add(scopeKey({scope: 'STAGE', stageCode: t.stageCode}));
    else {
      const doc = input.documents.find(d => d.stageCode === t.stageCode && d.documentCode === t.documentCode);
      if (doc && doc.fileCount > 0) required.add(scopeKey({scope: 'DOCUMENT', checklistId: doc.checklistId}));
    }
  }
  for (const key of required) {
    const round = latest.get(key);
    if (!round || !round.length || round.some(s => s.status !== 'APPROVED')) return 'IN_PROGRESS';
  }
  const allSubmitted = input.stageCodes.length > 0 && input.stageCodes.every(code => input.submittedStageCodes.has(code));
  return allSubmitted ? 'APPROVED' : 'IN_PROGRESS';
}

/** Is the scope approved in its newest round? A scope without approval steps has nothing to approve, so it counts as approved. */
export function scopeApproved(templates: TemplateStep[], steps: AppStep[], scope: ScopeRef): boolean {
  const has = templates.some(t =>
    scope.type === 'GROUP' ? t.scope === 'GROUP' && t.groupCode === scope.groupCode : t.scope === 'STAGE' && t.stageCode === scope.stageCode,
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
  async startScope(conn: Conn, app: {id: string; workflowFreezeId: string}, scope: ScopeRef, actor: Actor) {
    const templates = await this.repo.templatesForScope(conn, app.workflowFreezeId, scope);
    if (!templates.length) return {steps: [] as AppStep[], pending: [] as AppStep[]};
    const last = await this.repo.lastRoundNo(conn, app.id, scope);
    if (last > 0) {
      const round = await this.repo.roundOf(conn, app.id, scope, last);
      ensure(!round.some(s => OPEN.includes(s.status)), 'The approval of this part is already running.', 409);
      ensure(!round.length || !round.every(s => s.status === 'APPROVED'), 'This part is already approved.', 409);
    }
    // A PIC Marketing level is approved by the PIC set on the application: it must exist when the round starts.
    let picUserId: number | null = null;
    if (templates.some(t => t.isPicMarketing)) {
      const [[row]] = await conn.query<any[]>(`SELECT mkt_pic_id FROM ${CRM.applications} WHERE id=?`, [app.id]);
      picUserId = row?.mkt_pic_id ? Number(row.mkt_pic_id) : null;
      ensure(picUserId, 'This approval has a PIC Marketing level, but the application has no PIC Marketing yet. Choose the PIC Marketing first.', 422);
    }
    const first = Math.min(...templates.map(t => t.sortOrder));
    const steps = await this.repo.insertRound(
      conn,
      app.id,
      last + 1,
      scope,
      templates.map(t => ({template: t, status: (t.sortOrder === first ? 'PENDING' : 'WAITING') as StepStatus})),
      by(actor),
      picUserId,
    );
    return {steps, pending: steps.filter(s => s.status === 'PENDING')};
  }

  /** The template steps and the rounds of an application (for the rules about what may be submitted next). */
  async raw(applicationId: string, workflowFreezeId: string, conn: Conn = this.db.pool) {
    return {templates: await this.repo.templatesOf(workflowFreezeId, conn), steps: await this.repo.stepsOf(applicationId, conn)};
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
      // One decision at a time per application: steps of the same level are decided by different people at the same moment, and each of them
      // must see the other's decision (otherwise nobody sees "every step is approved" and the stage is never completed).
      await conn.execute(`SELECT id FROM ${CRM.applications} WHERE id=? FOR UPDATE`, [applicationId]);
      const found = await this.repo.stepOf(conn, applicationId, stepId, true);
      ensure(found, 'Approval step not found', 404);
      step = found;
      ensure(step.status === 'PENDING', 'This step is not waiting for a decision.', 409);
      ensure(canActOn(actor, step), 'Akun ini tidak memiliki wewenang untuk aksi ini.', 403);
      ensure(Number.isInteger(actor.portalUserId), 'The decision needs a signed-in user.', 401);
      if (input.decision === 'APPROVED') await hooks.beforeApproved?.(conn, step);
      else await hooks.beforeRejected?.(conn, step);
      await this.repo.recordDecision(conn, step.id, {userId: actor.portalUserId, decision: input.decision, remarks: remarks || null, via: input.via ?? 'WEB'}, by(actor));
      const scope = scopeOf(step);
      const round = await this.repo.roundOf(conn, applicationId, scope, step.roundNo);
      if (input.decision === 'REJECTED') {
        await this.repo.setStatus(conn, round.filter(s => s.id !== step.id && OPEN.includes(s.status)).map(s => s.id), 'CANCELLED', by(actor));
        await hooks.onRejected?.(conn, step);
        return;
      }
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
      await hooks.afterApproved?.(conn, step);
    });
    return {step, nextPending, scopeApproved, rejected: input.decision === 'REJECTED'};
  }

  /**
   * Reopens what hangs under stages that a group rejection opens again: the newest round of the stage and of each of its documents and rows (deeds)
   * is no longer valid, so a step still open is cancelled and an approved one becomes REJECTED (nobody rejected it, its group did: the view tells the two apart by the decisions, see `reopened`; the
   * resubmit then starts a new round from the first step, and the decisions already given stay as history). Returns the documents and the rows
   * (deeds) that were affected. `keep` lists approved documents and deeds that stay approved.
   */
  async reopenUnder(conn: Conn, applicationId: string, stageCodes: string[], actor: Actor, keep?: {documents: string[]; deeds: string[]}, only?: {documents: string[]; deeds: string[]}) {
    const mine = (await this.repo.stepsOf(applicationId, conn)).filter(s => s.scope !== 'GROUP' && s.stageCode && stageCodes.includes(s.stageCode));
    const documents: string[] = [];
    const rows: {sectionCode: string; subjectId: string}[] = [];
    for (const round of latestRounds(mine).values()) {
      const open = round.filter(s => OPEN.includes(s.status));
      const approved = round.filter(s => s.status === 'APPROVED');
      if (!open.length && !approved.length) continue;
      // an approved document or deed the approver chose to keep stays approved (only the rest of the stage is opened again)
      const first = round[0];
      // `only` (a stage rejected on its own): just the chosen documents and deeds open again, everything else under the stage is left as it is
      if (only && first.scope === 'DOCUMENT' && !(first.checklistId && only.documents.includes(first.checklistId))) continue;
      if (only && first.scope === 'SECTION' && !(first.subjectId && only.deeds.includes(first.subjectId))) continue;
      if (only && first.scope === 'STAGE') continue;
      if (first.scope === 'DOCUMENT' && first.checklistId && keep?.documents.includes(first.checklistId) && !open.length) continue;
      if (first.scope === 'SECTION' && first.subjectId && keep?.deeds.includes(first.subjectId) && !open.length) continue;
      await this.repo.setStatus(conn, open.map(s => s.id), 'CANCELLED', by(actor));
      await this.repo.reopen(conn, approved.map(s => s.id));
      const head = round[0];
      if (head.scope === 'DOCUMENT' && head.checklistId) documents.push(head.checklistId);
      if (head.scope === 'SECTION' && head.sectionCode && head.subjectId) rows.push({sectionCode: head.sectionCode, subjectId: head.subjectId});
    }
    return {documents, rows};
  }

  /** Tells everyone holding the authority of each step that it waits for them (never fails the action). */
  async notifyPending(steps: AppStep[], actor: Actor, text: {applicationId: string; company: string}) {
    for (const s of steps)
      if (s.isPicMarketing) {
        if (s.approverUserId && s.approverUserId !== Number(actor.portalUserId))
          await newNotification([s.approverUserId], {applicationId: text.applicationId, type: 'WORKFLOW_ACTION', title: `Waiting for your approval: ${s.name}`, message: `${text.company ? text.company + ' · ' : ''}${s.name} needs your approval as PIC Marketing.`}).catch(() => {});
      } else
      await notifyHolders([s.authorityName], {portalUserId: actor.portalUserId, username: actor.username, name: actor.name} as any, {
        applicationId: text.applicationId,
        type: 'WORKFLOW_ACTION',
        title: `Waiting for your approval: ${s.name}`,
        message: `${text.company ? text.company + ' · ' : ''}${s.name} needs your approval (${s.authorityName}).`,
      });
  }

  /* ---------- read ---------- */

  /** The state of an application, from its rounds. `conn` is optional so a hook can read inside its transaction. */
  async stateFor(applicationId: string, workflowFreezeId: string, conn: Conn = this.db.pool): Promise<ApprovalState> {
    const [templates, steps, [stages], [progress], [docs]] = await Promise.all([
      this.repo.templatesOf(workflowFreezeId, conn),
      this.repo.stepsOf(applicationId, conn),
      conn.query<any[]>(`SELECT code FROM ${CRM.frozenWorkflowStages} WHERE workflow_freeze_id=?`, [workflowFreezeId]),
      conn.query<any[]>(`SELECT stage_code FROM ${CRM.applicationStageProgress} WHERE application_id=? AND submitted_at IS NOT NULL`, [applicationId]),
      conn.query<any[]>(
        `SELECT c.id,c.stage_code,c.document_code,
                (SELECT COUNT(*) FROM ${CRM.applicationDocumentFiles} f WHERE f.checklist_id=c.id AND f.deleted_at IS NULL) AS n
         FROM ${CRM.applicationDocumentChecklists} c WHERE c.application_id=? AND c.document_code IS NOT NULL`,
        [applicationId],
      ),
    ]);
    return stateOf({
      templates,
      steps,
      stageCodes: stages.map((r: any) => r.code),
      submittedStageCodes: new Set(progress.map((r: any) => r.stage_code)),
      documents: docs.map((r: any) => ({checklistId: r.id, stageCode: r.stage_code, documentCode: r.document_code, fileCount: Number(r.n)})),
    });
  }

  /** The state of many applications at once (the list): a handful of queries, not a handful per application. */
  async statesFor(apps: {id: string; workflow_freeze_id: string}[]): Promise<Map<string, ApprovalState>> {
    const out = new Map<string, ApprovalState>();
    if (!apps.length) return out;
    const ids = apps.map(a => a.id);
    const codes = [...new Set(apps.map(a => a.workflow_freeze_id))];
    const marks = (n: number) => Array(n).fill('?').join(',');
    const [steps, [stages], [progress], [docs]] = await Promise.all([
      this.repo.stepsOfMany(ids),
      this.db.pool.query<any[]>(`SELECT code,workflow_freeze_id FROM ${CRM.frozenWorkflowStages} WHERE workflow_freeze_id IN (${marks(codes.length)})`, codes),
      this.db.pool.query<any[]>(`SELECT application_id,stage_code FROM ${CRM.applicationStageProgress} WHERE submitted_at IS NOT NULL AND application_id IN (${marks(ids.length)})`, ids),
      this.db.pool.query<any[]>(
        `SELECT c.application_id,c.id,c.stage_code,c.document_code,
                (SELECT COUNT(*) FROM ${CRM.applicationDocumentFiles} f WHERE f.checklist_id=c.id AND f.deleted_at IS NULL) AS n
         FROM ${CRM.applicationDocumentChecklists} c WHERE c.document_code IS NOT NULL AND c.application_id IN (${marks(ids.length)})`,
        ids,
      ),
    ]);
    const templates = new Map<string, TemplateStep[]>();
    for (const code of codes) templates.set(code, await this.repo.templatesOf(code));
    for (const a of apps)
      out.set(
        a.id,
        stateOf({
          templates: templates.get(a.workflow_freeze_id) || [],
          steps: steps.filter(s => s.applicationId === a.id),
          stageCodes: stages.filter((r: any) => r.workflow_freeze_id === a.workflow_freeze_id).map((r: any) => r.code),
          submittedStageCodes: new Set(progress.filter((r: any) => r.application_id === a.id).map((r: any) => r.stage_code)),
          documents: docs.filter((r: any) => r.application_id === a.id).map((r: any) => ({checklistId: r.id, stageCode: r.stage_code, documentCode: r.document_code, fileCount: Number(r.n)})),
        }),
      );
    return out;
  }

  /** What the application screen shows: the state, the newest round of every scope with who can act, and the older rounds as history. */
  async view(applicationId: string, workflowFreezeId: string, actor?: Actor, labelOf?: (s: ScopeRef) => string) {
    const steps = await this.repo.stepsOf(applicationId);
    // one step, one decision: the decisions of the screen are the decision columns of the steps
    const decisions: Decision[] = steps
      .filter(s => s.decision && s.decidedByUserId !== null && s.decidedAt)
      .map(s => ({id: s.id, stepId: s.id, userId: s.decidedByUserId as number, decision: s.decision as 'APPROVED' | 'REJECTED', remarks: s.decisionRemarks, decidedAt: s.decidedAt as Date, via: (s.decidedVia ?? 'WEB') as 'WEB' | 'LARK'}));
    const names = await this.users.names(decisions.map(d => d.userId));
    const state = await this.stateFor(applicationId, workflowFreezeId);
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
        /** A step the group's rejection opened again: it is REJECTED, but nobody rejected it (its decision is still the APPROVED it got before). */
        reopened: s.status === 'REJECTED' && s.decision === 'APPROVED',
        authorityName: s.authorityName,
        sortOrder: s.sortOrder,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        canAct: !!actor && s.status === 'PENDING' && canActOn(actor, s) && !ds.some(d => d.userId === actor.portalUserId),
        decisions: ds.map(d => ({by: names.get(d.userId) ?? `User ${d.userId}`, decision: d.decision, remarks: d.remarks, decidedAt: d.decidedAt, via: d.via})),
      };
    };
    const scopeView = (list: AppStep[]) => ({
      scope: list[0].scope,
      scopeName: labelOf ? labelOf({type: list[0].scope, groupCode: list[0].groupCode, stageCode: list[0].stageCode, documentCode: list[0].documentCode, checklistId: list[0].checklistId, sectionCode: list[0].sectionCode, subjectId: list[0].subjectId}) : '',
      checklistId: list[0].checklistId,
      sectionCode: list[0].sectionCode,
      subjectId: list[0].subjectId,
      stageCode: list[0].stageCode,
      groupCode: list[0].groupCode,
      documentCode: list[0].documentCode,
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
      /** True for the administrator and for whoever holds the authority of a step of this application (any round): they get the Approvals tab. The screen never compares authority names itself. */
      involved: !!actor && (isAdmin(actor) || steps.some(s => canActOn(actor, s))),
    };
  }

  /** What waits for this person: PENDING steps of the authorities they hold (administrators: every pending step). */
  async inbox(actor: Actor) {
    if (isAdmin(actor)) {
      const [rows] = await this.db.pool.query<any[]>(`SELECT application_id,id,name,authority_name FROM ${CRM.applicationApprovalSteps} WHERE status='PENDING' ORDER BY started_at`);
      return rows.map(r => ({applicationId: r.application_id, stepId: r.id, name: r.name, authorityName: r.authority_name}));
    }
    return this.repo.pendingFor(actor.authorities || [], Number.isInteger(actor.portalUserId) ? Number(actor.portalUserId) : null);
  }
}

