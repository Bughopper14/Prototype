import {storedDocumentUrl} from '@liugong/shared';
import crypto from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {cleanNullableString, isUuid} from '../../core/db/crm-lookups';
import {pool} from '../../core/db/pool';
import {dateStr} from '../applications/intake/helpers';

export const OCR_TABLES: Record<string, string> = {
  ktp: 'crm_fap_ocr_ktp',
  npwp: 'crm_fap_ocr_npwp',
  passport: 'crm_fap_ocr_passport',
  kitas: 'crm_fap_ocr_kitas',
};

export type IdentityDocType = 'ktp' | 'npwp' | 'passport' | 'kitas';

export type StoredIdentityRow = {
  id: string;
  stakeholder_id: string;
  document_path: string | null;
  file_name: string | null;
  ocr_data: Record<string, any> | null;
};

type SqlExecutor = Pick<PoolConnection, 'query' | 'execute'>;

async function queryOne<T = any>(db: SqlExecutor, sql: string, params: unknown[]): Promise<T | null> {
  const [rows] = await db.query<any[]>(sql, params);
  return (rows[0] as T | undefined) ?? null;
}

const pick = (obj: any, ...keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
};

function normalizeStoredPath(raw?: unknown): string | null {
  const clean = cleanNullableString(raw);
  if (!clean) return null;
  if (/^(data:|blob:)/i.test(clean)) return null;
  if (/^\/?documents\//i.test(clean.replace(/\\/g, '/'))) {
    return storedDocumentUrl(clean);
  }
  return clean.slice(0, 500);
}

/** Resolves an ID to an active stakeholder row in crm_fap_legal_stakeholders, or null if not yet saved. */
export async function resolveExistingStakeholderId(
  rawId: unknown,
  db: SqlExecutor = pool,
): Promise<string | null> {
  const s = cleanNullableString(rawId);
  if (!s || !isUuid(s)) return null;
  const row = await queryOne(
    db,
    'SELECT id FROM crm_fap_legal_stakeholders WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [s],
  );
  return row ? s : null;
}

