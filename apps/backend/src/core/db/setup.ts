import {pool} from './pool';
import {defaultMasterCatalog, type MasterCatalog} from '@liugong/shared';
import {initializeUsers, initializeAudit} from '../../modules/users/users.repository';
import {initializeIntake} from '../../modules/applications/intake.repository';
import {initializeFapArchive} from '../../modules/fap/fap-archive.repository';
import {initializeLegal, migrateStakeholderLocationNames} from '../../modules/legal/legal.repository';
import {initializeBusiness} from '../../modules/applications/business.repository';
import {initializeFinancialStatements} from '../../modules/applications/financial-statements.repository';
import {initializeLocation} from '../../modules/master-data/repositories/location.repository';
import {initializeCustomerMasters} from '../../modules/master-data/repositories/customer-masters.repository';
import {initializeBusinessMasters} from '../../modules/master-data/repositories/business-masters.repository';
import {initializeLegalMasters} from '../../modules/master-data/repositories/legal-masters.repository';
import {initializeFinanceMasters} from '../../modules/master-data/repositories/finance-masters.repository';
import {initializeEquipmentMasters} from '../../modules/master-data/repositories/equipment-masters.repository';
import {initializeDocumentMasters} from '../../modules/master-data/repositories/document-masters.repository';
import {initializePreanalysisMasters} from '../../modules/master-data/repositories/preanalysis-masters.repository';
import {
  initializeApplicationDocuments,
  syncApplicationDocuments,
} from '../../modules/documents/documents.repository';
import {documentMasterCatalog} from '../../modules/master-data/repositories/document-masters.repository';
import {initPreAnalysisStore} from '../../modules/pre-analysis/pre-analysis.repository';

async function seedDefaultCatalog() {
  await pool.query('INSERT IGNORE INTO master_data (id,catalog) VALUES (1,?)', [
    JSON.stringify(defaultMasterCatalog()),
  ]);
}

/** Idempotent migrations + reference-data seeding. Invoked by scripts/db-setup.ts only, never at request time. */
export async function runSetup() {
  await initializeUsers();
  await initializeIntake();
  await initializeFapArchive();
  await initializeLegal();
  await initializeBusiness();
  await initializeFinancialStatements();
  await initializeLocation();
  await migrateStakeholderLocationNames();
  await seedDefaultCatalog();
  const [rows] = await pool.query<any[]>('SELECT catalog FROM master_data WHERE id=1');
  const stored = typeof rows[0]?.catalog === 'string' ? JSON.parse(rows[0].catalog) : rows[0]?.catalog;
  const seed = {...defaultMasterCatalog(), ...(stored || {})} as MasterCatalog;
  await initializeCustomerMasters(seed);
  await initializeBusinessMasters(seed);
  await initializeLegalMasters(seed);
  await initializeFinanceMasters(seed);
  await initializeEquipmentMasters(seed);
  await initializeDocumentMasters(seed);
  await initializePreanalysisMasters(seed);
  await initializeApplicationDocuments();
  await initializeAudit();
  await initPreAnalysisStore();
  await syncApplicationDocuments();
}
