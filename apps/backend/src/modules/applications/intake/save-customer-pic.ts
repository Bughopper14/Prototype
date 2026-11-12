/** Saving the customer profile, PIC, business/financing, and financial statements of an application on crm_liugong1. */
import {randomUUID} from 'node:crypto';
import {
  cleanNullableString,
  enumOrNull,
  resolveLocationIds,
  resolveMasterId,
  resolveWorkflowStageByCode,
} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';
import {Problem} from '../../../core/domain';
import {saveBusiness} from '../business.repository';
import {saveFinancialStatements} from '../financial-statements.repository';
import {intakeDetail} from './detail';
import {actorMeta, cleanInt, dateStr, shortCode} from './helpers';

export async function saveCustomerPic(id: string, body: any, actor?: any) {
  const {userId, actorName} = actorMeta(actor);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [appRows] = await conn.query<any[]>(
      'SELECT * FROM crm_applications WHERE id = ? AND deleted_at IS NULL LIMIT 1',
      [id],
    );
    const app = appRows[0];
    if (!app) throw new Problem(404, 'Application not found.');

    const profile = body?.profile || {};
    const cust = body?.customer || {};
    const merged: Record<string, any> = {...cust};
    for (const [k, v] of Object.entries(profile)) {
      if (v !== undefined && v !== null && v !== '') {
        merged[k] = v;
      } else if (!(k in merged) || merged[k] === undefined) {
        merged[k] = v;
      }
    }

    const customerCategory =
      enumOrNull(body?.customerCategory || merged.customerStatus || app.customer_category, [
        'NEW',
        'EXISTING',
      ]) || app.customer_category;
    const branchId =
      (await resolveMasterId('crm_master_branches', merged.branchCode, undefined, conn as any)) ??
      app.branch_id;

    await conn.execute(
      `UPDATE crm_applications
       SET customer_category = ?, branch_id = ?, updated_at = CURRENT_TIMESTAMP(3), updated_by = ?
       WHERE id = ?`,
      [customerCategory, branchId, actorName, id],
    );

    if (String(body?.stage || '').toLowerCase().includes('pre')) {
      const preStage = await resolveWorkflowStageByCode('PRE_ANALYSIS', conn as any);
      if (preStage) {
        await conn.execute(
          `INSERT INTO crm_application_stage_progress (
            id, application_id, stage_id, status_id, is_locked, started_at, assigned_user_id, assigned_user_name, created_by, updated_by
          ) VALUES (?,?,?,?,0,CURRENT_TIMESTAMP(3),?,?,?,?)
          ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(3), updated_by = VALUES(updated_by)`,
          [randomUUID(), id, preStage.id, app.current_status_id, userId, actorName, actorName, actorName],
        );
      }
    }

    // Profile upsert (when profile/customer fields are present)
    const hasProfileInput = Boolean(
      body?.profile || body?.customer || body?.companyName !== undefined || body?.referenceComments !== undefined,
    );
    if (hasProfileInput) {
      const [existingProfRows] = await conn.query<any[]>(
        'SELECT * FROM crm_fap_application_profiles WHERE application_id = ? LIMIT 1',
        [id],
      );
      const ex = existingProfRows[0] || {};

      const loc = await resolveLocationIds(
        {
          country: merged.country || 'Indonesia',
          province: merged.province,
          city: merged.city,
          district: merged.district,
          village: merged.village,
          postalCode: merged.postalCode,
        },
        conn as any,
      );
      const [companyTypeId, premiseStatusId, industrySegmentId, businessRoleId] = await Promise.all([
        merged.companyType !== undefined
          ? resolveMasterId('crm_master_business_categories', merged.companyType, undefined, conn as any)
          : Promise.resolve(ex.business_category_id ?? null),
        merged.locationStatus !== undefined
          ? resolveMasterId('crm_master_premise_statuses', merged.locationStatus, undefined, conn as any)
          : Promise.resolve(ex.premise_status_id ?? null),
        merged.industrySegment !== undefined
          ? resolveMasterId('crm_master_industry_segments', merged.industrySegment, undefined, conn as any)
          : Promise.resolve(ex.industry_segment_id ?? null),
        merged.businessRole !== undefined
          ? resolveMasterId('crm_master_business_roles', merged.businessRole, undefined, conn as any)
          : Promise.resolve(ex.business_role_id ?? null),
      ]);

      const companyName =
        cleanNullableString(merged.companyName) || ex.company_name || 'Draft Company';
      const vals = {
        company_name: companyName,
        business_category_id: companyTypeId,
        nib: merged.nib !== undefined ? shortCode(merged.nib, 32) : ex.nib ?? null,
        nib_date: merged.nibDate !== undefined ? dateStr(merged.nibDate) : ex.nib_date ?? null,
        npwp: merged.npwp !== undefined ? shortCode(merged.npwp, 32) : ex.npwp ?? null,
        establishment_act_no:
          merged.establishmentActNo !== undefined
            ? shortCode(merged.establishmentActNo, 150)
            : ex.establishment_act_no ?? null,
        establishment_date:
          merged.establishmentDate !== undefined
            ? dateStr(merged.establishmentDate)
            : ex.establishment_date ?? null,
        premise_status_id: premiseStatusId,
        company_address:
          merged.companyAddress !== undefined
            ? cleanNullableString(merged.companyAddress)
            : ex.company_address ?? null,
        country_id: merged.country !== undefined ? loc.countryId : ex.country_id ?? loc.countryId,
        province_id: merged.province !== undefined ? loc.provinceId : ex.province_id ?? null,
        city_id: merged.city !== undefined ? loc.cityId : ex.city_id ?? null,
        district_id: merged.district !== undefined ? loc.districtId : ex.district_id ?? null,
        village_id: merged.village !== undefined ? loc.villageId : ex.village_id ?? null,
        postal_code_id: merged.postalCode !== undefined ? loc.postalCodeId : ex.postal_code_id ?? null,
        rt: merged.rt !== undefined ? shortCode(merged.rt, 5) : ex.rt ?? null,
        rw: merged.rw !== undefined ? shortCode(merged.rw, 5) : ex.rw ?? null,
        phone_fax: merged.phoneFax !== undefined ? shortCode(merged.phoneFax, 50) : ex.phone_fax ?? null,
        company_email:
          merged.email !== undefined ? shortCode(merged.email, 255) : ex.company_email ?? null,
        website: merged.website !== undefined ? shortCode(merged.website, 255) : ex.website ?? null,
        main_business:
          merged.mainBusiness !== undefined ? cleanNullableString(merged.mainBusiness) : ex.main_business ?? null,
        repayment_source:
          merged.repaymentSource !== undefined
            ? cleanNullableString(merged.repaymentSource)
            : ex.repayment_source ?? null,
        experience_years:
          merged.experienceYears !== undefined ? cleanInt(merged.experienceYears, 0) : ex.experience_years ?? 0,
        experience_months:
          merged.experienceMonths !== undefined
            ? Math.min(11, cleanInt(merged.experienceMonths, 0))
            : ex.experience_months ?? 0,
        latest_deed_no:
          merged.latestDeedNo !== undefined ? shortCode(merged.latestDeedNo, 150) : ex.latest_deed_no ?? null,
        latest_deed_date:
          merged.latestDeedDate !== undefined ? dateStr(merged.latestDeedDate) : ex.latest_deed_date ?? null,
        asset_he_liugong:
          merged.assetSummaryHeLiuGong !== undefined
            ? cleanInt(merged.assetSummaryHeLiuGong, 0)
            : ex.asset_he_liugong ?? 0,
        asset_truck_liugong:
          merged.assetSummaryTruckLiuGong !== undefined
            ? cleanInt(merged.assetSummaryTruckLiuGong, 0)
            : ex.asset_truck_liugong ?? 0,
        asset_he_non_liugong:
          merged.assetSummaryHeNonLiuGong !== undefined
            ? cleanInt(merged.assetSummaryHeNonLiuGong, 0)
            : ex.asset_he_non_liugong ?? 0,
        asset_truck_non_liugong:
          merged.assetSummaryTruckNonLiuGong !== undefined
            ? cleanInt(merged.assetSummaryTruckNonLiuGong, 0)
            : ex.asset_truck_non_liugong ?? 0,
        industry_segment_id: industrySegmentId,
        business_role_id: businessRoleId,
        reference_comments:
          merged.referenceComments !== undefined
            ? cleanNullableString(merged.referenceComments)
            : ex.reference_comments ?? null,
        is_financial_audited:
          merged.financialAudited !== undefined
            ? merged.financialAudited
              ? 1
              : 0
            : ex.is_financial_audited ?? 0,
      };

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
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          company_name=VALUES(company_name), business_category_id=VALUES(business_category_id),
          nib=VALUES(nib), nib_date=VALUES(nib_date), npwp=VALUES(npwp),
          establishment_act_no=VALUES(establishment_act_no), establishment_date=VALUES(establishment_date),
          premise_status_id=VALUES(premise_status_id), company_address=VALUES(company_address),
          country_id=VALUES(country_id), province_id=VALUES(province_id), city_id=VALUES(city_id),
          district_id=VALUES(district_id), village_id=VALUES(village_id), postal_code_id=VALUES(postal_code_id),
          rt=VALUES(rt), rw=VALUES(rw), phone_fax=VALUES(phone_fax), company_email=VALUES(company_email),
          website=VALUES(website), main_business=VALUES(main_business), repayment_source=VALUES(repayment_source),
          experience_years=VALUES(experience_years), experience_months=VALUES(experience_months),
          latest_deed_no=VALUES(latest_deed_no), latest_deed_date=VALUES(latest_deed_date),
          asset_he_liugong=VALUES(asset_he_liugong), asset_truck_liugong=VALUES(asset_truck_liugong),
          asset_he_non_liugong=VALUES(asset_he_non_liugong), asset_truck_non_liugong=VALUES(asset_truck_non_liugong),
          industry_segment_id=VALUES(industry_segment_id), business_role_id=VALUES(business_role_id),
          reference_comments=VALUES(reference_comments), is_financial_audited=VALUES(is_financial_audited),
          updated_at=CURRENT_TIMESTAMP(3), updated_by=VALUES(updated_by)`,
        [
          randomUUID(),
          id,
          vals.company_name,
          vals.business_category_id,
          vals.nib,
          vals.nib_date,
          vals.npwp,
          vals.establishment_act_no,
          vals.establishment_date,
          vals.premise_status_id,
          vals.company_address,
          vals.country_id,
          vals.province_id,
          vals.city_id,
          vals.district_id,
          vals.village_id,
          vals.postal_code_id,
          vals.rt,
          vals.rw,
          vals.phone_fax,
          vals.company_email,
          vals.website,
          vals.main_business,
          vals.repayment_source,
          vals.experience_years,
          vals.experience_months,
          vals.latest_deed_no,
          vals.latest_deed_date,
          vals.asset_he_liugong,
          vals.asset_truck_liugong,
          vals.asset_he_non_liugong,
          vals.asset_truck_non_liugong,
          vals.industry_segment_id,
          vals.business_role_id,
          vals.reference_comments,
          vals.is_financial_audited,
          actorName,
          actorName,
        ],
      );

      // Sync shared fields back to Master Business Partner directory (excluding removed skt_no / sppkp_no)
      await conn.execute(
        `UPDATE crm_master_business_partners SET
          company_name=?, business_category_id=?, nib=?, nib_date=?, npwp=?,
          establishment_act_no=?, establishment_date=?, latest_deed_no=?, latest_deed_date=?,
          branch_id=?, premise_status_id=?, company_address=?,
          country_id=?, province_id=?, city_id=?, district_id=?, village_id=?, postal_code_id=?,
          rt=?, rw=?, phone_fax=?, email=?, website=?, main_business=?,
          experience_years=?, experience_months=?, repayment_source=?,
          industry_segment_id=?, business_role_id=?,
          asset_he_liugong=?, asset_truck_liugong=?, asset_he_non_liugong=?, asset_truck_non_liugong=?,
          updated_at=CURRENT_TIMESTAMP(3), updated_by=?
        WHERE id=?`,
        [
          vals.company_name,
          vals.business_category_id,
          vals.nib,
          vals.nib_date,
          vals.npwp,
          vals.establishment_act_no,
          vals.establishment_date,
          vals.latest_deed_no,
          vals.latest_deed_date,
          branchId,
          vals.premise_status_id,
          vals.company_address,
          vals.country_id,
          vals.province_id,
          vals.city_id,
          vals.district_id,
          vals.village_id,
          vals.postal_code_id,
          vals.rt,
          vals.rw,
          vals.phone_fax,
          vals.company_email,
          vals.website,
          vals.main_business,
          vals.experience_years,
          vals.experience_months,
          vals.repayment_source,
          vals.industry_segment_id,
          vals.business_role_id,
          vals.asset_he_liugong,
          vals.asset_truck_liugong,
          vals.asset_he_non_liugong,
          vals.asset_truck_non_liugong,
          actorName,
          app.customer_id,
        ],
      );
    }

    // PIC upsert
    if (body?.pic && typeof body.pic === 'object') {
      const pic = body.pic;
      const picLoc = await resolveLocationIds(
        {
          country: pic.country || 'Indonesia',
          province: pic.province,
          city: pic.city,
          district: pic.district,
          village: pic.village,
          postalCode: pic.postalCode,
        },
        conn as any,
      );
      const posId = await resolveMasterId('crm_master_pic_positions', pic.position, undefined, conn as any);
      await conn.execute(
        `INSERT INTO crm_fap_primary_contacts (
          id, application_id, pic_name, position_id, phone, email,
          country_id, province_id, city_id, district_id, village_id, postal_code_id,
          rt, rw, current_address, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          pic_name=VALUES(pic_name), position_id=VALUES(position_id), phone=VALUES(phone), email=VALUES(email),
          country_id=VALUES(country_id), province_id=VALUES(province_id), city_id=VALUES(city_id),
          district_id=VALUES(district_id), village_id=VALUES(village_id), postal_code_id=VALUES(postal_code_id),
          rt=VALUES(rt), rw=VALUES(rw), current_address=VALUES(current_address),
          updated_at=CURRENT_TIMESTAMP(3), updated_by=VALUES(updated_by)`,
        [
          randomUUID(),
          id,
          cleanNullableString(pic.picName || pic.name)?.slice(0, 150) ?? null,
          posId,
          shortCode(pic.phone, 50),
          shortCode(pic.email, 255),
          picLoc.countryId,
          picLoc.provinceId,
          picLoc.cityId,
          picLoc.districtId,
          picLoc.villageId,
          picLoc.postalCodeId,
          shortCode(pic.rt, 5),
          shortCode(pic.rw, 5),
          cleanNullableString(pic.currentAddress || pic.address),
          actorName,
          actorName,
        ],
      );
    }

    // Business (projects, bank references, proposal, terms, units, doc/purpose requirements)
    await saveBusiness(id, body, conn, actorName);

    // Financial statements
    if (Array.isArray(body?.financialStatements)) {
      const isAudited = Boolean(
        body?.profile?.financialAudited ?? body?.financialAudited ?? body?.isAudited,
      );
      await saveFinancialStatements(id, body.financialStatements, isAudited, actorName, conn);
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return intakeDetail(id);
}
