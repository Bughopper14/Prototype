import {AUTHORITY_CATALOG, DEED_APPROVE_AUTHORITY} from '@liugong/shared';
import type {PoolConnection} from 'mysql2/promise';
import {pool} from '../../core/db/pool';
import {exec, many, one} from '../../core/db/query';
import {hashPassword} from '../auth/password';

export async function ensureUsersSchemaColumns() {
  if (!pool) return;
  const cols: Array<[string, string]> = [
    ['department', 'VARCHAR(100) NULL AFTER position'],
    ['phone', 'VARCHAR(50) NULL AFTER email'],
    ['is_admin', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active'],
    ['is_placeholder', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin'],
    ['last_login_at', 'DATETIME NULL AFTER force_logout_at'],
    ['updated_at', 'TIMESTAMP(3) NULL AFTER created_at'],
    ['created_by', 'VARCHAR(150) NULL AFTER updated_at'],
    ['updated_by', 'VARCHAR(150) NULL AFTER created_by'],
  ];
  for (const [col, def] of cols) {
    const [existing] = await pool.query<any[]>(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users_users' AND column_name = ?`,
      [col],
    );
    if (!existing.length) {
      await pool.query(`ALTER TABLE users_users ADD COLUMN \`${col}\` ${def}`);
    }
  }
}

export async function initializeUsers() {
  await ensureUsersSchemaColumns();
}

export const publicUser = (u: any) => ({
  id: u.id,
  username: u.username,
  full_name: u.full_name,
  position: u.position,
  department: u.department ?? null,
  email: u.email,
  phone: u.phone ?? null,
  is_active: Boolean(u.is_active),
  is_admin: Boolean(u.is_admin),
  is_placeholder: Boolean(u.is_placeholder),
  session_timeout_minutes: u.session_timeout_minutes ?? 15,
  force_logout_at: u.force_logout_at ?? null,
  last_login_at: u.last_login_at ?? null,
  created_at: u.created_at,
  updated_at: u.updated_at ?? null,
});

export async function getAuthoritiesForActor(
  _role: string,
  isAdmin: boolean,
  portalUserId?: number,
): Promise<string[]> {
  if (!pool) return [];
  if (isAdmin) return AUTHORITY_CATALOG.map(a => a.name);
  if (!portalUserId) return [];
  const rows = await many<{authority_name: string}>(
    `SELECT DISTINCT a.authority_name
     FROM users_user_app_roles uar
     JOIN users_role_authorities ra ON ra.role_id = uar.role_id
     JOIN users_authorities a ON a.id = ra.authority_id
     WHERE uar.user_id = ? AND uar.app_id = 2`,
    [portalUserId],
  );
  return rows.map(r => r.authority_name);
}

export async function userCount() {
  const row = await one<{n: number}>('SELECT COUNT(*) AS n FROM users_users');
  return Number(row?.n ?? 0);
}

export async function findUser(login: string, byId = false) {
  return one(
    `SELECT * FROM users_users WHERE ${byId ? 'id = ?' : 'username = ? OR email = ?'} LIMIT 1`,
    byId ? [login] : [login, login],
  );
}

export async function createUser(body: any, bootstrap = false) {
  const result = await exec(
    `INSERT INTO users_users
      (username, password_hash, full_name, position, department, email, phone, is_active, is_admin, session_timeout_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.username,
      hashPassword(body.password),
      body.full_name || body.username,
      body.position || null,
      body.department || null,
      body.email || null,
      body.phone || null,
      body.is_active === undefined ? 1 : body.is_active ? 1 : 0,
      bootstrap || body.is_admin ? 1 : 0,
      body.session_timeout_minutes ?? 60,
    ],
  );
  if (bootstrap) {
    await exec(
      `INSERT IGNORE INTO users_user_app_roles (user_id, app_id, role_id)
       SELECT ?, r.app_id, r.id FROM users_roles r WHERE r.role_name = 'Super Admin'`,
      [result.insertId],
    );
  }
  return result.insertId;
}

export async function syncCrmUser(input: {
  id: number;
  username: string;
  email?: string | null;
  name: string;
  role: string;
  isAdmin: boolean;
}) {
  if (pool && input.id) {
    await pool
      .execute(
        `UPDATE users_users
         SET last_login_at = COALESCE(last_login_at, NOW()),
             is_admin = GREATEST(is_admin, ?),
             updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [input.isAdmin ? 1 : 0, input.id],
      )
      .catch(() => {});
  }
  return `portal-${input.id}`;
}

export async function canUserApproveDeed(portalUserId: number): Promise<boolean> {
  const row = await one(
    `SELECT 1 AS ok
     FROM users_user_app_roles uar
     JOIN users_role_authorities ra ON ra.role_id = uar.role_id
     JOIN users_authorities au ON au.id = ra.authority_id
     WHERE uar.user_id = ? AND uar.app_id = 2 AND au.authority_name = ? LIMIT 1`,
    [portalUserId, DEED_APPROVE_AUTHORITY],
  );
  return Boolean(row);
}

/** Normalized schema manages `created_by` / `updated_by` explicitly in repository queries. */
export async function auditTable(_table: string, _conn?: PoolConnection) {
  return;
}

export async function initializeAudit() {
  return;
}
