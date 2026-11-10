import {SESSION_COOKIE, authenticate, readCookie, type Actor} from './session';
import {ready} from '../../core/ready';

type WithHeaders = {headers: Headers};

/** For the public /api/auth routes, which answer signed-out users themselves: the actor or null. */
export async function currentActor(request: WithHeaders): Promise<Actor | null> {
  await ready();
  const check = await authenticate(readCookie(request.headers.get('cookie'), SESSION_COOKIE));
  return check.ok ? check.actor : null;
}

export const clientIp = (request: WithHeaders) =>
  (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
  null;
