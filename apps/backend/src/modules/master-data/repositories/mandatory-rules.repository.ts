import {screenOfForm} from '@liugong/shared';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';

/**
 * Mandatory-field rules of a workflow (crm_workflow_stage_fields), read only: they are set in Workflow setup. The API
 * keeps its shape: stage is 'FAP' or 'PRE-AN' (from the screen of the stage form) or the stage code,
 * section is the name of its section (crm_master_form_sections), mandatory is is_mandatory.
 */
@Injectable()
export class MandatoryRulesRepository {
  constructor(private readonly db: CrmDatabase) {}

  /** Rules of `workflowId`, or of the active workflow when omitted. */
  async list(workflowId?: string) {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT sf.id,
              s.code AS stage_code,
              ff.form_code, fs.name AS section, ff.code, ff.field_key, ff.label, sf.is_mandatory AS mandatory
       FROM ${CRM.workflowStageFields} sf
       JOIN ${CRM.masterFormFields} ff ON ff.code=sf.form_field_code
       JOIN ${CRM.masterFormSections} fs ON fs.code=ff.section_code
       JOIN ${CRM.workflowStages} s ON s.workflow_code=sf.workflow_code AND s.code=sf.stage_code
       JOIN ${CRM.workflowStageGroups} g ON g.workflow_code=s.workflow_code AND g.code=s.group_code
       JOIN ${CRM.workflows} w ON w.code=sf.workflow_code AND ${workflowId ? 'w.id=?' : "w.is_active=1"}
       ORDER BY g.sort_order,s.sort_order,ff.sort_order`,
      workflowId ? [workflowId] : [],
    );
    // the screen of the form names the stage for the forms (FAP / PRE-AN); another form keeps its stage code
    const stageOf = (r: any) => {
      const screen = screenOfForm(r.form_code);
      return screen === 'FAP' ? 'FAP' : screen === 'PRE_ANALYSIS' ? 'PRE-AN' : r.stage_code;
    };
    return rows.map(r => ({id: r.id, stage: stageOf(r), section: r.section, field_key: r.field_key, field_label: r.label, mandatory: r.mandatory}));
  }
}
