import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;
const uuid = () => crypto.randomUUID();

/**
 * Workflow and approval freeze, the same way FAP freeze works (see fap-freeze.repository.ts): a frozen copy is an immutable header
 * (`crm_frozen_workflows`, `crm_frozen_approvals`) with its rows in child tables keyed by `workflow_freeze_id`. Every create or edit of a master makes a
 * new freeze (freeze_version + 1); the earlier one stays and loses is_latest_freeze. Frozen tables have no foreign keys, so a master can be
 * deleted and its freezes stay. An application connects to one workflow freeze (crm_applications.workflow_freeze_id) and never changes it.
 */
@Injectable()
export class WorkflowFreezeRepository {
  constructor(private readonly db: CrmDatabase) {}

  /** The newest freeze of a master workflow, or null when it was never frozen. */
  async latestWorkflowFreezeId(workflowCode: string, conn: Pick<Conn, 'query'> = this.db.pool): Promise<string | null> {
    const [rows] = await conn.query<any[]>(`SELECT id FROM ${CRM.frozenWorkflows} WHERE source_workflow_code=? AND is_latest_freeze=1`, [workflowCode]);
    return rows[0]?.id ?? null;
  }

  /** The workflow new applications start in: the newest freeze of the active master workflow. */
  async activeWorkflowFreezeId(conn: Pick<Conn, 'query'> = this.db.pool): Promise<string | null> {
    const [rows] = await conn.query<any[]>(
      `SELECT f.id FROM ${CRM.frozenWorkflows} f JOIN ${CRM.workflows} w ON w.code=f.source_workflow_code AND w.is_active=1 WHERE f.is_latest_freeze=1 LIMIT 1`,
    );
    return rows[0]?.id ?? null;
  }

  /** Freezes a master approval (always a new freeze). Returns the freeze id. */
  async freezeApproval(conn: Conn, code: string, by: string | null): Promise<string> {
    const [[a]] = await conn.query<any[]>(`SELECT * FROM ${CRM.masterApprovals} WHERE code=?`, [code]);
    const [levels] = await conn.query<any[]>(`SELECT level_no,app_id,authority_name,is_pic_marketing FROM ${CRM.masterApprovalLevels} WHERE approval_code=? ORDER BY level_no,is_pic_marketing,authority_name`, [code]);
    const [[max]] = await conn.query<any[]>(`SELECT COALESCE(MAX(freeze_version),0) AS v FROM ${CRM.frozenApprovals} WHERE source_approval_code=?`, [code]);
    await conn.execute(`UPDATE ${CRM.frozenApprovals} SET is_latest_freeze=0 WHERE source_approval_code=? AND is_latest_freeze=1`, [code]);
    const id = uuid();
    await conn.execute(
      `INSERT INTO ${CRM.frozenApprovals} (id,source_approval_code,freeze_version,is_latest_freeze,name,approval_type,description,frozen_by_name) VALUES (?,?,?,?,?,?,?,?)`,
      [id, code, Number(max.v) + 1, 1, a.name, a.approval_type, a.description ?? null, by],
    );
    for (const l of levels)
      await conn.execute(`INSERT INTO ${CRM.frozenApprovalLevels} (id,approval_freeze_id,level_no,app_id,authority_name,is_pic_marketing) VALUES (?,?,?,?,?,?)`, [uuid(), id, l.level_no, l.app_id, l.authority_name, l.is_pic_marketing]);
    return id;
  }

