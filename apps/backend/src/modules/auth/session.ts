import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {pool} from '../../core/db/pool';
import {mysqlActor} from '../../core/db/audit-context';
import {getAuthoritiesForActor} from '../users/users.repository';
import {Problem} from '../../core/domain';

export const SESSION_COOKIE = 'los_session';
const INACTIVITY_MIN = Number(process.env.SESSION_INACTIVITY_MINUTES || 15);
const MAX_LIFETIME_MIN = Number(process.env.SESSION_MAX_LIFETIME_MINUTES || 120);

export type Actor = {
  id: string;
  portalUserId: number;
  sessionId: string;
  username: string;
  name: string;
  email: string;
  role: string;
  displayRole: string;
  isAdmin: boolean;
  authorities: string[];
  source: 'portal';
};

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');
  // Development fallback derived from the DB credentials, so restarts keep sessions valid without a stored secret.
  return crypto
    .createHash('sha256')
    .update(`dev:${process.env.DB_NAME || 'los'}:${process.env.DB_PASSWORD || ''}`)
    .digest('hex');
}

export const signSession = (uid: number, sid: string) =>
  jwt.sign({uid, sid}, jwtSecret(), {expiresIn: `${MAX_LIFETIME_MIN * 4}m`, audience: 'los-api'});
export const signFileToken = (fileId: string, userId: string) =>
  jwt.sign({fileId, userId}, jwtSecret(), {expiresIn: '15m', audience: 'los-file'});
export const verifyFileToken = (token: string) =>
  jwt.verify(token, jwtSecret(), {audience: 'los-file'}) as {fileId: string; userId: string};

/**
 * The Secure attribute makes browsers drop the cookie on plain-HTTP origins (for example http://192.168.x.x on the
 * office network), which looks like "login works but I am sent back to the login page". It is therefore only set when
 * the request really came over HTTPS (reverse proxy header / https origin), or when COOKIE_SECURE=true forces it.
 */
export function isHttps(headers?: Headers) {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false' || !headers) return false;
  return headers.get('x-forwarded-proto') === 'https' || (headers.get('origin') || '').startsWith('https:');
}

export function sessionCookie(token: string | null, headers?: Headers) {
  const secure = isHttps(headers) ? '; Secure' : '';
  const base = `${SESSION_COOKIE}=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax${secure}`;
  return token ? `${base}; Max-Age=${MAX_LIFETIME_MIN * 60 * 4}` : `${base}; Max-Age=0`;
}

export function readCookie(header: string | null | undefined, name: string) {
  const found = (header || '')
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith(name + '='));
  return found ? found.slice(name.length + 1) : null;
}

type CrmRole = {role: string; displayRole: string; isAdmin: boolean};

export async function isAdminUser(userId: number, username?: string) {
  const [rows] = await pool.query<any[]>(
    `SELECT u.username, r.role_name FROM users u
     LEFT JOIN user_app_roles uar ON u.id = uar.user_id
     LEFT JOIN roles r ON uar.role_id = r.id WHERE u.id = ?`,
    [userId],
  );
  const uname = String(username || rows[0]?.username || '').toLowerCase();
  if (['admin', 'axel@liugongfinance.com'].includes(uname)) return true;
  return rows.some(r => /admin|super/i.test(String(r.role_name || '')));
}

