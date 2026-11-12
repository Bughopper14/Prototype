/** Business partner / customer directory queries and upserts for crm_master_business_partners. */
import {randomUUID} from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {
  cleanNullableString,
  enumOrNull,
  resolveLocationIds,
  resolveMasterId,
} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';
import {Problem} from '../../../core/domain';
import {actorMeta, cleanInt, dateStr, shortCode} from './helpers';

type Db = Pick<PoolConnection, 'query' | 'execute'>;

const PARTNER_SELECT = `
  SELECT
    p.*,
    bc.code AS company_type_code,
    bc.name AS company_type_name,
    br.code AS branch_code,
    br.name AS branch_name,
    ps.code AS premise_status_code,
    ps.name AS premise_status_name,
    ind.code AS industry_segment_code,
    ind.name AS industry_segment_name,
    bro.code AS business_role_code,
    bro.name AS business_role_name,
    co.name AS country_name,
    pr.name AS province_name,
    ct.name AS city_name,
    di.name AS district_name,
    vi.name AS village_name,
    pc.postal_code AS postal_code_value,
    app_agg.first_application_date
  FROM crm_master_business_partners p
  LEFT JOIN crm_master_business_categories bc ON bc.id = p.business_category_id
  LEFT JOIN crm_master_branches br ON br.id = p.branch_id
  LEFT JOIN crm_master_premise_statuses ps ON ps.id = p.premise_status_id
  LEFT JOIN crm_master_industry_segments ind ON ind.id = p.industry_segment_id
  LEFT JOIN crm_master_business_roles bro ON bro.id = p.business_role_id
  LEFT JOIN crm_master_countries co ON co.id = p.country_id
  LEFT JOIN crm_master_provinces pr ON pr.id = p.province_id
  LEFT JOIN crm_master_cities ct ON ct.id = p.city_id
  LEFT JOIN crm_master_districts di ON di.id = p.district_id
  LEFT JOIN crm_master_villages vi ON vi.id = p.village_id
  LEFT JOIN crm_master_postal_codes pc ON pc.id = p.postal_code_id
  LEFT JOIN (
    SELECT customer_id, MIN(COALESCE(application_date, DATE(created_at))) AS first_application_date
    FROM crm_applications
    WHERE deleted_at IS NULL
    GROUP BY customer_id
  ) app_agg ON app_agg.customer_id = p.id`;

export function mapPartnerRow(r: any) {
  if (!r) return null;
  return {
    id: r.id,
    partnerCode: r.partner_code || '',
    companyName: r.company_name || '',
    companyType: r.company_type_code || r.company_type_name || '',
    businessPartnerType: r.business_partner_type || 'DEBTOR',
    customerRelationship: r.customer_relationship || 'NEW',
    customerStatus: r.customer_relationship || 'NEW',
    nib: r.nib || '',
    nibDate: dateStr(r.nib_date) || '',
    npwp: r.npwp || '',
    establishmentActNo: r.establishment_act_no || '',
    establishmentDate: dateStr(r.establishment_date) || '',
    latestDeedNo: r.latest_deed_no || '',
    latestDeedDate: dateStr(r.latest_deed_date) || '',
    branchCode: r.branch_code || r.branch_name || '',
    locationStatus: r.premise_status_code || r.premise_status_name || '',
    companyAddress: r.company_address || '',
    country: r.country_name || 'Indonesia',
    province: r.province_name || '',
    city: r.city_name || '',
    district: r.district_name || '',
    village: r.village_name || '',
    postalCode: r.postal_code_value || '',
    rt: r.rt || '',
    rw: r.rw || '',
    phoneFax: r.phone_fax || '',
    email: r.email || '',
    website: r.website || '',
    mainBusiness: r.main_business || '',
    experienceYears: Number(r.experience_years ?? 0),
    experienceMonths: Number(r.experience_months ?? 0),
    repaymentSource: r.repayment_source || '',
    industrySegment: r.industry_segment_code || r.industry_segment_name || '',
    businessRole: r.business_role_code || r.business_role_name || '',
    assetSummaryHeLiuGong: Number(r.asset_he_liugong ?? 0),
    assetSummaryTruckLiuGong: Number(r.asset_truck_liugong ?? 0),
    assetSummaryHeNonLiuGong: Number(r.asset_he_non_liugong ?? 0),
    assetSummaryTruckNonLiuGong: Number(r.asset_truck_non_liugong ?? 0),
    firstApplicationDate: dateStr(r.first_application_date) || dateStr(r.created_at) || '',
    first_application_date: dateStr(r.first_application_date) || dateStr(r.created_at) || '',
    createdAt: r.created_at,
    created_at: r.created_at,
    updatedAt: r.updated_at,
    updated_at: r.updated_at,
  };
}

