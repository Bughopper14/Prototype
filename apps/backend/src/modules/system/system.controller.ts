import {Controller, Get, Res} from '@nestjs/common';
import {checkMysql} from '../../core/db/pool';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {Public} from '../../core/http/public.decorator';

@Controller(API_PREFIX)
export class SystemController {
  @Public()
  @Get('health')
  health(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return {status: 'ok'};
  }

  @Public()
  @Get('mysql/health')
  async mysqlHealth(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    await checkMysql();
    return {status: 'ok', database: process.env.DB_NAME};
  }
}
