import {CRM} from './db/crm-tables';
import {pool} from './db/pool';

const g = globalThis as unknown as {__crmReady?: Promise<void>};

/**
 * Cheap start-up check, executed once per server process. Schema creation and seeding are NOT done here:
 * apply apps/backend/db/1-schema.sql and 2-seed.sql to the database first.
 */
export function ready(): Promise<void> {
  g.__crmReady ??= (async () => {
    try {
      await pool.query(`SELECT 1 FROM ${CRM.applicationActivityLogs} LIMIT 1`);
    } catch (error: any) {
      g.__crmReady = undefined;
      if (error?.code === 'ER_NO_SUCH_TABLE') {
        throw new Error('Database schema is not installed. Apply apps/backend/db/1-schema.sql and 2-seed.sql first.');
      }
      throw error;
    }
  })();
  return g.__crmReady;
}
