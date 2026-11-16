import {Injectable} from '@nestjs/common';
import type {MasterCatalog} from '@liugong/shared';
import {CRM} from '../../../core/db/crm-tables';
import {MasterTableRepository, type MasterTable} from './master-table';

const tables: MasterTable[] = [{key: 'preanInvestmentPlanOptions', table: CRM.masterPreanalysisInvestmentOptions}];

/** Pre-analysis masters: the investment plan options (crm_master_preanalysis_investment_options). */
@Injectable()
export class PreanalysisMastersRepository {
  static readonly groups = tables.map(t => t.key);
  constructor(private readonly masterTables: MasterTableRepository) {}

  catalog(catalog: MasterCatalog) {
    return this.masterTables.read(tables, catalog);
  }

  save(catalog: MasterCatalog, by: string | null) {
    return this.masterTables.save(tables, catalog, by);
  }
}
