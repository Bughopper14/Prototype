import {auditTable} from '../../users/users.repository';
import {pool} from '../../../core/db/pool';
import type {MasterCatalog, MasterItem} from '@liugong/shared';
import crypto from 'node:crypto';

/** Pre-analysis option lists kept as their own master tables (investment plan options). */
const groups = [['preanInvestmentPlanOptions', 'master_prean_investment_plan_options']] as const;

export async function initializePreanalysisMasters(seed: MasterCatalog) {
  if (!pool) return;
  for (const [key, table] of groups) {
    await pool.query(`CREATE TABLE IF NOT EXISTS \`${table}\` (
   id CHAR(36) PRIMARY KEY,code VARCHAR(150) NOT NULL UNIQUE,name VARCHAR(150) NOT NULL,
   is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await auditTable(table);
    const [count] = await pool.query<any[]>(`SELECT COUNT(*) AS total FROM \`${table}\``);
    if (Number(count[0].total) === 0)
      for (const item of seed[key] || [])
        await pool.execute(`INSERT INTO \`${table}\` (id,code,name,is_active) VALUES (?,?,?,?)`, [
          crypto.randomUUID(),
          item.value,
          item.name,
          item.active ? 1 : 0,
        ]);
  }
}

export async function preanalysisMasterCatalog(catalog: MasterCatalog): Promise<MasterCatalog> {
  if (!pool) return catalog;
  const result = {...catalog};
  for (const [key, table] of groups) {
    try {
      const [rows] = await pool.query<any[]>(
        `SELECT code,name,is_active FROM \`${table}\` ORDER BY created_at,id`,
      );
      if (rows.length)
        result[key] = rows.map(
          row => ({value: row.code, name: row.name, active: !!row.is_active}) satisfies MasterItem,
        );
    } catch (e) {
      console.warn(`Could not read master table ${table}:`, e);
    }
  }
  return result;
}

export async function savePreanalysisMasters(catalog: MasterCatalog, targetGroup?: string) {
  if (!pool) throw new Error('MySQL is not configured');
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    for (const [key, table] of groups) {
      if ((targetGroup && key !== targetGroup) || !catalog[key]) continue;
      for (const item of catalog[key]) {
        const [rows] = await c.execute<any[]>(
          `SELECT name,is_active FROM \`${table}\` WHERE code=? FOR UPDATE`,
          [item.value],
        );
        if (rows.length) {
          if (rows[0].name !== item.name || !!rows[0].is_active !== item.active)
            await c.execute(
              `UPDATE \`${table}\` SET name=?,is_active=?,updated_at=CURRENT_TIMESTAMP(3) WHERE code=?`,
              [item.name, item.active ? 1 : 0, item.value],
            );
        } else
          await c.execute(`INSERT INTO \`${table}\` (id,code,name,is_active) VALUES (?,?,?,?)`, [
            crypto.randomUUID(),
            item.value,
            item.name,
            item.active ? 1 : 0,
          ]);
      }
    }
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
