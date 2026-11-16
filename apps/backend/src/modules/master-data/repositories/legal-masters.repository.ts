import {Injectable} from '@nestjs/common';
import type {MasterCatalog} from '@liugong/shared';
import {CRM} from '../../../core/db/crm-tables';
import {MasterTableRepository, type MasterTable} from './master-table';

const tables: MasterTable[] = [
  {
    key: 'remarkCategoryId',
    table: CRM.masterLegalRemarkCategories,
    extras: [{column: 'deed_scope', field: 'deedScope', write: v => v || 'ALL'}],
  },
  {key: 'representativeType', table: CRM.masterLegalRepresentativeTypes},
  {key: 'designation', table: CRM.masterLegalDesignations},
  {key: 'positions', table: CRM.masterStakeholderPositions},
];

/** Legal masters: remark categories, representative types, designations, stakeholder positions. */
@Injectable()
export class LegalMastersRepository {
  static readonly groups = tables.map(t => t.key);
  constructor(private readonly masterTables: MasterTableRepository) {}

  catalog(catalog: MasterCatalog) {
    return this.masterTables.read(tables, catalog);
  }

  save(catalog: MasterCatalog, by: string | null) {
    return this.masterTables.save(tables, catalog, by);
  }
}