/** Maps a portal user to the CRM workflow role through `user_app_roles` for application 2 (CRM). */
export async function resolveCrmRole(userId: number, username: string): Promise<CrmRole> {
  if (await isAdminUser(userId, username))
    return {role: 'ADMIN', displayRole: 'Administrator', isAdmin: true};
  const [rows] = await pool.query<any[]>(
    `SELECT r.role_name FROM user_app_roles uar JOIN roles r ON uar.role_id = r.id
     WHERE uar.user_id = ? AND uar.app_id = 2`,
    [userId],
  );
  const name: string = rows[0]?.role_name || '';
  if (/admin|super/i.test(name)) return {role: 'ADMIN', displayRole: 'Administrator', isAdmin: true};
  if (/MKT|Marketing/i.test(name)) return {role: 'MKT', displayRole: 'Marketing', isAdmin: false};
  if (/Committee/i.test(name)) return {role: 'COMMITTEE', displayRole: 'Credit Committee', isAdmin: false};
  if (/BS|Branch Support|Business Support/.test(name))
    return {role: 'BS', displayRole: 'Business Support', isAdmin: false};
  if (/\bCA\b|Credit Analyst/i.test(name)) return {role: 'CA', displayRole: 'Credit Analyst', isAdmin: false};
  if (/LEGAL/i.test(name)) return {role: 'LEGAL', displayRole: 'Legal Officer', isAdmin: false};
  if (name) return {role: name.toUpperCase().replace(/[^A-Z0-9]+/g, '_'), displayRole: name, isAdmin: false};
  return {role: 'MKT', displayRole: 'Marketing', isAdmin: false};
}

async function userTimeoutMinutes(userId: number, admin: boolean) {
  const [rows] = await pool.query<any[]>('SELECT session_timeout_minutes FROM users WHERE id = ?', [userId]);
  const v = rows[0]?.session_timeout_minutes;
  if (admin && (v === null || v === undefined || Number(v) === 0)) return 0;
  return v === null || v === undefined ? INACTIVITY_MIN : Number(v);
}

