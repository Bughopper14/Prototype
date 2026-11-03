import {pool} from './pool';
import {defaultMasterCatalog,type MasterCatalog} from '@/lib/shared/master-catalog';
import {initializeUsers,initializeAudit} from '@/lib/server/db/repositories/users';
import {initializeIntake} from '@/lib/server/db/repositories/intake';
import {initializeFapArchive} from '@/lib/server/db/repositories/fap-archive';
import {initializeLegal,migrateStakeholderLocationNames} from '@/lib/server/db/repositories/legal';
import {initializeBusiness} from '@/lib/server/db/repositories/business';
import {initializeFinancialStatements} from '@/lib/server/db/repositories/financial-statements';
import {initializeLocation} from '@/lib/server/db/repositories/location';
import {initializeCustomerMasters} from '@/lib/server/db/repositories/customer-masters';
import {initializeBusinessMasters} from '@/lib/server/db/repositories/business-masters';
import {initializeLegalMasters} from '@/lib/server/db/repositories/legal-masters';
import {initializeFinanceMasters} from '@/lib/server/db/repositories/finance-masters';
import {initializeEquipmentMasters} from '@/lib/server/db/repositories/equipment-masters';
import {initializeDocumentMasters} from '@/lib/server/db/repositories/document-masters';
import {initializeApplicationDocuments,syncApplicationDocuments} from '@/lib/server/db/repositories/documents';
import {documentMasterCatalog} from '@/lib/server/db/repositories/document-masters';
import {initPreAnalysisStore} from '@/lib/server/db/repositories/pre-analysis';

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

