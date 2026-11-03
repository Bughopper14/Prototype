import {currentActor} from '@/lib/server/auth/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const actor = await currentActor(request);
  if (!actor) return Response.json({status: 'expired', message: 'Sesi tidak ditemukan'}, {status: 401});
  return Response.json({status: 'active', user: actor.username, isAdmin: actor.isAdmin});
}
