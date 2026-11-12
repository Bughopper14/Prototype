import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {mysqlActor} from '../../core/db/audit-context';
import {pool} from '../../core/db/pool';
import {one} from '../../core/db/query';
import {Problem} from '../../core/domain';
import {findUser, getAuthoritiesForActor, syncCrmUser} from '../users/users.repository';

export const SESSION_COOKIE = 'los_session';

const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
const INACTIVITY_MINUTES = () => Number(process.env.SESSION_INACTIVITY_MINUTES || 60);
const MAX_LIFETIME_MINUTES = () => Number(process.env.SESSION_MAX_LIFETIME_MINUTES || 480);

export type Actor = {
  id: string;
  portalUserId: number;
  sessionId?: string;
  username: string;
  name: string;
  email: string;
  role: string;
  displayRole: string;
  isAdmin: boolean;
  authorities: string[];
  source: 'portal';
};

export type CrmRole = {role: string; displayRole: string; isAdmin: boolean};

const ROLE_NAME_TO_CODE: Record<string, string> = {
  'Super Admin': 'ADMIN',
  'Marketing (MKT)': 'MKT',
  'Business Support (BS)': 'BS',
  'Credit Analyst (CA)': 'CA',
  'Legal Officer (LEGAL)': 'LEGAL',
  'Credit Committee': 'COMMITTEE',
  'Quality Assurance (QA)': 'QA',
  Finance: 'FINANCE',
  'Legal Approval': 'LEGAL_APPROVAL',
};

export const signSession = (uid: number, sid: string, unlimited = false) =>
  jwt.sign(
    {uid, sid},
    JWT_SECRET(),
    unlimited ? undefined : {expiresIn: `${Math.max(MAX_LIFETIME_MINUTES(), 60)}m`},
  );

export const signFileToken = (fileId: string, userId: string) =>
  jwt.sign({fileId, userId}, JWT_SECRET(), {expiresIn: '15m'});

export const verifyFileToken = (token: string) =>
  jwt.verify(token, JWT_SECRET()) as {fileId: string; userId: string};

export function isHttps(headers?: Headers) {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return (headers?.get('x-forwarded-proto') || '').split(',')[0].trim() === 'https';
}

