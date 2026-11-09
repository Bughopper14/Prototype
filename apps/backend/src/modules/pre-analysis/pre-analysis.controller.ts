import {Controller, Get, Put, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {intakeDetail} from '../applications/intake.repository';
import {getPreAnalysisData, savePreAnalysisData} from './pre-analysis.repository';
import {requireAuthority} from '../auth/session';

@Controller(API_PREFIX)
export class PreAnalysisController {
  @Get('applications/:id/pre-analysis')
  async get(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_applications');
    return {
      success: true,
      data: await getPreAnalysisData(req.params.id, await intakeDetail(req.params.id)),
    };
  }

  @Put('applications/:id/pre-analysis')
  async save(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(
      req.actor,
      'crm_edit_app_financing_units',
      'crm_edit_app_financial',
      'crm_workflow_start_review',
    );
    await savePreAnalysisData(req.params.id, req.body);
    return {success: true, data: req.body};
  }
}
