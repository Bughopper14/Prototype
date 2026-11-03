import {dispatch} from '@/lib/server/api/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = {params: Promise<{path: string[]}>};
const handle = async (request: Request, ctx: Ctx) => dispatch(request, (await ctx.params).path);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
