import type {PoolConnection} from 'mysql2/promise';
import {pool} from './pool';

type Db = Pick<PoolConnection, 'query'>;

export interface MasterRow {
  id: string;
  code: string | null;
  name: string;
  is_active?: number | null;
  [key: string]: any;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v.trim());

export const normalizeCode = (v: unknown): string =>
  String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export function cleanNullableString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s || s.toUpperCase() === 'NONE') return null;
  return s;
}

export function enumOrNull<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  const s = cleanNullableString(v);
  if (!s) return null;
  const up = normalizeCode(s) as T;
  if (allowed.includes(up)) return up;
  const direct = s.toUpperCase() as T;
  if (allowed.includes(direct)) return direct;
  return null;
}

export function parsePortalUserId(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  const s = String(v ?? '').trim();
  if (/^\d+$/.test(s)) return Number(s);
  const m = s.match(/^portal-(\d+)$/);
  return m ? Number(m[1]) : null;
}

function stripWilayahPrefix(s: string): string {
  return s
    .trim()
    .replace(
      /^(?:kabupaten|kab\.?|kota\s*administrasi|kota\s*adm\.?|kota|kodya\.?|kecamatan|kec\.?|desa\/kelurahan|kelurahan\/desa|kelurahan|kel\.?|desa|ds\.?|provinsi|propinsi|prov\.?|prop\.?)\s+/i,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function wilayahMatches(masterName: string, input: string): boolean {
  const a = masterName.trim().toLowerCase();
  const b = input.trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (stripWilayahPrefix(a) === stripWilayahPrefix(b)) return true;
  if (
    (b.includes('dki jakarta') || b === 'jakarta') &&
    (a.includes('daerah khusus ibukota jakarta') || a === 'dki jakarta')
  ) {
    return true;
  }
  return false;
}

const tableCache = new Map<string, MasterRow[]>();

export function clearCrmLookupCache() {
  tableCache.clear();
}

export async function loadMasterRows(table: string, db: Db = pool): Promise<MasterRow[]> {
  let rows = tableCache.get(table);
  if (rows) return rows;
  const [res] = await db.query<any[]>(`SELECT * FROM \`${table}\``);
  rows = res as MasterRow[];
  // Avoid caching massive 80k-row village tables indefinitely in memory; cache smaller lookup tables.
  if (rows.length <= 2000) tableCache.set(table, rows);
  return rows;
}

export async function lookupMasterById(
  table: string,
  id: string | null | undefined,
  db: Db = pool,
): Promise<MasterRow | null> {
  if (!id) return null;
  if (tableCache.has(table)) {
    return tableCache.get(table)!.find(r => r.id === id) ?? null;
  }
  const [rows] = await db.query<any[]>(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
  return (rows[0] as MasterRow) ?? null;
}

export async function resolveMasterId(
  table: string,
  input: unknown,
  opts?: {parentCol?: string; parentId?: string | null; extraWhere?: string},
  db: Db = pool,
): Promise<string | null> {
  const raw = cleanNullableString(input);
  if (!raw) return null;
  if (isUuid(raw)) {
    const found = await lookupMasterById(table, raw, db);
    if (found) return found.id;
  }

  const rows = await loadMasterRows(table, db);
  const candidates =
    opts?.parentCol && opts?.parentId ? rows.filter(r => r[opts.parentCol!] === opts.parentId) : rows;
  const poolSet = candidates.length ? candidates : rows;

  const norm = normalizeCode(raw);
  const lower = raw.toLowerCase();

  const match =
    poolSet.find(r => r.id === raw) ??
    poolSet.find(r => (r.code ?? '').toLowerCase() === lower) ??
    poolSet.find(r => normalizeCode(r.code) === norm && norm !== '') ??
    poolSet.find(r => (r.name ?? '').trim().toLowerCase() === lower) ??
    poolSet.find(r => normalizeCode(r.name) === norm && norm !== '');

  return match?.id ?? null;
}

export async function resolveMasterCodeOrName(
  table: string,
  id: string | null | undefined,
  prefer: 'code' | 'name' = 'code',
  db: Db = pool,
): Promise<string> {
  const row = await lookupMasterById(table, id, db);
  if (!row) return '';
  if (prefer === 'name') return row.name || row.code || '';
  return row.code || row.name || '';
}

export async function resolveLocationIds(
  input: {
    country?: unknown;
    province?: unknown;
    city?: unknown;
    district?: unknown;
    village?: unknown;
    postalCode?: unknown;
  },
  db: Db = pool,
) {
  let countryId = await resolveMasterId('crm_master_countries', input.country || 'Indonesia', undefined, db);
  if (!countryId && cleanNullableString(input.country)) {
    countryId = await resolveMasterId('crm_master_countries', 'Indonesia', undefined, db);
  }

  const provRaw = cleanNullableString(input.province);
  let provinceId: string | null = null;
  if (provRaw) {
    if (isUuid(provRaw)) {
      provinceId = provRaw;
    } else {
      const provs = await loadMasterRows('crm_master_provinces', db);
      provinceId =
        provs.find(p => p.id === provRaw || wilayahMatches(p.name || '', provRaw))?.id ?? null;
    }
  }

  const cityRaw = cleanNullableString(input.city);
  let cityId: string | null = null;
  if (cityRaw) {
    if (isUuid(cityRaw)) {
      cityId = cityRaw;
    } else {
      const cities = await loadMasterRows('crm_master_cities', db);
      const scoped = provinceId ? cities.filter(c => c.province_id === provinceId) : cities;
      const found =
        scoped.find(c => c.id === cityRaw || wilayahMatches(c.name || '', cityRaw)) ??
        cities.find(c => wilayahMatches(c.name || '', cityRaw));
      if (found) {
        cityId = found.id;
        if (!provinceId) provinceId = found.province_id;
      }
    }
  }

  const distRaw = cleanNullableString(input.district);
  let districtId: string | null = null;
  if (distRaw) {
    if (isUuid(distRaw)) {
      districtId = distRaw;
    } else {
      const [rows] = await db.query<any[]>(
        cityId
          ? `SELECT id, city_id, name FROM crm_master_districts WHERE city_id = ?`
          : `SELECT id, city_id, name FROM crm_master_districts WHERE LOWER(name) = LOWER(?) LIMIT 5`,
        cityId ? [cityId] : [stripWilayahPrefix(distRaw) || distRaw],
      );
      const found = (rows as any[]).find(d => d.id === distRaw || wilayahMatches(d.name || '', distRaw));
      if (found) {
        districtId = found.id;
        if (!cityId) cityId = found.city_id;
      }
    }
  }

  const villRaw = cleanNullableString(input.village);
  let villageId: string | null = null;
  if (villRaw) {
    if (isUuid(villRaw)) {
      villageId = villRaw;
    } else {
      const [rows] = await db.query<any[]>(
        districtId
          ? `SELECT id, district_id, name FROM crm_master_villages WHERE district_id = ?`
          : `SELECT id, district_id, name FROM crm_master_villages WHERE LOWER(name) = LOWER(?) LIMIT 5`,
        districtId ? [districtId] : [stripWilayahPrefix(villRaw) || villRaw],
      );
      const found = (rows as any[]).find(v => v.id === villRaw || wilayahMatches(v.name || '', villRaw));
      if (found) {
        villageId = found.id;
      }
    }
  }

  const zipRaw = cleanNullableString(input.postalCode);
  let postalCodeId: string | null = null;
  if (typeof zipRaw === 'string' && zipRaw) {
    if (isUuid(zipRaw)) {
      postalCodeId = zipRaw;
    } else {
      const cleanZip = String(zipRaw).split(/\s+/)[0].trim();
      const [rows] = await db.query<any[]>(
        cityId
          ? `SELECT id FROM crm_master_postal_codes WHERE city_id = ? AND (postal_code = ? OR name = ? OR id = ?) LIMIT 1`
          : `SELECT id FROM crm_master_postal_codes WHERE postal_code = ? OR name = ? OR id = ? LIMIT 1`,
        cityId ? [cityId, cleanZip, zipRaw, zipRaw] : [cleanZip, zipRaw, zipRaw],
      );
      postalCodeId = rows[0]?.id ?? null;
    }
  }

  return {countryId, provinceId, cityId, districtId, villageId, postalCodeId};
}

export async function resolveLocationNames(
  ids: {
    country_id?: string | null;
    province_id?: string | null;
    city_id?: string | null;
    district_id?: string | null;
    village_id?: string | null;
    postal_code_id?: string | null;
  },
  db: Db = pool,
) {
  const [country, province, city, district, village, postal] = await Promise.all([
    lookupMasterById('crm_master_countries', ids.country_id, db),
    lookupMasterById('crm_master_provinces', ids.province_id, db),
    lookupMasterById('crm_master_cities', ids.city_id, db),
    lookupMasterById('crm_master_districts', ids.district_id, db),
    lookupMasterById('crm_master_villages', ids.village_id, db),
    lookupMasterById('crm_master_postal_codes', ids.postal_code_id, db),
  ]);
  return {
    country: country?.name || '',
    province: province?.name || '',
    city: city?.name || '',
    district: district?.name || '',
    village: village?.name || '',
    postalCode: (postal as any)?.postal_code || postal?.name || '',
  };
}

export async function resolveEquipmentIds(
  u: {
    unitCategory?: unknown;
    brand?: unknown;
    unitType?: unknown;
    modelName?: unknown;
    assetName?: unknown;
  },
  db: Db = pool,
) {
  const categoryId = await resolveMasterId('crm_master_equipment_categories', u.unitCategory, undefined, db);
  const brandId = await resolveMasterId(
    'crm_master_equipment_brands',
    u.brand,
    categoryId ? {parentCol: 'category_id', parentId: categoryId} : undefined,
    db,
  );
  const typeId = await resolveMasterId(
    'crm_master_equipment_types',
    u.unitType,
    brandId ? {parentCol: 'brand_id', parentId: brandId} : undefined,
    db,
  );
  const modelId = await resolveMasterId(
    'crm_master_equipment_models',
    u.modelName,
    typeId ? {parentCol: 'type_id', parentId: typeId} : undefined,
    db,
  );
  const assetId = await resolveMasterId(
    'crm_master_equipment_assets',
    u.assetName,
    modelId ? {parentCol: 'model_id', parentId: modelId} : undefined,
    db,
  );
  return {categoryId, brandId, typeId, modelId, assetId};
}

export async function resolveWorkflowStageByCode(code: string, db: Db = pool) {
  const rows = await loadMasterRows('crm_master_workflow_stages', db);
  return rows.find(r => r.code === code) ?? null;
}

export async function resolveWorkflowStatusByCode(code: string, db: Db = pool) {
  const rows = await loadMasterRows('crm_master_workflow_statuses', db);
  return rows.find(r => r.code === code) ?? null;
}

export async function resolveWorkflowStatusById(id: string, db: Db = pool) {
  const rows = await loadMasterRows('crm_master_workflow_statuses', db);
  return rows.find(r => r.id === id) ?? null;
}
