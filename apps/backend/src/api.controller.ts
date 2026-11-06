import {All, Controller, Get, Post, Req, Res} from '@nestjs/common';
import type {Request as ExpressRequest, Response as ExpressResponse} from 'express';
import {dispatch} from './api/dispatch';
import {changePassword, heartbeat, login, logout, logoutRedirect} from './auth/routes';
import {serveDocument} from './documents-file';
import {sendWebResponse, toWebRequest} from './common/http/web-bridge';

type WebHandler = (request: Request) => Promise<Response>;

const run = async (req: ExpressRequest, res: ExpressResponse, handler: WebHandler) =>
  sendWebResponse(res, await handler(toWebRequest(req)));

/** Path after a fixed prefix, e.g. "/api/v1/applications/1?x=y" → ["applications", "1"]. */
const segmentsAfter = (req: ExpressRequest, prefix: string) =>
  req.path
    .slice(prefix.length)
    .split('/')
    .filter(Boolean)
    .map(segment => decodeURIComponent(segment));

@Controller()
export class ApiController {
  @All('api/v1/*path')
  v1(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return run(req, res, request => dispatch(request, segmentsAfter(req, '/api/v1')));
  }

  @Post('api/auth/login')
  login(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return run(req, res, login);
  }

  @Post('api/auth/logout')
  logout(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return run(req, res, logout);
  }

  @Get('api/auth/logout')
  logoutRedirect(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return run(req, res, logoutRedirect);
  }

  @Post('api/auth/change-password')
  changePassword(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return run(req, res, changePassword);
  }

  @Post('api/auth/heartbeat')
  heartbeat(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return run(req, res, heartbeat);
  }

  @Get('documents/*path')
  document(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
    return run(req, res, request => serveDocument(request, segmentsAfter(req, '/documents').join('/')));
  }
}
