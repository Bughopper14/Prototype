import {Controller, Post, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {warmUpOcr} from './ocr-runner';

@Controller(API_PREFIX)
export class OcrController {
  @Post('ocr/warmup')
  warmUp(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    warmUpOcr();
    return {ok: true};
  }
}
