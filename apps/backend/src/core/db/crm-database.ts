import {Global, Injectable, Module} from '@nestjs/common';
import type {Pool, PoolConnection} from 'mysql2/promise';
import {pool} from './pool';

/** MySQL gives up one of two transactions that wait for each other (ER_LOCK_DEADLOCK); that one is run again. */
const DEADLOCK = 1213;
const ATTEMPTS = 4;

/**
 * Database access for CRM providers. CRM repositories inject this instead of importing the pool, so a test can hand
 * them a different pool. Table names come from crm-tables.ts (CRM.*). Users / auth code does not use this.
 */
@Injectable()
export class CrmDatabase {
  readonly pool: Pool = pool;

  /**
   * Runs `fn` in one transaction: commit on success, rollback on error. When MySQL picks the transaction as the victim
   * of a deadlock (two users saving at the same moment), it is rolled back and run again from the start, so `fn`
   * must only work on the database through `conn`.
   */
  async transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const conn = await this.pool.getConnection();
      try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
      } catch (e: any) {
        await conn.rollback().catch(() => undefined);
        if (e?.errno !== DEADLOCK || attempt >= ATTEMPTS) throw e;
      } finally {
        conn.release();
      }
      await new Promise(r => setTimeout(r, 20 + Math.random() * 80 * attempt));
    }
  }
}

@Global()
@Module({providers: [CrmDatabase], exports: [CrmDatabase]})
export class CrmDatabaseModule {}
