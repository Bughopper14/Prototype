import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {experienceFromEstablishmentDate} from '@liugong/shared';
import {MasterIdLookup} from './master-ids';

type Db = Pick<PoolConnection, 'query'>;

/** Trims text, turns '' into NULL, keeps dates as YYYY-MM-DD and numbers as integers (0 when empty). Objects and arrays are refused (422). */
export function clean(value: any, type: 'text' | 'date' | 'int' = 'text') {
  if (value === undefined || value === null) return type === 'int' ? 0 : null;
  // An object or array is never a field value; String() would store it as "[object Object]" or "a,b".
  if (typeof value === 'object' && !(value instanceof Date))
    throw Object.assign(new Error('Nilai isian harus berupa teks atau angka.'), {status: 422});
  if (type === 'int') {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (!text) return null;
  return type === 'date' ? text.slice(0, 10) : text;
}

/** API field → column of the company columns shared by crm_fap_application_profiles and crm_master_business_partners. */
const CUSTOMER_COLUMNS = [
  ['companyName', 'company_name', 'text'],
  ['nib', 'nib', 'text'],
  ['nibDate', 'nib_date', 'date'],
  ['npwp', 'npwp', 'text'],
  ['establishmentActNo', 'establishment_act_no', 'text'],
  ['establishmentDate', 'establishment_date', 'date'],
] as const;
const PROFILE_COLUMNS = [
  ['companyFullAddress', 'company_full_address', 'text'],
  ['companyAddress', 'company_address', 'text'],
  ['rt', 'rt', 'text'],
  ['rw', 'rw', 'text'],
  ['phoneFax', 'phone_fax', 'text'],
  ['website', 'website', 'text'],
  ['mainBusiness', 'main_business', 'text'],
  ['repaymentSource', 'repayment_source', 'text'],
  ['latestDeedNo', 'latest_deed_no', 'text'],
  ['latestDeedDate', 'latest_deed_date', 'date'],
  ['assetSummaryHeLiuGong', 'asset_he_liugong', 'int'],
  ['assetSummaryTruckLiuGong', 'asset_truck_liugong', 'int'],
  ['assetSummaryHeNonLiuGong', 'asset_he_non_liugong', 'int'],
  ['assetSummaryTruckNonLiuGong', 'asset_truck_non_liugong', 'int'],
] as const;

/** Columns that only crm_fap_application_profiles has (the directory of customers lost them). */
const PROFILE_ONLY = [
  'establishment_act_no',
  'establishment_date',
  'latest_deed_no',
  'latest_deed_date',
  'asset_he_liugong',
  'asset_truck_liugong',
  'asset_he_non_liugong',
  'asset_truck_non_liugong',
];

/** Maps a company (customer + profile fields) to and from crm_fap_application_profiles / crm_master_business_partners. */
@Injectable()
export class CompanyRecordMapper {
  constructor(private readonly ids: MasterIdLookup) {}

  /**
   * Column values of a company for one of the two tables. Master codes become ids, the postal code is resolved within
   * the city, country follows the province, experience follows the establishment date.
   */
  async columns(
    customer: Record<string, any>,
    profile: Record<string, any>,
    db: Db,
    emailColumn: 'company_email' | 'email',
  ): Promise<Record<string, any>> {
    const ids = this.ids;
  const out: Record<string, any> = {};
  for (const [key, column, type] of CUSTOMER_COLUMNS) out[column] = clean(customer[key], type);
  for (const [key, column, type] of PROFILE_COLUMNS) out[column] = clean(profile[key], type);
  out[emailColumn] = clean(profile.email);
  out.business_category_id = await ids.idOf('businessCategory', customer.companyType, db);
  out.premise_status_id = await ids.idOf('premiseStatus', profile.locationStatus, db);
  out.industry_segment_id = await ids.idOf('industrySegment', profile.industrySegment, db);
  out.business_role_id = await ids.idOf('businessRole', profile.businessRole, db);
  const location = await ids.locationIds(profile, db);
  if (location.unresolved.length)
    throw Object.assign(new Error(`Unknown location: ${location.unresolved.join(', ')}.`), {status: 422});
  out.province_id = location.province;
  out.city_id = location.city;
  out.district_id = location.district;
  out.village_id = location.village;
  out.postal_code_id = await ids.postalCodeId(out.city_id, profile.postalCode, db);
  // the company address column holds the full address (the form shows its street part)
  out.company_address = await ids.fullAddress(out.company_address, {rt: out.rt, rw: out.rw, villageId: out.village_id, districtId: out.district_id, cityId: out.city_id, provinceId: out.province_id, postalCode: profile.postalCode}, db);
  out.country_id = await ids.countryOfProvince(out.province_id, db);
  const experience = experienceFromEstablishmentDate(out.establishment_date);
  out.experience_years = clean(experience.experienceYears ?? profile.experienceYears, 'int');
  out.experience_months = clean(experience.experienceMonths ?? profile.experienceMonths, 'int');
  // The customer directory (crm_master_business_partners) does not keep the data of one application: these columns exist only on the profile.
  if (emailColumn === 'email') for (const column of PROFILE_ONLY) delete out[column];
  return out;
  }

  /** The API shape ({customer, profile}) of a stored company row. */
  async fields(row: any, emailColumn: 'company_email' | 'email') {
    const ids = this.ids;
  const customer: Record<string, any> = {};
  for (const [key, column] of CUSTOMER_COLUMNS) customer[key] = row[column] ?? null;
  customer.companyType = await ids.codeOf('businessCategory', row.business_category_id);
  const profile: Record<string, any> = {};
  for (const [key, column, type] of PROFILE_COLUMNS) profile[key] = row[column] ?? (type === 'int' ? 0 : null);
  profile.province = row.province_id ?? null;
  profile.city = row.city_id ?? null;
  profile.district = row.district_id ?? null;
  profile.village = row.village_id ?? null;
  profile.email = row[emailColumn] ?? null;
  profile.postalCode = await ids.postalCodeOf(row.postal_code_id);
  profile.locationStatus = await ids.codeOf('premiseStatus', row.premise_status_id);
  profile.industrySegment = await ids.codeOf('industrySegment', row.industry_segment_id);
  profile.businessRole = await ids.codeOf('businessRole', row.business_role_id);
  profile.experienceYears = Number(row.experience_years ?? 0);
  profile.experienceMonths = Number(row.experience_months ?? 0);
  customer.experienceYears = profile.experienceYears;
  customer.experienceMonths = profile.experienceMonths;
  return {customer, profile};
  }
}

/** Writes `values` to the row with `id`, or inserts it; returns true when something changed. */
export async function upsertRow(
  db: Pick<PoolConnection, 'query' | 'execute'>,
  table: string,
  id: string,
  values: Record<string, any>,
  by: string | null,
  insertExtras: Record<string, any> = {},
): Promise<boolean> {
  const [old] = await db.execute<any[]>(`SELECT * FROM ${table} WHERE id=? FOR UPDATE`, [id]);
  const keys = Object.keys(values);
  if (!old.length) {
    const all = {...insertExtras, ...values, created_by: by};
    const cols = Object.keys(all);
    await db.execute(
      `INSERT INTO ${table} (id,${cols.map(c => `\`${c}\``).join(',')}) VALUES (?,${cols.map(() => '?').join(',')})`,
      [id, ...Object.values(all)],
    );
    return true;
  }
  const changed = keys.filter(k => String(old[0][k] ?? '') !== String(values[k] ?? ''));
  if (!changed.length) return false;
  await db.execute(
    `UPDATE ${table} SET ${changed.map(k => `\`${k}\`=?`).join(',')},updated_by=? WHERE id=?`,
    [...changed.map(k => values[k]), by, id],
  );
  return true;
}
