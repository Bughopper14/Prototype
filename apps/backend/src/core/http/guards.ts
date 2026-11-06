import {type CanActivate, type ExecutionContext, Injectable} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {validateWrite} from '@liugong/shared';
import {SESSION_COOKIE, authenticate, readCookie} from '../../modules/auth/session';
import {Problem} from '../domain';
import {ready} from '../ready';
import {API_PREFIX, WRITE_METHODS, apiPath, type HttpRequest} from './api-request';
import {IS_PUBLIC} from './public.decorator';
import {SessionRequired} from './problem';

/**
 * Global guards, registered in this order in AppModule:
 *   OriginGuard → SessionGuard → WriteValidationGuard
 */

/** CSRF protection: a write sent by a browser from another origin is refused. */
@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<HttpRequest>();
    const origin = req.headers.origin;
    if (!origin || !WRITE_METHODS.has(req.method)) return true;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      return true; // not a URL (e.g. "null"): nothing to compare
    }
    if (originHost !== host) throw new Problem(403, 'Origin is not allowed');
    return true;
  }
}

/** Checks the database is ready, then requires a valid session unless the route is @Public(). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext) {
    await ready();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest<HttpRequest>();
    const check = await authenticate(readCookie(req.headers.cookie, SESSION_COOKIE));
    if (!check.ok) throw new SessionRequired(check.reason);
    req.actor = check.actor;
    return true;
  }
}

/** Shared input rules (@liugong/shared) applied to every /api/v1 write, the same rules the browser forms use. */
@Injectable()
export class WriteValidationGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<HttpRequest>();
    if (!WRITE_METHODS.has(req.method) || !req.path.startsWith(`/${API_PREFIX}/`)) return true;
    try {
      validateWrite(apiPath(req), req.method, req.body ?? {});
    } catch (e: any) {
      throw new Problem(422, e.message);
    }
    return true;
  }
}
