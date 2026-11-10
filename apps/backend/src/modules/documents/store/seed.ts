/** Creates the checklist of required documents of an application. */
import type {PoolConnection} from 'mysql2/promise';
import crypto from 'node:crypto';
import {pool} from '../../../core/db/pool';
import {auditTable} from '../../users/users.repository';

export async function seedApplicationDocuments(c: PoolConnection, id: string) {
  const [masters] = await c.query<any[]>(
    'SELECT * FROM master_document_jenis_dokumen_wajib WHERE is_active=1 ORDER BY created_at,id',
  );
  for (const m of masters)
    await c.execute(
      'INSERT IGNORE INTO application_document_checklist (id,application_id,document_code,document_name,assigned_role,is_mandatory) VALUES (?,?,?,?,?,?)',
      [crypto.randomUUID(), id, m.code, m.name, m.department, m.is_required],
    );
}

export async function syncApplicationDocuments() {
  if (!pool) return;
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const [apps] = await c.query<any[]>(
      'SELECT application_id FROM all_applications ORDER BY application_id FOR UPDATE',
    );
    for (const app of apps) await seedApplicationDocuments(c, app.application_id);
    await c.execute(`DELETE d FROM application_document_checklist d
   LEFT JOIN master_document_jenis_dokumen_wajib m ON m.code=d.document_code
   LEFT JOIN application_document_file f ON f.checklist_id=d.id
   WHERE m.id IS NULL AND f.id IS NULL AND d.status='PENDING'
   AND d.checked_by_mkt=0 AND d.checked_by_bs=0 AND d.checked_by_ca=0 AND d.checked_by_legal=0`);
    await c.commit();
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}

export async function initializeApplicationDocuments() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS application_document_checklist (
  id CHAR(36) PRIMARY KEY,application_id CHAR(36) NOT NULL,document_code VARCHAR(150) NOT NULL,
  document_name VARCHAR(150) NOT NULL,assigned_role VARCHAR(20) NOT NULL,is_mandatory BOOLEAN NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',checked_by_mkt BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by_bs BOOLEAN NOT NULL DEFAULT FALSE,checked_by_ca BOOLEAN NOT NULL DEFAULT FALSE,checked_by_legal BOOLEAN NOT NULL DEFAULT FALSE,
  registration_date DATE NULL,expired_date DATE NULL,data_summary TEXT NULL,notes TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  UNIQUE KEY application_document_code(application_id,document_code),
  FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS application_document_file (
  id CHAR(36) PRIMARY KEY,checklist_id CHAR(36) NOT NULL,file_name VARCHAR(255) NOT NULL,file_key CHAR(36) NOT NULL,
  file_size BIGINT NOT NULL,mime_type VARCHAR(100) NOT NULL,uploaded_by VARCHAR(150) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  FOREIGN KEY(checklist_id) REFERENCES application_document_checklist(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS application_submit_lock (
  application_id CHAR(36) PRIMARY KEY,
  is_locked TINYINT(1) NOT NULL DEFAULT 1,
  stage VARCHAR(50) NOT NULL DEFAULT 'FAP_STAGE',
  fap_doc_uploaded TINYINT(1) NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMP(3) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [hasOcrCol] = await pool.query<any[]>(
    `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='application_submit_lock' AND column_name='ocr_comparison_json'`,
  );
  if (!hasOcrCol.length)
    await pool.query(`ALTER TABLE application_submit_lock ADD COLUMN ocr_comparison_json LONGTEXT NULL`);
  const [hasRemarksCol] = await pool.query<any[]>(
    `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='application_submit_lock' AND column_name='remarks'`,
  );
  if (!hasRemarksCol.length)
    await pool.query(`ALTER TABLE application_submit_lock ADD COLUMN remarks LONGTEXT NULL`);
  await auditTable('application_document_checklist');
  await auditTable('application_document_file');
  await syncApplicationDocuments();
}
