import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';

/**
 * Mandatory-field rules (crm_master_field_mandatory_rules). The API keeps its existing shape: stage is 'FAP' or 'PRE-AN'
 * (from the workflow stage codes FAP_STAGE / PRE_ANALYSIS), section is section_name, mandatory is is_mandatory.
 */
const LIST_SQL = `SELECT r.id,
    CASE s.code WHEN 'FAP_STAGE' THEN 'FAP' WHEN 'PRE_ANALYSIS' THEN 'PRE-AN' ELSE s.code END AS stage,
    r.section_name AS section, r.field_key, r.field_label, r.is_mandatory AS mandatory
  FROM ${CRM.masterFieldMandatoryRules} r JOIN ${CRM.masterWorkflowStages} s ON s.id=r.stage_id
  WHERE r.is_active=1
  ORDER BY s.sequence_order, r.section_name, r.field_key`;

@Injectable()
export class MandatoryRulesRepository {
  constructor(private readonly db: CrmDatabase) {}

  async list() {
    return (await this.db.pool.query<any[]>(LIST_SQL))[0];
  }

  async set(
    target: {id?: string | number | null; section?: string; fieldKey?: string},
    mandatory: boolean,
    by: string | null,
  ) {
    const flag = mandatory ? 1 : 0;
    if (target.id !== undefined && target.id !== null && target.id !== '')
      await this.db.pool.execute(`UPDATE ${CRM.masterFieldMandatoryRules} SET is_mandatory=?,updated_by=? WHERE id=?`, [
        flag,
        by,
        String(target.id),
      ]);
    else if (target.section && target.fieldKey)
      await this.db.pool.execute(
        `UPDATE ${CRM.masterFieldMandatoryRules} SET is_mandatory=?,updated_by=? WHERE section_name=? AND field_key=?`,
        [flag, by, target.section, target.fieldKey],
      );
  }
}
