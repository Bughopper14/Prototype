import type {MasterCatalog} from '@liugong/shared';
import {readSimpleCatalog, saveSimpleCatalog, type SimpleTableSpec} from './simple-master.helper';

const SPECS: SimpleTableSpec[] = [
  {key: 'preanInvestmentPlanOptions', table: 'crm_master_preanalysis_investment_options'},
];

export async function initializePreanalysisMasters(_seed: MasterCatalog) {
  return;
}

export async function preanalysisMasterCatalog(_base: MasterCatalog): Promise<MasterCatalog> {
  return readSimpleCatalog(SPECS);
}

export async function savePreanalysisMasters(catalog: MasterCatalog, targetGroup?: string) {
  if (targetGroup && targetGroup !== 'preanInvestmentPlanOptions') return;
  await saveSimpleCatalog(SPECS, catalog);
}
