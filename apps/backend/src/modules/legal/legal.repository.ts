import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolConnection} from 'mysql2/promise';
import {ageFromDateOfBirth, deedData, FOREIGN_REGION_KEYS, FOREIGN_REGION_VALUE, storedDocumentUrl} from '@liugong/shared';
import {CrmDatabase} from '../../core/db/crm-database';
import {CRM} from '../../core/db/crm-tables';
import {clean} from '../applications/repositories/company-record';
import {MasterIdLookup, type CodeMaster} from '../applications/repositories/master-ids';
import {parseAmount} from '../applications/repositories/fap-sections.repository';

type Conn = Pick<PoolConnection, 'query' | 'execute'>;
const bad = (message: string, status = 422) => Object.assign(new Error(message), {status});

/** A deed is valid for five years from its date; after that it is INACTIVE. */
const DEED_VALID_YEARS = 5;

/** Stakeholder API field → column of crm_fap_legal_stakeholders. */
const STAKEHOLDER: {key: string; column: string; master?: CodeMaster; type?: 'enum' | 'number' | 'date'}[] = [
  {key: 'representativeType', column: 'representative_type_id', master: 'representativeType'},
  {key: 'positions', column: 'position_id', master: 'stakeholderPosition'},
  {key: 'designation', column: 'designation_id', master: 'designation'},
  {key: 'stakeholderType', column: 'stakeholder_type', type: 'enum'},
  {key: 'signatory', column: 'is_signatory', type: 'enum'},
  {key: 'idType', column: 'id_type', type: 'enum'},
  {key: 'idNumber', column: 'id_number'},
  {key: 'idNumberSecondary', column: 'id_number_secondary'},
  {key: 'title', column: 'title', type: 'enum'},
  {key: 'firstName', column: 'first_name'},
  {key: 'middleName', column: 'middle_name'},
  {key: 'lastName', column: 'last_name'},
  {key: 'dateOfBirth', column: 'date_of_birth', type: 'date'},
  {key: 'maritalStatus', column: 'marital_status', type: 'enum'},
  {key: 'occupation', column: 'occupation'},
  {key: 'email', column: 'email'},
  {key: 'mobilePhone', column: 'mobile_phone'},
  {key: 'gender', column: 'gender', type: 'enum'},
  {key: 'sharePercentage', column: 'share_percentage', type: 'number'},
  {key: 'depositedCapital', column: 'deposited_capital', type: 'number'},
  {key: 'primaryCapital', column: 'primary_capital', type: 'number'},
  {key: 'citizenship', column: 'citizenship', type: 'enum'},
  {key: 'rt', column: 'rt'},
  {key: 'rw', column: 'rw'},
  {key: 'address', column: 'address'},
];
/** Address levels of a stakeholder (API field → column). */
const LOCATION = [
  ['province', 'province_id'],
  ['cityRegency', 'city_id'],
  ['district', 'district_id'],
  ['village', 'village_id'],
] as const;

/** A foreign stakeholder: citizenship FOREIGN, identified by a passport or a KITAS. */
const isForeignStakeholder = (s: any) =>
  String(s?.citizenship || '').toUpperCase() === 'FOREIGN' && ['PASSPORT_KITAS', 'PASSPORT', 'KITAS'].includes(String(s?.idType || s?.id_type || '').toUpperCase());

const num = (v: any) => (v === null || v === undefined ? null : Number(v));
const enumValue = (v: any) => {
  const text = clean(v);
  return text === null ? null : String(text).toUpperCase();
};

/**
 * Deeds, their remark categories, stakeholders and review state of an application (crm_fap_legal_*). The API keeps the
 * shape of the legal editor: {deeds: [...], hiddenDeedIds, selectedDeedId}.
 */
@Injectable()
export class LegalRepository {
  constructor(
    private readonly db: CrmDatabase,
    private readonly ids: MasterIdLookup,
  ) {}

  /* ---------- read ---------- */