export async function getBusinessPartnerById(id: string, db: Db = pool) {
  const [rows] = await db.query<any[]>(`${PARTNER_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
  return mapPartnerRow(rows[0]);
}

export async function intakeCustomers() {
  const [rows] = await pool.query<any[]>(
    `${PARTNER_SELECT} WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC`,
  );
  return rows.map(mapPartnerRow);
}

export async function upsertBusinessPartner(body: any, actor?: any, db: Db = pool) {
  const companyName = cleanNullableString(body?.companyName);
  if (!companyName) throw new Problem(422, 'Company name is required.');

  const {actorName} = actorMeta(actor);
  const existingId = cleanNullableString(body?.id);
  const loc = await resolveLocationIds(
    {
      country: body?.country || 'Indonesia',
      province: body?.province,
      city: body?.city,
      district: body?.district,
      village: body?.village,
      postalCode: body?.postalCode,
    },
    db as any,
  );
  const [businessCategoryId, branchId, premiseStatusId, industrySegmentId, businessRoleId] = await Promise.all([
    resolveMasterId('crm_master_business_categories', body?.companyType, undefined, db as any),
    resolveMasterId('crm_master_branches', body?.branchCode, undefined, db as any),
    resolveMasterId('crm_master_premise_statuses', body?.locationStatus, undefined, db as any),
    resolveMasterId('crm_master_industry_segments', body?.industrySegment, undefined, db as any),
    resolveMasterId('crm_master_business_roles', body?.businessRole, undefined, db as any),
  ]);

  const relationship =
    enumOrNull(body?.customerRelationship || body?.customerStatus || body?.customerCategory, [
      'NEW',
      'EXISTING',
    ]) || 'NEW';
  const partnerType = cleanNullableString(body?.businessPartnerType) || 'DEBTOR';
  const npwpClean = shortCode(body?.npwp, 32);
  const nibClean = shortCode(body?.nib, 32);

  if (existingId) {
    const [existing] = await db.query<any[]>(
      'SELECT id, partner_code FROM crm_master_business_partners WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [existingId],
    );
    if (existing[0]) {
      await db.execute(
        `UPDATE crm_master_business_partners SET
          company_name=?, business_category_id=?, business_partner_type=?, customer_relationship=?,
          nib=?, nib_date=?, npwp=?, establishment_act_no=?, establishment_date=?,
          latest_deed_no=?, latest_deed_date=?, branch_id=?, premise_status_id=?,
          company_address=?, country_id=?, province_id=?, city_id=?, district_id=?, village_id=?, postal_code_id=?,
          rt=?, rw=?, phone_fax=?, email=?, website=?, main_business=?,
          experience_years=?, experience_months=?, repayment_source=?,
          industry_segment_id=?, business_role_id=?,
          asset_he_liugong=?, asset_truck_liugong=?, asset_he_non_liugong=?, asset_truck_non_liugong=?,
          updated_at=CURRENT_TIMESTAMP(3), updated_by=?
        WHERE id=?`,
        [
          companyName,
          businessCategoryId,
          partnerType,
          relationship,
          nibClean,
          dateStr(body?.nibDate),
          npwpClean,
          shortCode(body?.establishmentActNo, 150),
          dateStr(body?.establishmentDate),
          shortCode(body?.latestDeedNo, 150),
          dateStr(body?.latestDeedDate),
          branchId,
          premiseStatusId,
          cleanNullableString(body?.companyAddress),
          loc.countryId,
          loc.provinceId,
          loc.cityId,
          loc.districtId,
          loc.villageId,
          loc.postalCodeId,
          shortCode(body?.rt, 5),
          shortCode(body?.rw, 5),
          shortCode(body?.phoneFax, 50),
          shortCode(body?.email, 255),
          shortCode(body?.website, 255),
          cleanNullableString(body?.mainBusiness),
          cleanInt(body?.experienceYears, 0),
          Math.min(11, cleanInt(body?.experienceMonths, 0)),
          cleanNullableString(body?.repaymentSource),
          industrySegmentId,
          businessRoleId,
          cleanInt(body?.assetSummaryHeLiuGong, 0),
          cleanInt(body?.assetSummaryTruckLiuGong, 0),
          cleanInt(body?.assetSummaryHeNonLiuGong, 0),
          cleanInt(body?.assetSummaryTruckNonLiuGong, 0),
          actorName,
          existingId,
        ],
      );
      return getBusinessPartnerById(existingId, db);
    }
  }

  const id = randomUUID();
  const partnerCode =
    shortCode(body?.partnerCode, 50) || `BP-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 4).toUpperCase()}`;

  await db.execute(
    `INSERT INTO crm_master_business_partners (
      id, partner_code, company_name, business_category_id, business_partner_type, customer_relationship,
      nib, nib_date, npwp, establishment_act_no, establishment_date, latest_deed_no, latest_deed_date,
      branch_id, premise_status_id, company_address,
      country_id, province_id, city_id, district_id, village_id, postal_code_id,
      rt, rw, phone_fax, email, website, main_business, experience_years, experience_months,
      repayment_source, industry_segment_id, business_role_id,
      asset_he_liugong, asset_truck_liugong, asset_he_non_liugong, asset_truck_non_liugong,
      created_by, updated_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      partnerCode,
      companyName,
      businessCategoryId,
      partnerType,
      relationship,
      nibClean,
      dateStr(body?.nibDate),
      npwpClean,
      shortCode(body?.establishmentActNo, 150),
      dateStr(body?.establishmentDate),
      shortCode(body?.latestDeedNo, 150),
      dateStr(body?.latestDeedDate),
      branchId,
      premiseStatusId,
      cleanNullableString(body?.companyAddress),
      loc.countryId,
      loc.provinceId,
      loc.cityId,
      loc.districtId,
      loc.villageId,
      loc.postalCodeId,
      shortCode(body?.rt, 5),
      shortCode(body?.rw, 5),
      shortCode(body?.phoneFax, 50),
      shortCode(body?.email, 255),
      shortCode(body?.website, 255),
      cleanNullableString(body?.mainBusiness),
      cleanInt(body?.experienceYears, 0),
      Math.min(11, cleanInt(body?.experienceMonths, 0)),
      cleanNullableString(body?.repaymentSource),
      industrySegmentId,
      businessRoleId,
      cleanInt(body?.assetSummaryHeLiuGong, 0),
      cleanInt(body?.assetSummaryTruckLiuGong, 0),
      cleanInt(body?.assetSummaryHeNonLiuGong, 0),
      cleanInt(body?.assetSummaryTruckNonLiuGong, 0),
      actorName,
      actorName,
    ],
  );
  return getBusinessPartnerById(id, db);
}
