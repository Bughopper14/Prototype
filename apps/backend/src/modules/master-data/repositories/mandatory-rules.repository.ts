import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {formField} from '../../workflows/form-fields';

/**
 * Mandatory-field rules of a workflow (crm_workflow_stage_fields), read only: they are set in Workflow setup. The API
 * keeps its shape: stage is 'FAP' or 'PRE-AN' (workflow stage codes FAP_STAGE / PRE_ANALYSIS) or the stage code,
 * section is section_name, mandatory is is_mandatory.
 */
@Injectable()
export class MandatoryRulesRepository {
  constructor(private readonly db: CrmDatabase) {}

  /** Rules of `workflowId`, or of the active workflow when omitted. */
  async list(workflowId?: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT ff.id,
              CASE s.code WHEN 'FAP-STAGE' THEN 'FAP' WHEN 'PRE-ANALYSIS' THEN 'PRE-AN' ELSE s.code END AS stage,
              ff.form_code, ff.section_name AS section, ff.code, sf.is_mandatory AS mandatory
       FROM ${CRM.workflowStageFields} sf
       JOIN ${CRM.masterFormFields} ff ON ff.id=sf.form_field_id
       JOIN ${CRM.workflowStages} s ON s.id=sf.stage_id
       JOIN ${CRM.workflowStageGroups} g ON g.id=s.stage_group_id
       JOIN ${CRM.workflows} w ON w.code=sf.workflow_code AND ${workflowId ? 'w.id=?' : "w.status='ACTIVE'"}
       ORDER BY g.sort_order,s.sort_order,ff.sort_order`,
      workflowId ? [workflowId] : [],
    );
    // the form field key and label come from the form definition (form-fields.ts), not from the database
    return rows.map(r => {
      const def = formField(r.form_code, r.section, r.code);
      return {id: r.id, stage: r.stage, section: r.section, field_key: def?.key ?? r.code, field_label: def?.label ?? r.code, mandatory: r.mandatory};
    });
  }
}