/** Inserts or updates the OCR record in crm_fap_ocr_<docType> for a scanned/uploaded identity document. */
export async function upsertIdentityRecord(
  docType: string,
  params: {
    stakeholderId: string | null;
    rawStakeholderId?: string | null;
    documentPath: string | null;
    fileName: string | null;
    data: any;
    actorName: string;
  },
  db: SqlExecutor = pool,
) {
  const table = OCR_TABLES[docType];
  if (!table) return null;
  const {stakeholderId, documentPath, fileName, data, actorName} = params;
  const existing = stakeholderId
    ? await queryOne<any>(db, `SELECT id FROM \`${table}\` WHERE stakeholder_id = ? LIMIT 1`, [stakeholderId])
    : null;
  const id = existing?.id || crypto.randomUUID();

  if (docType === 'ktp') {
    const fields = {
      nik: pick(data, 'nik', 'idNo', 'idNumber'),
      full_name: pick(data, 'nama', 'full_name', 'fullName', 'name'),
      birth_place: pick(data, 'tempat_lahir', 'birth_place', 'birthPlace', 'tempatLahir'),
      birth_date: dateStr(pick(data, 'tanggal_lahir', 'birth_date', 'birthDate', 'tanggalLahir')),
      gender: pick(data, 'jenis_kelamin', 'gender'),
      blood_type: pick(data, 'golongan_darah', 'blood_type', 'bloodType', 'golonganDarah')?.slice(0, 10) ?? null,
      address: pick(data, 'alamat', 'address'),
      street_address: pick(data, 'street_address', 'streetAddress', 'alamat', 'address'),
      rt_rw: pick(data, 'rt_rw', 'rtRw'),
      village_name: pick(data, 'kelurahan_desa', 'kel_desa', 'kelurahan', 'village_name', 'village', 'kelDesa'),
      district_name: pick(data, 'kecamatan', 'district_name', 'district'),
      city_name: pick(data, 'kabupaten_kota', 'city_regency', 'cityRegency', 'city_name', 'city'),
      province_name: pick(data, 'provinsi', 'province_name', 'province'),
      postal_code: pick(data, 'kode_pos', 'postal_code', 'postalCode'),
      religion: pick(data, 'agama', 'religion'),
      marital_status: pick(data, 'status_perkawinan', 'marital_status', 'maritalStatus'),
      occupation: pick(data, 'pekerjaan', 'occupation'),
      nationality: pick(data, 'kewarganegaraan', 'nationality', 'citizenship'),
      valid_until: pick(data, 'berlaku_hingga', 'valid_until', 'validUntil'),
    };
    if (existing) {
      await db.execute(
        `UPDATE crm_fap_ocr_ktp SET
          nik=?, full_name=?, birth_place=?, birth_date=?, gender=?, blood_type=?,
          address=?, street_address=?, rt_rw=?, village_name=?, district_name=?,
          city_name=?, province_name=?, postal_code=?,
          religion=?, marital_status=?, occupation=?, nationality=?, valid_until=?,
          document_path=COALESCE(?, document_path), file_name=COALESCE(?, file_name),
          updated_at=CURRENT_TIMESTAMP(3), updated_by=?
        WHERE id=?`,
        [
          fields.nik, fields.full_name, fields.birth_place, fields.birth_date, fields.gender, fields.blood_type,
          fields.address, fields.street_address, fields.rt_rw, fields.village_name, fields.district_name,
          fields.city_name, fields.province_name, fields.postal_code,
          fields.religion, fields.marital_status, fields.occupation, fields.nationality, fields.valid_until,
          documentPath, fileName, actorName, id,
        ],
      );
    } else {
      await db.execute(
        `INSERT INTO crm_fap_ocr_ktp (
          id, stakeholder_id, nik, full_name, birth_place, birth_date, gender, blood_type,
          address, street_address, rt_rw, village_name, district_name,
          city_name, province_name, postal_code,
          religion, marital_status, occupation, nationality, valid_until,
          document_path, file_name, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id, stakeholderId, fields.nik, fields.full_name, fields.birth_place, fields.birth_date,
          fields.gender, fields.blood_type, fields.address, fields.street_address, fields.rt_rw,
          fields.village_name, fields.district_name, fields.city_name, fields.province_name, fields.postal_code,
          fields.religion, fields.marital_status,
          fields.occupation, fields.nationality, fields.valid_until,
          documentPath, fileName, actorName, actorName,
        ],
      );
    }
    return id;
  }

  if (docType === 'npwp') {
    const fields = {
      npwp_number: pick(data, 'npwp', 'npwp_number', 'npwpNumber'),
      raw_npwp: pick(data, 'raw_npwp', 'rawNpwp', 'npwp'),
      full_name: pick(data, 'nama', 'full_name', 'fullName', 'name'),
      nik: pick(data, 'nik'),
      address: pick(data, 'alamat', 'address'),
      village_district: pick(data, 'kelurahan_kecamatan', 'village_district', 'villageDistrict', 'kelurahanKecamatan'),
      city_province: pick(data, 'kota_provinsi', 'city_province', 'cityProvince', 'kotaProvinsi'),
      tax_office_kpp: pick(data, 'kpp', 'tax_office_kpp', 'taxOfficeKpp'),
      registered_date: pick(data, 'tanggal_terdaftar', 'registered_date', 'registeredDate', 'tanggalTerdaftar'),
    };
    if (existing) {
      await db.execute(
        `UPDATE crm_fap_ocr_npwp SET
          npwp_number=?, raw_npwp=?, full_name=?, nik=?, address=?, village_district=?,
          city_province=?, tax_office_kpp=?, registered_date=?,
          document_path=COALESCE(?, document_path), file_name=COALESCE(?, file_name),
          updated_at=CURRENT_TIMESTAMP(3), updated_by=?
        WHERE id=?`,
        [
          fields.npwp_number, fields.raw_npwp, fields.full_name, fields.nik, fields.address,
          fields.village_district, fields.city_province, fields.tax_office_kpp, fields.registered_date,
          documentPath, fileName, actorName, id,
        ],
      );
    } else {
      await db.execute(
        `INSERT INTO crm_fap_ocr_npwp (
          id, stakeholder_id, npwp_number, raw_npwp, full_name, nik, address,
          village_district, city_province, tax_office_kpp, registered_date,
          document_path, file_name, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id, stakeholderId, fields.npwp_number, fields.raw_npwp, fields.full_name, fields.nik,
          fields.address, fields.village_district, fields.city_province, fields.tax_office_kpp,
          fields.registered_date, documentPath, fileName, actorName, actorName,
        ],
      );
    }
    return id;
  }

  if (docType === 'passport') {
    const fields = {
      passport_number: pick(data, 'passport_no', 'no_paspor', 'passport_number', 'passportNumber', 'idNo'),
      country_code: pick(data, 'kode_negara', 'country_code', 'countryCode'),
      country_name: pick(data, 'negara', 'country_name', 'countryName', 'country'),
      full_name: pick(data, 'nama_lengkap', 'nama', 'full_name', 'fullName', 'name'),
      surname: pick(data, 'surname'),
      given_names: pick(data, 'given_names', 'givenNames'),
      nationality: pick(data, 'kewarganegaraan', 'nationality', 'citizenship'),
      birth_date: dateStr(pick(data, 'tanggal_lahir', 'birth_date', 'birthDate', 'dateOfBirth')),
      birth_place: pick(data, 'tempat_lahir', 'birth_place', 'birthPlace', 'placeOfBirth'),
      gender: pick(data, 'jenis_kelamin', 'gender'),
      issue_date: dateStr(pick(data, 'tanggal_keluar', 'issue_date', 'issueDate')),
      expiry_date: dateStr(pick(data, 'tanggal_habis_berlaku', 'berlaku_hingga', 'expiry_date', 'expiryDate')),
      issuing_office: pick(data, 'kantor_penerbit', 'issuing_office', 'issuingOffice', 'issuingAuthority'),
      personal_id: pick(data, 'no_reg', 'personal_id', 'personalId'),
    };
    if (existing) {
      await db.execute(
        `UPDATE crm_fap_ocr_passport SET
          passport_number=?, country_code=?, country_name=?, full_name=?, surname=?, given_names=?,
          nationality=?, birth_date=?, birth_place=?, gender=?, issue_date=?, expiry_date=?,
          issuing_office=?, personal_id=?,
          document_path=COALESCE(?, document_path), file_name=COALESCE(?, file_name),
          updated_at=CURRENT_TIMESTAMP(3), updated_by=?
        WHERE id=?`,
        [
          fields.passport_number, fields.country_code, fields.country_name, fields.full_name,
          fields.surname, fields.given_names, fields.nationality, fields.birth_date,
          fields.birth_place, fields.gender, fields.issue_date, fields.expiry_date,
          fields.issuing_office, fields.personal_id, documentPath, fileName, actorName, id,
        ],
      );
    } else {
      await db.execute(
        `INSERT INTO crm_fap_ocr_passport (
          id, stakeholder_id, passport_number, country_code, country_name, full_name, surname, given_names,
          nationality, birth_date, birth_place, gender, issue_date, expiry_date, issuing_office, personal_id,
          document_path, file_name, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id, stakeholderId, fields.passport_number, fields.country_code, fields.country_name,
          fields.full_name, fields.surname, fields.given_names, fields.nationality, fields.birth_date,
          fields.birth_place, fields.gender, fields.issue_date, fields.expiry_date,
          fields.issuing_office, fields.personal_id, documentPath, fileName, actorName, actorName,
        ],
      );
    }
    return id;
  }

  if (docType === 'kitas') {
    const fields = {
      niora: pick(data, 'niora'),
      permit_number: pick(data, 'permit_number', 'permitNumber', 'no_kitas', 'kitas_no'),
      full_name: pick(data, 'nama', 'full_name', 'fullName', 'name'),
      nationality: pick(data, 'kewarganegaraan', 'nationality', 'citizenship'),
      birth_date: dateStr(pick(data, 'tanggal_lahir', 'birth_date', 'birthDate', 'tanggalLahir')),
      gender: pick(data, 'jenis_kelamin', 'gender'),
      valid_until: pick(data, 'berlaku_hingga', 'valid_until', 'validUntil', 'berlakuHingga'),
      issuing_office: pick(data, 'kantor_imigrasi', 'issuing_office', 'issuingOffice', 'instansiPenerbit'),
      address: pick(data, 'alamat', 'address'),
    };
    if (existing) {
      await db.execute(
        `UPDATE crm_fap_ocr_kitas SET
          niora=?, permit_number=?, full_name=?, nationality=?, birth_date=?, gender=?,
          valid_until=?, issuing_office=?, address=?,
          document_path=COALESCE(?, document_path), file_name=COALESCE(?, file_name),
          updated_at=CURRENT_TIMESTAMP(3), updated_by=?
        WHERE id=?`,
        [
          fields.niora, fields.permit_number, fields.full_name, fields.nationality,
          fields.birth_date, fields.gender, fields.valid_until, fields.issuing_office,
          fields.address, documentPath, fileName, actorName, id,
        ],
      );
    } else {
      await db.execute(
        `INSERT INTO crm_fap_ocr_kitas (
          id, stakeholder_id, niora, permit_number, full_name, nationality, birth_date, gender,
          valid_until, issuing_office, address, document_path, file_name, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id, stakeholderId, fields.niora, fields.permit_number, fields.full_name, fields.nationality,
          fields.birth_date, fields.gender, fields.valid_until, fields.issuing_office,
          fields.address, documentPath, fileName, actorName, actorName,
        ],
      );
    }
    return id;
  }

  return null;
}

