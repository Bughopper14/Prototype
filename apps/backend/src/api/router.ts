import {z} from 'zod';
import {Problem} from '../domain';
import type {Actor} from '../auth/session';

export type UploadedFile = {buffer: Buffer; mimetype: string; originalname: string; size: number};

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

/** Minimal response builder; handlers either call `res.*` or simply return a value to be sent as JSON. */
export class ApiResponse {
  statusCode = 200;
  private readonly headers = new Headers();
  private payload: string | Uint8Array | null = null;
  private sent = false;

  status(code: number) {
    this.statusCode = code;
    return this;
  }
  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }
  json(data: unknown) {
    this.headers.set('Content-Type', 'application/json; charset=utf-8');
    this.payload = JSON.stringify(data);
    this.sent = true;
    return this;
  }
  send(data: Buffer | string) {
    this.payload = typeof data === 'string' ? data : new Uint8Array(data);
    this.sent = true;
    return this;
  }
  hasHeader(name: string) {
    return this.headers.has(name);
  }
  /** Finishes the response without a body (e.g. 304). */
  end() {
    this.sent = true;
    return this;
  }
  get isSent() {
    return this.sent;
  }
  toResponse() {
    return new Response(this.payload, {status: this.statusCode, headers: this.headers});
  }
}

export type Handler = (req: ApiRequest, res: ApiResponse) => Promise<unknown> | unknown;
type Route = {method: string; regex: RegExp; keys: string[]; handler: Handler; isPublic: boolean};

const routes: Route[] = [];

function compile(pattern: string) {
  const keys: string[] = [];
  const source = pattern.replace(/\/:([A-Za-z]+)/g, (_m, key) => {
    keys.push(key);
    return '/([^/]+)';
  });
  return {regex: new RegExp(`^${source}/?$`), keys};
}

export type RouteOptions = {public?: boolean};

function add(method: string, patterns: string | string[], handler: Handler, options: RouteOptions = {}) {
  for (const pattern of Array.isArray(patterns) ? patterns : [patterns]) {
    const {regex, keys} = compile(pattern);
    routes.push({method, regex, keys, handler, isPublic: Boolean(options.public)});
  }
}

export const get = (p: string | string[], h: Handler, o?: RouteOptions) => add('GET', p, h, o);
export const post = (p: string | string[], h: Handler, o?: RouteOptions) => add('POST', p, h, o);
export const put = (p: string | string[], h: Handler, o?: RouteOptions) => add('PUT', p, h, o);
export const patch = (p: string | string[], h: Handler, o?: RouteOptions) => add('PATCH', p, h, o);
export const del = (p: string | string[], h: Handler, o?: RouteOptions) => add('DELETE', p, h, o);

export function match(method: string, path: string) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const m = route.regex.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    route.keys.forEach((key, i) => {
      params[key] = decodeURIComponent(m[i + 1]);
    });
    return {route, params};
  }
  return null;
}

/** Converts any thrown error into the RFC 7807 problem payload used by the front end. */
export function problemResponse(error: any) {
  let status = error?.status || 500;
  let message = error?.message || 'Request failed';
  let errors = error?.errors || [];
  if (error instanceof z.ZodError) {
    status = 422;
    message = 'Validation failed';
    errors = error.issues.map(x => ({field: x.path.join('.'), detail: x.message}));
  } else if (error?.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Username/email atau data unik sudah digunakan';
  } else if (
    [
      'ER_BAD_NULL_ERROR',
      'ER_DATA_TOO_LONG',
      'ER_TRUNCATED_WRONG_VALUE',
      'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
      'ER_WARN_DATA_OUT_OF_RANGE',
      'ER_DATA_OUT_OF_RANGE',
    ].includes(error?.code)
  ) {
    status = 422;
    message = 'One or more fields contain an invalid value';
  } else if (['ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2'].includes(error?.code)) {
    status = 422;
    message = 'Referenced record was not found';
  }
  if (status >= 500) {
    console.error('API error:', error);
    message = 'An unexpected server error occurred';
  }
  return new Response(
    JSON.stringify({
      type: 'about:blank',
      title: message,
      status,
      statusCode: status,
      error: status === 422 ? 'Unprocessable Entity' : message,
      message,
      errors,
      timestamp: new Date().toISOString(),
    }),
    {status, headers: {'Content-Type': 'application/problem+json'}},
  );
}

export const notFound = () => new Problem(404, 'Endpoint not found');
