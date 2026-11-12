import crypto from 'node:crypto';
import type {MasterCatalog} from '@liugong/shared';
import {clearCrmLookupCache, cleanNullableString, normalizeCode, resolveWorkflowStageByCode} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';

export async function initializeDocumentMasters(_seed: MasterCatalog) {
  return;
}

export async function documentMasterCatalog(_base: MasterCatalog): Promise<MasterCatalog> {
  if (!pool) return {documents: []};
  const [rows] = await pool.query<any[]>(
    'SELECT code, name, title, department_code, is_mandatory, is_active FROM crm_master_document_types ORDER BY sort_order ASC, name ASC',
  );
  return {
    documents: rows.map(r => ({
      value: r.code,
      name: r.name || r.title,
      active: Boolean(r.is_active),
      required: Boolean(r.is_mandatory),
      role: r.department_code || 'MKT',
    })),
  };
}

export async function saveDocumentMasters(catalog: MasterCatalog) {
  if (!pool || !Array.isArray(catalog.documents)) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const preStage = await resolveWorkflowStageByCode('PRE_ANALYSIS', conn);
    const fapStage = await resolveWorkflowStageByCode('FAP_STAGE', conn);
    for (let i = 0; i < catalog.documents.length; i++) {
      const item = catalog.documents[i];
      const rawCode = cleanNullableString(item?.value);
      const name = cleanNullableString(item?.name) || rawCode;
      if (!rawCode || !name) continue;
      const code = normalizeCode(rawCode).slice(0, 60) || rawCode;
      const role = String(item.role || 'MKT').trim().toUpperCase().slice(0, 30);
      const isMandatory = item.required ? 1 : 0;
      const active = item.active === false ? 0 : 1;
      const stageId = code === 'FAP' ? fapStage?.id ?? preStage?.id ?? null : preStage?.id ?? null;

      const [existing] = await conn.execute<any[]>(
        'SELECT id FROM crm_master_document_types WHERE id = ? OR LOWER(code) = LOWER(?) LIMIT 1',
        [rawCode, code],
      );
      if (existing.length) {
        await conn.execute(
          `UPDATE crm_master_document_types
           SET name = ?, title = ?, department_code = ?, is_mandatory = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ?`,
          [name, name, role, isMandatory, i + 1, active, existing[0].id],
        );
      } else {
        await conn.execute(
          `INSERT INTO crm_master_document_types
            (id, stage_id, code, name, title, department_code, is_mandatory, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), stageId, code, name, name, role, isMandatory, i + 1, active],
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
