import {SESSION_COOKIE, authenticate, type Actor} from './session';
import {ready} from '../ready';

/** For the /api/auth routes (outside /api/v1): resolves the actor or null. */
export async function currentActor(request: Request): Promise<Actor | null> {
  await ready();
  const header = request.headers.get('cookie') || '';
  const token =
    header
      .split(';')
      .map(s => s.trim())
      .find(s => s.startsWith(SESSION_COOKIE + '='))
      ?.slice(SESSION_COOKIE.length + 1) ?? null;
  const check = await authenticate(token);
  return check.ok ? check.actor : null;
}

export const clientIp = (request: Request) =>
  (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
  null;
