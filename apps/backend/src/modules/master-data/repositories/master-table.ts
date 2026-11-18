import {toCode} from '../../../core/domain/code';
import crypto from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import {CrmDatabase} from '../../../core/db/crm-database';

/**
 * A plain code / name / is_active / sort_order master table of the crm_liugong design, read into one catalog group.
 * `extras` maps further columns of that table to MasterItem fields (for example a currency symbol).
 */
export type MasterTable = {
  key: string;
  table: string;
  extras?: {column: string; field: keyof MasterItem; read?: (v: any) => any; write?: (v: any) => any}[];
  /** Read only: listed in the catalog but never written by the Master Data screen. */
  readOnly?: boolean;
};

const identity = (v: any) => v;

/** Shared read / save for the plain master tables; the customer, business, legal and finance repositories use it. */
@Injectable()
export class MasterTableRepository {
  constructor(private readonly db: CrmDatabase) {}

  /** Reads each table into its catalog group, ordered by sort_order. */
  async read(defs: MasterTable[], catalog: MasterCatalog): Promise<MasterCatalog> {
    const result = {...catalog};
    for (const def of defs) {
      const extras = def.extras || [];
      const [rows] = await this.db.pool.query<any[]>(
        `SELECT code,name,is_active${extras.map(x => `,${x.column}`).join('')} FROM ${def.table}
         ORDER BY sort_order,created_at,id`,
      );
      result[def.key] = rows.map(row => {
        const item: MasterItem = {value: row.code, name: row.name, active: !!row.is_active};
        for (const x of extras) {
          const value = (x.read || identity)(row[x.column]);
          if (value !== null && value !== undefined) (item as any)[x.field] = value;
        }
        return item;
      });
    }
    return result;
  }

  /**
   * Inserts new codes and updates changed ones. Rows are never deleted: the design hides masters with is_active, and
   * the Master Data screen refuses saves that drop an existing code. New rows go to the end of the list (sort_order).
   */
  async save(defs: MasterTable[], catalog: MasterCatalog, by: string | null) {
    await this.db.transaction(async c => {
      for (const def of defs) {
        if (def.readOnly) continue;
        const extras = def.extras || [];
        for (const item of catalog[def.key] || []) {
          const extraValues = extras.map(x => (x.write || identity)((item as any)[x.field] ?? null));
          const [rows] = await c.execute<any[]>(
            `SELECT name,is_active${extras.map(x => `,${x.column}`).join('')} FROM ${def.table} WHERE code=? FOR UPDATE`,
            [item.value],
          );
          if (rows.length) {
            const old = rows[0];
            const changed =
              old.name !== item.name ||
              !!old.is_active !== item.active ||
              extras.some((x, i) => String(old[x.column] ?? '') !== String(extraValues[i] ?? ''));
            if (changed)
              await c.execute(
                `UPDATE ${def.table} SET name=?,is_active=?${extras.map(x => `,${x.column}=?`).join('')},updated_by=?
                 WHERE code=?`,
                [item.name, item.active ? 1 : 0, ...extraValues, by, item.value],
              );
          } else
            await c.execute(
              `INSERT INTO ${def.table} (id,code,name,is_active${extras.map(x => `,${x.column}`).join('')},sort_order,created_by)
               SELECT ?,?,?,?${extras.map(() => ',?').join('')},COALESCE(MAX(sort_order),0)+1,? FROM ${def.table}`,
              [crypto.randomUUID(), toCode(item.value), item.name, item.active ? 1 : 0, ...extraValues, by],
            );
        }
      }
    });
  }
}
