import mysql from 'mysql2/promise';
import {mysqlActor} from './audit-context';

const globalForPool = globalThis as unknown as {__crmPool?: mysql.Pool};

function createPool() {
  if (!process.env.DB_NAME)
    throw new Error('DB_NAME is not configured. Copy .env.example to .env and fill in the DB_* values.');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    // A DATE has no time zone: read it as the plain 'YYYY-MM-DD' string. As a JS Date it is local midnight, and
    // turning that into a string through UTC (toISOString) moved every date one day back on each read and save.
    dateStrings: ['DATE'],
  });
  // Each checkout receives the request's actor (NULL for non-request work) for the audit triggers.
  const checkout = pool.getConnection.bind(pool);
  pool.getConnection = async () => {
    const c = await checkout();
    try {
      await c.query('SET @app_user_id=?', [mysqlActor.getStore() || null]);
      return c;
    } catch (e) {
      c.release();
      throw e;
    }
  };
  for (const method of ['query', 'execute'] as const) {
    (pool as any)[method] = async (...args: any[]) => {
      const c = await pool.getConnection();
      try {
        return await (c[method] as any)(...args);
      } finally {
        c.release();
      }
    };
  }
  return pool;
}

// The pool is created lazily so `next build` does not need a database.
let cached: mysql.Pool | undefined;
export function getPool(): mysql.Pool {
  if (!cached) cached = globalForPool.__crmPool ??= createPool();
  return cached;
}
/** Drop-in `pool` for the store modules: resolves the real pool on first use. */
export const pool: mysql.Pool = new Proxy({} as mysql.Pool, {
  get: (_t, prop) => {
    const p = getPool() as any;
    const v = p[prop];
    return typeof v === 'function' ? v.bind(p) : v;
  },
});

export async function checkMysql() {
  await pool.query('SELECT 1');
}
