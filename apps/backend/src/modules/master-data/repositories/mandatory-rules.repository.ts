import {screenOfForm} from '@liugong/shared';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';

/**
 * Mandatory-field rules of a workflow (crm_workflow_stage_fields), read only: they are set in Workflow setup. A rule names its field the way
 * the master does: the code of the section (crm_master_form_sections.code) and the field key (crm_master_form_fields.field_key).
 */
@Injectable()
export class MandatoryRulesRepository {
  constructor(private readonly db: CrmDatabase) {}

  /**
   * Rules of `workflowId` (the frozen workflow an application runs in: its rules never change after it was frozen), or of the active
   * workflow when omitted.
   */
  async list(workflowId?: string) {
    const [rows] = await this.db.pool.query<any[]>(
      workflowId
        ? `SELECT sf.id,
                  s.code AS stage_code,
                  ff.form_code, fs.code AS section_code, fs.name AS section, ff.field_key, ff.label, ff.is_enforceable, sf.is_mandatory AS mandatory
           FROM ${CRM.frozenWorkflowStageFields} sf
           JOIN ${CRM.masterFormFields} ff ON ff.code=sf.form_field_code
           JOIN ${CRM.masterFormSections} fs ON fs.code=ff.section_code
           JOIN ${CRM.frozenWorkflowStages} s ON s.workflow_freeze_id=sf.workflow_freeze_id AND s.code=sf.stage_code
           JOIN ${CRM.frozenWorkflowStageGroups} g ON g.workflow_freeze_id=s.workflow_freeze_id AND g.code=s.group_code
           WHERE sf.workflow_freeze_id=?
           ORDER BY g.sort_order,s.sort_order,ff.sort_order`
        : `SELECT sf.id,
                  s.code AS stage_code,
                  ff.form_code, fs.code AS section_code, fs.name AS section, ff.field_key, ff.label, ff.is_enforceable, sf.is_mandatory AS mandatory
           FROM ${CRM.workflowStageFields} sf
           JOIN ${CRM.masterFormFields} ff ON ff.code=sf.form_field_code
           JOIN ${CRM.masterFormSections} fs ON fs.code=ff.section_code
           JOIN ${CRM.workflowStages} s ON s.workflow_code=sf.workflow_code AND s.code=sf.stage_code
           JOIN ${CRM.workflowStageGroups} g ON g.workflow_code=s.workflow_code AND g.code=s.group_code
           JOIN ${CRM.workflows} w ON w.code=sf.workflow_code AND w.is_active=1
           ORDER BY g.sort_order,s.sort_order,ff.sort_order`,
      workflowId ? [workflowId] : [],
    );
    return rows.map(r => ({id: r.id, formCode: r.form_code, sectionCode: r.section_code, section: r.section, fieldKey: r.field_key, label: r.label, enforceable: !!r.is_enforceable, mandatory: !!r.mandatory}));
  }
}
