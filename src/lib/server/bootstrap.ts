import {pool} from './db/pool';

const g = globalThis as unknown as {__crmReady?: Promise<void>};

/**
 * Cheap start-up check, executed once per server process. Schema creation and seeding are NOT done here:
 * run `npm run db:setup` once per database (see scripts/db-setup.ts and db/schema.sql).
 */
export function ready(): Promise<void> {
  g.__crmReady ??= (async () => {
    try {
      await pool.query('SELECT 1 FROM application_activity LIMIT 1');
    } catch (error: any) {
      g.__crmReady = undefined;
      if (error?.code === 'ER_NO_SUCH_TABLE') {
        throw new Error('Database schema is not installed. Run "npm run db:setup" first.');
      }
      throw error;
    }
  })();
  return g.__crmReady;
}
