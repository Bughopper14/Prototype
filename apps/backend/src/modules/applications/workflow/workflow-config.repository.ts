import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {Problem} from '../../../core/domain';
import {WorkflowFreezeRepository} from '../../workflows/workflow-freeze.repository';

export type ConfigStage = {code: string; name: string; groupName: string; groupCode: string; groupOrder: number; departmentCode: string | null; order: number; formCode: string | null};
/** `id` is the workflow freeze an application connects to; `code` is the master workflow it was frozen from. */
export type WorkflowConfig = {id: string; code: string; name: string; freezeVersion: number; stages: ConfigStage[]; stageByCode: Map<string, ConfigStage>};

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
 * The workflow an application runs in: a workflow freeze (crm_frozen_workflows) with which stages it has, in which order, and per
 * stage the required fields and documents. It does NOT hold approval: the approval steps of a workflow are read by modules/approvals.
 * Every application points at one freeze (crm_applications.workflow_freeze_id); new applications use the newest freeze of the active
 * workflow. A freeze never changes, so it is cached.
 */
@Injectable()
export class WorkflowConfigRepository {
  private readonly frozen = new Map<string, WorkflowConfig>();

  constructor(
    private readonly db: CrmDatabase,
    private readonly freezes: WorkflowFreezeRepository,
  ) {}

  /** The freeze id of the workflow new applications start in. */
  async activeFreezeId(conn: Pick<CrmDatabase['pool'], 'query'> = this.db.pool): Promise<string> {
    const id = await this.freezes.activeWorkflowFreezeId(conn);
    if (!id) throw new Problem(409, 'There is no active workflow yet. Ask an administrator to set one active in Workflow setup.');
    return id;
  }

  async load(freezeId: string): Promise<WorkflowConfig> {
    const cached = this.frozen.get(freezeId);
    if (cached) return cached;
    const [headers] = await this.db.pool.query<any[]>(`SELECT * FROM ${CRM.frozenWorkflows} WHERE id=?`, [freezeId]);
    const h = headers[0];
    if (!h) throw new Problem(404, 'Workflow not found');
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT s.code,s.name,s.department_code,s.sort_order,s.form_code,g.name AS group_name,g.code AS group_code,g.sort_order AS group_order
       FROM ${CRM.frozenWorkflowStages} s JOIN ${CRM.frozenWorkflowStageGroups} g ON g.workflow_freeze_id=s.workflow_freeze_id AND g.code=s.group_code
       WHERE s.workflow_freeze_id=?
       ORDER BY g.sort_order,g.name,s.sort_order,s.name`,
      [freezeId],
    );
    const stages: ConfigStage[] = rows.map(r => ({
      code: r.code,
      name: r.name,
      groupName: r.group_name,
      groupCode: r.group_code,
      groupOrder: Number(r.group_order),
      departmentCode: r.department_code ?? null,
      order: Number(r.sort_order),
      formCode: r.form_code,
    }));
    const config: WorkflowConfig = {
      id: h.id,
      code: h.source_workflow_code,
      name: h.name,
      freezeVersion: Number(h.freeze_version),
      stages,
      stageByCode: new Map(stages.map(s => [s.code, s])),
    };
    this.frozen.set(freezeId, config);
    return config;
  }
}
