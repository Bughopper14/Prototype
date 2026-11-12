import crypto from 'node:crypto';
import type {MasterCatalog} from '@liugong/shared';
import {clearCrmLookupCache, cleanNullableString, normalizeCode} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';
import {readSimpleCatalog, saveSimpleCatalog, type SimpleTableSpec} from './simple-master.helper';

const SIMPLE_SPECS: SimpleTableSpec[] = [
  {key: 'representativeType', table: 'crm_master_legal_representative_types'},
  {key: 'designation', table: 'crm_master_legal_designations'},
];

export async function initializeLegalMasters(_seed: MasterCatalog) {
  return;
}

export async function legalMasterCatalog(_base: MasterCatalog): Promise<MasterCatalog> {
  const catalog = await readSimpleCatalog(SIMPLE_SPECS);
  if (pool) {
    const [remarks] = await pool.query<any[]>(
      'SELECT code, name, deed_scope, is_active FROM crm_master_legal_remark_categories ORDER BY sort_order ASC, name ASC',
    );
    catalog.remarkCategoryId = remarks.map(r => ({
      value: r.code,
      name: r.name,
      active: Boolean(r.is_active),
    }));
  } else {
    catalog.remarkCategoryId = [];
  }
  return catalog;
}

export async function saveLegalMasters(catalog: MasterCatalog) {
  const filtered: MasterCatalog = {
    representativeType: (catalog.representativeType || []).filter(i => cleanNullableString(i?.value) !== null),
    designation: (catalog.designation || []).filter(i => cleanNullableString(i?.value) !== null),
  };
  await saveSimpleCatalog(SIMPLE_SPECS, filtered);

  if (pool && Array.isArray(catalog.remarkCategoryId)) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < catalog.remarkCategoryId.length; i++) {
        const item = catalog.remarkCategoryId[i];
        const rawVal = cleanNullableString(item?.value);
        const name = cleanNullableString(item?.name) || rawVal;
        if (!rawVal || !name) continue;
        const code = normalizeCode(rawVal).slice(0, 80) || rawVal;
        const scope = code.includes('ESTABLISHMENT') || /pendirian/i.test(name) ? 'ESTABLISHMENT' : 'AMENDMENT';
        const active = item.active === false ? 0 : 1;
        const [existing] = await conn.execute<any[]>(
          'SELECT id FROM crm_master_legal_remark_categories WHERE id = ? OR LOWER(code) = LOWER(?) LIMIT 1',
          [rawVal, code],
        );
        if (existing.length) {
          await conn.execute(
            'UPDATE crm_master_legal_remark_categories SET name = ?, deed_scope = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
            [name, scope, i + 1, active, existing[0].id],
          );
        } else {
          await conn.execute(
            'INSERT INTO crm_master_legal_remark_categories (id, code, name, deed_scope, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [crypto.randomUUID(), code, name, scope, i + 1, active],
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
