import crypto from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';

/**
 * Location masters: country → province → city → district → village, plus postal codes per city.
 * Catalog values: countries use their code; provinces, cities, districts and villages use their row id; postal codes use
 * the postal code itself with the city id as parentValue. A village's zipCode is the postal code of its postal_code_id.
 */
const levels = [
  {key: 'province', table: CRM.masterProvinces, parentColumn: 'country_id'},
  {key: 'city', table: CRM.masterCities, parentColumn: 'province_id'},
  {key: 'district', table: CRM.masterDistricts, parentColumn: 'city_id'},
  {key: 'village', table: CRM.masterVillages, parentColumn: 'district_id'},
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (message: string) => Object.assign(new Error(message), {status: 422});


const equal = (a: any, b: any) =>
  JSON.stringify([a?.value, a?.name, a?.active, a?.parentValue || '', a?.region || '', a?.zipCode || '']) ===
  JSON.stringify([b?.value, b?.name, b?.active, b?.parentValue || '', b?.region || '', b?.zipCode || '']);

async function saveCountries(c: PoolConnection, catalog: MasterCatalog, by: string | null) {
  const [stored] = await c.query<any[]>(`SELECT id,code,name,is_active FROM ${CRM.masterCountries} FOR UPDATE`);
  for (const row of catalog.country || []) {
    const old = stored.find(x => x.code === row.value);
    if (!old)
      await c.execute(
        `INSERT INTO ${CRM.masterCountries} (id,code,name,is_active,sort_order,created_by)
         SELECT ?,?,?,?,COALESCE(MAX(sort_order),0)+1,? FROM ${CRM.masterCountries}`,
        [crypto.randomUUID(), row.value, row.name, row.active ? 1 : 0, by],
      );
    else if (old.name !== row.name || !!old.is_active !== row.active)
      await c.execute(`UPDATE ${CRM.masterCountries} SET name=?,is_active=?,updated_by=? WHERE id=?`, [
        row.name,
        row.active ? 1 : 0,
        by,
        old.id,
      ]);
  }
}

async function savePostalCodes(c: PoolConnection, catalog: MasterCatalog, by: string | null) {
  const [stored] = await c.query<any[]>(`SELECT id,city_id,postal_code,name,is_active FROM ${CRM.masterPostalCodes} FOR UPDATE`);
  const lookup = new Map(stored.map(row => [`${row.city_id}|${row.postal_code}`, row]));
  for (const row of catalog.postalCode || []) {
    const city = (catalog.city || []).find(x => x.value === row.parentValue);
    if (!city) throw fail('Kota/kabupaten wajib dipilih untuk ZIP code.');
    const old = lookup.get(`${city.value}|${row.value}`);
    if (!old)
      await c.execute(
        `INSERT INTO ${CRM.masterPostalCodes} (id,city_id,postal_code,name,is_active,created_by) VALUES (?,?,?,?,?,?)`,
        [crypto.randomUUID(), city.value, row.value, row.name, row.active ? 1 : 0, by],
      );
    else if (old.name !== row.name || !!old.is_active !== row.active)
      await c.execute(`UPDATE ${CRM.masterPostalCodes} SET name=?,is_active=?,updated_by=? WHERE id=?`, [
        row.name,
        row.active ? 1 : 0,
        by,
        old.id,
      ]);
  }
}

@Injectable()
export class LocationRepository {
  static readonly groups = ['country', 'province', 'city', 'district', 'village', 'postalCode'];
  constructor(private readonly db: CrmDatabase) {}

  async catalog(base: MasterCatalog): Promise<MasterCatalog> {
    const result = {...base};
    const [countries] = await this.db.pool.query<any[]>(
      `SELECT code,name,is_active FROM ${CRM.masterCountries} ORDER BY sort_order,created_at,id`,
    );
    result.country = countries.map(x => ({value: x.code, name: x.name, active: !!x.is_active}));

    const [provinces] = await this.db.pool.query<any[]>(
      `SELECT a.id,a.name,a.is_active,a.region,c.code AS parent FROM ${CRM.masterProvinces} a
       JOIN ${CRM.masterCountries} c ON c.id=a.country_id ORDER BY a.created_at,a.id`,
    );
    const [cities] = await this.db.pool.query<any[]>(
      `SELECT id,name,is_active,province_id AS parent FROM ${CRM.masterCities} ORDER BY created_at,id`,
    );
    const [districts] = await this.db.pool.query<any[]>(
      `SELECT id,name,is_active,city_id AS parent FROM ${CRM.masterDistricts} ORDER BY created_at,id`,
    );
    const [villages] = await this.db.pool.query<any[]>(
      `SELECT v.id,v.name,v.is_active,v.district_id AS parent,z.postal_code AS zip FROM ${CRM.masterVillages} v
       LEFT JOIN ${CRM.masterPostalCodes} z ON z.id=v.postal_code_id ORDER BY v.created_at,v.id`,
    );
    const item = (r: any): MasterItem => ({
      value: r.id,
      name: r.name,
      active: !!r.is_active,
      parentValue: r.parent,
      ...(r.region ? {region: r.region} : {}),
      ...(r.zip ? {zipCode: r.zip} : {}),
    });
    result.province = provinces.map(item);
    result.city = cities.map(item);
    result.district = districts.map(item);
    result.village = villages.map(item);

    const [zipRows] = await this.db.pool.query<any[]>(
      `SELECT z.postal_code,z.name,z.city_id,(z.is_active AND c.is_active AND p.is_active) AS is_active
       FROM ${CRM.masterPostalCodes} z
       JOIN ${CRM.masterCities} c ON c.id=z.city_id
       JOIN ${CRM.masterProvinces} p ON p.id=c.province_id
       ORDER BY z.city_id,z.postal_code`,
    );
    result.postalCode = zipRows.map(r => ({
      value: String(r.postal_code),
      name: r.name,
      active: !!r.is_active,
      parentValue: String(r.city_id),
    }));
    return result;
  }

  async save(catalog: MasterCatalog, previous: MasterCatalog, by: string | null) {
    await this.db.transaction(async c => {
      await saveCountries(c, catalog, by);
      const [countries] = await c.query<any[]>(`SELECT id,code FROM ${CRM.masterCountries}`);

      let postalIds: Map<string, string> | null = null;
      const postalId = async (districtId: string, zip: string | undefined) => {
        if (!zip) return null;
        postalIds ??= new Map(
          (await c.query<any[]>(`SELECT id,city_id,postal_code FROM ${CRM.masterPostalCodes}`))[0].map(r => [
            `${r.city_id}|${r.postal_code}`,
            r.id as string,
          ]),
        );
        const district = (catalog.district || []).find(x => x.value === districtId);
        const id = district && postalIds.get(`${district.parentValue}|${zip}`);
        if (!id) throw fail('ZIP code must belong to the same city/regency as the village.');
        return id;
      };

      const ensureRow = async (index: number, row: MasterItem): Promise<string> => {
        const level = levels[index];
        let parentId: string;
        if (index === 0) {
          const country = countries.find(x => x.code === row.parentValue || x.id === row.parentValue);
          if (!country) throw fail('Negara wajib dipilih.');
          parentId = country.id;
        } else {
          const parent = (catalog[levels[index - 1].key] || []).find(p => p.value === row.parentValue);
          if (!parent) throw fail('Wilayah induk wajib dipilih.');
          parentId = await ensureRow(index - 1, parent);
        }

        const columns: string[] = ['name', level.parentColumn, 'is_active'];
        const values: any[] = [row.name, parentId, row.active ? 1 : 0];
        if (index === 0) columns.push('region'), values.push(row.region || null);
        if (index === 3) columns.push('postal_code_id'), values.push(await postalId(parentId, row.zipCode));

        const [old] = await c.query<any[]>(`SELECT * FROM ${level.table} WHERE id=? FOR UPDATE`, [row.value]);
        if (old.length) {
          if (columns.some((k, i) => String(old[0][k] ?? '') !== String(values[i] ?? '')))
            await c.execute(
              `UPDATE ${level.table} SET ${columns.map(k => `${k}=?`).join(',')},updated_by=? WHERE id=?`,
              [...values, by, old[0].id],
            );
          return old[0].id;
        }
        if (!UUID.test(row.value)) throw fail('ID wilayah tidak valid.');
        await c.execute(
          `INSERT INTO ${level.table} (id,${columns.join(',')},created_by) VALUES (?,${columns.map(() => '?').join(',')},?)`,
          [row.value, ...values, by],
        );
        return row.value;
      };

      const saveLevel = async (index: number) => {
        const key = levels[index].key;
        const old = new Map((previous[key] || []).map(x => [x.value, x]));
        for (const row of catalog[key] || []) if (!equal(row, old.get(row.value))) await ensureRow(index, row);
      };
      // Villages point at a postal code, so postal codes are saved after cities and before villages.
      await saveLevel(0);
      await saveLevel(1);
      await savePostalCodes(c, catalog, by);
      await saveLevel(2);
      await saveLevel(3);
    });
  }
}
