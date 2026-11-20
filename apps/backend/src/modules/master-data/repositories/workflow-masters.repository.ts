import {Injectable} from '@nestjs/common';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {STATE_NAME, type ApprovalState} from '../../approvals/approvals.service';

/**
 * Workflow stages and application states for the frontend (read only): the stages are those of the ACTIVE workflow (an application
 * carries its own workflow, so its screens use that one); the states are the four an approval can leave an application in.
 * Who may approve a step is decided by the authority of that step (modules/approvals).
 */
@Injectable()
export class WorkflowMastersRepository {
  constructor(private readonly db: CrmDatabase) {}

  async catalog(catalog: MasterCatalog): Promise<MasterCatalog> {
    const [stages] = await this.db.pool.query<any[]>(
      `SELECT s.code,s.name FROM ${CRM.workflowStages} s
       JOIN ${CRM.workflowStageGroups} g ON g.workflow_code=s.workflow_code AND g.code=s.group_code
       JOIN ${CRM.workflows} w ON w.code=s.workflow_code AND w.is_active=1
       ORDER BY g.sort_order,g.name,s.sort_order,s.name`,
    );
    return {
      ...catalog,
      workflowStage: stages.map((r, i) => ({value: r.code, name: r.name, active: true, sequence: i + 1}) satisfies MasterItem),
      workflowStatus: (Object.keys(STATE_NAME) as ApprovalState[]).map(
        code => ({value: code, name: STATE_NAME[code], active: true, terminal: code === 'APPROVED'}) satisfies MasterItem,
      ),
    };
  }
}
