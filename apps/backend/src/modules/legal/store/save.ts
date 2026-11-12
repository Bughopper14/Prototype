/** Transactional persistence for legal deeds, remark categories, review metadata, and stakeholders. */
import {randomUUID} from 'node:crypto';
import {ageFromDateOfBirth} from '@liugong/shared';
import {
  cleanNullableString,
  enumOrNull,
  resolveMasterId,
} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';
import {cleanDecimal, cleanNullableInt, dateStr, shortCode} from '../../applications/intake/helpers';
import {
  normalizeCitizenship,
  normalizeIdType,
  normalizeRemarkCategoryCode,
  splitFullName,
} from './helpers';
import {stakeholderLocationNames} from './locations';
import {readLegal} from './read';
import {mapReviewStatus, syncDeedReviewChildren} from './deed-review';
import {linkStakeholderIdentityDocuments} from '../../identity-documents/identity-documents.store';

export async function saveLegal(applicationId: string, incoming: any, _final = false) {
  const deeds = Array.isArray(incoming?.deeds) ? incoming.deeds : [];
  const selectedDeedId = cleanNullableString(incoming?.selectedDeedId);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const keepDeedIds = deeds.map((d: any) => String(d?.id || randomUUID()).slice(0, 36));
    if (keepDeedIds.length > 0) {
      const ph = keepDeedIds.map(() => '?').join(',');
      await conn.execute(
        `UPDATE crm_fap_legal_deeds
         SET deleted_at = CURRENT_TIMESTAMP(3), is_selected = 0, updated_at = CURRENT_TIMESTAMP(3)
         WHERE application_id = ? AND deleted_at IS NULL AND id NOT IN (${ph})`,
        [applicationId, ...keepDeedIds],
      );
      await conn.execute(
        `UPDATE crm_fap_legal_stakeholders
         SET is_active = 0, deleted_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
         WHERE application_id = ? AND deleted_at IS NULL AND deed_id NOT IN (${ph})`,
        [applicationId, ...keepDeedIds],
      );
    } else {
      await conn.execute(
        `UPDATE crm_fap_legal_deeds
         SET deleted_at = CURRENT_TIMESTAMP(3), is_selected = 0, updated_at = CURRENT_TIMESTAMP(3)
         WHERE application_id = ? AND deleted_at IS NULL`,
        [applicationId],
      );
      await conn.execute(
        `UPDATE crm_fap_legal_stakeholders
         SET is_active = 0, deleted_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
         WHERE application_id = ? AND deleted_at IS NULL`,
        [applicationId],
      );
    }

    const latestIndex = deeds.length - 1;
    let estDeedNo: string | null = null;
    let estDeedDate: string | null = null;
    let latestDeedNo: string | null = null;
    let latestDeedDate: string | null = null;

    for (let i = 0; i < deeds.length; i++) {
      const d = deeds[i];
      const deedId = keepDeedIds[i];
      const isEstablishment = String(d?.type || '').toLowerCase() === 'establishment';
      const deedType: 'ESTABLISHMENT' | 'AMENDMENT' = isEstablishment ? 'ESTABLISHMENT' : 'AMENDMENT';
      const deedNumber = cleanNullableString(d?.deedNumber)?.slice(0, 255) || 'DRAFT';
      const deedDate = dateStr(d?.deedDate) || new Date().toISOString().slice(0, 10);
      const deedStatus = enumOrNull(d?.deedStatus, ['ACTIVE', 'INACTIVE']) || 'ACTIVE';
      const isSelected = selectedDeedId ? deedId === selectedDeedId : i === latestIndex;
      const isLatest = i === latestIndex;

      if (isEstablishment) {
        estDeedNo = cleanNullableString(d?.deedNumber)?.slice(0, 150) ?? estDeedNo;
        estDeedDate = dateStr(d?.deedDate) ?? estDeedDate;
      }
      if (cleanNullableString(d?.deedNumber)) {
        latestDeedNo = cleanNullableString(d?.deedNumber)?.slice(0, 150) ?? latestDeedNo;
        latestDeedDate = dateStr(d?.deedDate) ?? latestDeedDate;
      }

      await conn.execute(
        `INSERT INTO crm_fap_legal_deeds (
          id, application_id, deed_type, deed_number, deed_date, notary_name, deed_status,
          valid_until, ministerial_decree_number, ministerial_decree_date, remarks,
          representative_note, company_shareholder_note, is_selected, is_latest_deed, deleted_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)
        ON DUPLICATE KEY UPDATE
          deed_type=VALUES(deed_type), deed_number=VALUES(deed_number), deed_date=VALUES(deed_date),
          notary_name=VALUES(notary_name), deed_status=VALUES(deed_status), valid_until=VALUES(valid_until),
          ministerial_decree_number=VALUES(ministerial_decree_number),
          ministerial_decree_date=VALUES(ministerial_decree_date), remarks=VALUES(remarks),
          representative_note=VALUES(representative_note),
          company_shareholder_note=VALUES(company_shareholder_note),
          is_selected=VALUES(is_selected), is_latest_deed=VALUES(is_latest_deed),
          deleted_at=NULL, updated_at=CURRENT_TIMESTAMP(3)`,
        [
          deedId,
          applicationId,
          deedType,
          deedNumber,
          deedDate,
          cleanNullableString(d?.notaryName)?.slice(0, 200) ?? null,
          deedStatus,
          dateStr(d?.validUntil),
          cleanNullableString(d?.ministerialDecreeNumber)?.slice(0, 255) ?? null,
          dateStr(d?.ministerialDecreeDate),
          cleanNullableString(d?.remarks),
          cleanNullableString(d?.representativeNote),
          cleanNullableString(d?.companyShareholderNote),
          isSelected ? 1 : 0,
          isLatest ? 1 : 0,
        ],
      );

      // Remark categories junction
      await conn.execute('DELETE FROM crm_fap_legal_deed_remark_categories WHERE deed_id = ?', [deedId]);
      const rawCats: unknown[] = [];
      if (d?.remarkCategoryId) rawCats.push(d.remarkCategoryId);
      if (Array.isArray(d?.remarkCategoryIds)) rawCats.push(...d.remarkCategoryIds);
      const seenCatIds = new Set<string>();
      for (const rc of rawCats) {
        const normCode = normalizeRemarkCategoryCode(rc);
        if (!normCode) continue;
        const rcId = await resolveMasterId('crm_master_legal_remark_categories', normCode, undefined, conn as any);
        if (!rcId || seenCatIds.has(rcId)) continue;
        seenCatIds.add(rcId);
        await conn.execute(
          `INSERT INTO crm_fap_legal_deed_remark_categories (id, deed_id, remark_category_id)
           VALUES (?,?,?)`,
          [randomUUID(), deedId, rcId],
        );
      }

      // Preserve review state + extended deed UI metadata relationally in crm_fap_legal_deed_reviews
      const [revRows] = await conn.query<any[]>(
        'SELECT * FROM crm_fap_legal_deed_reviews WHERE application_id = ? AND deed_id = ? LIMIT 1',
        [applicationId, deedId],
      );
      const revRow = revRows[0];
      const nextReview = d?.review || {
        status: revRow?.workflow_status || 'DRAFT',
        revision: Number(revRow?.revision || 1),
      };
      const dbStatus = mapReviewStatus(nextReview.status);
      const revId = revRow?.id || randomUUID();

      await conn.execute(
        `INSERT INTO crm_fap_legal_deed_reviews (
          id, application_id, deed_id, review_status, source, deed_created_at,
          workflow_status, revision, document_id,
          submitted_by_id, submitted_by, submitted_at,
          checked_by_id, checked_by, checked_at,
          rejected_by, rejected_at, rejection_reason,
          correction_by, correction_at, correction_note,
          info_added, approved_by, approved_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          review_status = VALUES(review_status),
          source = VALUES(source),
          deed_created_at = COALESCE(VALUES(deed_created_at), deed_created_at),
          workflow_status = VALUES(workflow_status),
          revision = VALUES(revision),
          document_id = VALUES(document_id),
          submitted_by_id = VALUES(submitted_by_id),
          submitted_by = VALUES(submitted_by),
          submitted_at = VALUES(submitted_at),
          checked_by_id = VALUES(checked_by_id),
          checked_by = VALUES(checked_by),
          checked_at = VALUES(checked_at),
          rejected_by = VALUES(rejected_by),
          rejected_at = VALUES(rejected_at),
          rejection_reason = VALUES(rejection_reason),
          correction_by = VALUES(correction_by),
          correction_at = VALUES(correction_at),
          correction_note = VALUES(correction_note),
          info_added = COALESCE(VALUES(info_added), info_added),
          approved_by = COALESCE(VALUES(approved_by), approved_by),
          approved_at = COALESCE(VALUES(approved_at), approved_at),
          updated_at = CURRENT_TIMESTAMP(3)`,
        [
          revId,
          applicationId,
          deedId,
          dbStatus,
          d?.source || revRow?.source || 'manual',
          d?.createdAt || revRow?.deed_created_at || new Date().toISOString(),
          String(nextReview.status || 'DRAFT').slice(0, 30),
          Number(nextReview.revision || 1),
          nextReview.documentId ?? revRow?.document_id ?? null,
          nextReview.submittedById ?? revRow?.submitted_by_id ?? null,
          nextReview.submittedBy ?? revRow?.submitted_by ?? null,
          nextReview.submittedAt ?? revRow?.submitted_at ?? null,
          nextReview.checkedById !== undefined ? nextReview.checkedById : revRow?.checked_by_id ?? null,
          nextReview.checkedBy !== undefined ? nextReview.checkedBy : revRow?.checked_by ?? null,
          nextReview.checkedAt !== undefined ? nextReview.checkedAt : revRow?.checked_at ?? null,
          nextReview.rejectedBy !== undefined ? nextReview.rejectedBy : revRow?.rejected_by ?? null,
          nextReview.rejectedAt !== undefined ? nextReview.rejectedAt : revRow?.rejected_at ?? null,
          nextReview.rejectionReason !== undefined ? nextReview.rejectionReason : revRow?.rejection_reason ?? null,
          nextReview.correctionBy !== undefined ? nextReview.correctionBy : revRow?.correction_by ?? null,
          nextReview.correctionAt !== undefined ? nextReview.correctionAt : revRow?.correction_at ?? null,
          nextReview.correctionNote !== undefined ? nextReview.correctionNote : revRow?.correction_note ?? null,
          d?.infoAdded !== undefined ? d.infoAdded : revRow?.info_added ?? null,
          nextReview.approvedBy ?? revRow?.approved_by ?? null,
          d?.approvedAt ? new Date(d.approvedAt) : revRow?.approved_at ?? null,
        ],
      );

      await syncDeedReviewChildren(conn, revId, applicationId, deedId, {
        reviewHistory: Array.isArray(d?.reviewHistory) ? d.reviewHistory : undefined,
        approvedSnapshot: d?.approvedSnapshot,
        comparisonBefore: nextReview.comparisonBefore,
        parties: d?.parties,
        categoryRemarks: d?.categoryRemarks,
      });

      // Stakeholders for this deed
      const deedStakeholders = Array.isArray(d?.stakeholders)
        ? d.stakeholders
        : isSelected && Array.isArray(incoming?.stakeholders)
          ? incoming.stakeholders
          : [];

      await conn.execute(
        `UPDATE crm_fap_legal_stakeholders
         SET is_active = 0, deleted_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
         WHERE deed_id = ? AND is_active = 1`,
        [deedId],
      );

      for (const s of deedStakeholders) {
        if (!s) continue;
        const stId = String(s.id || randomUUID()).slice(0, 36);
        const {ids: loc} = await stakeholderLocationNames(conn, s);
        const [repTypeId, posId, desId] = await Promise.all([
          resolveMasterId('crm_master_legal_representative_types', s.representativeType, undefined, conn as any),
          resolveMasterId('crm_master_stakeholder_positions', s.position, undefined, conn as any),
          resolveMasterId('crm_master_legal_designations', s.designation, undefined, conn as any),
        ]);
        const {firstName, middleName, lastName} = splitFullName(s);
        const dob = dateStr(s.dateOfBirth);
        const calcAge = dob ? ageFromDateOfBirth(dob) : null;

        await conn.execute(
          `INSERT INTO crm_fap_legal_stakeholders (
            id, deed_id, application_id, representative_type_id, position_id, designation_id,
            stakeholder_type, is_signatory, id_type, id_number, id_number_secondary,
            title, first_name, middle_name, last_name, date_of_birth, age_years, age_months,
            marital_status, occupation, email, mobile_phone, gender,
            share_percentage, deposited_capital, primary_capital, citizenship,
            country_id, province_id, city_id, district_id, village_id, postal_code_id,
            foreign_region_text, rt, rw, address, is_inherited, source_deed_id,
            deleted_at, is_active
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,1)
          ON DUPLICATE KEY UPDATE
            deed_id=VALUES(deed_id), representative_type_id=VALUES(representative_type_id),
            position_id=VALUES(position_id), designation_id=VALUES(designation_id),
            stakeholder_type=VALUES(stakeholder_type), is_signatory=VALUES(is_signatory),
            id_type=VALUES(id_type), id_number=VALUES(id_number),
            id_number_secondary=VALUES(id_number_secondary), title=VALUES(title),
            first_name=VALUES(first_name), middle_name=VALUES(middle_name), last_name=VALUES(last_name),
            date_of_birth=VALUES(date_of_birth), age_years=VALUES(age_years), age_months=VALUES(age_months),
            marital_status=VALUES(marital_status), occupation=VALUES(occupation),
            email=VALUES(email), mobile_phone=VALUES(mobile_phone), gender=VALUES(gender),
            share_percentage=VALUES(share_percentage), deposited_capital=VALUES(deposited_capital),
            primary_capital=VALUES(primary_capital), citizenship=VALUES(citizenship),
            country_id=VALUES(country_id), province_id=VALUES(province_id), city_id=VALUES(city_id),
            district_id=VALUES(district_id), village_id=VALUES(village_id), postal_code_id=VALUES(postal_code_id),
            foreign_region_text=VALUES(foreign_region_text), rt=VALUES(rt), rw=VALUES(rw),
            address=VALUES(address), is_inherited=VALUES(is_inherited), source_deed_id=VALUES(source_deed_id),
            deleted_at=NULL, is_active=1, updated_at=CURRENT_TIMESTAMP(3)`,
          [
            stId,
            deedId,
            applicationId,
            repTypeId,
            posId,
            desId,
            enumOrNull(s.stakeholderType || s.type, ['INDIVIDUAL', 'CORPORATE']) || 'INDIVIDUAL',
            enumOrNull(s.isSignatory, ['YES', 'NO']),
            normalizeIdType(s.idType),
            shortCode(s.idNumber, 50),
            shortCode(s.idNumberSecondary, 50),
            enumOrNull(s.title, ['MR', 'MRS', 'MS', 'DR', 'OTHER']),
            firstName,
            middleName,
            lastName,
            dob,
            calcAge ? Number(calcAge.ageYears) : cleanNullableInt(s.ageYears),
            calcAge ? Number(calcAge.ageMonths) : cleanNullableInt(s.ageMonths),
            enumOrNull(s.maritalStatus, ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER']),
            shortCode(s.occupation, 100),
            shortCode(s.email, 255),
            shortCode(s.mobilePhone, 30),
            enumOrNull(s.gender, ['MALE', 'FEMALE', 'OTHER']),
            cleanDecimal(s.sharePercentage, 0) ?? 0,
            cleanDecimal(s.depositedCapital),
            cleanDecimal(s.primaryCapital),
            normalizeCitizenship(s.citizenship || s.nationalityType),
            loc.countryId,
            loc.provinceId,
            loc.cityId,
            loc.districtId,
            loc.villageId,
            loc.postalCodeId,
            shortCode(s.foreignRegionText, 255),
            shortCode(s.rt, 5),
            shortCode(s.rw, 5),
            cleanNullableString(s.address),
            s.isInherited ? 1 : 0,
            cleanNullableString(s.sourceDeedId)?.slice(0, 36) ?? null,
          ],
        );

        await linkStakeholderIdentityDocuments(conn, stId, s);
      }
    }

    // Sync Establishment & Latest Deed numbers back to Application Profile + Master Business Partner
    if (estDeedNo || latestDeedNo) {
      await conn.execute(
        `UPDATE crm_fap_application_profiles
         SET establishment_act_no = COALESCE(?, establishment_act_no),
             establishment_date = COALESCE(?, establishment_date),
             latest_deed_no = COALESCE(?, latest_deed_no),
             latest_deed_date = COALESCE(?, latest_deed_date),
             updated_at = CURRENT_TIMESTAMP(3)
         WHERE application_id = ?`,
        [estDeedNo, estDeedDate, latestDeedNo, latestDeedDate, applicationId],
      );
      await conn.execute(
        `UPDATE crm_master_business_partners bp
         JOIN crm_applications a ON a.customer_id = bp.id
         SET bp.establishment_act_no = COALESCE(?, bp.establishment_act_no),
             bp.establishment_date = COALESCE(?, bp.establishment_date),
             bp.latest_deed_no = COALESCE(?, bp.latest_deed_no),
             bp.latest_deed_date = COALESCE(?, bp.latest_deed_date),
             bp.updated_at = CURRENT_TIMESTAMP(3)
         WHERE a.id = ?`,
        [estDeedNo, estDeedDate, latestDeedNo, latestDeedDate, applicationId],
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  return readLegal(applicationId);
}
