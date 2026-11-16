import crypto from 'node:crypto';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {Injectable} from '@nestjs/common';
import {CrmDatabase} from '../../../core/db/crm-database';
import {CRM} from '../../../core/db/crm-tables';

/**
 * Five-level equipment hierarchy. Each child row points at its parent by id (parentColumn); the catalog keeps using the
 * parent's code as parentValue, so the frontend is unchanged.
 */
const levels = [
  {key: 'unitCategory', table: CRM.masterEquipmentCategories, parentColumn: null},
  {key: 'brand', table: CRM.masterEquipmentBrands, parentColumn: 'category_id'},
  {key: 'unitType', table: CRM.masterEquipmentTypes, parentColumn: 'brand_id'},
  {key: 'modelName', table: CRM.masterEquipmentModels, parentColumn: 'type_id'},
  {key: 'assetName', table: CRM.masterEquipmentAssets, parentColumn: 'model_id'},
] as const;


/** Equipment masters: category → brand → type → model → asset. */
@Injectable()
export class EquipmentMastersRepository {
  static readonly groups: string[] = levels.map(l => l.key);
  constructor(private readonly db: CrmDatabase) {}

  async catalog(catalog: MasterCatalog): Promise<MasterCatalog> {
    const result = {...catalog};
    for (const [i, level] of levels.entries()) {
      const parent = i > 0 ? levels[i - 1] : null;
      const [rows] = await this.db.pool.query<any[]>(
        parent
          ? `SELECT c.code,c.name,c.is_active,p.code AS parent_code FROM ${level.table} c
             LEFT JOIN ${parent.table} p ON p.id=c.${level.parentColumn} ORDER BY c.created_at,c.id`
          : `SELECT code,name,is_active,NULL AS parent_code FROM ${level.table} ORDER BY sort_order,created_at,id`,
      );
      result[level.key] = rows.map(
        row =>
          ({
            value: row.code,
            name: row.name,
            active: !!row.is_active,
            ...(row.parent_code ? {parentValue: row.parent_code} : {}),
          }) satisfies MasterItem,
      );
    }
    return result;
  }

  async save(catalog: MasterCatalog, by: string | null) {
    await this.db.transaction(async c => {
      for (const [i, level] of levels.entries()) {
        const parentLevel = i > 0 ? levels[i - 1] : null;
        for (const item of catalog[level.key] || []) {
          const parentCode = parentLevel ? item.parentValue || null : null;
          const [rows] = await c.execute<any[]>(
            parentLevel
              ? `SELECT c.name,c.is_active,p.code AS parent_code FROM ${level.table} c
                 LEFT JOIN ${parentLevel.table} p ON p.id=c.${level.parentColumn} WHERE c.code=? FOR UPDATE`
              : `SELECT name,is_active,NULL AS parent_code FROM ${level.table} WHERE code=? FOR UPDATE`,
            [item.value],
          );
          const old = rows[0];
          const unchanged =
            old && old.name === item.name && !!old.is_active === item.active && (old.parent_code || null) === parentCode;
          if (unchanged) continue;

          let parentId: string | null = null;
          if (parentLevel) {
            if (!parentCode) throw Object.assign(new Error(`Pilih induk untuk ${item.name}.`), {status: 422});
            const [parents] = await c.execute<any[]>(`SELECT id FROM ${parentLevel.table} WHERE code=?`, [parentCode]);
            if (!parents.length || !catalog[parentLevel.key].some(x => x.value === parentCode))
              throw Object.assign(new Error(`Induk ${item.name} tidak tersedia.`), {status: 422});
            parentId = parents[0].id;
          }

          if (old)
            await c.execute(
              `UPDATE ${level.table} SET name=?,is_active=?${parentLevel ? `,${level.parentColumn}=?` : ''},updated_by=?
               WHERE code=?`,
              [item.name, item.active ? 1 : 0, ...(parentLevel ? [parentId] : []), by, item.value],
            );
          else if (parentLevel)
            await c.execute(
              `INSERT INTO ${level.table} (id,code,name,is_active,${level.parentColumn},created_by) VALUES (?,?,?,?,?,?)`,
              [crypto.randomUUID(), item.value, item.name, item.active ? 1 : 0, parentId, by],
            );
          else
            await c.execute(
              `INSERT INTO ${level.table} (id,code,name,is_active,sort_order,created_by)
               SELECT ?,?,?,?,COALESCE(MAX(sort_order),0)+1,? FROM ${level.table}`,
              [crypto.randomUUID(), item.value, item.name, item.active ? 1 : 0, by],
            );
        }
      }
    });
  }
}
