import {type CallHandler, type ExecutionContext, Injectable, type NestInterceptor} from '@nestjs/common';
import type {Response} from 'express';
import {from, lastValueFrom, map} from 'rxjs';
import {withActor} from '../../modules/auth/session';
import type {HttpRequest} from './api-request';

/**
 * Runs every handler with the audit actor bound to the MySQL connection (DB triggers fill created_by/updated_by), and
 * sends its return value as JSON unless the handler already answered.
 *
 * Handlers take `@Res()`, so Nest never writes the response itself: a status a handler set (201, 304, 400 …) is kept,
 * and API responses default to `Cache-Control: no-store` unless the handler chose another policy.
 */
@Injectable()
export class ApiResultInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<HttpRequest>();
    const res = ctx.switchToHttp().getResponse<Response>();
    // Nest pre-sets 201 for POST; the API answers 200 unless the handler chooses another status (e.g. 201 on create).
    res.status(200).setHeader('Cache-Control', 'no-store');

    return from(
      withActor(req.actor ?? null, () => lastValueFrom(next.handle(), {defaultValue: undefined})),
    ).pipe(
      map(result => {
        if (res.headersSent || res.writableEnded) return;
        if (result === undefined) res.end();
        else res.json(result);
      }),
    );
  }
}
