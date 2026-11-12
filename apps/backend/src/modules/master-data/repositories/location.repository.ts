import crypto from 'node:crypto';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {clearCrmLookupCache, cleanNullableString, resolveMasterId} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';

export async function initializeLocation() {
  return;
}

export async function locationCatalog(_base: MasterCatalog): Promise<MasterCatalog> {
  if (!pool) {
    return {country: [], province: [], city: [], district: [], village: [], postalCode: []};
  }
  const [countries] = await pool.query<any[]>(
    'SELECT id, code, name, is_active FROM crm_master_countries ORDER BY sort_order ASC, name ASC',
  );
  const countryById = new Map<string, string>(countries.map(c => [c.id, c.name]));

  const [provs] = await pool.query<any[]>(
    'SELECT id, country_id, name, is_active, region FROM crm_master_provinces ORDER BY name ASC',
  );
  const [cities] = await pool.query<any[]>(
    'SELECT id, province_id, name, is_active FROM crm_master_cities ORDER BY name ASC',
  );
  const [districts] = await pool.query<any[]>(
    'SELECT id, city_id, name, is_active FROM crm_master_districts ORDER BY name ASC',
  );
  const [postals] = await pool.query<any[]>(
    'SELECT id, city_id, postal_code, name, is_active FROM crm_master_postal_codes ORDER BY postal_code ASC',
  );
  const postalById = new Map<string, string>(postals.map(p => [p.id, p.postal_code]));

  const [villages] = await pool.query<any[]>(
    'SELECT id, district_id, name, postal_code_id, is_active FROM crm_master_villages ORDER BY name ASC',
  );

  return {
    country: countries.map(c => ({
      value: c.name,
      name: c.name,
      active: Boolean(c.is_active),
    })),
    province: provs.map(p => ({
      value: p.id,
      name: p.name,
      active: Boolean(p.is_active),
      parentValue: countryById.get(p.country_id) || 'Indonesia',
      ...(p.region ? {region: p.region} : {}),
    })),
    city: cities.map(c => ({
      value: c.id,
      name: c.name,
      active: Boolean(c.is_active),
      parentValue: c.province_id,
    })),
    district: districts.map(d => ({
      value: d.id,
      name: d.name,
      active: Boolean(d.is_active),
      parentValue: d.city_id,
    })),
    village: villages.map(v => ({
      value: v.id,
      name: v.name,
      active: Boolean(v.is_active),
      parentValue: v.district_id,
      ...(v.postal_code_id && postalById.get(v.postal_code_id)
        ? {zipCode: postalById.get(v.postal_code_id)}
        : {}),
    })),
    postalCode: postals.map(z => ({
      value: z.postal_code,
      name: z.name || z.postal_code,
      active: Boolean(z.is_active),
      parentValue: z.city_id,
    })),
  };
}

export async function saveLocations(catalog: MasterCatalog, previous: MasterCatalog) {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const changedOnly = (nextList?: MasterItem[], prevList?: MasterItem[]) => {
      if (!Array.isArray(nextList)) return [];
      const prevMap = new Map((prevList || []).map(x => [`${x.value}|${x.parentValue || ''}`, x]));
      return nextList.filter(item => {
        const prev = prevMap.get(`${item.value}|${item.parentValue || ''}`);
        return !prev || prev.name !== item.name || prev.active !== item.active;
      });
    };

    const countryIdDefault = await resolveMasterId('crm_master_countries', 'Indonesia', undefined, conn);

    for (const item of changedOnly(catalog.province, previous.province)) {
      const name = cleanNullableString(item.name) || cleanNullableString(item.value);
      if (!name) continue;
      const active = item.active === false ? 0 : 1;
      const cId = (await resolveMasterId('crm_master_countries', item.parentValue, undefined, conn)) || countryIdDefault;
      if (!cId) continue;
      const [ex] = await conn.execute<any[]>('SELECT id FROM crm_master_provinces WHERE id = ? OR LOWER(name) = LOWER(?) LIMIT 1', [item.value, name]);
      if (ex.length) {
        await conn.execute('UPDATE crm_master_provinces SET name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [name, active, ex[0].id]);
      } else {
        await conn.execute('INSERT INTO crm_master_provinces (id, country_id, name, is_active) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), cId, name, active]);
      }
    }

    for (const item of changedOnly(catalog.city, previous.city)) {
      const name = cleanNullableString(item.name) || cleanNullableString(item.value);
      if (!name) continue;
      const active = item.active === false ? 0 : 1;
      const pId = await resolveMasterId('crm_master_provinces', item.parentValue, undefined, conn);
      if (!pId) continue;
      const [ex] = await conn.execute<any[]>('SELECT id FROM crm_master_cities WHERE id = ? LIMIT 1', [item.value]);
      if (ex.length) {
        await conn.execute('UPDATE crm_master_cities SET name = ?, province_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [name, pId, active, ex[0].id]);
      } else {
        await conn.execute('INSERT INTO crm_master_cities (id, province_id, name, is_active) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), pId, name, active]);
      }
    }

    for (const item of changedOnly(catalog.district, previous.district)) {
      const name = cleanNullableString(item.name) || cleanNullableString(item.value);
      if (!name) continue;
      const active = item.active === false ? 0 : 1;
      const cId = await resolveMasterId('crm_master_cities', item.parentValue, undefined, conn);
      if (!cId) continue;
      const [ex] = await conn.execute<any[]>('SELECT id FROM crm_master_districts WHERE id = ? LIMIT 1', [item.value]);
      if (ex.length) {
        await conn.execute('UPDATE crm_master_districts SET name = ?, city_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [name, cId, active, ex[0].id]);
      } else {
        await conn.execute('INSERT INTO crm_master_districts (id, city_id, name, is_active) VALUES (?, ?, ?, ?)', [crypto.randomUUID(), cId, name, active]);
      }
    }

    for (const item of changedOnly(catalog.postalCode, previous.postalCode)) {
      const zip = cleanNullableString(item.value);
      const name = cleanNullableString(item.name) || zip;
      if (!zip || !name) continue;
      const active = item.active === false ? 0 : 1;
      const cId = await resolveMasterId('crm_master_cities', item.parentValue, undefined, conn);
      if (!cId) continue;
      await conn.execute(
        `INSERT INTO crm_master_postal_codes (id, city_id, postal_code, name, is_active)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active), updated_at = CURRENT_TIMESTAMP(3)`,
        [crypto.randomUUID(), cId, zip.slice(0, 20), name.slice(0, 150), active],
      );
    }

    await conn.commit();
    clearCrmLookupCache();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
