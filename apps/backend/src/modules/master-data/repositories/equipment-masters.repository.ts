import crypto from 'node:crypto';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {clearCrmLookupCache, cleanNullableString, normalizeCode, resolveMasterId} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';

export async function initializeEquipmentMasters(_seed: MasterCatalog) {
  return;
}

export async function equipmentMasterCatalog(_base: MasterCatalog): Promise<MasterCatalog> {
  if (!pool) return {unitCategory: [], brand: [], unitType: [], modelName: [], assetName: []};
  const [cats] = await pool.query<any[]>('SELECT id, code, name, is_active FROM crm_master_equipment_categories ORDER BY sort_order ASC, name ASC');
  const [brands] = await pool.query<any[]>(
    `SELECT b.id, b.code, b.name, b.is_active, c.code AS parent_code
     FROM crm_master_equipment_brands b
     JOIN crm_master_equipment_categories c ON c.id = b.category_id
     ORDER BY b.name ASC`,
  );
  const [types] = await pool.query<any[]>(
    `SELECT t.id, t.code, t.name, t.is_active, b.code AS parent_code
     FROM crm_master_equipment_types t
     JOIN crm_master_equipment_brands b ON b.id = t.brand_id
     ORDER BY t.name ASC`,
  );
  const [models] = await pool.query<any[]>(
    `SELECT m.id, m.code, m.name, m.is_active, t.code AS parent_code
     FROM crm_master_equipment_models m
     JOIN crm_master_equipment_types t ON t.id = m.type_id
     ORDER BY m.name ASC`,
  );
  const [assets] = await pool.query<any[]>(
    `SELECT a.id, a.code, a.name, a.is_active, m.code AS parent_code
     FROM crm_master_equipment_assets a
     JOIN crm_master_equipment_models m ON m.id = a.model_id
     ORDER BY a.name ASC`,
  );

  const mapChild = (rows: any[]): MasterItem[] =>
    rows.map(r => ({
      value: r.code || r.name,
      name: r.name,
      active: Boolean(r.is_active),
      parentValue: r.parent_code,
    }));

  return {
    unitCategory: cats.map(c => ({value: c.code, name: c.name, active: Boolean(c.is_active)})),
    brand: mapChild(brands),
    unitType: mapChild(types),
    modelName: mapChild(models),
    assetName: mapChild(assets),
  };
}

export async function saveEquipmentMasters(catalog: MasterCatalog) {
  if (!pool) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (Array.isArray(catalog.unitCategory)) {
      for (let i = 0; i < catalog.unitCategory.length; i++) {
        const item = catalog.unitCategory[i];
        const raw = cleanNullableString(item?.value);
        const name = cleanNullableString(item?.name) || raw;
        if (!raw || !name) continue;
        const code = normalizeCode(raw).slice(0, 50) || raw;
        const active = item.active === false ? 0 : 1;
        const [ex] = await conn.execute<any[]>(
          'SELECT id FROM crm_master_equipment_categories WHERE id = ? OR LOWER(code) = LOWER(?) LIMIT 1',
          [raw, code],
        );
        if (ex.length) {
          await conn.execute(
            'UPDATE crm_master_equipment_categories SET name = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
            [name, i + 1, active, ex[0].id],
          );
        } else {
          await conn.execute(
            'INSERT INTO crm_master_equipment_categories (id, code, name, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
            [crypto.randomUUID(), code, name, i + 1, active],
          );
        }
      }
    }

    const levels: Array<{
      items: MasterItem[] | undefined;
      table: string;
      parentCol: string;
      parentTable: string;
    }> = [
      {items: catalog.brand, table: 'crm_master_equipment_brands', parentCol: 'category_id', parentTable: 'crm_master_equipment_categories'},
      {items: catalog.unitType, table: 'crm_master_equipment_types', parentCol: 'brand_id', parentTable: 'crm_master_equipment_brands'},
      {items: catalog.modelName, table: 'crm_master_equipment_models', parentCol: 'type_id', parentTable: 'crm_master_equipment_types'},
      {items: catalog.assetName, table: 'crm_master_equipment_assets', parentCol: 'model_id', parentTable: 'crm_master_equipment_models'},
    ];

    for (const lvl of levels) {
      if (!Array.isArray(lvl.items)) continue;
      for (const item of lvl.items) {
        const code = cleanNullableString(item?.value);
        const name = cleanNullableString(item?.name) || code;
        if (!code || !name) continue;
        const active = item.active === false ? 0 : 1;
        let parentId = await resolveMasterId(lvl.parentTable, item.parentValue, undefined, conn);
        if (!parentId) {
          const [firstParent] = await conn.query<any[]>(`SELECT id FROM \`${lvl.parentTable}\` ORDER BY created_at LIMIT 1`);
          parentId = firstParent[0]?.id ?? null;
        }
        if (!parentId) continue;

        const [ex] = await conn.execute<any[]>(
          `SELECT id FROM \`${lvl.table}\` WHERE id = ? OR LOWER(code) = LOWER(?) LIMIT 1`,
          [code, code],
        );
        if (ex.length) {
          await conn.execute(
            `UPDATE \`${lvl.table}\` SET ${lvl.parentCol} = ?, name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
            [parentId, name, active, ex[0].id],
          );
        } else {
          await conn.execute(
            `INSERT INTO \`${lvl.table}\` (id, ${lvl.parentCol}, code, name, is_active) VALUES (?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), parentId, code.slice(0, 80), name.slice(0, 150), active],
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
