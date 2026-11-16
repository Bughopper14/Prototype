import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';

/**
 * OCR result key (as the OCR service and the stakeholder form use them) → column of crm_fap_ocr_<type>.
 * `date` columns get an ISO date (the OCR reads dates as DD-MM-YYYY and similar).
 */
const COLUMNS: Record<string, {table: string; map: [string, string, 'date'?][]}> = {
  ktp: {
    table: CRM.fapOcrKtp,
    map: [
      ['nik', 'nik'],
      ['nama', 'full_name'],
      ['tempat_lahir', 'birth_place'],
      ['tanggal_lahir', 'birth_date', 'date'],
      ['jenis_kelamin', 'gender'],
      ['golongan_darah', 'blood_type'],
      ['alamat', 'address'],
      ['rt_rw', 'rt_rw'],
      ['kel_desa', 'village_name'],
      ['kecamatan', 'district_name'],
      ['agama', 'religion'],
      ['status_perkawinan', 'marital_status'],
      ['pekerjaan', 'occupation'],
      ['kewarganegaraan', 'nationality'],
      ['berlaku_hingga', 'valid_until'],
    ],
  },
  npwp: {
    table: CRM.fapOcrNpwp,
    map: [
      ['npwp_number', 'npwp_number'],
      ['raw_npwp', 'raw_npwp'],
      ['nama', 'full_name'],
      ['nik', 'nik'],
      ['alamat', 'address'],
      ['kelurahan_kecamatan', 'village_district'],
      ['kota_provinsi', 'city_province'],
      ['kpp', 'tax_office_kpp'],
      ['tanggal_terdaftar', 'registered_date'],
    ],
  },
  passport: {
    table: CRM.fapOcrPassport,
    map: [
      ['passport_number', 'passport_number'],
      ['country_code', 'country_code'],
      ['country_name', 'country_name'],
      ['nama', 'full_name'],
      ['surname', 'surname'],
      ['given_names', 'given_names'],
      ['nationality', 'nationality'],
      ['tanggal_lahir', 'birth_date', 'date'],
      ['tempat_lahir', 'birth_place'],
      ['jenis_kelamin', 'gender'],
      ['tanggal_pengeluaran', 'issue_date', 'date'],
      ['tanggal_berlaku', 'expiry_date', 'date'],
      ['kantor_penerbit', 'issuing_office'],
      ['personal_id', 'personal_id'],
    ],
  },
  kitas: {
    table: CRM.fapOcrKitas,
    map: [
      ['niora', 'niora'],
      ['permit_number', 'permit_number'],
      ['nama', 'full_name'],
      ['kewarganegaraan', 'nationality'],
      ['tanggal_lahir', 'birth_date', 'date'],
      ['jenis_kelamin', 'gender'],
      ['berlaku_hingga', 'valid_until'],
      ['instansi_penerbit', 'issuing_office'],
      ['alamat', 'address'],
    ],
  },
};

export const IDENTITY_TYPES = Object.keys(COLUMNS);

/** YYYY-MM-DD from "17-05-1980", "17/05/1980", "1980-05-17" or "17 05 1980"; anything else → NULL. */
export function isoDate(value: unknown): string | null {
  const s = String(value ?? '').trim();
  let m = s.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/** OCR results of stakeholder identity documents (crm_fap_ocr_ktp / _npwp / _passport / _kitas). */
@Injectable()
export class IdentityDocumentsRepository {
  constructor(private readonly db: CrmDatabase) {}

  /** The stakeholder exists (the OCR tables point at crm_fap_legal_stakeholders). */
  async stakeholderExists(stakeholderId: string) {
    const [rows] = await this.db.pool.execute<any[]>(`SELECT id FROM ${CRM.fapLegalStakeholders} WHERE id=?`, [
      stakeholderId,
    ]);
    return rows.length > 0;
  }

  async save(
    type: string,
    stakeholderId: string,
    data: Record<string, any>,
    file: {fileName: string | null; documentPath: string | null},
    by: string | null,
  ) {
    const def = COLUMNS[type];
    const values: Record<string, any> = {};
    for (const [key, column, kind] of def.map) {
      const v = data?.[key];
      values[column] = kind === 'date' ? isoDate(v) : v === undefined || v === '' ? null : String(v);
    }
    // An Indonesian KTP is valid for life (Permendagri; printed as SEUMUR HIDUP).
    if (type === 'ktp') values.valid_until = 'SEUMUR HIDUP';
    values.raw_ocr_json = JSON.stringify(data || {});
    const [old] = await this.db.pool.execute<any[]>(`SELECT id FROM ${def.table} WHERE stakeholder_id=?`, [
      stakeholderId,
    ]);
    const cols = Object.keys(values);
    if (old.length)
      await this.db.pool.execute(
        `UPDATE ${def.table} SET ${cols.map(c => `${c}=?`).join(',')},file_name=COALESCE(?,file_name),
           document_path=COALESCE(?,document_path),updated_by=? WHERE id=?`,
        [...Object.values(values), file.fileName, file.documentPath, by, old[0].id],
      );
    else
      await this.db.pool.execute(
        `INSERT INTO ${def.table} (id,stakeholder_id,${cols.join(',')},file_name,document_path,created_by)
         VALUES (?,?,${cols.map(() => '?').join(',')},?,?,?)`,
        [crypto.randomUUID(), stakeholderId, ...Object.values(values), file.fileName, file.documentPath, by],
      );
  }

  /** Every scan a row refers to, as lower-case "<type>/<file name>" (what documents/<type>/ holds). */
  async referencedPaths() {
    const kept = new Set<string>();
    for (const def of Object.values(COLUMNS)) {
      const [rows] = await this.db.pool.query<any[]>(`SELECT document_path FROM ${def.table} WHERE document_path IS NOT NULL`);
      for (const r of rows) {
        const parts = String(r.document_path).split('/').filter(Boolean);
        if (parts.length >= 2) kept.add(`${parts[parts.length - 2]}/${parts[parts.length - 1]}`.toLowerCase());
      }
    }
    return kept;
  }

  /** The stored OCR result in the OCR key shape the stakeholder form reads. */
  async find(type: string, stakeholderId: string) {
    const def = COLUMNS[type];
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${def.table} WHERE stakeholder_id=? ORDER BY updated_at DESC,created_at DESC LIMIT 1`,
      [stakeholderId],
    );
    const row = rows[0];
    if (!row) return null;
    const data: Record<string, any> = {id: row.id, stakeholder_id: row.stakeholder_id};
    for (const [key, column] of def.map) data[key] = row[column] ?? null;
    return {...data, file_name: row.file_name, document_path: row.document_path};
  }
}
