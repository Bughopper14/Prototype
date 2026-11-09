import {Controller, Get, Post, Res} from '@nestjs/common';
import crypto from 'node:crypto';
import {pool} from '../../core/db/pool';
import {ensure} from '../../core/domain';
import {API_PREFIX, ApiReq, type ApiRequest, type ApiResponse} from '../../core/http/api-request';
import {intakeCustomers} from '../applications/intake.repository';
import {requireAuthority} from '../auth/session';

@Controller(API_PREFIX)
export class CustomersController {
  @Get('customers')
  list(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    return intakeCustomers();
  }

  @Post('customers')
  async create(@ApiReq() req: ApiRequest, @Res() res: ApiResponse) {
    requireAuthority(req.actor, 'crm_manage_customers');
    const b = req.body || {};
    const companyName = String(b.companyName || '').trim();
    const companyType = String(b.companyType || '').trim();
    // A draft may be started before the customer's registration numbers are known: blank values get unique
    // placeholders (never a shared constant, which would merge unrelated customers) and are replaced when edited.
    const stamp = String(Date.now());
    const nib = String(b.nib || '').trim() || stamp;
    const npwp = String(b.npwp || '').trim() || `${stamp}${crypto.randomInt(10, 100)}`;
    ensure(companyName && companyType, 'Company name and type are required');
    ensure(/^\d{13}$/.test(nib), 'NIB must contain 13 digits');
    ensure(/^\d{15,16}$/.test(npwp.replace(/\D/g, '')), 'NPWP must contain 15 or 16 digits');

    const [existing] = await pool.query<any[]>(
      'SELECT id FROM business_partner WHERE nib=? OR npwp=? LIMIT 1',
      [nib, npwp],
    );
    const id = existing[0]?.id || crypto.randomUUID();
    await pool.execute(
      `INSERT INTO business_partner (id, company_name, company_type, nib, npwp, establishment_act_no, establishment_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), company_type=VALUES(company_type), nib=VALUES(nib), npwp=VALUES(npwp),
       establishment_act_no=COALESCE(VALUES(establishment_act_no), establishment_act_no),
       establishment_date=COALESCE(VALUES(establishment_date), establishment_date)`,
      [id, companyName, companyType, nib, npwp, b.establishmentActNo || null, b.establishmentDate || null],
    );
    return {
      id,
      companyName,
      companyType,
      nib,
      npwp,
      establishmentActNo: b.establishmentActNo || null,
      establishmentDate: b.establishmentDate || null,
    };
  }
}
