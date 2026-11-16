import {Injectable} from '@nestjs/common';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';

/**
 * Workflow stages and statuses for the frontend (read only): labels, stage of each status, order and final statuses.
 * Which actions a user may take is decided by the backend from crm_master_workflow (availableActions).
 */
@Injectable()
export class WorkflowMastersRepository {
  constructor(private readonly db: CrmDatabase) {}

  async catalog(catalog: MasterCatalog): Promise<MasterCatalog> {
    const [stages] = await this.db.pool.query<any[]>(
      `SELECT code,name,sequence_order,is_active FROM ${CRM.masterWorkflowStages} ORDER BY sequence_order`,
    );
    const [statuses] = await this.db.pool.query<any[]>(
      `SELECT s.code,s.name,s.is_terminal,s.is_active,st.code AS stage_code FROM ${CRM.masterWorkflowStatuses} s
       JOIN ${CRM.masterWorkflowStages} st ON st.id=s.stage_id ORDER BY st.sequence_order,s.sort_order`,
    );
    return {
      ...catalog,
      workflowStage: stages.map(
        r => ({value: r.code, name: r.name, active: !!r.is_active, sequence: Number(r.sequence_order)}) satisfies MasterItem,
      ),
      workflowStatus: statuses.map(
        r =>
          ({
            value: r.code,
            name: r.name,
            active: !!r.is_active,
            parentValue: r.stage_code,
            terminal: !!r.is_terminal,
          }) satisfies MasterItem,
      ),
    };
  }
}
