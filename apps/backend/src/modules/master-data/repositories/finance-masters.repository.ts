import {Injectable} from '@nestjs/common';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {MasterTableRepository, type MasterTable} from './master-table';

const tables: MasterTable[] = [
  {key: 'facilityPurpose', table: CRM.masterFacilityPurposes},
  {key: 'financingMethod', table: CRM.masterFinancingMethods},
  {key: 'currency', table: CRM.masterCurrencies, extras: [{column: 'symbol', field: 'symbol'}]},
  {
    key: 'paymentMethod',
    table: CRM.masterPaymentTimings,
    // The catalog keeps the lowercase timing ('advance' / 'arrear') the calculators read; the table stores ADVANCE / ARREAR.
    extras: [
      {
        column: 'timing_type',
        field: 'timing',
        read: v => (v ? String(v).toLowerCase() : null),
        write: v => (v ? String(v).toUpperCase() : 'ARREAR'),
      },
    ],
  },
];

/**
 * Financing masters (facility purpose, financing method, currency, payment timing) plus, read only, the FAP Section 05
 * purpose options and Section 08 document requirements. Each of those names its FAP sheet cell (param_key); they are
 * wired into the FAP form together with crm_fap_financing_purposes / crm_fap_doc_requirements.
 */
@Injectable()
export class FinanceMastersRepository {
  static readonly groups = tables.map(t => t.key);
  constructor(
    private readonly db: CrmDatabase,
    private readonly masterTables: MasterTableRepository,
  ) {}

  async catalog(catalog: MasterCatalog): Promise<MasterCatalog> {
    const result = await this.masterTables.read(tables, catalog);
    const [purposes] = await this.db.pool.query<any[]>(
      `SELECT o.code,o.label,o.group_label,o.param_key,o.is_visible,o.is_active,p.code AS purpose_code
       FROM ${CRM.masterFinancingPurposeOptions} o JOIN ${CRM.masterFacilityPurposes} p ON p.id=o.facility_purpose_id
       ORDER BY o.sort_order,o.created_at,o.id`,
    );
    const [requirements] = await this.db.pool.query<any[]>(
      `SELECT code,label,param_key,is_visible,is_active FROM ${CRM.masterFapDocumentRequirements}
       ORDER BY sort_order,created_at,id`,
    );
    return {
      ...result,
      financingPurposeOption: purposes.map(
        row =>
          ({
            value: row.code,
            name: row.label,
            active: !!row.is_active,
            parentValue: row.purpose_code,
            paramKey: row.param_key,
            groupLabel: row.group_label,
            visible: !!row.is_visible,
          }) satisfies MasterItem,
      ),
      fapDocumentRequirement: requirements.map(
        row =>
          ({
            value: row.code,
            name: row.label,
            active: !!row.is_active,
            paramKey: row.param_key,
            visible: !!row.is_visible,
          }) satisfies MasterItem,
      ),
    };
  }

  save(catalog: MasterCatalog, by: string | null) {
    return this.masterTables.save(tables, catalog, by);
  }
}
