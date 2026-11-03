import {z} from 'zod';
import {pool} from '@/lib/server/db/pool';
import {ready} from '@/lib/server/bootstrap';
import {verifyPassword} from '@/lib/server/auth/password';
import {createSessionRecord, isAdminUser, logAudit, sessionCookie, signSession} from '@/lib/server/auth/session';
import {clientIp} from '@/lib/server/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const attempts = new Map<string, {count: number; until: number}>();
const MAX_ATTEMPTS = 10;
const LOCK_MS = 15 * 60 * 1000;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers}});

/** Only same-site relative paths may be used as a post-login destination. */
const safeNext = (next?: string | null) => (next && next.startsWith('/') && !next.startsWith('//') ? next : '/gallery');

/** Browser form post fallback: answer with redirects instead of JSON. */
const redirectTo = (location: string, headers: Record<string, string> = {}) =>
  new Response(null, {status: 303, headers: {Location: location, 'Cache-Control': 'no-store', ...headers}});

export async function POST(request: Request) {
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

  const parsed = z.object({username: z.string().min(1), password: z.string().min(1), next: z.string().optional()}).safeParse(form ? Object.fromEntries(form) : await request.json().catch(() => ({})));
  if (!parsed.success) return fail('Enter username and password', 422);
  const {username, password, next} = parsed.data;

  const [rows] = await pool.query<any[]>('SELECT * FROM users WHERE username = ? AND is_active = 1', [username.trim()]);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    attempts.set(key, {count: (entry && entry.until > Date.now() ? entry.count : 0) + 1, until: Date.now() + LOCK_MS});
    return fail('Invalid username or password', 401);
  }
  attempts.delete(key);

  const admin = await isAdminUser(user.id, user.username);
  const sessionId = await createSessionRecord(user.id, admin, ip, request.headers.get('user-agent'));
  await logAudit(user.id, 'User Login', 'Portal Hub', ip);
  const cookie = {'Set-Cookie': sessionCookie(signSession(user.id, sessionId), request.headers)};
  return isForm ? redirectTo(safeNext(next), cookie) : json({ok: true, redirect: safeNext(next)}, 200, cookie);
}
