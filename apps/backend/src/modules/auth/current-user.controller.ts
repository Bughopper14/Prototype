import {Controller, Get, Post, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {endSession, sessionCookie} from './session';

@Controller(API_PREFIX)
export class CurrentUserController {
  @Get('auth/me')
  me(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return {...req.actor, sessionId: undefined};
  }

  @Post('auth/logout')
  async logout(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    await endSession(req.actor.sessionId);
    res.setHeader('Set-Cookie', sessionCookie(null, req.headers));
    return {ok: true};
  }
}
