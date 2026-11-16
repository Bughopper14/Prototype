import {Injectable} from '@nestjs/common';
import type {MasterCatalog} from '@liugong/shared';
import {CRM} from '../../../core/db/crm-tables';
import {MasterTableRepository, type MasterTable} from './master-table';

const tables: MasterTable[] = [
  {key: 'branchCode', table: CRM.masterBranches},
  {key: 'companyType', table: CRM.masterBusinessCategories},
  {key: 'industrySegment', table: CRM.masterIndustrySegments},
  {key: 'businessRole', table: CRM.masterBusinessRoles},
  {key: 'position', table: CRM.masterPicPositions},
  {key: 'locationStatus', table: CRM.masterPremiseStatuses},
];

/** Customer & PIC masters: branch, business category, industry, business role, PIC position, premise status. */
@Injectable()
export class CustomerMastersRepository {
  static readonly groups = tables.map(t => t.key);
  constructor(private readonly masterTables: MasterTableRepository) {}

  catalog(catalog: MasterCatalog) {
    return this.masterTables.read(tables, catalog);
  }

  save(catalog: MasterCatalog, by: string | null) {
    return this.masterTables.save(tables, catalog, by);
  }
}
