import {Controller, Get, Put, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {intakeDetail} from '../applications/intake.repository';
import {getPreAnalysisData, savePreAnalysisData} from './pre-analysis.repository';

@Controller(API_PREFIX)
export class PreAnalysisController {
  @Get('applications/:id/pre-analysis')
  async get(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return {
      success: true,
      data: await getPreAnalysisData(req.params.id, await intakeDetail(req.params.id)),
    };
  }

  @Put('applications/:id/pre-analysis')
  async save(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    await savePreAnalysisData(req.params.id, req.body);
    return {success: true, data: req.body};
  }
}
