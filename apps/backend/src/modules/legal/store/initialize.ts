/** Creates / upgrades the Legal tables. */
import {pool} from '../../../core/db/pool';
import {stakeholderFields} from '@liugong/shared';
import {col} from './helpers';

export async function initializeLegal() {
  if (!pool) return;
  // ktp / passport were created as utf8mb4_unicode_ci; the stakeholder query joins them to
  // legal_stakeholder (utf8mb4_0900_ai_ci), which MySQL refuses with "Illegal mix of collations".
  const [idTables] = await pool.query<any[]>(
    `SELECT table_name AS t FROM information_schema.tables WHERE table_schema=DATABASE()
     AND table_name IN ('ktp','passport') AND table_collation<>'utf8mb4_0900_ai_ci'`,
  );
  for (const {t} of idTables)
    await pool.query(`ALTER TABLE \`${t}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS daftar_akta (
  id VARCHAR(100) PRIMARY KEY,application_id CHAR(36) NOT NULL,akta VARCHAR(30) NOT NULL,nomor_akta VARCHAR(1000) NOT NULL,tanggal DATE NOT NULL,
  status VARCHAR(30) NOT NULL,berlaku_sampai DATE,sk_menteri VARCHAR(1000),tanggal_sk_menteri DATE,kategori_remarks VARCHAR(150),remarks TEXT,
  representative TEXT,pemegang_saham_perusahaan TEXT,
  stakeholders INT NOT NULL DEFAULT 0,jumlah_shareholder INT NOT NULL DEFAULT 0,total_kepemilikan DECIMAL(7,2) NOT NULL DEFAULT 0,is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_daftar_akta_application FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  try {
    const [cols] = await pool.query<any[]>('DESCRIBE daftar_akta');
    const existingCols = new Set(cols.map((r: any) => r.Field));
    if (!existingCols.has('representative')) {
      await pool.query('ALTER TABLE daftar_akta ADD COLUMN representative TEXT NULL AFTER remarks');
    }
    if (!existingCols.has('pemegang_saham_perusahaan')) {
      await pool.query(
        'ALTER TABLE daftar_akta ADD COLUMN pemegang_saham_perusahaan TEXT NULL AFTER representative',
      );
    }
  } catch (e) {
    console.warn('daftar_akta column sync warning:', e);
  }

  await pool.query(`DROP TABLE IF EXISTS akta_pendirian, akta_perubahan`);

  await pool.query(`CREATE TABLE IF NOT EXISTS legal_stakeholder (
  id CHAR(36) PRIMARY KEY,akta_id VARCHAR(100) NOT NULL,application_id CHAR(36) NOT NULL,
  ${stakeholderFields.map(f => '`' + col(f.key) + '` ' + (f.type === 'number' ? 'DECIMAL(20,2)' : f.type === 'date' ? 'DATE' : 'TEXT') + ' NULL').join(',')},
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,deleted_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_legal_stakeholder_akta FOREIGN KEY(akta_id) REFERENCES daftar_akta(id),CONSTRAINT fk_legal_stakeholder_application FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  try {
    const [cols] = await pool.query<any[]>('DESCRIBE legal_stakeholder');
    const existingCols = new Set(cols.map((r: any) => r.Field));
    for (const f of stakeholderFields) {
      const colName = col(f.key);
      if (!existingCols.has(colName)) {
        const colType = f.type === 'number' ? 'DECIMAL(20,2)' : f.type === 'date' ? 'DATE' : 'VARCHAR(255)';
        await pool.query(`ALTER TABLE legal_stakeholder ADD COLUMN \`${colName}\` ${colType} NULL`);
      }
    }
  } catch (e) {
    console.warn('legal_stakeholder column sync warning:', e);
  }
}
