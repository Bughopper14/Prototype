import {Controller, Get, Put, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {intakeDetail} from '../applications/intake.repository';
import {
  generatePreAnalysisNo,
  getAllPreAnalysisNumbers,
  getPreAnalysisData,
  savePreAnalysisData,
} from './pre-analysis.repository';
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
    const data = req.body || {};
    const missing = (v: any) => !v || String(v).includes('Auto') || String(v).trim() === '';
    // A form saved before its numbers exist gets them here: next Pre-Analysis number, FAP number, company name
    if (missing(data.preAnalysisNo))
      data.preAnalysisNo = generatePreAnalysisNo(await getAllPreAnalysisNumbers(), new Date());
    const appRecord: any = await intakeDetail(req.params.id);
    if (appRecord && missing(data.fapNumber))
      data.fapNumber = appRecord.fapNumber || appRecord.fap_number || '';
    if (appRecord && (missing(data.customerProjectName) || data.customerProjectName === 'New Applicant'))
      data.customerProjectName =
        appRecord.customer?.companyName || appRecord.companyName || data.customerProjectName;
    await savePreAnalysisData(req.params.id, data, req.actor?.name || 'System');
    return {success: true, data};
  }
}
