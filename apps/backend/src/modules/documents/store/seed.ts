/** Seeds and syncs document checklists from crm_master_document_types into crm_application_document_checklists. */
import {randomUUID} from 'node:crypto';
import type {PoolConnection} from 'mysql2/promise';
import {loadMasterRows} from '../../../core/db/crm-lookups';
import {pool} from '../../../core/db/pool';

type Db = Pick<PoolConnection, 'query' | 'execute'>;

export async function seedApplicationDocuments(conn: Db, applicationId: string, actorName = 'System') {
  const docTypes = (await loadMasterRows('crm_master_document_types', conn as any)).filter(
    d => d.is_active === undefined || d.is_active === null || Number(d.is_active) === 1,
  );
  for (const dt of docTypes) {
    await conn.execute(
      `INSERT IGNORE INTO crm_application_document_checklists (
        id, application_id, document_type_id, assigned_role, is_mandatory, status, created_by, updated_by
      ) VALUES (?,?,?,?,?,'PENDING',?,?)`,
      [
        randomUUID(),
        applicationId,
        dt.id,
        dt.department_code || 'BS',
        dt.is_mandatory ? 1 : 0,
        actorName,
        actorName,
      ],
    );
  }
}

export async function seedDocumentChecklist(applicationId: string, actorName = 'System') {
  await seedApplicationDocuments(pool as any, applicationId, actorName);
}

export async function syncApplicationDocuments() {
  const [apps] = await pool.query<any[]>(
    'SELECT id FROM crm_applications WHERE deleted_at IS NULL',
  );
  for (const a of apps) {
    await seedApplicationDocuments(pool as any, a.id);
  }
}

export async function initializeApplicationDocuments() {
  await pool.query('SELECT 1 FROM crm_application_document_checklists LIMIT 1');
}
