import {createParamDecorator, type ExecutionContext} from '@nestjs/common';
import type {Request, Response} from 'express';
import type {Actor} from '../../modules/auth/session';

/** Prefix of the REST API used by the frontend. */
export const API_PREFIX = 'api/v1';
export const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type UploadedFile = {buffer: Buffer; mimetype: string; originalname: string; size: number};

/**
 * The request as every API handler sees it: path relative to /api/v1, string-only query, standard `Headers`, the
 * parsed body (writes only), the uploaded file of a multipart request and the signed-in actor.
 */
export type ApiRequest = {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  headers: Headers;
  file?: UploadedFile;
  actor: Actor;
};

/** Handlers set status/headers on the Express response or return a value that is sent as JSON. */
export type ApiResponse = Response;

/** Express request after the body parsers and SessionGuard ran. */
export type HttpRequest = Request & {actor?: Actor; uploadedFile?: UploadedFile; apiRequest?: ApiRequest};

export function toApiRequest(req: HttpRequest): ApiRequest {
  if (req.apiRequest) return req.apiRequest;
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach(v => headers.append(name, v));
    else if (value !== undefined) headers.set(name, value);
  }
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.query ?? {})) {
    const last = Array.isArray(value) ? value[value.length - 1] : value;
    if (last !== undefined) query[key] = String(last);
  }
  req.apiRequest = {
    method: req.method,
    path: apiPath(req),
    params: {...(req.params as Record<string, string>)},
    query,
    body: WRITE_METHODS.has(req.method) ? (req.body ?? {}) : undefined,
    headers,
    file: req.uploadedFile,
    actor: req.actor as Actor,
  };
  return req.apiRequest;
}

/** "/api/v1/applications/1" → "/applications/1"; other paths are returned unchanged. */
export function apiPath(req: Request) {
  const prefix = `/${API_PREFIX}`;
  return req.path.startsWith(prefix) ? req.path.slice(prefix.length) || '/' : req.path;
}

/** Controller parameter: `@ApiReq() req: ApiRequest`. */
export const ApiReq = createParamDecorator((_data: unknown, ctx: ExecutionContext) =>
  toApiRequest(ctx.switchToHttp().getRequest<HttpRequest>()),
);
