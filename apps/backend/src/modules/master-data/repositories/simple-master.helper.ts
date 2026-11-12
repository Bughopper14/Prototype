import crypto from 'node:crypto';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {clearCrmLookupCache, cleanNullableString, normalizeCode} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';

export interface SimpleTableSpec {
  key: string;
  table: string;
  hasSortOrder?: boolean;
  extraSelect?: string;
  mapRow?: (row: any) => MasterItem;
}

export async function readSimpleCatalog(specs: SimpleTableSpec[]): Promise<MasterCatalog> {
  const catalog: MasterCatalog = {};
  if (!pool) return catalog;
  for (const spec of specs) {
    const orderBy = spec.hasSortOrder !== false ? 'ORDER BY sort_order ASC, name ASC' : 'ORDER BY name ASC';
    const [rows] = await pool.query<any[]>(`SELECT * FROM \`${spec.table}\` ${orderBy}`);
    catalog[spec.key] = rows.map(row =>
      spec.mapRow
        ? spec.mapRow(row)
        : {
            value: row.code || row.id,
            name: row.name,
            active: Boolean(row.is_active),
          },
    );
  }
  return catalog;
}

export async function saveSimpleCatalog(specs: SimpleTableSpec[], catalog: MasterCatalog) {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const spec of specs) {
      const items = catalog[spec.key];
      if (!Array.isArray(items)) continue;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rawVal = cleanNullableString(item?.value);
        const name = cleanNullableString(item?.name) || rawVal;
        if (!rawVal || !name) continue;
        const code = rawVal.length <= 80 ? rawVal : normalizeCode(rawVal).slice(0, 80);
        const active = item.active === false ? 0 : 1;
        const [existing] = await conn.execute<any[]>(
          `SELECT id FROM \`${spec.table}\` WHERE id = ? OR LOWER(code) = LOWER(?) LIMIT 1`,
          [rawVal, code],
        );
        if (existing.length) {
          if (spec.hasSortOrder !== false) {
            await conn.execute(
              `UPDATE \`${spec.table}\` SET name = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
              [name, i + 1, active, existing[0].id],
            );
          } else {
            await conn.execute(
              `UPDATE \`${spec.table}\` SET name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
              [name, active, existing[0].id],
            );
          }
        } else if (spec.hasSortOrder !== false) {
          await conn.execute(
            `INSERT INTO \`${spec.table}\` (id, code, name, sort_order, is_active) VALUES (?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), code, name, i + 1, active],
          );
        } else {
          await conn.execute(
            `INSERT INTO \`${spec.table}\` (id, code, name, is_active) VALUES (?, ?, ?, ?)`,
            [crypto.randomUUID(), code, name, active],
          );
        }
      }
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

