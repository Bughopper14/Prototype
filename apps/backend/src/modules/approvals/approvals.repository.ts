import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;

export type ApprovalScope = 'GROUP' | 'STAGE' | 'DOCUMENT';
export type StepStatus = 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/** What a round of approval is about: a group, a stage, or one document of the application. Exactly the id of its type is set. */
export type ScopeRef = {type: ApprovalScope; groupId?: string | null; stageId?: string | null; checklistId?: string | null};

export type TemplateStep = {
  id: string;
  workflowCode: string;
  code: string;
  name: string;
  scope: ApprovalScope;
  groupId: string | null;
  stageId: string | null;
  workflowStageDocumentId: string | null;
  groupCode: string | null;
  stageCode: string | null;
  documentCode: string | null;
  sortOrder: number;
  authorityName: string;
};

export type AppStep = {
  id: string;
  applicationId: string;
  workflowCode: string;
  roundNo: number;
  code: string;
  name: string;
  scope: ApprovalScope;
  groupId: string | null;
  stageId: string | null;
  checklistId: string | null;
  sortOrder: number;
  authorityName: string;
  status: StepStatus;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type Decision = {id: string; stepId: string; userId: number; decision: 'APPROVED' | 'REJECTED'; remarks: string | null; decidedAt: Date; via: 'WEB' | 'LARK'};

const template = (r: any): TemplateStep => ({
  id: r.id,
  workflowCode: r.workflow_code,
  code: r.code,
  name: r.name,
  scope: r.scope_type,
  groupId: r.stage_group_id,
  stageId: r.stage_id,
  workflowStageDocumentId: r.workflow_stage_document_id,
  groupCode: r.group_code,
  stageCode: r.stage_code,
  documentCode: r.document_code,
  sortOrder: Number(r.sort_order),
  authorityName: r.authority_name,
});

const step = (r: any): AppStep => ({
  id: r.id,
  applicationId: r.application_id,
  workflowCode: r.workflow_code,
  roundNo: Number(r.round_no),
  code: r.code,
  name: r.name,
  scope: r.scope_type,
  groupId: r.stage_group_id,
  stageId: r.stage_id,
  checklistId: r.document_checklist_id,
  sortOrder: Number(r.sort_order),
  authorityName: r.authority_name,
  status: r.status,
  startedAt: r.started_at,
  completedAt: r.completed_at,
});

/** The scope of a row as a SQL condition (NULL-safe, so a group scope never matches a stage scope). */
const scopeWhere = (s: ScopeRef) => ({
  sql: 'scope_type=? AND stage_group_id <=> ? AND stage_id <=> ? AND document_checklist_id <=> ?',
  args: [s.type, s.groupId ?? null, s.stageId ?? null, s.checklistId ?? null],
});

/** Approval steps of a workflow (the template), the rounds of an application, and the decisions on them. CRM tables only. */
@Injectable()
export class ApprovalsRepository {
  constructor(private readonly db: CrmDatabase) {}

  /* ---------- the template (crm_workflow_approval_steps) ---------- */

  async templatesOf(workflowCode: string, conn: Conn = this.db.pool): Promise<TemplateStep[]> {
    const [rows] = await conn.execute<any[]>(
      `SELECT * FROM ${CRM.workflowApprovalSteps} WHERE workflow_code=? ORDER BY scope_type,sort_order,code`,
      [workflowCode],
    );
    return rows.map(template);
  }

  /** The steps a scope has in the workflow, in running order. For a document the scope is the workflow document of the checklist row. */
  async templatesForScope(conn: Conn, workflowCode: string, scope: ScopeRef, workflowStageDocumentId?: string | null): Promise<TemplateStep[]> {
    const where =
      scope.type === 'GROUP'
        ? ['stage_group_id=?', scope.groupId]
        : scope.type === 'STAGE'
          ? ['stage_id=?', scope.stageId]
          : ['workflow_stage_document_id=?', workflowStageDocumentId ?? null];
    const [rows] = await conn.execute<any[]>(
      `SELECT * FROM ${CRM.workflowApprovalSteps} WHERE workflow_code=? AND scope_type=? AND ${where[0]} ORDER BY sort_order,code`,
      [workflowCode, scope.type, where[1] ?? null],
    );
    return rows.map(template);
  }

  /* ---------- the rounds of an application (crm_application_approval_steps) ---------- */

  async stepsOf(applicationId: string, conn: Conn = this.db.pool): Promise<AppStep[]> {
    const [rows] = await conn.execute<any[]>(
      `SELECT * FROM ${CRM.applicationApprovalSteps} WHERE application_id=? ORDER BY round_no,sort_order,code`,
      [applicationId],
    );
    return rows.map(step);
  }

  async stepsOfMany(applicationIds: string[], conn: Conn = this.db.pool): Promise<AppStep[]> {
    if (!applicationIds.length) return [];
    const [rows] = await conn.query<any[]>(
      `SELECT * FROM ${CRM.applicationApprovalSteps} WHERE application_id IN (${applicationIds.map(() => '?').join(',')}) ORDER BY round_no,sort_order,code`,
      applicationIds,
    );
    return rows.map(step);
  }

  async stepOf(conn: Conn, applicationId: string, stepId: string, forUpdate = false): Promise<AppStep | null> {
    const [rows] = await conn.execute<any[]>(
      `SELECT * FROM ${CRM.applicationApprovalSteps} WHERE id=? AND application_id=?${forUpdate ? ' FOR UPDATE' : ''}`,
      [stepId, applicationId],
    );
    return rows[0] ? step(rows[0]) : null;
  }

  /** The steps of one round of one scope. */
  async roundOf(conn: Conn, applicationId: string, scope: ScopeRef, roundNo: number): Promise<AppStep[]> {
    const w = scopeWhere(scope);
    const [rows] = await conn.execute<any[]>(
      `SELECT * FROM ${CRM.applicationApprovalSteps} WHERE application_id=? AND round_no=? AND ${w.sql} ORDER BY sort_order,code`,
      [applicationId, roundNo, ...w.args],
    );
    return rows.map(step);
  }

  async lastRoundNo(conn: Conn, applicationId: string, scope: ScopeRef): Promise<number> {
    const w = scopeWhere(scope);
    const [rows] = await conn.execute<any[]>(
      `SELECT COALESCE(MAX(round_no),0) AS n FROM ${CRM.applicationApprovalSteps} WHERE application_id=? AND ${w.sql}`,
      [applicationId, ...w.args],
    );
    return Number(rows[0].n);
  }

  async insertRound(
    conn: Conn,
    applicationId: string,
    roundNo: number,
    scope: ScopeRef,
    steps: {template: TemplateStep; status: StepStatus}[],
    by: string | null,
  ): Promise<AppStep[]> {
    const out: AppStep[] = [];
    for (const {template: t, status} of steps) {
      const id = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO ${CRM.applicationApprovalSteps}
           (id,application_id,workflow_code,round_no,code,name,scope_type,stage_group_id,stage_id,document_checklist_id,group_code,stage_code,document_code,
            sort_order,authority_name,status,started_at,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,${status === 'PENDING' ? 'CURRENT_TIMESTAMP(3)' : 'NULL'},?)`,
        [id, applicationId, t.workflowCode, roundNo, t.code, t.name, scope.type, scope.groupId ?? null, scope.stageId ?? null, scope.checklistId ?? null, t.groupCode, t.stageCode, t.documentCode, t.sortOrder, t.authorityName, status, by],
      );
    }
    for (const s of await this.roundOf(conn, applicationId, scope, roundNo)) out.push(s);
    return out;
  }

  async setStatus(conn: Conn, ids: string[], status: StepStatus, by: string | null) {
    if (!ids.length) return;
    const stamps = status === 'PENDING' ? ',started_at=CURRENT_TIMESTAMP(3)' : ['APPROVED', 'REJECTED', 'CANCELLED'].includes(status) ? ',completed_at=CURRENT_TIMESTAMP(3)' : '';
    await conn.execute(`UPDATE ${CRM.applicationApprovalSteps} SET status=?${stamps},updated_by=? WHERE id IN (${ids.map(() => '?').join(',')})`, [status, by, ...ids]);
  }

  /* ---------- the decisions (crm_application_approval_decisions) ---------- */

  async decisionsOf(stepIds: string[], conn: Conn = this.db.pool): Promise<Decision[]> {
    if (!stepIds.length) return [];
    const [rows] = await conn.query<any[]>(
      `SELECT * FROM ${CRM.applicationApprovalDecisions} WHERE application_step_id IN (${stepIds.map(() => '?').join(',')}) ORDER BY decided_at,id`,
      stepIds,
    );
    return rows.map(r => ({id: r.id, stepId: r.application_step_id, userId: Number(r.user_id), decision: r.decision, remarks: r.remarks, decidedAt: r.decided_at, via: r.decided_via}));
  }

  async hasDecided(conn: Conn, stepId: string, userId: number): Promise<boolean> {
    const [rows] = await conn.execute<any[]>(`SELECT 1 FROM ${CRM.applicationApprovalDecisions} WHERE application_step_id=? AND user_id=?`, [stepId, userId]);
    return rows.length > 0;
  }

  async insertDecision(conn: Conn, d: {code: string; stepId: string; userId: number; decision: 'APPROVED' | 'REJECTED'; remarks: string | null; via: 'WEB' | 'LARK'}, by: string | null) {
    await conn.execute(
      `INSERT INTO ${CRM.applicationApprovalDecisions} (id,code,application_step_id,user_id,decision,remarks,decided_via,created_by) VALUES (?,?,?,?,?,?,?,?)`,
      [crypto.randomUUID(), d.code, d.stepId, d.userId, d.decision, d.remarks, d.via, by],
    );
  }

  /** Steps that wait (PENDING) for any of the authorities, across applications: what a person has to act on. */
  async pendingFor(authorityNames: string[], conn: Conn = this.db.pool): Promise<{applicationId: string; stepId: string; name: string; authorityName: string}[]> {
    if (!authorityNames.length) return [];
    const [rows] = await conn.query<any[]>(
      `SELECT application_id,id,name,authority_name FROM ${CRM.applicationApprovalSteps}
       WHERE status='PENDING' AND authority_name IN (${authorityNames.map(() => '?').join(',')}) ORDER BY started_at`,
      authorityNames,
    );
    return rows.map(r => ({applicationId: r.application_id, stepId: r.id, name: r.name, authorityName: r.authority_name}));
  }
}
