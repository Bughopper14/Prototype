import {type ArgumentsHost, Catch, type ExceptionFilter, NotFoundException} from '@nestjs/common';
import type {Response} from 'express';
import {sessionCookie} from '../../modules/auth/session';
import {Problem} from '../domain';
import {toApiRequest, type HttpRequest} from './api-request';
import {SessionRequired, toProblem} from './problem';

/** Every error becomes an `application/problem+json` response (or the session-expired answer). */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<HttpRequest>();
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) {
      console.error('Error after the response was sent:', error);
      if (!res.writableEnded) res.end();
      return;
    }

    if (error instanceof SessionRequired) {
      res
        .status(401)
        .setHeader('Set-Cookie', sessionCookie(null, toApiRequest(req).headers))
        .setHeader('Cache-Control', 'no-store')
        .json({error: error.reason, code: 'SESSION_TIMEOUT'});
      return;
    }

    const cause = error instanceof NotFoundException ? new Problem(404, 'Endpoint not found') : error;
    const {status, body} = toProblem(cause);
    res.status(status).type('application/problem+json').send(JSON.stringify(body));
  }
}