  /** The newest approval freeze when it still equals the master, else a new one (a workflow freeze does not copy an unchanged approval again). */
  private async approvalFreezeFor(conn: Conn, code: string, by: string | null): Promise<string> {
    const [[latest]] = await conn.query<any[]>(`SELECT * FROM ${CRM.frozenApprovals} WHERE source_approval_code=? AND is_latest_freeze=1`, [code]);
    if (latest) {
      const [[a]] = await conn.query<any[]>(`SELECT name,approval_type,description FROM ${CRM.masterApprovals} WHERE code=?`, [code]);
      const [now] = await conn.query<any[]>(`SELECT level_no,authority_name,is_pic_marketing FROM ${CRM.masterApprovalLevels} WHERE approval_code=? ORDER BY level_no,is_pic_marketing,authority_name`, [code]);
      const [then] = await conn.query<any[]>(`SELECT level_no,authority_name,is_pic_marketing FROM ${CRM.frozenApprovalLevels} WHERE approval_freeze_id=? ORDER BY level_no,is_pic_marketing,authority_name`, [latest.id]);
      const same = now.length === then.length && now.every((r, i) => Number(r.level_no) === Number(then[i].level_no) && r.authority_name === then[i].authority_name && !!r.is_pic_marketing === !!then[i].is_pic_marketing);
      if (a && a.name === latest.name && a.approval_type === latest.approval_type && (a.description ?? null) === (latest.description ?? null) && same) return latest.id;
    }
    return this.freezeApproval(conn, code, by);
  }

  /** Freezes a master workflow with the approvals it points at. Returns the new freeze id. */
  async freezeWorkflow(conn: Conn, workflowCode: string, by: string | null): Promise<string> {
    const [[w]] = await conn.query<any[]>(`SELECT * FROM ${CRM.workflows} WHERE code=?`, [workflowCode]);
    const [[max]] = await conn.query<any[]>(`SELECT COALESCE(MAX(freeze_version),0) AS v FROM ${CRM.frozenWorkflows} WHERE source_workflow_code=?`, [workflowCode]);
    // the approvals first, so the workflow freeze can point at their freezes
    const [assignments] = await conn.query<any[]>(`SELECT * FROM ${CRM.workflowApprovalAssignments} WHERE workflow_code=?`, [workflowCode]);
    const approvalFreeze = new Map<string, string>();
    for (const code of new Set<string>(assignments.map(a => a.approval_code))) approvalFreeze.set(code, await this.approvalFreezeFor(conn, code, by));

    await conn.execute(`UPDATE ${CRM.frozenWorkflows} SET is_latest_freeze=0 WHERE source_workflow_code=? AND is_latest_freeze=1`, [workflowCode]);
    const id = uuid();
    await conn.execute(
      `INSERT INTO ${CRM.frozenWorkflows} (id,source_workflow_code,freeze_version,is_latest_freeze,name,description,frozen_by_name) VALUES (?,?,?,?,?,?,?)`,
      [id, workflowCode, Number(max.v) + 1, 1, w.name, w.description ?? null, by],
    );
    const copy = async (table: string, from: string, cols: string[]) => {
      const [rows] = await conn.query<any[]>(`SELECT ${cols.join(',')} FROM ${from} WHERE workflow_code=?`, [workflowCode]);
      for (const r of rows)
        await conn.execute(`INSERT INTO ${table} (id,workflow_freeze_id,${cols.join(',')}) VALUES (?,?,${cols.map(() => '?').join(',')})`, [uuid(), id, ...cols.map(c => r[c] ?? null)]);
    };
    await copy(CRM.frozenWorkflowStageGroups, CRM.workflowStageGroups, ['code', 'name', 'sort_order', 'description']);
    await copy(CRM.frozenWorkflowStages, CRM.workflowStages, ['group_code', 'code', 'name', 'department_code', 'sort_order', 'form_code', 'description']);
    await copy(CRM.frozenWorkflowStageFields, CRM.workflowStageFields, ['stage_code', 'form_field_code', 'is_mandatory']);
    await copy(CRM.frozenWorkflowStageDocuments, CRM.workflowStageDocuments, ['group_code', 'stage_code', 'document_type_id', 'document_code', 'is_default', 'is_mandatory', 'sort_order']);
    for (const a of assignments)
      await conn.execute(
        `INSERT INTO ${CRM.frozenWorkflowApprovalAssignments} (id,workflow_freeze_id,code,scope_type,section_code,group_code,stage_code,document_code,approval_code,approval_freeze_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [uuid(), id, a.code, a.scope_type, a.section_code, a.group_code, a.stage_code, a.document_code, a.approval_code, approvalFreeze.get(a.approval_code)],
      );
    return id;
  }

  /** Freezes every master workflow that points at an approval (after the approval was edited), so new applications get the change. */
  /** Writes one line of the workflow log (who did what, when). The log stays when the workflow is deleted. */
  async logWorkflow(conn: Conn, code: string, name: string | null, action: 'CREATE' | 'EDIT' | 'RENAME' | 'ACTIVATE' | 'DEACTIVATE' | 'DELETE', summary: string, by: string | null) {
    const [[v]] = await conn.query<any[]>(`SELECT MAX(freeze_version) AS v FROM ${CRM.frozenWorkflows} WHERE source_workflow_code=?`, [code]);
    await conn.execute(`INSERT INTO ${CRM.workflowLogs} (id,workflow_code,workflow_name,action,summary,freeze_version,actor_name) VALUES (?,?,?,?,?,?,?)`, [uuid(), code, name, action, summary.slice(0, 500), v?.v == null ? null : Number(v.v), by]);
  }

  async refreezeWorkflowsUsing(conn: Conn, approvalCode: string, by: string | null) {
    const [rows] = await conn.query<any[]>(`SELECT DISTINCT a.workflow_code,w.name FROM ${CRM.workflowApprovalAssignments} a JOIN ${CRM.workflows} w ON w.code=a.workflow_code WHERE a.approval_code=?`, [approvalCode]);
    for (const r of rows) {
      await this.freezeWorkflow(conn, r.workflow_code, by);
      await this.logWorkflow(conn, r.workflow_code, r.name, 'EDIT', `Saved again because the approval ${approvalCode} was edited`, by);
    }
  }

  /** The applications running on each of the given workflow freezes: the total and the newest ones (to link from a history). */
  async applicationsOn(freezeIds: string[], limit = 3): Promise<Map<string, {total: number; items: {id: string; companyName: string | null; createdAt: string}[]}>> {
    const out = new Map<string, {total: number; items: {id: string; companyName: string | null; createdAt: string}[]}>();
    if (!freezeIds.length) return out;
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT a.workflow_freeze_id,a.id,a.created_at,p.company_name
       FROM ${CRM.applications} a LEFT JOIN ${CRM.fapApplicationProfiles} p ON p.application_id=a.id
       WHERE a.deleted_at IS NULL AND a.workflow_freeze_id IN (${freezeIds.map(() => '?').join(',')}) ORDER BY a.created_at DESC`,
      freezeIds,
    );
    for (const r of rows) {
      const e = out.get(r.workflow_freeze_id) ?? {total: 0, items: []};
      e.total += 1;
      if (e.items.length < limit) e.items.push({id: r.id, companyName: r.company_name ?? null, createdAt: r.created_at});
      out.set(r.workflow_freeze_id, e);
    }
    return out;
  }

