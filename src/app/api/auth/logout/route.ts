import {ready} from '@/lib/server/ready';
import {currentActor, clientIp} from '@/lib/server/auth/guard';
import {endSession, logAudit, sessionCookie} from '@/lib/server/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function logout(request: Request) {
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

export const POST = logout;
// GET keeps plain "/api/auth/logout" links working.
export async function GET(request: Request) {
  const res = await logout(request);
  return new Response(null, {
    status: 302,
    headers: {Location: '/login', 'Set-Cookie': res.headers.get('Set-Cookie') || ''},
  });
}
