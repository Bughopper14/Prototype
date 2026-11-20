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
 * once, or once per row when the section is repeating (the deeds): then `subjectId` is the id of the row. A place of the workflow is named by its CODE:
 * a GROUP by groupCode, a STAGE by stageCode, a SECTION by stageCode + sectionCode, a DOCUMENT by its checklist row (checklistId) and the stageCode + documentCode of the workflow document.
 */
export type ScopeRef = {
  type: ApprovalScope;
  groupCode?: string | null;
  stageCode?: string | null;
  documentCode?: string | null;
  checklistId?: string | null;
  sectionCode?: string | null;
  subjectId?: string | null;
};

export type TemplateStep = {
  id: string;
  workflowFreezeId: string;
  code: string;
  name: string;
  scope: ApprovalScope;
  groupCode: string | null;
  stageCode: string | null;
  documentCode: string | null;
  sectionCode: string | null;
  /** The master approval the workflow points at, and the level (sortOrder) of this step in it. Levels with the same number run in parallel. */
  approvalCode: string;
  sortOrder: number;
  authorityName: string;
  /** The level is approved by the PIC Marketing of the application instead of by an authority. */
  isPicMarketing: boolean;
};

export type AppStep = {
  id: string;
  applicationId: string;
  workflowFreezeId: string;
  roundNo: number;
  code: string;
  name: string;
  scope: ApprovalScope;
  checklistId: string | null;
  sectionCode: string | null;
  subjectId: string | null;
  stageCode: string | null;
  groupCode: string | null;
  documentCode: string | null;
  sortOrder: number;
  authorityName: string;
  isPicMarketing: boolean;
  /** The user who must approve a PIC Marketing step (the application's PIC when the round started). */
  approverUserId: number | null;
  status: StepStatus;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type Decision = {id: string; stepId: string; userId: number; decision: 'APPROVED' | 'REJECTED'; remarks: string | null; decidedAt: Date; via: 'WEB' | 'LARK'};

/** One row of an assignment joined with a level of its master approval: that level is one step of the template. */
const template = (r: any): TemplateStep => ({
  id: `${r.id}:${r.level_no}:${r.authority_name}`,
  workflowFreezeId: r.workflow_freeze_id,
  code: `${r.code}-${r.level_no}-${String(r.authority_name).replace(/[^A-Za-z0-9]+/g, '-')}`.slice(0, 120),
  name: `${r.approval_name} · level ${r.level_no}`,
  scope: r.scope_type,
  groupCode: r.group_code,
  stageCode: r.stage_code,
  documentCode: r.document_code,
  sectionCode: r.section_code ?? null,
  approvalCode: r.approval_code,
  sortOrder: Number(r.level_no),
  authorityName: r.authority_name,
  isPicMarketing: !!r.is_pic_marketing,
});

const step = (r: any): AppStep => ({
  id: r.id,
  applicationId: r.application_id,
  workflowFreezeId: r.workflow_freeze_id,
  roundNo: Number(r.round_no),
  code: r.code,
  name: r.name,
  scope: r.scope_type,
  checklistId: r.document_checklist_id,
  sectionCode: r.section_code ?? null,
  subjectId: r.subject_id ?? null,
  stageCode: r.stage_code ?? null,
  groupCode: r.group_code ?? null,
  documentCode: r.document_code ?? null,
  sortOrder: Number(r.sort_order),
  authorityName: r.authority_name,
  isPicMarketing: !!r.is_pic_marketing,
  approverUserId: r.approver_user_id === null || r.approver_user_id === undefined ? null : Number(r.approver_user_id),
  status: r.status,
  startedAt: r.started_at,
  completedAt: r.completed_at,
});

/** The scope of a row as a SQL condition: only the columns that name this kind of place are compared (NULL-safe). */
const scopeWhere = (s: ScopeRef): {sql: string; args: (string | null)[]} => {
  if (s.type === 'GROUP') return {sql: 'scope_type=? AND group_code <=> ?', args: [s.type, s.groupCode ?? null]};
  if (s.type === 'STAGE') return {sql: 'scope_type=? AND stage_code <=> ?', args: [s.type, s.stageCode ?? null]};
  if (s.type === 'SECTION')
    return {sql: 'scope_type=? AND stage_code <=> ? AND section_code <=> ? AND subject_id <=> ?', args: [s.type, s.stageCode ?? null, s.sectionCode ?? null, s.subjectId ?? null]};
  return {sql: 'scope_type=? AND document_checklist_id <=> ?', args: [s.type, s.checklistId ?? null]};
};

/** Approval steps of a workflow (the template), the rounds of an application, and the decisions on them. CRM tables only. */
@Injectable()
export class ApprovalsRepository {
  constructor(private readonly db: CrmDatabase) {}

  /* ---------- the template: the approvals a workflow points at (assignments) and their levels (master approval) ---------- */

  private readonly templateSelect = `SELECT a.id,a.freeze_id AS workflow_freeze_id,a.code,a.scope_type,a.group_code,a.stage_code,
            a.document_code,a.section_code,a.approval_code,ap.name AS approval_name,l.level_no,COALESCE(l.authority_name,'PIC Marketing') AS authority_name,l.is_pic_marketing
     FROM ${CRM.frozenWorkflowApprovalAssignments} a
     JOIN ${CRM.frozenApprovals} ap ON ap.id=a.approval_freeze_id
     JOIN ${CRM.frozenApprovalLevels} l ON l.freeze_id=a.approval_freeze_id`;

  async templatesOf(workflowFreezeId: string, conn: Conn = this.db.pool): Promise<TemplateStep[]> {
    const [rows] = await conn.execute<any[]>(
      `${this.templateSelect} WHERE a.freeze_id=? ORDER BY a.scope_type,a.code,l.level_no,l.is_pic_marketing,l.authority_name`,
      [workflowFreezeId],
    );
    return rows.map(template);
  }

  /** The steps a scope has in the workflow, in running order. For a document the scope names the workflow document (stageCode + documentCode). */
  async templatesForScope(conn: Conn, workflowFreezeId: string, scope: ScopeRef): Promise<TemplateStep[]> {
    const where =
      scope.type === 'GROUP'
        ? ['a.group_code=?', [scope.groupCode ?? null]]
        : scope.type === 'STAGE'
          ? ['a.stage_code=?', [scope.stageCode ?? null]]
          : scope.type === 'SECTION'
            ? ['a.stage_code=? AND a.section_code=?', [scope.stageCode ?? null, scope.sectionCode ?? null]]
            : ['a.stage_code=? AND a.document_code=?', [scope.stageCode ?? null, scope.documentCode ?? null]];
    const [rows] = await conn.execute<any[]>(
      `${this.templateSelect} WHERE a.freeze_id=? AND a.scope_type=? AND ${where[0]} ORDER BY l.level_no,l.is_pic_marketing,l.authority_name`,
      [workflowFreezeId, scope.type, ...(where[1] as (string | null)[])],
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
    picUserId: number | null = null,
  ): Promise<AppStep[]> {
    const out: AppStep[] = [];
    for (const {template: t, status} of steps) {
      const id = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO ${CRM.applicationApprovalSteps}
           (id,application_id,workflow_freeze_id,round_no,code,name,scope_type,document_checklist_id,section_code,subject_id,group_code,stage_code,document_code,
            sort_order,authority_name,is_pic_marketing,approver_user_id,status,started_at,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,${status === 'PENDING' ? 'CURRENT_TIMESTAMP(3)' : 'NULL'},?)`,
        [id, applicationId, t.workflowFreezeId, roundNo, t.code, t.name, scope.type, scope.checklistId ?? null, scope.sectionCode ?? null, scope.subjectId ?? null, t.groupCode, t.stageCode, t.documentCode, t.sortOrder, t.authorityName, +t.isPicMarketing, t.isPicMarketing ? picUserId : null, status, by],
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
  async pendingFor(authorityNames: string[], userId: number | null = null, conn: Conn = this.db.pool): Promise<{applicationId: string; stepId: string; name: string; authorityName: string}[]> {
    const marks = authorityNames.map(() => '?').join(',');
    const [rows] = await conn.query<any[]>(
      `SELECT application_id,id,name,authority_name FROM ${CRM.applicationApprovalSteps}
       WHERE status='PENDING' AND ((is_pic_marketing=0${authorityNames.length ? ` AND authority_name IN (${marks})` : ' AND 1=0'}) OR (is_pic_marketing=1 AND approver_user_id <=> ?)) ORDER BY started_at`,
      [...authorityNames, userId],
    );
    return rows.map(r => ({applicationId: r.application_id, stepId: r.id, name: r.name, authorityName: r.authority_name}));
  }
}
