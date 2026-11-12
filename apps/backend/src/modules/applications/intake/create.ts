/** Creating a new CRM application across crm_applications, crm_fap_application_profiles, and stage progress. */
import {randomUUID} from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {
  cleanNullableString,
  enumOrNull,
  resolveLocationIds,
  resolveMasterId,
  resolveWorkflowStageByCode,
  resolveWorkflowStatusByCode,
} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';
import {Problem} from '../../../core/domain';
import {upsertBusinessPartner} from './customers';
import {intakeDetail} from './detail';
import {actorMeta, cleanInt, dateStr, shortCode} from './helpers';

async function nextFapNumber(conn: PoolConnection): Promise<string> {
  const now = new Date();
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const roman = romans[now.getMonth()] || 'I';
  const year = now.getFullYear();
  const [rows] = await conn.query<any[]>(
    `SELECT fap_registration_number
     FROM crm_applications
     WHERE fap_registration_number LIKE ?
     ORDER BY CAST(SUBSTRING_INDEX(fap_registration_number, '/', 1) AS UNSIGNED) DESC
     LIMIT 1`,
    [`%/AF/%/${year}`],
  );
  const last = String(rows[0]?.fap_registration_number || '');
  const seqMatch = last.match(/^(\d+)\/AF\//);
  const nextSeq = seqMatch ? Number(seqMatch[1]) + 1 : 1;
  return `${String(nextSeq).padStart(3, '0')}/AF/${roman}/${year}`;
}

function cleanUserFapNumber(value: unknown): string | null {
  const s = cleanNullableString(value);
  if (!s) return null;
  if (/^auto(\b|\s|\(|$)/i.test(s) || s === '-') return null;
  return s;
}

export async function createIntake(
  body: any,
  identity?: {id: string; fapNumber?: string; status?: string},
  actor?: any,
) {
  const {userId, actorName} = actorMeta(actor);
  const appId = identity?.id || randomUUID();
  const statusCode = identity?.status || body?.status || 'DRAFT';

  const statusRow =
    (await resolveWorkflowStatusByCode(statusCode)) || (await resolveWorkflowStatusByCode('DRAFT'));
  if (!statusRow) throw new Problem(500, 'Master workflow status DRAFT is missing in crm_liugong1.');

  const fapStage = await resolveWorkflowStageByCode('FAP_STAGE');
  const preStage = await resolveWorkflowStageByCode('PRE_ANALYSIS');
  if (!fapStage) throw new Problem(500, 'Master workflow stage FAP_STAGE is missing in crm_liugong1.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let customerId = cleanNullableString(body?.customerId || body?.customer?.id);
    if (customerId) {
      const [found] = await conn.query<any[]>(
        'SELECT id FROM crm_master_business_partners WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [customerId],
      );
      if (!found[0]) customerId = null;
    }
    if (!customerId) {
      const custInput = {
        ...(body?.customer || {}),
        companyName: body?.customer?.companyName || body?.companyName,
        companyType: body?.customer?.companyType || body?.companyType,
        nib: body?.customer?.nib || body?.nib,
        nibDate: body?.customer?.nibDate || body?.nibDate,
        npwp: body?.customer?.npwp || body?.npwp,
        establishmentActNo: body?.customer?.establishmentActNo || body?.establishmentActNo,
        establishmentDate: body?.customer?.establishmentDate || body?.establishmentDate,
        branchCode: body?.branchCode,
        locationStatus: body?.locationStatus,
        companyAddress: body?.companyAddress,
        country: body?.country || 'Indonesia',
        province: body?.province,
        city: body?.city,
        district: body?.district,
        village: body?.village,
        postalCode: body?.postalCode,
        rt: body?.rt,
        rw: body?.rw,
        phoneFax: body?.phoneFax,
        email: body?.email,
        website: body?.website,
        mainBusiness: body?.mainBusiness,
        repaymentSource: body?.repaymentSource,
        customerRelationship: body?.customerCategory || body?.customerStatus || 'NEW',
      };
      if (!cleanNullableString(custInput.companyName)) {
        throw new Problem(422, 'Company name is required to create an application.');
      }
      const createdPartner = await upsertBusinessPartner(custInput, actor, conn);
      customerId = createdPartner!.id;
    }

    const customerCategory =
      enumOrNull(body?.customerCategory || body?.customerStatus, ['NEW', 'EXISTING']) || 'NEW';
    const fapNumber =
      cleanUserFapNumber(identity?.fapNumber) ||
      cleanUserFapNumber(body?.fapNumber) ||
      (await nextFapNumber(conn));
    const appDate = dateStr(body?.applicationDate) || new Date().toISOString().slice(0, 10);

    const loc = await resolveLocationIds(
      {
        country: body?.country || 'Indonesia',
        province: body?.province,
        city: body?.city,
        district: body?.district,
        village: body?.village,
        postalCode: body?.postalCode,
      },
      conn as any,
    );
    const [branchId, companyTypeId, premiseStatusId, industrySegmentId, businessRoleId] = await Promise.all([
      resolveMasterId('crm_master_branches', body?.branchCode, undefined, conn as any),
      resolveMasterId(
        'crm_master_business_categories',
        body?.companyType || body?.customer?.companyType,
        undefined,
        conn as any,
      ),
      resolveMasterId('crm_master_premise_statuses', body?.locationStatus, undefined, conn as any),
      resolveMasterId('crm_master_industry_segments', body?.industrySegment, undefined, conn as any),
      resolveMasterId('crm_master_business_roles', body?.businessRole, undefined, conn as any),
    ]);

    const makerUserId = userId;
    const makerName = actorName;

    await conn.execute(
      `INSERT INTO crm_applications (
        id, fap_registration_number, application_date, customer_id, customer_category, branch_id,
        current_status_id, is_fap_doc_uploaded, is_fap_form_locked, latest_freeze_version,
        maker_user_id, maker_name, created_by, updated_by
      ) VALUES (?,?,?,?,?,?,?,0,0,0,?,?,?,?)`,
      [
        appId,
        fapNumber,
        appDate,
        customerId,
        customerCategory,
        branchId,
        statusRow.id,
        makerUserId,
        makerName,
        actorName,
        actorName,
      ],
    );

    await conn.execute(
      `INSERT INTO crm_application_stage_progress (
        id, application_id, stage_id, status_id, is_locked, started_at, assigned_user_id, assigned_user_name, created_by, updated_by
      ) VALUES (?,?,?,?,0,CURRENT_TIMESTAMP(3),?,?,?,?)`,
      [randomUUID(), appId, fapStage.id, statusRow.id, makerUserId, makerName, actorName, actorName],
    );

    if (String(body?.stage || '').toLowerCase().includes('pre') && preStage) {
      await conn.execute(
        `INSERT INTO crm_application_stage_progress (
          id, application_id, stage_id, status_id, is_locked, started_at, assigned_user_id, assigned_user_name, created_by, updated_by
        ) VALUES (?,?,?,?,0,CURRENT_TIMESTAMP(3),?,?,?,?)
        ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(3)`,
        [randomUUID(), appId, preStage.id, statusRow.id, makerUserId, makerName, actorName, actorName],
      );
    }

    const companyName =
      cleanNullableString(body?.companyName || body?.customer?.companyName) || 'Draft Company';

    await conn.execute(
      `INSERT INTO crm_fap_application_profiles (
        id, application_id, company_name, business_category_id, nib, nib_date, npwp,
        establishment_act_no, establishment_date, premise_status_id, company_address,
        country_id, province_id, city_id, district_id, village_id, postal_code_id,
        rt, rw, phone_fax, company_email, website, main_business, repayment_source,
        experience_years, experience_months, latest_deed_no, latest_deed_date,
        asset_he_liugong, asset_truck_liugong, asset_he_non_liugong, asset_truck_non_liugong,
        industry_segment_id, business_role_id, reference_comments, is_financial_audited,
        created_by, updated_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        randomUUID(),
        appId,
        companyName,
        companyTypeId,
        shortCode(body?.nib || body?.customer?.nib, 32),
        dateStr(body?.nibDate || body?.customer?.nibDate),
        shortCode(body?.npwp || body?.customer?.npwp, 32),
        shortCode(body?.establishmentActNo || body?.customer?.establishmentActNo, 150),
        dateStr(body?.establishmentDate || body?.customer?.establishmentDate),
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
        cleanNullableString(body?.repaymentSource),
        cleanInt(body?.experienceYears, 0),
        Math.min(11, cleanInt(body?.experienceMonths, 0)),
        shortCode(body?.latestDeedNo, 150),
        dateStr(body?.latestDeedDate),
        cleanInt(body?.assetSummaryHeLiuGong, 0),
        cleanInt(body?.assetSummaryTruckLiuGong, 0),
        cleanInt(body?.assetSummaryHeNonLiuGong, 0),
        cleanInt(body?.assetSummaryTruckNonLiuGong, 0),
        industrySegmentId,
        businessRoleId,
        cleanNullableString(body?.referenceComments),
        body?.financialAudited ? 1 : 0,
        actorName,
        actorName,
      ],
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return intakeDetail(appId);
}