function mapOcrRowToData(type: IdentityDocType, r: any): Record<string, any> | null {
  if (type === 'ktp') {
    const out: Record<string, any> = {
      nik: r.nik || '',
      idNumber: r.nik || '',
      nama: r.full_name || '',
      name: r.full_name || '',
      tempat_lahir: r.birth_place || '',
      tanggal_lahir: dateStr(r.birth_date) || '',
      dateOfBirth: dateStr(r.birth_date) || '',
      jenis_kelamin: r.gender || '',
      gender: r.gender || '',
      golongan_darah: r.blood_type || '',
      alamat: r.address || '',
      address: r.address || '',
      streetAddress: r.street_address || r.address || '',
      rt_rw: r.rt_rw || '',
      kel_desa: r.village_name || '',
      village: r.village_name || '',
      kecamatan: r.district_name || '',
      district: r.district_name || '',
      kabupaten_kota: r.city_name || '',
      city: r.city_name || '',
      provinsi: r.province_name || '',
      province: r.province_name || '',
      kode_pos: r.postal_code || '',
      postalCode: r.postal_code || '',
      agama: r.religion || '',
      status_perkawinan: r.marital_status || '',
      maritalStatus: r.marital_status || '',
      pekerjaan: r.occupation || '',
      occupation: r.occupation || '',
      kewarganegaraan: r.nationality || '',
      citizenship: r.nationality || '',
      berlaku_hingga: r.valid_until || '',
    };
    return Object.values(out).some(Boolean) ? out : null;
  }
  if (type === 'npwp') {
    const out: Record<string, any> = {
      npwp: r.npwp_number || '',
      raw_npwp: r.raw_npwp || r.npwp_number || '',
      nama: r.full_name || '',
      name: r.full_name || '',
      nik: r.nik || '',
      alamat: r.address || '',
      address: r.address || '',
      kelurahan_kecamatan: r.village_district || '',
      kota_provinsi: r.city_province || '',
      kpp: r.tax_office_kpp || '',
      tanggal_terdaftar: r.registered_date || '',
    };
    return Object.values(out).some(Boolean) ? out : null;
  }
  if (type === 'passport') {
    const out: Record<string, any> = {
      passport_no: r.passport_number || '',
      passportNumber: r.passport_number || '',
      kode_negara: r.country_code || '',
      negara: r.country_name || '',
      nama_lengkap: r.full_name || '',
      name: r.full_name || '',
      surname: r.surname || '',
      given_names: r.given_names || '',
      kewarganegaraan: r.nationality || '',
      tanggal_lahir: dateStr(r.birth_date) || '',
      dateOfBirth: dateStr(r.birth_date) || '',
      tempat_lahir: r.birth_place || '',
      jenis_kelamin: r.gender || '',
      tanggal_keluar: dateStr(r.issue_date) || '',
      tanggal_habis_berlaku: dateStr(r.expiry_date) || '',
      kantor_penerbit: r.issuing_office || '',
      no_reg: r.personal_id || '',
    };
    return Object.values(out).some(Boolean) ? out : null;
  }
  if (type === 'kitas') {
    const out: Record<string, any> = {
      niora: r.niora || '',
      permit_number: r.permit_number || '',
      permitNumber: r.permit_number || '',
      nama: r.full_name || '',
      name: r.full_name || '',
      kewarganegaraan: r.nationality || '',
      tanggal_lahir: dateStr(r.birth_date) || '',
      dateOfBirth: dateStr(r.birth_date) || '',
      jenis_kelamin: r.gender || '',
      berlaku_hingga: r.valid_until || '',
      kantor_imigrasi: r.issuing_office || '',
      alamat: r.address || '',
      address: r.address || '',
    };
    return Object.values(out).some(Boolean) ? out : null;
  }
  return null;
}

