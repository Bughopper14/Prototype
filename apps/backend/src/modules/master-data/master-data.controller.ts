import {Controller, Get, Put, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority} from '../auth/session';
import {MasterDataService} from './master-data.service';
import {MandatoryRulesRepository} from './repositories/mandatory-rules.repository';
import {many, tx} from '../../core/db/query';
import {USER_TABLES} from '../../core/db/user-tables';

@Controller(API_PREFIX)
export class MasterDataController {
  constructor(
    private readonly masterData: MasterDataService,
    private readonly mandatoryRules: MandatoryRulesRepository,
  ) {}

  @Get('master-data')
  async catalog(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'access_crm_dashboard');
    const data = await this.masterData.load();
    const etag = `W/"master-${data.revision}-${this.masterData.gzip(data).length}"`;
    res.setHeader('ETag', etag).setHeader('Cache-Control', 'private, no-cache');
    if (req.headers.get('if-none-match') === etag) return res.status(304).end();
    if (String(req.headers.get('accept-encoding') || '').includes('gzip')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8').setHeader('Content-Encoding', 'gzip');
      return res.send(this.masterData.gzip(data));
    }
    return data;
  }

  @Put('master-data')
  saveCatalog(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_manage_master_data', 'crm_quick_add_master_option');
    const by = req.actor?.username || null;
    if (req.body.group && Array.isArray(req.body.items))
      return this.masterData.saveGroup(String(req.body.group), req.body.items, req.body.revision, by);
    return this.masterData.saveCatalog(req.body.catalog, req.body.revision, by);
  }

  /** Mandatory rules of a workflow (?workflowId=), default the active one. They are edited in Workflow setup. */
  @Get('mandatory')
  mandatoryList(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'access_crm_dashboard');
    const workflowId = req.query?.workflowId ? String(req.query.workflowId) : undefined;
    return this.mandatoryRules.list(workflowId);
  }

  @Get('workflow-approvers')
  async approversLookup(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'access_crm_dashboard');
    const [departments, users] = await Promise.all([
      many(`SELECT dept_id, department_code, department_name FROM ${USER_TABLES.departments} WHERE is_active = 1 ORDER BY dept_id`),
      many(`SELECT id, username, full_name, dept_id, position FROM ${USER_TABLES.users} WHERE is_active = 1 ORDER BY full_name, username`),
    ]);
    return {departments, users};
  }

  @Get('workflow-stage-submodules')
  async getStageSubmodules(@ApiReq() req: ApiRequest) {
    requireAuthority(req.actor, 'access_crm_dashboard');
    return many(
      `SELECT stage_code, submodule_code, submodule_name, order_in_stage, is_mandatory, allow_concurrent_edit 
       FROM crm_master_workflow_stage_submodules 
       WHERE is_active = 1 
       ORDER BY stage_code, order_in_stage ASC`
    );
  }

  @Put('workflow-stage-submodules/reorder')
  async reorderStageSubmodules(@ApiReq() req: ApiRequest) {
    requireAuthority(req.actor, 'crm_manage_master_data');
    const {stageCode, submoduleCodes} = req.body as {stageCode: string; submoduleCodes: string[]};
    if (!stageCode || !Array.isArray(submoduleCodes)) {
      return {success: false, message: 'Invalid payload'};
    }
    await tx(async conn => {
      for (let i = 0; i < submoduleCodes.length; i++) {
        await conn.query(
          `UPDATE crm_master_workflow_stage_submodules 
           SET order_in_stage = ? 
           WHERE stage_code = ? AND submodule_code = ?`,
          [i + 1, stageCode, submoduleCodes[i]]
        );
      }
    });
    return {success: true, stageCode, submoduleCodes};
  }
}
