import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../core/db/crm-database';
import {uniqueCode} from '../../core/domain/code';
import {CRM} from '../../core/db/crm-tables';
import {clean, CompanyRecordMapper, upsertRow} from '../applications/repositories/company-record';
import {MasterIdLookup} from '../applications/repositories/master-ids';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;

/** The customer golden record (crm_master_business_partners): one row per company, shared by its applications. */
@Injectable()
export class BusinessPartnersRepository {
  constructor(
    private readonly db: CrmDatabase,
    private readonly ids: MasterIdLookup,
    private readonly companies: CompanyRecordMapper,
  ) {}

  /** The customer directory with the date of each customer's first application. */
  async list() {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT b.id,b.company_name,b.business_category_id,b.nib,b.nib_date,b.npwp,b.establishment_act_no,
              b.establishment_date,b.created_at,b.updated_at,MIN(a.application_date) AS first_application_date
       FROM ${CRM.masterBusinessPartners} b
       LEFT JOIN ${CRM.applications} a ON a.business_partner_id=b.id AND a.deleted_at IS NULL
       WHERE b.deleted_at IS NULL
       GROUP BY b.id ORDER BY b.company_name`,
    );
    const categories = await this.ids.codes('businessCategory');
    return rows.map(r => ({
      id: r.id,
      companyName: r.company_name,
      companyType: categories.get(r.business_category_id) ?? null,
      nib: r.nib,
      nibDate: r.nib_date,
      npwp: r.npwp,
      establishmentActNo: r.establishment_act_no,
      establishmentDate: r.establishment_date,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      firstApplicationDate: r.first_application_date,
    }));
  }

  /** One customer in the API shape ({customer, profile}), or null. */
  async get(id: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.masterBusinessPartners} WHERE id=? AND deleted_at IS NULL`,
      [id],
    );
    if (!rows.length) return null;
    const {customer, profile} = await this.companies.fields(rows[0], 'email');
    return {
      id: rows[0].id,
      customer: {...customer, id: rows[0].id},
      profile: {...profile, branchCode: await this.ids.codeOf('branch', rows[0].branch_id)},
    };
  }

  /**
   * Creates a customer from the "new debtor" form, or returns the existing one with the same NPWP (the design keeps
   * NPWP unique through the backend). Registration numbers may still be blank on a draft.
   */
  async create(input: Record<string, any>, by: string | null) {
    const companyName = clean(input.companyName);
    if (!companyName) throw Object.assign(new Error('Company name is required'), {status: 422});
    const nib = clean(input.nib) as string | null;
    const npwp = clean(String(input.npwp ?? '').replace(/\D/g, '')) as string | null;
    if (nib && !/^\d{13}$/.test(nib)) throw Object.assign(new Error('NIB must contain 13 digits'), {status: 422});
    if (npwp && !/^\d{15,16}$/.test(npwp))
      throw Object.assign(new Error('NPWP must contain 15 or 16 digits'), {status: 422});
    if (npwp) {
      const [existing] = await this.db.pool.execute<any[]>(
        `SELECT id FROM ${CRM.masterBusinessPartners} WHERE npwp=? AND deleted_at IS NULL LIMIT 1`,
        [npwp],
      );
      if (existing.length) return this.get(existing[0].id);
    }
    const id = crypto.randomUUID();
    await this.db.pool.execute(
      `INSERT INTO ${CRM.masterBusinessPartners}
         (id,company_name,business_category_id,nib,npwp,establishment_act_no,establishment_date,created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        id,
        companyName,
        await this.ids.idOf('businessCategory', input.companyType),
        nib,
        npwp,
        clean(input.establishmentActNo),
        clean(input.establishmentDate, 'date'),
        by,
      ],
    );
    return this.get(id);
  }

  /** Keeps the golden record in step with an application's customer and profile data. */
  async saveFromApplication(
    conn: Conn,
    id: string,
    customer: Record<string, any>,
    profile: Record<string, any>,
    by: string | null,
  ) {
    const values: Record<string, any> = {
      ...(await this.companies.columns(customer, profile, conn, 'email')),
      branch_id: await this.ids.idOf('branch', profile.branchCode, conn),
    };
    if (!values.company_name) throw Object.assign(new Error('Company name is required'), {status: 422});
    // The backend builds the code from the company name (kept once it exists)
    const [stored] = await conn.query<any[]>(`SELECT code FROM ${CRM.masterBusinessPartners} WHERE id=?`, [id]);
    if (!stored[0]?.code)
      values.code = await uniqueCode(values.company_name, async c => (await conn.query<any[]>(`SELECT 1 FROM ${CRM.masterBusinessPartners} WHERE code=? AND id<>?`, [c, id]))[0].length > 0);
    return upsertRow(conn, CRM.masterBusinessPartners, id, values, by);
  }
}