  private async readStakeholder(row: any) {
    const out: Record<string, any> = {id: row.id, createdAt: row.created_at, updatedAt: row.updated_at};
    for (const f of STAKEHOLDER)
      out[f.key] = f.master
        ? await this.ids.codeOf(f.master, row[f.column])
        : f.type === 'number'
          ? num(row[f.column])
          : (row[f.column] ?? null);
    out.country = await this.ids.codeOf('country', row.country_id);
    for (const [key, column] of LOCATION) out[key] = row[column] ?? null;
    out.postalCode = await this.ids.postalCodeOf(row.postal_code_id);
    out.foreignRegion = row.foreign_region_text ?? null;
    Object.assign(out, ageFromDateOfBirth(row.date_of_birth));
    out.isInherited = !!row.is_inherited;
    out.sourceDeedId = row.source_deed_id ?? null;
    // a foreign stakeholder (passport / KITAS) always has "Others" in every address field
    if (isForeignStakeholder(out)) for (const k of FOREIGN_REGION_KEYS) out[k] = FOREIGN_REGION_VALUE;
    out.name = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ');
    out.document_path = row.document_path || '';
    out.file_name = row.file_name || '';
    out.fileUrl = storedDocumentUrl(row.document_path) || null;
    return out;
  }

  async read(applicationId: string) {
    const [rows] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.fapLegalDeeds} WHERE application_id=? AND deleted_at IS NULL ORDER BY deed_date,created_at,id`,
      [applicationId],
    );
    const [categories] = await this.db.pool.execute<any[]>(
      `SELECT c.deed_id,m.code FROM ${CRM.fapLegalDeedRemarkCategories} c
       JOIN ${CRM.masterLegalRemarkCategories} m ON m.id=c.remark_category_id
       JOIN ${CRM.fapLegalDeeds} d ON d.id=c.deed_id WHERE d.application_id=? ORDER BY m.sort_order`,
      [applicationId],
    );
    const [stakeholders] = await this.db.pool.execute<any[]>(
      `SELECT s.*,COALESCE(k.document_path,p.document_path) AS document_path,COALESCE(k.file_name,p.file_name) AS file_name
       FROM ${CRM.fapLegalStakeholders} s
       LEFT JOIN ${CRM.fapOcrKtp} k ON k.stakeholder_id=s.id
       LEFT JOIN ${CRM.fapOcrPassport} p ON p.stakeholder_id=s.id
       WHERE s.application_id=? AND s.is_active=1 ORDER BY s.created_at,s.id`,
      [applicationId],
    );
    const [reviews] = await this.db.pool.execute<any[]>(
      `SELECT * FROM ${CRM.fapLegalDeedReviews} WHERE application_id=?`,
      [applicationId],
    );
    const deeds = [];
    for (const row of rows) {
      const codes = categories.filter(c => c.deed_id === row.id).map(c => c.code);
      const deedStakeholders = await Promise.all(
        stakeholders.filter(s => s.deed_id === row.id).map(s => this.readStakeholder(s)),
      );
      const review = reviews.find(r => r.deed_id === row.id);
      deeds.push({
        id: row.id,
        type: row.deed_type === 'ESTABLISHMENT' ? 'establishment' : 'amendment',
        deedNumber: row.deed_number,
        deedDate: row.deed_date,
        notaryName: row.notary_name,
        ministerialDecreeNumber: row.ministerial_decree_number,
        ministerialDecreeDate: row.ministerial_decree_date,
        remarkCategoryId: codes[0] ?? null,
        remarkCategoryIds: codes,
        remarks: row.remarks || '',
        parties: {representative: row.representative_note || '', companyShareholder: row.company_shareholder_note || ''},
        status: row.deed_status,
        expiryDate: row.valid_until,
        isLatestDeed: !!row.is_latest_deed,
        shareholders: deedStakeholders.filter(s => Number(s.sharePercentage) > 0).length,
        stakeholders: deedStakeholders,
        infoAdded: deedStakeholders.length > 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(await this.reviewOf(review)),
      });
    }
    const [hidden] = await this.db.pool.execute<any[]>(
      `SELECT id FROM ${CRM.fapLegalDeeds} WHERE application_id=? AND deleted_at IS NOT NULL`,
      [applicationId],
    );
    return {
      deeds,
      hiddenDeedIds: hidden.map(r => r.id),
      selectedDeedId: rows.find(r => r.is_selected)?.id || deeds[0]?.id,
    };
  }

  /**
   * Review state for the editor. No row: a draft. The revision used for "deed changed meanwhile" checks is the time
   * of the last review change. The submitter is the user that last moved the review to PENDING (updated_by).
   */
  private async reviewOf(row: any) {
    if (!row) return {review: {status: 'DRAFT', revision: 1}};
    const changed = row.updated_at || row.created_at;
    let approvedSnapshot = null;
    try {
      approvedSnapshot = row.approved_snapshot_text ? JSON.parse(row.approved_snapshot_text) : null;
    } catch {}
    return {
      review: {
        status: row.review_status,
        revision: changed ? new Date(changed).getTime() : 1,
        notes: row.review_notes,
        submittedBy: row.review_status === 'PENDING' ? row.updated_by || row.created_by : null,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
      },
      ...(approvedSnapshot ? {approvedSnapshot, approvedAt: row.approved_at} : {}),
    };
  }

  /** Deeds waiting for approval and deeds sent back, per application (application list and overview). */
  async reviewCounts(): Promise<Map<string, {pending: number; sentBack: number}>> {
    const [rows] = await this.db.pool.query<any[]>(
      `SELECT r.application_id,r.review_status,COUNT(*) AS n FROM ${CRM.fapLegalDeedReviews} r
       JOIN ${CRM.fapLegalDeeds} d ON d.id=r.deed_id AND d.deleted_at IS NULL GROUP BY r.application_id,r.review_status`,
    );
    const out = new Map<string, {pending: number; sentBack: number}>();
    for (const r of rows) {
      const counts = out.get(r.application_id) || {pending: 0, sentBack: 0};
      if (r.review_status === 'PENDING') counts.pending += Number(r.n);
      if (r.review_status === 'REJECTED') counts.sentBack += Number(r.n);
      out.set(r.application_id, counts);
    }
    return out;
  }

  /* ---------- save ---------- */

  private async stakeholderValues(conn: Conn, raw: any) {
    // A foreign stakeholder (FOREIGN, identified by PASSPORT - KITAS) has "Others" in every address field, whatever the request carries.
    const isForeign = isForeignStakeholder(raw);
    const s = isForeign ? {...raw, ...Object.fromEntries(FOREIGN_REGION_KEYS.map(k => [k, FOREIGN_REGION_VALUE]))} : raw;
    const out: Record<string, any> = {};
    for (const f of STAKEHOLDER) {
      const v = s[f.key];
      if (f.master) out[f.column] = await this.ids.idOf(f.master, v, conn);
      else if (f.type === 'enum') out[f.column] = enumValue(v);
      else if (f.type === 'number') out[f.column] = parseAmount(v);
      else if (f.type === 'date') out[f.column] = clean(v, 'date');
      else out[f.column] = clean(v);
    }
    // "Others" does not fit the 5 characters of RT / RW: they stay empty and are shown as "Others" when the stakeholder is read
    if (isForeign) {
      out.rt = null;
      out.rw = null;
    }
    const age = ageFromDateOfBirth(out.date_of_birth);
    out.age_years = age.ageYears ?? null;
    out.age_months = age.ageMonths ?? null;
    // Indonesian addresses travel as master ids / codes; other text (a foreign address) is kept as foreign_region_text.
    const foreign: string[] = [];
    out.country_id = await this.ids.tryIdOf('country', s.country, conn);
    if (!out.country_id && clean(s.country)) foreign.push(String(s.country));
    const location = await this.ids.locationIds(
      {province: s.province, city: s.cityRegency, district: s.district, village: s.village},
      conn,
    );
    out.province_id = location.province;
    out.city_id = location.city;
    out.district_id = location.district;
    out.village_id = location.village;
    foreign.push(...location.unresolved);
    out.foreign_region_text = clean(s.foreignRegion) ?? (foreign.length ? foreign.join(', ') : null);
    out.postal_code_id = out.city_id ? await this.ids.tryPostalCodeId(out.city_id, s.postalCode, conn) : null;
    // the address column holds the full address (the form shows its street part)
    if (!isForeign)
      out.address = await this.ids.fullAddress(out.address, {rt: out.rt, rw: out.rw, villageId: out.village_id, districtId: out.district_id, cityId: out.city_id, provinceId: out.province_id, postalCode: s.postalCode}, conn);
    out.is_inherited = s.isInherited ? 1 : 0;
    out.source_deed_id = clean(s.sourceDeedId);
    if (!out.first_name && clean(s.name)) {
      const parts = String(s.name).trim().split(/\s+/);
      out.first_name = parts[0];
      out.middle_name = parts.length > 2 ? parts.slice(1, -1).join(' ') : null;
      out.last_name = parts.length > 1 ? parts[parts.length - 1] : null;
    }
    return out;
  }

  /**
   * Id of a new stakeholder: the id the form gave it (so its ID scans can be stored right after the save) when that is a
   * UUID no row uses yet, otherwise a fresh one.
   */
  private async newStakeholderId(conn: Conn, requested: unknown) {
    if (typeof requested === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested)) {
      const [taken] = await conn.execute<any[]>(`SELECT id FROM ${CRM.fapLegalStakeholders} WHERE id=?`, [requested]);
      if (!taken.length) return requested;
    }
    return crypto.randomUUID();
  }

  private async upsert(conn: Conn, table: string, id: string, values: Record<string, any>, by: string | null) {
    const [old] = await conn.execute<any[]>(`SELECT id FROM ${table} WHERE id=? FOR UPDATE`, [id]);
    const cols = Object.keys(values);
    if (old.length)
      await conn.execute(`UPDATE ${table} SET ${cols.map(c => `${c}=?`).join(',')},updated_by=? WHERE id=?`, [
        ...Object.values(values),
        by,
        id,
      ]);
    else
      await conn.execute(
        `INSERT INTO ${table} (id,${cols.join(',')},created_by) VALUES (?,${cols.map(() => '?').join(',')},?)`,
        [id, ...Object.values(values), by],
      );
  }

  /**
   * Replaces the deeds of an application with `legal.deeds` (deeds not sent are soft-deleted). A deed without
   * `stakeholders` keeps its stored stakeholders. Afterwards the latest deed is flagged and the profile's
   * establishment and latest deed numbers follow the deeds.
   */
  async save(conn: Conn, applicationId: string, legal: any, by: string | null) {
    const deeds: any[] = Array.isArray(legal?.deeds) ? structuredClone(legal.deeds) : [];
    const numbers = new Set<string>();
    for (const d of deeds) {
      const no = String(d.deedNumber || '').trim().toLowerCase();
      if (no && numbers.has(no)) throw bad('This deed number has already been entered in this application.');
      if (no) numbers.add(no);
    }
    const [stored] = await conn.execute<any[]>(
      `SELECT id FROM ${CRM.fapLegalDeeds} WHERE application_id=? FOR UPDATE`,
      [applicationId],
    );
    const known = new Set(stored.map(r => r.id));
    const today = new Date().toISOString().slice(0, 10);
    const kept: string[] = [];
    for (const [i, d] of deeds.entries()) {
      const id = typeof d.id === 'string' && /^[0-9a-f-]{36}$/i.test(d.id) ? d.id : crypto.randomUUID();
      if (kept.includes(id)) throw bad('ID akta tidak boleh duplikat.');
      kept.push(id);
      d.id = id;
      const type = d.type === 'establishment' || (!d.type && i === 0) ? 'ESTABLISHMENT' : 'AMENDMENT';
      const deedDate = clean(d.deedDate, 'date') as string | null;
      let validUntil: string | null = null;
      if (deedDate) {
        const until = new Date(deedDate + 'T00:00:00Z');
        until.setUTCFullYear(until.getUTCFullYear() + DEED_VALID_YEARS);
        validUntil = until.toISOString().slice(0, 10);
      }
      await this.upsert(
        conn,
        CRM.fapLegalDeeds,
        id,
        {
          application_id: applicationId,
          deed_type: type,
          deed_number: clean(d.deedNumber) ?? '',
          deed_date: deedDate ?? today,
          notary_name: clean(d.notaryName),
          deed_status: !validUntil || validUntil >= today ? 'ACTIVE' : 'INACTIVE',
          valid_until: validUntil,
          ministerial_decree_number: clean(d.ministerialDecreeNumber),
          ministerial_decree_date: clean(d.ministerialDecreeDate, 'date'),
          remarks: clean(d.remarks),
          representative_note: clean(d.parties?.representative),
          company_shareholder_note: clean(d.parties?.companyShareholder),
          is_selected: id === legal.selectedDeedId ? 1 : 0,
          deleted_at: null,
        },
        by,
      );
      // remark categories (multi-select)
      const codes: string[] = Array.isArray(d.remarkCategoryIds) && d.remarkCategoryIds.length
        ? d.remarkCategoryIds
        : d.remarkCategoryId
          ? [d.remarkCategoryId]
          : [];
      await conn.execute(`DELETE FROM ${CRM.fapLegalDeedRemarkCategories} WHERE deed_id=?`, [id]);
      for (const code of [...new Set(codes)])
        await conn.execute(
          `INSERT INTO ${CRM.fapLegalDeedRemarkCategories} (id,deed_id,remark_category_id,created_by) VALUES (?,?,?,?)`,
          [crypto.randomUUID(), id, await this.ids.idOf('remarkCategory', code, conn), by],
        );
      // stakeholders: only when sent
      if (Array.isArray(d.stakeholders)) {
        const [old] = await conn.execute<any[]>(
          `SELECT id FROM ${CRM.fapLegalStakeholders} WHERE deed_id=? AND is_active=1 FOR UPDATE`,
          [id],
        );
        const oldIds = new Set(old.map(r => r.id));
        const keep: string[] = [];
        for (const s of d.stakeholders) {
          const sid = oldIds.has(s.id) ? s.id : await this.newStakeholderId(conn, s.id);
          keep.push(sid);
          await this.upsert(
            conn,
            CRM.fapLegalStakeholders,
            sid,
            {deed_id: id, application_id: applicationId, ...(await this.stakeholderValues(conn, s)), is_active: 1},
            by,
          );
        }
        const gone = [...oldIds].filter(x => !keep.includes(x));
        if (gone.length)
          await conn.execute(
            `UPDATE ${CRM.fapLegalStakeholders} SET is_active=NULL,deleted_at=CURRENT_TIMESTAMP(3),updated_by=?
             WHERE id IN (${gone.map(() => '?').join(',')})`,
            [by, ...gone],
          );
      }
    }
    const removed = [...known].filter(id => !kept.includes(id));
    if (removed.length) {
      const marks = removed.map(() => '?').join(',');
      await conn.execute(
        `UPDATE ${CRM.fapLegalStakeholders} SET is_active=NULL,deleted_at=CURRENT_TIMESTAMP(3),updated_by=?
         WHERE is_active=1 AND deed_id IN (${marks})`,
        [by, ...removed],
      );
      await conn.execute(
        `UPDATE ${CRM.fapLegalDeeds} SET deleted_at=CURRENT_TIMESTAMP(3),is_selected=0,is_latest_deed=0,updated_by=?
         WHERE deleted_at IS NULL AND id IN (${marks})`,
        [by, ...removed],
      );
    }
    await this.syncLatestDeed(conn, applicationId, by);
  }

  /** Flags the newest deed (is_latest_deed) and copies establishment / latest deed numbers to the FAP profile. */
  private async syncLatestDeed(conn: Conn, applicationId: string, by: string | null) {
    const [rows] = await conn.execute<any[]>(
      `SELECT id,deed_type,deed_number,deed_date FROM ${CRM.fapLegalDeeds}
       WHERE application_id=? AND deleted_at IS NULL ORDER BY deed_date DESC,created_at DESC`,
      [applicationId],
    );
    await conn.execute(`UPDATE ${CRM.fapLegalDeeds} SET is_latest_deed=0 WHERE application_id=? AND is_latest_deed=1`, [
      applicationId,
    ]);
    if (rows[0])
      await conn.execute(`UPDATE ${CRM.fapLegalDeeds} SET is_latest_deed=1 WHERE id=?`, [rows[0].id]);
    const establishment = rows.find(r => r.deed_type === 'ESTABLISHMENT');
    const latestAmendment = rows.find(r => r.deed_type === 'AMENDMENT');
    const values: Record<string, any> = {};
    if (establishment?.deed_number) {
      values.establishment_act_no = establishment.deed_number;
      values.establishment_date = establishment.deed_date;
    }
    if (latestAmendment?.deed_number) {
      values.latest_deed_no = latestAmendment.deed_number;
      values.latest_deed_date = latestAmendment.deed_date;
    }
    const cols = Object.keys(values);
    if (cols.length)
      await conn.execute(
        `UPDATE ${CRM.fapApplicationProfiles} SET ${cols.map(c => `${c}=?`).join(',')},updated_by=? WHERE application_id=?`,
        [...Object.values(values), by, applicationId],
      );
  }

  /** Stores the review state produced by deedTransition (PENDING / APPROVED / REJECTED). */
  async saveReview(conn: Conn, applicationId: string, deed: any, by: string | null) {
    const review = deed.review || {};
    const approved = review.status === 'APPROVED';
    await conn.execute(
      `INSERT INTO ${CRM.fapLegalDeedReviews}
         (id,application_id,deed_id,review_status,review_notes,approved_snapshot_text,approved_by,approved_at,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE review_status=VALUES(review_status),review_notes=VALUES(review_notes),
         approved_snapshot_text=COALESCE(VALUES(approved_snapshot_text),approved_snapshot_text),
         approved_by=COALESCE(VALUES(approved_by),approved_by),approved_at=COALESCE(VALUES(approved_at),approved_at),
         updated_by=VALUES(updated_by)`,
      [
        crypto.randomUUID(),
        applicationId,
        deed.id,
        review.status,
        review.notes ?? null,
        approved ? JSON.stringify(deed.approvedSnapshot ?? deedData(deed)) : null,
        approved ? review.approvedBy ?? by : null,
        approved ? new Date(review.approvedAt || Date.now()) : null,
        by,
        by,
      ],
    );
  }
}
