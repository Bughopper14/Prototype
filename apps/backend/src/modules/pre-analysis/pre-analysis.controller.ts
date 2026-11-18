import {Controller, Get, Post, Put, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority} from '../auth/session';
import {PreAnalysisService} from './pre-analysis.service';

@Controller(API_PREFIX)
export class PreAnalysisController {
  constructor(private readonly preAnalysis: PreAnalysisService) {}

  @Get('applications/:id/pre-analysis')
  async get(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_view_applications');
    return {success: true, ...(await this.preAnalysis.get(req.params.id, req.actor))};
  }

  /** `?version=` is the version the screen loaded; a form someone else changed since is refused (409). */
  @Put('applications/:id/pre-analysis')
  async save(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_edit_app_financing_units', 'crm_edit_app_financial', 'crm_workflow_start_review');
    return {success: true, ...(await this.preAnalysis.save(req.params.id, req.body, req.actor, req.query.version))};
  }

  /** Makes the Pre-Analysis number (it is not made when the form is opened or saved). */
  @Post('applications/:id/pre-analysis-number')
  async generateNumber(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_edit_app_financing_units', 'crm_edit_app_financial', 'crm_workflow_start_review');
    return {success: true, ...(await this.preAnalysis.generateNumber(req.params.id, req.actor))};
  }
}
