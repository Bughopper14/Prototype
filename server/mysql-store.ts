import {mysqlActor} from './mysql-audit-context';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import crypto from 'node:crypto';

const enabled = !!process.env.MYSQL_DATABASE;
export const pool = enabled ? mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
}) : null;

// Each checkout receives the request's actor, including NULL for non-request work.
if(pool){
 const checkout=pool.getConnection.bind(pool);
 pool.getConnection=async()=>{const c=await checkout();try{await c.query('SET @app_username=?',[mysqlActor.getStore()||null]);return c;}catch(e){c.release();throw e;}};
 for(const method of ['query','execute'] as const){(pool as any)[method]=async(...args:any[])=>{const c=await pool.getConnection();try{return await (c[method] as any)(...args);}finally{c.release();}};}
}

const menus = new Set(['overview','applications','customers','document-desk','master-data','notifications','activity']);
function tableFor(menu: string) {
  if (!menus.has(menu)) throw new Error('Unknown workspace menu');
  return `ui_${menu.replaceAll('-', '_')}`;
}

export async function checkMysql() {
  if (!pool) throw new Error('MYSQL_DATABASE is not configured');
  await pool.query('SELECT 1');
}

export async function readMenu(menu: string) {
  if (!pool) return [];
  const table = tableFor(menu);
  const [tables] = await pool.query<any[]>('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?', [table]);
  if (!tables[0].n) return [];
  const [rows] = await pool.query<any[]>(`SELECT id, payload, created_at FROM \`${table}\` ORDER BY created_at DESC`);
  return rows.map(row => ({id: row.id, payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload, createdAt: row.created_at}));
}

export async function writeMenu(menu: string, payload: unknown) {
  if (!pool) throw new Error('MYSQL_DATABASE is not configured');
  const table = tableFor(menu);
  await pool.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (id CHAR(36) NOT NULL PRIMARY KEY, payload JSON NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX created_at_idx (created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const {auditTable}=await import('./mysql-users');await auditTable(table);
  const id = crypto.randomUUID();
  await pool.query(`INSERT INTO \`${table}\` (id,payload) VALUES (?,?)`, [id, JSON.stringify(payload ?? null)]);
  return {id};
}

export async function closeMysql() { await pool?.end(); }
