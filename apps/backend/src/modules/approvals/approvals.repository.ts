import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;

export type ApprovalScope = 'GROUP' | 'STAGE' | 'DOCUMENT' | 'SECTION';
export type StepStatus = 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/**
 * What a round of approval is about: a group, a stage, one document of the application, or a section. A section of a stage is approved
 * once, or once per row when the section is repeating (the deeds): then `subjectId` is the id of the row. Exactly the id of its type is set.
 */
export type ScopeRef = {type: ApprovalScope; groupId?: string | null; stageId?: string | null; checklistId?: string | null; sectionCode?: string | null; subjectId?: string | null};

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
  sectionCode: string | null;
  /** The master approval the workflow points at, and the level (sortOrder) of this step in it. Levels with the same number run in parallel. */
  approvalCode: string;
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
  sectionCode: string | null;
  subjectId: string | null;
  stageCode: string | null;
  groupCode: string | null;
  documentCode: string | null;
  sortOrder: number;
  authorityName: string;
  status: StepStatus;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type Decision = {id: string; stepId: string; userId: number; decision: 'APPROVED' | 'REJECTED'; remarks: string | null; decidedAt: Date; via: 'WEB' | 'LARK'};

/** One row of an assignment joined with a level of its master approval: that level is one step of the template. */
const template = (r: any): TemplateStep => ({
  id: `${r.id}:${r.level_no}:${r.authority_name}`,
  workflowCode: r.workflow_code,
  code: `${r.code}-${r.level_no}-${String(r.authority_name).replace(/[^A-Za-z0-9]+/g, '-')}`.slice(0, 120),
  name: `${r.approval_name} · level ${r.level_no}`,
  scope: r.scope_type,
  groupId: r.stage_group_id,
  stageId: r.stage_id,
  workflowStageDocumentId: r.workflow_stage_document_id,
  groupCode: r.group_code,
  stageCode: r.stage_code,
  documentCode: r.document_code,
  sectionCode: r.section_code ?? null,
  approvalCode: r.approval_code,
  sortOrder: Number(r.level_no),
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
  sectionCode: r.section_code ?? null,
  subjectId: r.subject_id ?? null,
  stageCode: r.stage_code ?? null,
  groupCode: r.group_code ?? null,
  documentCode: r.document_code ?? null,
  sortOrder: Number(r.sort_order),
  authorityName: r.authority_name,
  status: r.status,
  startedAt: r.started_at,
  completedAt: r.completed_at,
});

/** The scope of a row as a SQL condition (NULL-safe, so a group scope never matches a stage scope). */
const scopeWhere = (s: ScopeRef) => ({
  sql: 'scope_type=? AND stage_group_id <=> ? AND stage_id <=> ? AND document_checklist_id <=> ? AND section_code <=> ? AND subject_id <=> ?',
  args: [s.type, s.groupId ?? null, s.stageId ?? null, s.checklistId ?? null, s.sectionCode ?? null, s.subjectId ?? null],
});

/** Approval steps of a workflow (the template), the rounds of an application, and the decisions on them. CRM tables only. */
@Injectable()
export class ApprovalsRepository {
  constructor(private readonly db: CrmDatabase) {}

  /* ---------- the template: the approvals a workflow points at (assignments) and their levels (master approval) ---------- */

  private readonly templateSelect = `SELECT a.id,a.workflow_code,a.code,a.scope_type,a.stage_group_id,a.stage_id,a.workflow_stage_document_id,a.group_code,a.stage_code,
            a.document_code,a.section_code,a.approval_code,ap.name AS approval_name,l.level_no,l.authority_name
     FROM ${CRM.workflowApprovalAssignments} a
     JOIN ${CRM.masterApprovals} ap ON ap.code=a.approval_code
     JOIN ${CRM.masterApprovalLevels} l ON l.approval_code=a.approval_code`;

  async templatesOf(workflowCode: string, conn: Conn = this.db.pool): Promise<TemplateStep[]> {
    const [rows] = await conn.execute<any[]>(
      `${this.templateSelect} WHERE a.workflow_code=? ORDER BY a.scope_type,a.code,l.level_no,l.authority_name`,
      [workflowCode],
    );
    return rows.map(template);
  }

  /** The steps a scope has in the workflow, in running order. For a document the scope is the workflow document of the checklist row. */
  async templatesForScope(conn: Conn, workflowCode: string, scope: ScopeRef, workflowStageDocumentId?: string | null): Promise<TemplateStep[]> {
    const where =
      scope.type === 'GROUP'
        ? ['a.stage_group_id=?', [scope.groupId ?? null]]
        : scope.type === 'STAGE'
          ? ['a.stage_id=?', [scope.stageId ?? null]]
          : scope.type === 'SECTION'
            ? ['a.stage_id=? AND a.section_code=?', [scope.stageId ?? null, scope.sectionCode ?? null]]
            : ['a.workflow_stage_document_id=?', [workflowStageDocumentId ?? null]];
    const [rows] = await conn.execute<any[]>(
      `${this.templateSelect} WHERE a.workflow_code=? AND a.scope_type=? AND ${where[0]} ORDER BY l.level_no,l.authority_name`,
      [workflowCode, scope.type, ...(where[1] as (string | null)[])],
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
           (id,application_id,workflow_code,round_no,code,name,scope_type,stage_group_id,stage_id,document_checklist_id,section_code,subject_id,group_code,stage_code,document_code,
            sort_order,authority_name,status,started_at,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,${status === 'PENDING' ? 'CURRENT_TIMESTAMP(3)' : 'NULL'},?)`,
        [id, applicationId, t.workflowCode, roundNo, t.code, t.name, scope.type, scope.groupId ?? null, scope.stageId ?? null, scope.checklistId ?? null, scope.sectionCode ?? null, scope.subjectId ?? null, t.groupCode, t.stageCode, t.documentCode, t.sortOrder, t.authorityName, status, by],
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
