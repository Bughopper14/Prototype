import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import {mysqlActor} from './audit-context';
import {auditTable} from '../../modules/users/users.repository';

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

const menus = new Set([
  'overview',
  'applications',
  'customers',
  'document-desk',
  'master-data',
  'notifications',
  'activity',
]);
function tableFor(menu: string) {
  if (!menus.has(menu)) throw new Error('Unknown workspace menu');
  return `ui_${menu.replaceAll('-', '_')}`;
}

export async function checkMysql() {
  await pool.query('SELECT 1');
}

export async function readMenu(menu: string) {
  const table = tableFor(menu);
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT id, payload, created_at FROM \`${table}\` ORDER BY created_at DESC`,
    );
    return rows.map(row => ({
      id: row.id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      createdAt: row.created_at,
    }));
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return [];
    throw err;
  }
}

export async function writeMenu(menu: string, payload: unknown) {
  const table = tableFor(menu);
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${table}\` (id CHAR(36) NOT NULL PRIMARY KEY, payload JSON NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX created_at_idx (created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  await auditTable(table);
  const id = crypto.randomUUID();
  await pool.query(`INSERT INTO \`${table}\` (id,payload) VALUES (?,?)`, [
    id,
    JSON.stringify(payload ?? null),
  ]);
  return {id};
}
