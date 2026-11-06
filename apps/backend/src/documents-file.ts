import fs from 'node:fs/promises';
import path from 'node:path';
import {currentActor} from './auth/guard';
import {documentsDir} from './storage';

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** GET /documents/<type>/<file>: identity documents stored on disk, for signed-in users only. */
export async function serveDocument(request: Request, relativePath: string): Promise<Response> {
  if (!(await currentActor(request))) return new Response('Unauthorized', {status: 401});

  const file = path.resolve(documentsDir, relativePath);
  if (!file.startsWith(documentsDir + path.sep)) return new Response('Not found', {status: 404});
  try {
    const body = await fs.readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', {status: 404});
  }
}
