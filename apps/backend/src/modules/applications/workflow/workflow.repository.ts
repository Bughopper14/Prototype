import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {UsersAuthorityLookup} from './users-authority.lookup';

export type WorkflowStage = {id: string; code: string; name: string; sequence: number};
export type WorkflowStatus = {id: string; code: string; name: string; stageId: string; isTerminal: boolean};
export type WorkflowRule = {
  id: string;
  beforeStatusId: string;
  afterStatusId: string;
  action: string;
  authority: string;
};
export type Workflow = {
  stages: WorkflowStage[];
  statuses: WorkflowStatus[];
  rules: WorkflowRule[];
  stageById: Map<string, WorkflowStage>;
  stageByCode: Map<string, WorkflowStage>;
  statusById: Map<string, WorkflowStatus>;
  statusByCode: Map<string, WorkflowStatus>;
};

/** Stages, statuses and transition rules of the application workflow (crm_master_workflow_*). */
@Injectable()
export class WorkflowRepository {
  constructor(
    private readonly db: CrmDatabase,
    private readonly authorities: UsersAuthorityLookup,
  ) {}

  async load(): Promise<Workflow> {
    const [stageRows] = await this.db.pool.query<any[]>(
      `SELECT id,code,name,sequence_order FROM ${CRM.masterWorkflowStages} WHERE is_active=1 ORDER BY sequence_order`,
    );
    const [statusRows] = await this.db.pool.query<any[]>(
      `SELECT id,code,name,stage_id,is_terminal FROM ${CRM.masterWorkflowStatuses} WHERE is_active=1
       ORDER BY sort_order`,
    );
    const [ruleRows] = await this.db.pool.query<any[]>(
      `SELECT id,before_status_id,authority_id,action,after_status_id FROM ${CRM.masterWorkflow}`,
    );
    const names = await this.authorities.names(ruleRows.map(r => Number(r.authority_id)));
    const stages = stageRows.map(r => ({id: r.id, code: r.code, name: r.name, sequence: Number(r.sequence_order)}));
    const statuses = statusRows.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      stageId: r.stage_id,
      isTerminal: !!r.is_terminal,
    }));
    const rules = ruleRows
      .filter(r => names.has(Number(r.authority_id)))
      .map(r => ({
        id: r.id,
        beforeStatusId: r.before_status_id,
        afterStatusId: r.after_status_id,
        action: r.action,
        authority: names.get(Number(r.authority_id))!,
      }));
    return {
      stages,
      statuses,
      rules,
      stageById: new Map(stages.map(s => [s.id, s])),
      stageByCode: new Map(stages.map(s => [s.code, s])),
      statusById: new Map(statuses.map(s => [s.id, s])),
      statusByCode: new Map(statuses.map(s => [s.code, s])),
    };
  }
}

/** The actions an actor may take from a status, in the order of crm_master_workflow (admins may take every action). */
export function availableActions(
  workflow: Workflow,
  statusId: string,
  actor: {isAdmin?: boolean; role?: string; authorities?: string[]},
): string[] {
  const isAdmin = !!actor.isAdmin || actor.role === 'ADMIN';
  const held = new Set(actor.authorities || []);
  const actions = workflow.rules
    .filter(r => r.beforeStatusId === statusId && (isAdmin || held.has(r.authority)))
    .map(r => r.action);
  return [...new Set(actions)];
}
