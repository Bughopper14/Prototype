import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {SESSION_COOKIE, authenticate, type Actor} from './session';
import {ready} from '../ready';

/** Server-component guard: returns the signed-in actor or redirects to /login (with the reason). */
export async function requireActor(next?: string): Promise<Actor> {
  await ready();
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  const check = await authenticate(token);
  if (!check.ok) {
    const params = new URLSearchParams();
    if (token) params.set('reason', check.reason);
    if (next) params.set('next', next);
    redirect(`/login${params.size ? `?${params}` : ''}`);
  }
  return check.actor;
}

/** For API routes outside /api/v1: resolves the actor or null. */
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
