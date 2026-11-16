import {Controller, Get, Put, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority} from '../auth/session';
import {MasterDataService} from './master-data.service';
import {MandatoryRulesRepository} from './repositories/mandatory-rules.repository';

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

  @Get('mandatory')
  mandatoryList(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'access_crm_dashboard');
    return this.mandatoryRules.list();
  }

  @Put('mandatory')
  async updateMandatoryRule(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_manage_master_data');
    const {id, section, fieldKey, field_key, mandatory} = req.body;
    await this.mandatoryRules.set(
      {id, section, fieldKey: fieldKey || field_key},
      mandatory === 1 || mandatory === true || mandatory === '1',
      req.actor?.username || null,
    );
    return this.mandatoryRules.list();
  }
}
