import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {Problem} from '../../../core/domain';

export type ConfigStage = {id: string; code: string; name: string; groupId: string; groupName: string; groupCode: string; groupOrder: number; departmentCode: string | null; order: number; formCode: string | null};
export type WorkflowConfig = {id: string; code: string; name: string; versionNo: number; isDraft: boolean; isActive: boolean; stages: ConfigStage[]; stageByCode: Map<string, ConfigStage>};

/** The stages of a workflow in order (group, then stage order), for the screens. */
export const stagesOf = (c: WorkflowConfig) =>
  c.stages.map(s => ({code: s.code, name: s.name, groupCode: s.groupCode, formCode: s.formCode, order: s.order}));

/** The groups of a workflow with the codes of their stages (stages of one group run side by side), for the screens. */
export const groupsOf = (c: WorkflowConfig) => {
  const groups: {code: string; name: string; order: number; stageCodes: string[]}[] = [];
  for (const s of c.stages) {
    let g = groups.find(x => x.code === s.groupCode);
    if (!g) groups.push((g = {code: s.groupCode, name: s.groupName, order: s.groupOrder, stageCodes: []}));
    g.stageCodes.push(s.code);
  }
  return groups;
};

/**
 * The workflow an application runs in (crm_workflows): which stages it has, in which order, and per stage the required
 * fields and documents. It does NOT hold approval: the approval steps of a workflow are read by modules/approvals.
 * Every application points at one workflow (crm_applications.workflow_code); new applications use the active one.
 * A workflow that is not a draft never changes, so it is cached; a draft is always read fresh.
 */
@Injectable()
export class WorkflowConfigRepository {
  private readonly published = new Map<string, WorkflowConfig>();

  constructor(private readonly db: CrmDatabase) {}

  /** The code of the workflow new applications start in. */
  async activeCode(conn: Pick<CrmDatabase['pool'], 'query'> = this.db.pool): Promise<string> {
    const [rows] = await conn.query<any[]>(`SELECT code FROM ${CRM.workflows} WHERE status='ACTIVE' LIMIT 1`);
    if (!rows[0]) throw new Problem(500, 'No active workflow. An administrator must activate one in Workflow setup.');
    return rows[0].code;
  }

  forget(workflowCode: string) {
    this.published.delete(workflowCode);
  }

  async load(workflowCode: string): Promise<WorkflowConfig> {
    const cached = this.published.get(workflowCode);
    if (cached) return cached;
    const [headers] = await this.db.pool.query<any[]>(`SELECT * FROM ${CRM.workflows} WHERE code=?`, [workflowCode]);
    const h = headers[0];
    if (!h) throw new Problem(404, 'Workflow not found');
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT s.id,s.code,s.name,s.department_code,s.sort_order,s.form_code,g.id AS group_id,g.name AS group_name,g.code AS group_code,g.sort_order AS group_order
       FROM ${CRM.workflowStages} s JOIN ${CRM.workflowStageGroups} g ON g.id=s.stage_group_id
       WHERE s.workflow_code=?
       ORDER BY g.sort_order,g.name,s.sort_order,s.name`,
      [workflowCode],
    );
    const stages: ConfigStage[] = rows.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      groupId: r.group_id,
      groupName: r.group_name,
      groupCode: r.group_code,
      groupOrder: Number(r.group_order),
      departmentCode: r.department_code ?? null,
      order: Number(r.sort_order),
      formCode: r.form_code,
    }));
    const config: WorkflowConfig = {
      id: h.id,
      code: h.code,
      name: h.name,
      versionNo: Number(h.version_no),
      isDraft: h.status === 'DRAFT',
      isActive: h.status === 'ACTIVE',
      stages,
      stageByCode: new Map(stages.map(s => [s.code, s])),
    };
    if (!config.isDraft) this.published.set(workflowCode, config);
    return config;
  }
}
