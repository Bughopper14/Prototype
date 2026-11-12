import crypto from 'node:crypto';
import type {MasterCatalog} from '@liugong/shared';
import {clearCrmLookupCache, cleanNullableString, normalizeCode} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';
import {readSimpleCatalog, saveSimpleCatalog, type SimpleTableSpec} from './simple-master.helper';

const SIMPLE_SPECS: SimpleTableSpec[] = [
  {key: 'facilityPurpose', table: 'crm_master_facility_purposes'},
  {key: 'financingMethod', table: 'crm_master_financing_methods'},
  {key: 'currency', table: 'crm_master_currencies'},
];

export async function initializeFinanceMasters(_seed: MasterCatalog) {
  return;
}

export async function financeMasterCatalog(_base: MasterCatalog): Promise<MasterCatalog> {
  const catalog = await readSimpleCatalog(SIMPLE_SPECS);
  if (pool) {
    const [timings] = await pool.query<any[]>(
      'SELECT code, name, timing_type, is_active FROM crm_master_payment_timings ORDER BY sort_order ASC, name ASC',
    );
    catalog.paymentMethod = timings.map(r => ({
      value: r.code,
      name: r.name,
      active: Boolean(r.is_active),
      timing: String(r.timing_type || 'ARREAR').toLowerCase(),
    }));
  } else {
    catalog.paymentMethod = [];
  }
  return catalog;
}

export async function saveFinanceMasters(catalog: MasterCatalog) {
  await saveSimpleCatalog(SIMPLE_SPECS, catalog);
  if (pool && Array.isArray(catalog.paymentMethod)) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < catalog.paymentMethod.length; i++) {
        const item = catalog.paymentMethod[i];
        const rawVal = cleanNullableString(item?.value);
        const name = cleanNullableString(item?.name) || rawVal;
        if (!rawVal || !name) continue;
        const code = normalizeCode(rawVal).slice(0, 50) || rawVal;
        const timingType = String(item.timing || '').toLowerCase().includes('advance') ? 'ADVANCE' : 'ARREAR';
        const active = item.active === false ? 0 : 1;
        const [existing] = await conn.execute<any[]>(
          'SELECT id FROM crm_master_payment_timings WHERE id = ? OR LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1',
          [rawVal, code, name],
        );
        if (existing.length) {
          await conn.execute(
            'UPDATE crm_master_payment_timings SET name = ?, timing_type = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
            [name, timingType, i + 1, active, existing[0].id],
          );
        } else {
          await conn.execute(
            'INSERT INTO crm_master_payment_timings (id, code, name, timing_type, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), code, name, timingType, i + 1, active],
          );
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
}
