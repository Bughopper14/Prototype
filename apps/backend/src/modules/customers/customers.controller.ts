import {Controller, Get, Post, Res} from '@nestjs/common';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {intakeCustomers, upsertBusinessPartner} from '../applications/intake/customers';
import {requireAuthority} from '../auth/session';

@Controller(API_PREFIX)
export class CustomersController {
  @Get('customers')
  list(@ApiReq() req: ApiRequest) {
    requireAuthority(req.actor, 'crm_view_customers', 'crm_create_application');
    return intakeCustomers();
  }

  @Post('customers')
  async create(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_manage_customers', 'crm_create_application');
    const created = await upsertBusinessPartner(req.body, req.actor);
    return res.status(201).json(created);
  }
}
