import type {MasterCatalog} from '@liugong/shared';
import {readSimpleCatalog, saveSimpleCatalog, type SimpleTableSpec} from './simple-master.helper';

const SPECS: SimpleTableSpec[] = [
  {key: 'branchCode', table: 'crm_master_branches'},
  {key: 'companyType', table: 'crm_master_business_categories'},
  {key: 'industrySegment', table: 'crm_master_industry_segments'},
  {key: 'businessRole', table: 'crm_master_business_roles'},
  {key: 'position', table: 'crm_master_pic_positions'},
];

export async function initializeCustomerMasters(_seed: MasterCatalog) {
  return;
}

export async function customerMasterCatalog(_base: MasterCatalog): Promise<MasterCatalog> {
  return readSimpleCatalog(SPECS);
}

export async function saveCustomerMasters(catalog: MasterCatalog) {
  await saveSimpleCatalog(SPECS, catalog);
}