export function sessionCookie(token: string | null, headers?: Headers, unlimited = false) {
  const parts = [`${SESSION_COOKIE}=${token ?? ''}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (token === null) parts.push('Max-Age=0');
  else if (!unlimited) parts.push(`Max-Age=${MAX_LIFETIME_MINUTES() * 60}`);
  if (isHttps(headers)) parts.push('Secure');
  return parts.join('; ');
}

export function readCookie(header: string | null | undefined, name: string) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export async function isAdminUser(userId: number, username?: string) {
  if (username === 'admin') return true;
  const row = await one<{ok: number}>(
    `SELECT 1 AS ok
     FROM users_users u
     LEFT JOIN users_user_app_roles uar ON uar.user_id = u.id
     LEFT JOIN users_roles r ON r.id = uar.role_id
     WHERE u.id = ? AND (u.is_admin = 1 OR r.role_name = 'Super Admin')
     LIMIT 1`,
    [userId],
  );
  return Boolean(row?.ok);
}

export async function resolveCrmRole(userId: number, username: string): Promise<CrmRole> {
  if (username === 'admin') {
    return {role: 'ADMIN', displayRole: 'Super Admin', isAdmin: true};
  }
  const row = await one<{role_id: number; role_name: string}>(
    `SELECT r.id AS role_id, r.role_name
     FROM users_user_app_roles uar
     JOIN users_roles r ON r.id = uar.role_id
     WHERE uar.user_id = ? AND uar.app_id = 2
     ORDER BY r.id ASC
     LIMIT 1`,
    [userId],
  );
  if (!row) {
    const portalAdmin = await isAdminUser(userId, username);
    if (portalAdmin) return {role: 'ADMIN', displayRole: 'Super Admin', isAdmin: true};
    return {role: 'GUEST', displayRole: 'No CRM Role', isAdmin: false};
  }
  const code =
    ROLE_NAME_TO_CODE[row.role_name] ||
    row.role_name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const isAdmin = row.role_name === 'Super Admin' || row.role_id === 2;
  return {role: code, displayRole: row.role_name, isAdmin};
}

export async function userTimeoutMinutes(userId: number, admin: boolean) {
  const row = await one<{session_timeout_minutes: number | null}>(
    'SELECT session_timeout_minutes FROM users_users WHERE id = ?',
    [userId],
  );
  if (row?.session_timeout_minutes !== undefined && row?.session_timeout_minutes !== null) {
    return Number(row.session_timeout_minutes);
  }
  return admin ? 0 : INACTIVITY_MINUTES();
}

export async function createSessionRecord(
  userId: number,
  ip: string | null,
  userAgent: string | null,
  appName = 'CRM Dashboard',
) {
  const sid = crypto.randomUUID();
  const admin = await isAdminUser(userId);
  const timeout = await userTimeoutMinutes(userId, admin);
  const expiresSql = timeout > 0 ? 'DATE_ADD(NOW(), INTERVAL ? MINUTE)' : 'NULL';
  const params = timeout > 0 ? [userId, sid, ip, userAgent, appName, timeout] : [userId, sid, ip, userAgent, appName];
  await pool.execute(
    `INSERT INTO users_session_logs
      (user_id, session_id, ip_address, user_agent, app_name, login_time, last_activity, expires_at, is_invalidated)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ${expiresSql}, 0)`,
    params,
  );
  await pool.execute('UPDATE users_users SET last_login_at = NOW() WHERE id = ?', [userId]).catch(() => {});
  return {sid, unlimited: timeout === 0};
}

export async function endSession(sid: string) {
  if (!pool || !sid) return;
  await pool.execute(
    'UPDATE users_session_logs SET is_invalidated = 1, logout_time = COALESCE(logout_time, NOW()) WHERE session_id = ?',
    [sid],
  );
}

export async function logAudit(
  userId: number | null,
  action: string,
  ip: string | null = null,
  appName = 'CRM Dashboard',
) {
  if (!pool) return;
  await pool
    .execute(
      'INSERT INTO users_audit_logs (user_id, action, app_name, ip_address, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [userId, action, appName, ip],
    )
    .catch(() => {});
}

export type SessionCheck = {ok: true; actor: Actor} | {ok: false; reason: string};

const sessionCache = new Map<string, {expiresAt: number; value: SessionCheck}>();
export const clearSessionCache = () => sessionCache.clear();

export async function authenticate(token: string | null): Promise<SessionCheck> {
  if (!token) return {ok: false, reason: 'Silakan login terlebih dahulu.'};
  let payload: {uid: number; sid: string; iat?: number};
  try {
    payload = jwt.verify(token, JWT_SECRET()) as {uid: number; sid: string; iat?: number};
  } catch {
    return {ok: false, reason: 'Sesi telah berakhir. Silakan login kembali.'};
  }

  const user = await findUser(String(payload.uid), true);
  if (!user || !user.is_active) {
    return {ok: false, reason: 'Akun tidak aktif atau tidak ditemukan.'};
  }
  if (user.force_logout_at && payload.iat) {
    const forced = Math.floor(new Date(user.force_logout_at).getTime() / 1000);
    if (payload.iat <= forced) {
      return {ok: false, reason: 'Sesi Anda telah diakhiri oleh administrator.'};
    }
  }

  const crm = await resolveCrmRole(user.id, user.username);
  if (crm.role === 'GUEST') {
    return {ok: false, reason: 'Akun ini belum memiliki akses role pada CRM Dashboard.'};
  }

  const s = await one<{
    is_invalidated: number;
    logout_time: Date | null;
    idle: number;
    expired: number;
  }>(
    `SELECT is_invalidated, logout_time,
            TIMESTAMPDIFF(SECOND, COALESCE(last_activity, login_time), NOW()) AS idle,
            IF(expires_at IS NOT NULL AND expires_at < NOW(), 1, 0) AS expired
     FROM users_session_logs
     WHERE session_id = ? AND user_id = ?
     LIMIT 1`,
    [payload.sid, user.id],
  );
  if (!s || s.is_invalidated || s.logout_time) {
    return {ok: false, reason: 'Sesi tidak valid atau sudah logout.'};
  }

  const timeout = await userTimeoutMinutes(user.id, crm.isAdmin);
  if (timeout > 0) {
    if (Number(s.expired || 0) === 1 || Number(s.idle || 0) > timeout * 60) {
      await pool.query(
        'UPDATE users_session_logs SET is_invalidated = 1, logout_time = NOW() WHERE session_id = ?',
        [payload.sid],
      );
      return {
        ok: false,
        reason: `Sesi telah berakhir karena tidak ada aktivitas selama ${timeout} menit. Silakan login kembali.`,
      };
    }
  }

  const expiresUpdate = timeout > 0 ? ', expires_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)' : '';
  const updateParams = timeout > 0 ? [timeout, payload.sid] : [payload.sid];
  await pool.query(`UPDATE users_session_logs SET last_activity = NOW()${expiresUpdate} WHERE session_id = ?`, updateParams);

  const name = user.full_name || user.username;
  const id = await syncCrmUser({
    id: user.id,
    username: user.username,
    email: user.email,
    name,
    role: crm.role,
    isAdmin: crm.isAdmin,
  });
  const authorities = await getAuthoritiesForActor(crm.role, crm.isAdmin, user.id);
  return {
    ok: true,
    actor: {
      id,
      portalUserId: user.id,
      sessionId: payload.sid,
      username: user.username,
      name,
      email: user.email || `${user.username}@portal.local`,
      role: crm.role,
      displayRole: crm.displayRole,
      isAdmin: crm.isAdmin,
      authorities,
      source: 'portal',
    },
  };
}

/** Runs `fn` with the audit actor bound. */
export const withActor = <T>(actor: Actor | null, fn: () => Promise<T>) =>
  mysqlActor.run(actor?.id ?? null, fn);

/** Allows the action when the actor's DB roles grant any of the authorities (administrators always pass). */
export function requireAuthority(actor: Actor, ...authorities: string[]) {
  if (actor.isAdmin || actor.role === 'ADMIN') return;
  if (!authorities.some(a => (actor.authorities || []).includes(a)))
    throw new Problem(403, 'Your role cannot perform this action');
}
