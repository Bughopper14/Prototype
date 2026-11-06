import {pool} from './pool';
import {defaultMasterCatalog,type MasterCatalog} from '@liugong/shared';
import {initializeUsers,initializeAudit} from './repositories/users';
import {initializeIntake} from './repositories/intake';
import {initializeFapArchive} from './repositories/fap-archive';
import {initializeLegal,migrateStakeholderLocationNames} from './repositories/legal';
import {initializeBusiness} from './repositories/business';
import {initializeFinancialStatements} from './repositories/financial-statements';
import {initializeLocation} from './repositories/location';
import {initializeCustomerMasters} from './repositories/customer-masters';
import {initializeBusinessMasters} from './repositories/business-masters';
import {initializeLegalMasters} from './repositories/legal-masters';
import {initializeFinanceMasters} from './repositories/finance-masters';
import {initializeEquipmentMasters} from './repositories/equipment-masters';
import {initializeDocumentMasters} from './repositories/document-masters';
import {initializeApplicationDocuments,syncApplicationDocuments} from './repositories/documents';
import {documentMasterCatalog} from './repositories/document-masters';
import {initPreAnalysisStore} from './repositories/pre-analysis';

async function seedDefaultCatalog() {
  await pool.query('INSERT IGNORE INTO master_data (id,catalog) VALUES (1,?)', [JSON.stringify(defaultMasterCatalog())]);
}

/** Idempotent migrations + reference-data seeding. Invoked by scripts/db-setup.ts only, never at request time. */
export async function runSetup(){
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
  await initializeApplicationDocuments();
  await initializeAudit();
  await initPreAnalysisStore();
  await syncApplicationDocuments();
}

