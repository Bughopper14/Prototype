import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';

/**
 * Mandatory-field rules of a workflow (crm_workflow_stage_fields), read only: they are set in Workflow setup. The API
 * keeps its shape: stage is 'FAP' or 'PRE-AN' (workflow stage codes FAP_STAGE / PRE_ANALYSIS) or the stage code,
 * section is the name of its section (crm_master_form_sections), mandatory is is_mandatory.
 */
@Injectable()
export class MandatoryRulesRepository {
  constructor(private readonly db: CrmDatabase) {}

  /** Rules of `workflowId`, or of the active workflow when omitted. */
  async list(workflowId?: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT sf.id,
              CASE s.code WHEN 'FAP-STAGE' THEN 'FAP' WHEN 'PRE-ANALYSIS' THEN 'PRE-AN' ELSE s.code END AS stage,
              ff.form_code, fs.name AS section, ff.code, ff.field_key, ff.label, sf.is_mandatory AS mandatory
       FROM ${CRM.workflowStageFields} sf
       JOIN ${CRM.masterFormFields} ff ON ff.code=sf.form_field_code
       JOIN ${CRM.masterFormSections} fs ON fs.code=ff.section_code
       JOIN ${CRM.workflowStages} s ON s.id=sf.stage_id
       JOIN ${CRM.workflowStageGroups} g ON g.id=s.stage_group_id
       JOIN ${CRM.workflows} w ON w.code=sf.workflow_code AND ${workflowId ? 'w.id=?' : "w.status='ACTIVE'"}
       ORDER BY g.sort_order,s.sort_order,ff.sort_order`,
      workflowId ? [workflowId] : [],
    );
    return rows.map(r => ({id: r.id, stage: r.stage, section: r.section, field_key: r.field_key, field_label: r.label, mandatory: r.mandatory}));
  }
}
