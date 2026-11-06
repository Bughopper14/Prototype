import type {PoolConnection} from 'mysql2/promise';
import {pool} from './pool';

/**
 * Reusable data-access helpers. Routes and stores use these instead of repeating
 * destructuring of mysql2 results, so every query shares the same error and audit behaviour.
 */
type Params = any[];
type Db = Pick<PoolConnection, 'query'>;

export async function many<T = any>(sql: string, params: Params = [], db: Db = pool): Promise<T[]> {
  const [rows] = await db.query<any[]>(sql, params);
  return rows as T[];
}

export async function one<T = any>(sql: string, params: Params = [], db: Db = pool): Promise<T | null> {
  return (await many<T>(sql, params, db))[0] ?? null;
}

export async function exec(sql: string, params: Params = [], db: Db = pool) {
  const [result] = await db.query<any>(sql, params);
  return result as {affectedRows: number; insertId: number};
}

/** Runs `fn` in a transaction; commits on success and rolls back on any error. */
export async function tx<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