/** Loads all identity OCR records (KTP, NPWP, Passport, KITAS) linked to the given stakeholders. */
export async function readStakeholderIdentityDocs(
  stakeholderIds: string[],
  db: SqlExecutor = pool,
): Promise<Map<string, Partial<Record<IdentityDocType, StoredIdentityRow>>>> {
  const result = new Map<string, Partial<Record<IdentityDocType, StoredIdentityRow>>>();
  if (stakeholderIds.length === 0) return result;
  const placeholders = stakeholderIds.map(() => '?').join(',');
  const docTypes: IdentityDocType[] = ['ktp', 'npwp', 'passport', 'kitas'];

  const queries = await Promise.all(
    docTypes.map(t =>
      db
        .query<any[]>(
          `SELECT *
           FROM \`${OCR_TABLES[t]}\`
           WHERE stakeholder_id IN (${placeholders})
           ORDER BY COALESCE(updated_at, created_at) ASC`,
          stakeholderIds,
        )
        .then(([rows]) => ({type: t, rows}))
        .catch(() => ({type: t, rows: [] as any[]})),
    ),
  );

  for (const {type, rows} of queries) {
    for (const r of rows) {
      if (!r.stakeholder_id || (!r.document_path && !r.file_name)) continue;
      const entry = result.get(r.stakeholder_id) || {};
      entry[type] = {
        id: r.id,
        stakeholder_id: r.stakeholder_id,
        document_path: r.document_path || null,
        file_name: r.file_name || null,
        ocr_data: mapOcrRowToData(type, r),
      };
      result.set(r.stakeholder_id, entry);
    }
  }
  return result;
}

