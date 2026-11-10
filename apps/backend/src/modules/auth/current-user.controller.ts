import {Controller, Get, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';

@Controller(API_PREFIX)
export class CurrentUserController {
  @Get('auth/me')
  me(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return {...req.actor, sessionId: undefined};
  }
}
