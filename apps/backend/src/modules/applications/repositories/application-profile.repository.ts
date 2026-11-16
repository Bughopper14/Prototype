import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';
import {clean, CompanyRecordMapper, upsertRow} from './company-record';
import {MasterIdLookup} from './master-ids';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;

/** API field → column of crm_fap_primary_contacts (location fields travel as ids). */
const CONTACT_COLUMNS = [
  ['picName', 'pic_name'],
  ['phone', 'phone'],
  ['email', 'email'],
  ['rt', 'rt'],
  ['rw', 'rw'],
  ['currentAddress', 'current_address'],
] as const;

/** The FAP company profile (crm_fap_application_profiles) and primary contact (crm_fap_primary_contacts) of an application. */
@Injectable()
export class ApplicationProfileRepository {
  constructor(
    private readonly db: CrmDatabase,
    private readonly ids: MasterIdLookup,
    private readonly companies: CompanyRecordMapper,
  ) {}

  async getProfile(applicationId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.fapApplicationProfiles} WHERE application_id=?`,
      [applicationId],
    );
    if (!rows.length) return null;
    const {customer, profile} = await this.companies.fields(rows[0], 'company_email');
    return {
      customer,
      profile: {
        ...profile,
        referenceComments: rows[0].reference_comments ?? null,
        financialAudited: !!rows[0].is_financial_audited,
      },
    };
  }

  async saveProfile(
    conn: Conn,
    applicationId: string,
    customer: Record<string, any>,
    profile: Record<string, any>,
    by: string | null,
  ) {
    const values: Record<string, any> = {
      ...(await this.companies.columns(customer, profile, conn, 'company_email')),
      reference_comments: clean(profile.referenceComments),
      // FAP section 09 "Audited" (global check)
      is_financial_audited: profile.financialAudited ? 1 : 0,
    };
    if (!values.company_name) throw Object.assign(new Error('Company name is required'), {status: 422});
    const [rows] = await conn.execute<any[]>(
      `SELECT id FROM ${CRM.fapApplicationProfiles} WHERE application_id=? FOR UPDATE`,
      [applicationId],
    );
    return upsertRow(conn, CRM.fapApplicationProfiles, rows[0]?.id || crypto.randomUUID(), values, by, {
      application_id: applicationId,
    });
  }

  async getContact(applicationId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.fapPrimaryContacts} WHERE application_id=?`,
      [applicationId],
    );
    const row = rows[0];
    if (!row) return null;
    const pic: Record<string, any> = {id: row.id, createdAt: row.created_at, updatedAt: row.updated_at};
    for (const [key, column] of CONTACT_COLUMNS) pic[key] = row[column] ?? null;
    pic.province = row.province_id ?? null;
    pic.city = row.city_id ?? null;
    pic.district = row.district_id ?? null;
    pic.village = row.village_id ?? null;
    pic.position = await this.ids.codeOf('picPosition', row.position_id);
    pic.country = await this.ids.codeOf('country', row.country_id);
    pic.postalCode = await this.ids.postalCodeOf(row.postal_code_id);
    return pic;
  }

  /** Saves the contact; nothing is stored while every field is still empty. */
  async saveContact(conn: Conn, applicationId: string, pic: Record<string, any>, by: string | null) {
    const values: Record<string, any> = {};
    for (const [key, column] of CONTACT_COLUMNS) values[column] = clean(pic[key]);
    values.position_id = await this.ids.idOf('picPosition', pic.position, conn);
    values.country_id = await this.ids.idOf('country', pic.country, conn);
    const location = await this.ids.locationIds(pic, conn);
    if (location.unresolved.length)
      throw Object.assign(new Error(`Unknown location: ${location.unresolved.join(', ')}.`), {status: 422});
    values.province_id = location.province;
    values.city_id = location.city;
    values.district_id = location.district;
    values.village_id = location.village;
    values.postal_code_id = await this.ids.postalCodeId(values.city_id, pic.postalCode, conn);
    const [rows] = await conn.execute<any[]>(
      `SELECT id FROM ${CRM.fapPrimaryContacts} WHERE application_id=? FOR UPDATE`,
      [applicationId],
    );
    if (!rows.length && Object.values(values).every(v => v === null)) return false;
    return upsertRow(conn, CRM.fapPrimaryContacts, rows[0]?.id || crypto.randomUUID(), values, by, {
      application_id: applicationId,
    });
  }
}