function inferPrimaryFallbackType(stakeholder: any): IdentityDocType {
  const fallbackPath = String(stakeholder?.document_path || stakeholder?.fileUrl || '').toLowerCase();
  const folderMatch = fallbackPath.match(/\/documents\/(ktp|npwp|passport|kitas)\//);
  if (folderMatch) return folderMatch[1] as IdentityDocType;
  return String(stakeholder?.idType || '').toUpperCase().startsWith('PASSPORT') ? 'passport' : 'ktp';
}

/**
 * Links pre-scanned OCR rows (which may have stakeholder_id = NULL when uploaded before saving a new stakeholder)
 * or creates/updates/clears crm_fap_ocr_<type> rows when saving a stakeholder inside the legal transaction.
 */
export async function linkStakeholderIdentityDocuments(
  db: SqlExecutor,
  stakeholderId: string,
  stakeholder: any,
  actorName = 'System',
) {
  if (!stakeholderId || !stakeholder) return;
  const fallbackType = inferPrimaryFallbackType(stakeholder);
  const docTypes: IdentityDocType[] = ['ktp', 'npwp', 'passport', 'kitas'];

  for (const docType of docTypes) {
    const table = OCR_TABLES[docType];
    const ocrId = cleanNullableString(stakeholder[`${docType}OcrId`]);
    const isPrimaryFallback = docType === fallbackType;
    const rawPath =
      normalizeStoredPath(stakeholder[`${docType}DocumentPath`]) ||
      normalizeStoredPath(stakeholder[`${docType}Url`]) ||
      (isPrimaryFallback
        ? normalizeStoredPath(stakeholder.document_path) || normalizeStoredPath(stakeholder.fileUrl)
        : null);
    const fileName =
      cleanNullableString(stakeholder[`${docType}FileName`]) ||
      (isPrimaryFallback ? cleanNullableString(stakeholder.file_name) : null);
    const removed = stakeholder[`${docType}Removed`] === true;
    const ocrData = stakeholder[`${docType}Data`];

    if (removed && !ocrId && !rawPath) {
      await db.execute(
        `UPDATE \`${table}\`
         SET stakeholder_id = NULL, updated_at = CURRENT_TIMESTAMP(3), updated_by = ?
         WHERE stakeholder_id = ?`,
        [actorName, stakeholderId],
      );
      continue;
    }

    if (!ocrId && !rawPath && !fileName) continue;

    let matched: {id: string; stakeholder_id: string | null} | null = null;
    if (ocrId && isUuid(ocrId)) {
      matched = await queryOne(db, `SELECT id, stakeholder_id FROM \`${table}\` WHERE id = ? LIMIT 1`, [ocrId]);
    }
    if (!matched && rawPath) {
      matched = await queryOne(
        db,
        `SELECT id, stakeholder_id FROM \`${table}\` WHERE document_path = ? ORDER BY created_at DESC LIMIT 1`,
        [rawPath],
      );
    }
    if (!matched && fileName) {
      matched = await queryOne(
        db,
        `SELECT id, stakeholder_id FROM \`${table}\` WHERE file_name = ? ORDER BY created_at DESC LIMIT 1`,
        [fileName],
      );
    }

    if (matched) {
      if (matched.stakeholder_id !== stakeholderId) {
        await db.execute(
          `UPDATE \`${table}\`
           SET stakeholder_id = NULL, updated_at = CURRENT_TIMESTAMP(3), updated_by = ?
           WHERE stakeholder_id = ? AND id <> ?`,
          [actorName, stakeholderId, matched.id],
        );
        await db.execute(
          `UPDATE \`${table}\`
           SET stakeholder_id = ?, updated_at = CURRENT_TIMESTAMP(3), updated_by = ?
           WHERE id = ?`,
          [stakeholderId, actorName, matched.id],
        );
      }
    } else if (rawPath) {
      await upsertIdentityRecord(
        docType,
        {
          stakeholderId,
          documentPath: rawPath,
          fileName: fileName || rawPath.split('/').pop() || null,
          data: ocrData && typeof ocrData === 'object' ? ocrData : {},
          actorName,
        },
        db,
      );
    }
  }
}

