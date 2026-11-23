import {Controller, Get, Post, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {requireAuthority} from '../auth/session';
import {BusinessPartnersRepository} from './business-partners.repository';

@Controller(API_PREFIX)
export class CustomersController {
  constructor(private readonly partners: BusinessPartnersRepository) {}

  @Get('customers')
  list(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_CUSTOMER_VIEW', 'CRM_APPLICATION_CREATE');
    return this.partners.list();
  }

  /** New debtor from the "new application" form; returns the existing customer when the NPWP is already known. */
  @Post('customers')
  async create(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'CRM_CUSTOMER_MANAGE');
    const created = await this.partners.create(req.body || {}, req.actor?.username || null);
    return {...created!.customer, id: created!.id};
  }
}
