import {Injectable} from '@nestjs/common';
import type {MasterCatalog} from '@liugong/shared';
import {CRM} from '../../../core/db/crm-tables';
import {MasterTableRepository, type MasterTable} from './master-table';

const tables: MasterTable[] = [
  {
    key: 'bankOrFinInstitution',
    table: CRM.masterFinancialInstitutions,
    extras: [{column: 'institution_type', field: 'institutionType', write: v => v || 'BANK'}],
  },
  {key: 'projectRole', table: CRM.masterProjectRoles},
  {key: 'applicationSource', table: CRM.masterApplicationSources},
];

/** Business & banks masters: financial institutions, project roles, application sources. */
@Injectable()
export class BusinessMastersRepository {
  static readonly groups = tables.map(t => t.key);
  constructor(private readonly masterTables: MasterTableRepository) {}

  catalog(catalog: MasterCatalog) {
    return this.masterTables.read(tables, catalog);
  }

  save(catalog: MasterCatalog, by: string | null) {
    return this.masterTables.save(tables, catalog, by);
  }
}
