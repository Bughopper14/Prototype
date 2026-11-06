import {Controller, Get, Post, Res} from '@nestjs/common';
import {z} from 'zod';
import {pool} from '../../core/db/pool';
import {ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {Public} from '../../core/http/public.decorator';
import {hashPassword, verifyPassword} from './password';
import {createSessionRecord, endSession, isAdminUser, logAudit, sessionCookie, signSession} from './session';
import {clientIp, currentActor} from './current-actor';

const attempts = new Map<string, {count: number; until: number}>();
const MAX_ATTEMPTS = 10;
const LOCK_MS = 15 * 60 * 1000;

/** Only same-site relative paths may be used as a post-login destination. */
const safeNext = (next?: string | null) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : '/gallery';

/**
 * /api/auth/*: login, logout, change-password, heartbeat. All public: each one answers signed-out users itself
 * (login works without a session; the others reply 401 or simply clear the cookie).
 */
@Public()
@Controller('api/auth')
export class AuthController {
  @Post('login')
  async login(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const isForm = (req.headers.get('content-type') || '').includes('application/x-www-form-urlencoded');
    // Browser form post fallback answers with redirects instead of JSON.
    const fail = (message: string, status: number) =>
      isForm
        ? res.redirect(303, `/login?reason=${encodeURIComponent(message)}`)
        : res.status(status).json({error: message});

    const ip = clientIp(req);
    const key = ip || 'local';
    const entry = attempts.get(key);
    if (entry && entry.count >= MAX_ATTEMPTS && entry.until > Date.now()) {
      return fail('Too many login attempts. Try again in 15 minutes.', 429);
    }

    const parsed = z
      .object({username: z.string().min(1), password: z.string().min(1), next: z.string().optional()})
      .safeParse(req.body);
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
    const sessionId = await createSessionRecord(user.id, admin, ip, req.headers.get('user-agent'));
    await logAudit(user.id, 'User Login', 'Portal Hub', ip);
    res.setHeader('Set-Cookie', sessionCookie(signSession(user.id, sessionId), req.headers));
    return isForm ? res.redirect(303, safeNext(next)) : {ok: true, redirect: safeNext(next)};
  }

  @Post('logout')
  async logout(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    await this.endCurrentSession(req, res);
    return {ok: true};
  }

  /** GET keeps plain "/api/auth/logout" links working. */
  @Get('logout')
  async logoutRedirect(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    await this.endCurrentSession(req, res);
    res.redirect(302, '/login');
  }

  @Post('change-password')
  async changePassword(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const actor = await currentActor(req);
    if (!actor)
      return res.status(401).json({success: false, error: 'Sesi tidak valid. Silakan login kembali.'});
    const {current_password = '', new_password = ''} = (req.body || {}) as {
      current_password?: string;
      new_password?: string;
    };
    if (!current_password || !new_password) return {success: false, error: 'Semua field wajib diisi.'};
    if (String(new_password).length < 6) return {success: false, error: 'Password baru minimal 6 karakter.'};

    const [rows] = await pool.query<any[]>('SELECT password_hash FROM users WHERE id = ? AND is_active = 1', [
      actor.portalUserId,
    ]);
    if (!rows[0]) return {success: false, error: 'User tidak ditemukan.'};
    if (!verifyPassword(current_password, rows[0].password_hash))
      return {success: false, error: 'Password saat ini salah.'};

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [
      hashPassword(new_password),
      actor.portalUserId,
    ]);
    await logAudit(actor.portalUserId, 'Changed Password', 'Portal Hub', clientIp(req));
    return {success: true};
  }

  @Post('heartbeat')
  async heartbeat(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    const actor = await currentActor(req);
    if (!actor) return res.status(401).json({status: 'expired', message: 'Sesi tidak ditemukan'});
    return {status: 'active', user: actor.username, isAdmin: actor.isAdmin};
  }

  private async endCurrentSession(req: ApiRequest, res: ApiResponse) {
    const actor = await currentActor(req);
    if (actor) {
      await endSession(actor.sessionId);
      await logAudit(actor.portalUserId, 'User Logout', 'Portal Hub', clientIp(req));
    }
    res.setHeader('Set-Cookie', sessionCookie(null, req.headers));
  }
}
