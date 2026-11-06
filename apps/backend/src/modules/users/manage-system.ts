import {one} from '../../core/db/query';
import {Problem} from '../../core/domain';
import {
  type CallHandler,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import {tap} from 'rxjs';
import type {HttpRequest} from '../../core/http/api-request';
import {clearSessionCache, type Actor} from '../auth/session';

/** True when the user holds the portal-wide `manage_system` authority (required for everything under /um). */
export async function canManageSystem(actor: Actor) {
  const allowed = await one(
    `SELECT 1 AS ok FROM user_app_roles uar
     JOIN role_authorities ra ON ra.role_id = uar.role_id
     JOIN authorities au ON au.id = ra.authority_id
     WHERE uar.user_id = ? AND au.authority_name = 'manage_system' LIMIT 1`,
    [actor.portalUserId],
  );
  return Boolean(allowed);
}

export async function requireManageSystem(actor: Actor) {
  if (!(await canManageSystem(actor)))
    throw new Problem(403, 'Anda tidak memiliki akses ke User Management.');
}

/** Every /um route needs the portal-wide `manage_system` authority. */
@Injectable()
export class ManageSystemGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext) {
    await requireManageSystem(ctx.switchToHttp().getRequest<HttpRequest>().actor as Actor);
    return true;
  }
}

/**
 * After any user-management change the cached session checks are dropped, so role changes, force-logouts and
 * deactivations take effect on the very next request.
 */
@Injectable()
export class ClearSessionCacheInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const method = ctx.switchToHttp().getRequest<HttpRequest>().method;
    return next.handle().pipe(tap(() => method !== 'GET' && clearSessionCache()));
  }
}