export async function createSessionRecord(
  userId: number,
  admin: boolean,
  ip: string | null,
  userAgent: string | null,
) {
  const sid = crypto.randomBytes(16).toString('hex');
  const timeout = await userTimeoutMinutes(userId, admin);
  const lifetime = timeout === 0 ? 5256000 : Math.max(MAX_LIFETIME_MIN, timeout * 4);
  await pool.query(
    `INSERT INTO session_logs (user_id, session_id, ip_address, user_agent, app_name, login_time, last_activity, expires_at)
     VALUES (?, ?, ?, ?, 'Portal Apps', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [userId, sid, ip, userAgent, lifetime],
  );
  await pool.query('UPDATE users SET force_logout_at = NULL WHERE id = ?', [userId]);
  return sid;
}

export async function endSession(sid: string) {
  for (const [token, entry] of sessionCache) if (entry.actor.sessionId === sid) sessionCache.delete(token);
  await pool.query(
    'UPDATE session_logs SET logout_time = NOW() WHERE session_id = ? AND logout_time IS NULL',
    [sid],
  );
}

export async function logAudit(
  userId: number | null,
  action: string,
  appName = 'Portal Hub',
  ip: string | null = null,
) {
  try {
    await pool.query('INSERT INTO audit_logs (user_id, action, app_name, ip_address) VALUES (?, ?, ?, ?)', [
      userId,
      action,
      appName,
      ip,
    ]);
  } catch (e) {
    console.warn('Audit log error:', (e as Error).message);
  }
}

/** Mirrors the portal user into crm_users so the CRM audit columns (created_by/updated_by) stay valid. */
async function syncCrmUser(u: {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
}) {
  const crmId = `portal-${u.id}`;
  await pool.query(
    `INSERT INTO crm_users (user_id, username, email, password_hash, name, role, is_active, is_admin, is_placeholder)
     VALUES (?, ?, ?, '!portal', ?, ?, 1, ?, 0)
     ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), is_admin=VALUES(is_admin), is_active=1`,
    [
      crmId,
      `portal.${u.username}`.slice(0, 100),
      (u.email || `${u.username}@portal.local`).toLowerCase(),
      u.name,
      u.role,
      u.isAdmin ? 1 : 0,
    ],
  );
  return crmId;
}

export type SessionCheck = {ok: true; actor: Actor} | {ok: false; reason: string};

/**
 * Validating a session costs several queries (user, role, timeout, session log, authorities). A request burst from
 * one page would repeat them dozens of times, so a successful check is reused for a few seconds. Force-logout and
 * role changes therefore take effect within CACHE_MS.
 */
const CACHE_MS = 15_000;
const g = globalThis as unknown as {__sessionCache?: Map<string, {actor: Actor; until: number}>};
const sessionCache = (g.__sessionCache ??= new Map());

/** Validates the JWT, the DB session (force logout, lifetime, inactivity) and builds the CRM actor. */
export async function authenticate(token: string | null): Promise<SessionCheck> {
  if (!token) return {ok: false, reason: 'Please sign in'};
  const hit = sessionCache.get(token);
  if (hit && hit.until > Date.now()) return {ok: true, actor: hit.actor};
  const result = await verifySession(token);
  if (result.ok) {
    if (sessionCache.size > 500)
      for (const [key, value] of sessionCache) if (value.until < Date.now()) sessionCache.delete(key);
    sessionCache.set(token, {actor: result.actor, until: Date.now() + CACHE_MS});
  } else sessionCache.delete(token);
  return result;
}

/** Drops cached checks, e.g. right after logout. */
export const clearSessionCache = () => sessionCache.clear();

async function verifySession(token: string): Promise<SessionCheck> {
  let payload: {uid: number; sid: string};
  try {
    payload = jwt.verify(token, jwtSecret(), {audience: 'los-api'}) as any;
  } catch {
    return {ok: false, reason: 'Sesi Anda telah berakhir. Silakan login kembali.'};
  }

  const [users] = await pool.query<any[]>('SELECT * FROM users WHERE id = ? AND is_active = 1', [
    payload.uid,
  ]);
  const user = users[0];
  if (!user) return {ok: false, reason: 'Akun tidak aktif atau tidak ditemukan.'};
  if (user.force_logout_at) return {ok: false, reason: 'Sesi dihentikan oleh administrator.'};

  const crm = await resolveCrmRole(user.id, user.username);
  const timeout = await userTimeoutMinutes(user.id, crm.isAdmin);
  const unlimited = timeout === 0 || crm.isAdmin;
  const [rows] = await pool.query<any[]>(
    `SELECT is_invalidated, logout_time,
            TIMESTAMPDIFF(SECOND, last_activity, NOW()) idle,
            TIMESTAMPDIFF(SECOND, NOW(), expires_at) remaining
     FROM session_logs WHERE session_id = ? ORDER BY id DESC LIMIT 1`,
    [payload.sid],
  );
  const s = rows[0];
  // A logged-out or terminated session is dead for everyone; lifetime and idle limits do not apply to unlimited users.
  if (!s || s.is_invalidated || s.logout_time) return {ok: false, reason: 'Sesi telah diakhiri.'};
  if (!unlimited) {
    if (s.remaining !== null && Number(s.remaining) <= 0) {
      await pool.query(
        'UPDATE session_logs SET is_invalidated = 1, logout_time = NOW() WHERE session_id = ?',
        [payload.sid],
      );
      return {
        ok: false,
        reason: `Batas waktu maksimal login (${MAX_LIFETIME_MIN} menit) telah berakhir. Silakan login kembali.`,
      };
    }
    if (Number(s.idle || 0) > timeout * 60) {
      await pool.query(
        'UPDATE session_logs SET is_invalidated = 1, logout_time = NOW() WHERE session_id = ?',
        [payload.sid],
      );
      return {
        ok: false,
        reason: `Sesi telah berakhir karena tidak ada aktivitas selama ${timeout} menit. Silakan login kembali.`,
      };
    }
  }
  await pool.query('UPDATE session_logs SET last_activity = NOW() WHERE session_id = ?', [payload.sid]);

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

/** Runs `fn` with the audit actor bound so DB triggers record created_by/updated_by. */
export const withActor = <T>(actor: Actor | null, fn: () => Promise<T>) =>
  mysqlActor.run(actor?.id ?? null, fn);

export function requireRole(actor: Actor, roles: string[]) {
  if (!(actor.isAdmin || actor.role === 'ADMIN' || roles.includes(actor.role))) {
    throw new Problem(403, 'Your role cannot perform this action');
  }
}
