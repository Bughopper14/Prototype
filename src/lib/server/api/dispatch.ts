import {validateWrite} from '@/lib/shared/input-validation';
import {Problem} from '../domain';
import {ready} from '../ready';
import {
  SESSION_COOKIE,
  authenticate,
  readCookie,
  sessionCookie,
  withActor,
  type Actor,
} from '../auth/session';
import {ApiResponse, match, notFound, problemResponse, type ApiRequest, type UploadedFile} from './router';
import './routes';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || !WRITE_METHODS.has(request.method)) return;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try {
    if (new URL(origin).host !== host) throw new Problem(403, 'Origin is not allowed');
  } catch (e) {
    if (e instanceof Problem) throw e;
  }
}

async function parseBody(request: Request): Promise<{body: any; file?: UploadedFile}> {
  if (!WRITE_METHODS.has(request.method)) return {body: undefined};
  const type = request.headers.get('content-type') || '';
  if (type.includes('multipart/form-data')) {
    const form = await request.formData();
    const body: Record<string, any> = {};
    let file: UploadedFile | undefined;
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') {
        body[key] = value;
        continue;
      }
      if (value.size > 20 * 1024 * 1024) throw new Problem(422, 'File exceeds the 20 MB limit');
      file = {
        buffer: Buffer.from(await value.arrayBuffer()),
        mimetype: value.type,
        originalname: value.name,
        size: value.size,
      };
    }
    return {body, file};
  }
  if (type.includes('application/json')) {
    const text = await request.text();
    return {body: text ? JSON.parse(text) : {}};
  }
  return {body: {}};
}

export async function dispatch(request: Request, segments: string[]): Promise<Response> {
  try {
    await ready();
    assertSameOrigin(request);
    const url = new URL(request.url);
    const path = '/' + segments.join('/');
    const found = match(request.method, path);
    if (!found) throw notFound();

    const {body, file} = await parseBody(request);
    if (WRITE_METHODS.has(request.method)) {
      try {
        validateWrite(path, request.method, body);
      } catch (e: any) {
        throw new Problem(422, e.message);
      }
    }

    let actor: Actor | null = null;
    if (!found.route.isPublic) {
      const check = await authenticate(readCookie(request.headers.get('cookie'), SESSION_COOKIE));
      if (!check.ok) {
        const res = new Response(JSON.stringify({error: check.reason, code: 'SESSION_TIMEOUT'}), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': sessionCookie(null, request.headers),
            'Cache-Control': 'no-store',
          },
        });
        return res;
      }
      actor = check.actor;
    }

    const req: ApiRequest = {
      method: request.method,
      path,
      params: found.params,
      query: Object.fromEntries(url.searchParams),
      body,
      headers: request.headers,
      file,
      actor: actor as Actor,
    };
    const res = new ApiResponse();
    const out = await withActor(actor, async () => found.route.handler(req, res));
    if (!res.isSent && out !== undefined) res.json(out);
    if (!res.hasHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.toResponse();
  } catch (error) {
    return problemResponse(error);
  }
}
