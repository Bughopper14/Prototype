import type {MasterCatalog} from '@liugong/shared';
import {readSimpleCatalog, saveSimpleCatalog, type SimpleTableSpec} from './simple-master.helper';

const SPECS: SimpleTableSpec[] = [
  {key: 'bankOrFinInstitution', table: 'crm_master_financial_institutions'},
  {key: 'projectRole', table: 'crm_master_project_roles'},
  {key: 'applicationSource', table: 'crm_master_application_sources'},
];

export async function initializeBusinessMasters(_seed: MasterCatalog) {
  return;
}

export async function businessMasterCatalog(_base: MasterCatalog): Promise<MasterCatalog> {
  return readSimpleCatalog(SPECS);
}

export async function saveBusinessMasters(catalog: MasterCatalog) {
  await saveSimpleCatalog(SPECS, catalog);
}
