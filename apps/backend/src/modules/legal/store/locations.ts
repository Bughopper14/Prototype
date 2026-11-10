/** Province / city / district names of stakeholders. */
import {pool} from '../../../core/db/pool';
import fs from 'node:fs/promises';

export async function stakeholderLocationNames(c: any, input: any) {
  const stored = {...input};
  let parentId: string | undefined;
  for (const [key, table, parent] of [
    ['province', 'master_location_provinsi', null],
    ['cityRegency', 'master_location_kabupaten_kota', 'provinsi_id'],
    ['district', 'master_location_kecamatan', 'kabupaten_kota_id'],
    ['village', 'master_location_kelurahan_desa', 'kecamatan_id'],
  ] as const) {
    if (!input[key]) {
      parentId = undefined;
      continue;
    }
    try {
      const [rows] = await c.execute(
        'SELECT id,name FROM ' +
          table +
          ' WHERE (id=? OR name=?)' +
          (parent && parentId ? ' AND ' + parent + '=?' : ''),
        [input[key], input[key], ...(parent && parentId ? [parentId] : [])],
      );
      if (rows.length >= 1) {
        stored[key] = rows[0].name;
        parentId = rows[0].id;
      }
    } catch {}
  }
  return stored;
}
export async function migrateStakeholderLocationNames() {
  if (!pool) return;
  const fields = [
    ['province', 'master_location_provinsi'],
    ['city_regency', 'master_location_kabupaten_kota'],
    ['district', 'master_location_kecamatan'],
    ['village', 'master_location_kelurahan_desa'],
  ] as const;
  try {
    const c = await pool.getConnection();
    try {
      await c.beginTransaction();
      const [backup] = await c.query<any[]>(
        'SELECT id,province,city_regency,district,village FROM legal_stakeholder WHERE ' +
          fields
            .map(
              ([key, table]) =>
                'EXISTS (SELECT 1 FROM ' + table + ' m WHERE m.id=legal_stakeholder.' + key + ')',
            )
            .join(' OR ') +
          ' FOR UPDATE',
      );
      if (backup.length) {
        await fs.mkdir('.data', {recursive: true});
        await fs.writeFile(
          '.data/stakeholder-location-backup-' + Date.now() + '.json',
          JSON.stringify(backup, null, 2),
        );
      }
      for (const [key, table] of fields)
        await c.query(
          'UPDATE legal_stakeholder s JOIN ' + table + ' m ON m.id=s.' + key + ' SET s.' + key + '=m.name',
        );
      await c.commit();
    } catch (e) {
      await c.rollback();
      console.warn('migrateStakeholderLocationNames warning, skipped:', (e as any)?.message || e);
    } finally {
      c.release();
    }
  } catch (connErr) {
    console.warn('migrateStakeholderLocationNames connection error:', (connErr as any)?.message || connErr);
  }
}