  /** One page of the applications on the given workflow freezes (for the "view all" dialog), with an optional search on the company name. */
  async applicationsPage(freezeIds: string[], search: string, page: number, size = 15) {
    if (!freezeIds.length) return {total: 0, page: 1, size, items: [] as {id: string; companyName: string | null; createdAt: string}[]};
    const marks = freezeIds.map(() => '?').join(',');
    const like = `%${search.replace(/[\\%_]/g, m => '\\' + m)}%`;
    const where = `a.deleted_at IS NULL AND a.workflow_freeze_id IN (${marks})${search ? ' AND p.company_name LIKE ?' : ''}`;
    const params = search ? [...freezeIds, like] : freezeIds;
    const from = `FROM ${CRM.applications} a LEFT JOIN ${CRM.fapApplicationProfiles} p ON p.application_id=a.id WHERE ${where}`;
    const [[count]] = await this.db.pool.query<any[]>(`SELECT COUNT(*) AS n ${from}`, params);
    const total = Number(count.n);
    const pages = Math.max(1, Math.ceil(total / size));
    const at = Math.min(Math.max(1, page), pages);
    const [rows] = await this.db.pool.query<any[]>(`SELECT a.id,a.created_at,p.company_name ${from} ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?`, [...params, size, (at - 1) * size]);
    return {total, page: at, size, items: rows.map(r => ({id: r.id as string, companyName: (r.company_name ?? null) as string | null, createdAt: r.created_at as string}))};
  }
}
