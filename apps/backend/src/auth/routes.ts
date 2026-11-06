import {z} from 'zod';
import {pool} from '../db/pool';
import {ready} from '../ready';
import {hashPassword, verifyPassword} from './password';
import {
  createSessionRecord,
  endSession,
  isAdminUser,
  logAudit,
  sessionCookie,
  signSession,
} from './session';
import {clientIp, currentActor} from './guard';

/**
 * Handlers for /api/auth/* (login, logout, change-password, heartbeat). They take and return Web Request/Response
 * objects; AuthController in main.ts adapts them to Express.
 */

const attempts = new Map<string, {count: number; until: number}>();
const MAX_ATTEMPTS = 10;
const LOCK_MS = 15 * 60 * 1000;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers},
  });

/** Only same-site relative paths may be used as a post-login destination. */
const safeNext = (next?: string | null) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : '/gallery';

/** Browser form post fallback: answer with redirects instead of JSON. */
const redirectTo = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, {status: 303, headers: {Location: location, 'Cache-Control': 'no-store', ...headers}});

export async function login(request: Request) {
  const isForm = (request.headers.get('content-type') || '').includes('application/x-www-form-urlencoded');
  const form = isForm ? await request.formData() : null;
  const fail = (message: string, status: number) =>
    isForm ? redirectTo(`/login?reason=${encodeURIComponent(message)}`) : json({error: message}, status);

  await ready();
  const ip = clientIp(request);
  const key = ip || 'local';
  const entry = attempts.get(key);
  if (entry && entry.count >= MAX_ATTEMPTS && entry.until > Date.now()) {
    return fail('Too many login attempts. Try again in 15 minutes.', 429);
  }

  const parsed = z
    .object({username: z.string().min(1), password: z.string().min(1), next: z.string().optional()})
    .safeParse(form ? Object.fromEntries(form) : await request.json().catch(() => ({})));
  if (!parsed.success) return fail('Enter username and password', 422);
  const {username, password, next} = parsed.data;

  const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE username = ? AND is_active = 1', [
    username.trim(),
  ]);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    attempts.set(key, {
      count: (entry && entry.until > Date.now() ? entry.count : 0) + 1,
      until: Date.now() + LOCK_MS,
    });
    return fail('Invalid username or password', 401);
  }
  attempts.delete(key);

  const admin = await isAdminUser(user.id, user.username);
  const sessionId = await createSessionRecord(user.id, admin, ip, request.headers.get('user-agent'));
  await logAudit(user.id, 'User Login', 'Portal Hub', ip);
  const cookie = {'Set-Cookie': sessionCookie(signSession(user.id, sessionId), request.headers)};
  return isForm
    ? redirectTo(safeNext(next), cookie)
    : json({ok: true, redirect: safeNext(next)}, 200, cookie);
}

export async function logout(request: Request) {
  await ready();
  const actor = await currentActor(request);
  if (actor) {
    await endSession(actor.sessionId);
    await logAudit(actor.portalUserId, 'User Logout', 'Portal Hub', clientIp(request));
  }
  return new Response(JSON.stringify({ok: true}), {
    headers: {'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(null, request.headers)},
  });
}

/** GET keeps plain "/api/auth/logout" links working. */
export async function logoutRedirect(request: Request) {
  const res = await logout(request);
  return new Response(null, {
    status: 302,
    headers: {Location: '/login', 'Set-Cookie': res.headers.get('Set-Cookie') || ''},
  });
}

export async function changePassword(request: Request) {
  const actor = await currentActor(request);
  if (!actor) return json({success: false, error: 'Sesi tidak valid. Silakan login kembali.'}, 401);
  const body = (await request.json().catch(() => ({}))) as {current_password?: string; new_password?: string};
  const {current_password = '', new_password = ''} = body;
  if (!current_password || !new_password) return json({success: false, error: 'Semua field wajib diisi.'});
  if (String(new_password).length < 6)
    return json({success: false, error: 'Password baru minimal 6 karakter.'});

  const [rows] = await pool.query<any[]>('SELECT password_hash FROM users WHERE id = ? AND is_active = 1', [
    actor.portalUserId,
  ]);
  if (!rows[0]) return json({success: false, error: 'User tidak ditemukan.'});
  if (!verifyPassword(current_password, rows[0].password_hash))
    return json({success: false, error: 'Password saat ini salah.'});

  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [
    hashPassword(new_password),
    actor.portalUserId,
  ]);
  await logAudit(actor.portalUserId, 'Changed Password', 'Portal Hub', clientIp(request));
  return json({success: true});
}

export async function heartbeat(request: Request) {
  const actor = await currentActor(request);
  if (!actor) return Response.json({status: 'expired', message: 'Sesi tidak ditemukan'}, {status: 401});
  return Response.json({status: 'active', user: actor.username, isAdmin: actor.isAdmin});
}
