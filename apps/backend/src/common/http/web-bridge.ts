import {Readable} from 'node:stream';
import type {Request as ExpressRequest, Response as ExpressResponse} from 'express';

/**
 * The API handlers are written against the standard Web Request/Response (they were Next.js route handlers).
 * These two helpers adapt Express to that interface, so the handlers stay framework-free and unchanged.
 */

export function toWebRequest(req: ExpressRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach(v => headers.append(name, v));
    else if (value !== undefined) headers.set(name, value);
  }
  const url = `${req.protocol}://${req.get('host') || 'localhost'}${req.originalUrl}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as unknown as ReadableStream) : undefined,
    duplex: 'half',
  } as RequestInit);
}

export async function sendWebResponse(res: ExpressResponse, response: Response) {
  res.status(response.status);
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie') res.setHeader(name, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
}
