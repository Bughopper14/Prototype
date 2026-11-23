import {Controller, Post, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority} from '../auth/session';
import {OcrWorkerService} from './ocr-worker.service';

@Controller(API_PREFIX)
export class OcrController {
  constructor(private readonly ocr: OcrWorkerService) {}

  /** Loads the OCR models in the background when the CRM opens, so the first scan is fast. */
  @Post('ocr/warmup')
  warmUp(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_DASHBOARD_ACCESS');
    this.ocr.warmUp();
    return {ok: true};
  }
}
