/** Creates / upgrades the intake tables and moves customer PIC locations. */
import {pool} from '../../../core/db/pool';
import {picFields} from '@liugong/shared';
import {auditTable} from '../../users/users.repository';
import {column, fapFields, fieldType, picColumn, preFields} from './helpers';

export async function initializeIntake() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS master_cust_n_pic_business_partner (
  id CHAR(36) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,company_type VARCHAR(50) NULL,nib VARCHAR(32) NULL,npwp VARCHAR(32) NULL,
  business_partner_type VARCHAR(50) NOT NULL DEFAULT 'Prorpect Customer',
  skt_no VARCHAR(100) NULL,sppkp_no VARCHAR(100) NULL,establishment_act_no VARCHAR(100) NULL,establishment_date DATE NULL,
  branch_code VARCHAR(30) NULL,customer_relationship VARCHAR(30) NULL,company_address TEXT NULL,city VARCHAR(150) NULL,province VARCHAR(150) NULL,postal_code VARCHAR(20) NULL,
  phone_fax VARCHAR(50) NULL,email VARCHAR(255) NULL,website VARCHAR(255) NULL,main_business TEXT NULL,experience_years INT NULL,experience_months INT NULL,
  location_status VARCHAR(50) NULL,repayment_source TEXT NULL,latest_deed_no VARCHAR(100) NULL,latest_deed_date DATE NULL,
  industry_segment VARCHAR(100) NULL,business_role VARCHAR(100) NULL,asset_summary_he_liu_gong INT NULL,asset_summary_truck_liu_gong INT NULL,
  asset_summary_he_non_liu_gong INT NULL,asset_summary_truck_non_liu_gong INT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  created_by VARCHAR(150) NULL,updated_by VARCHAR(150) NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [partnerTypeColumns] = await pool.query<any[]>(`SELECT COLUMN_NAME FROM information_schema.columns
  WHERE table_schema=DATABASE() AND table_name='master_cust_n_pic_business_partner' AND column_name='business_partner_type'`);
  if (!partnerTypeColumns.length)
    await pool.query(
      "ALTER TABLE master_cust_n_pic_business_partner ADD COLUMN business_partner_type VARCHAR(50) NOT NULL DEFAULT 'Prorpect Customer' AFTER company_type",
    );
  else {
    const [columnOrder] = await pool.query<any[]>(`SELECT ORDINAL_POSITION FROM information_schema.columns
   WHERE table_schema=DATABASE() AND table_name='master_cust_n_pic_business_partner' AND column_name='business_partner_type'`);
    if (Number(columnOrder[0]?.ORDINAL_POSITION) !== 4)
      await pool.query(
        "ALTER TABLE master_cust_n_pic_business_partner MODIFY COLUMN business_partner_type VARCHAR(50) NOT NULL DEFAULT 'Prorpect Customer' AFTER company_type",
      );
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS new_application_fap_stage (
  id_fap_stage CHAR(36) PRIMARY KEY,customer_category VARCHAR(30) NOT NULL,customer_id CHAR(36) NOT NULL,
  application_date DATE NOT NULL,fap_registration_number VARCHAR(80) NOT NULL UNIQUE,
  ${fapFields.map(f => `\`${column(f.key)}\` ${fieldType(f)} ${f.key === 'experienceYears' || f.key === 'experienceMonths' ? 'NOT NULL DEFAULT 0' : 'NULL'}`).join(',')},
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS new_application_pre_analisis (
  id_pre_analysis CHAR(36) PRIMARY KEY,application_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  ${preFields.map(f => `\`${column(f.key)}\` ${fieldType(f)} NULL`).join(',')},
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS all_applications (
  application_id CHAR(36) PRIMARY KEY,id_fap_stage CHAR(36) NOT NULL UNIQUE,id_pre_analysis CHAR(36) NOT NULL UNIQUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_all_applications_fap_stage FOREIGN KEY(id_fap_stage) REFERENCES new_application_fap_stage(id_fap_stage),
  CONSTRAINT fk_all_applications_pre_analysis FOREIGN KEY(id_pre_analysis) REFERENCES new_application_pre_analisis(id_pre_analysis)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS customer_pic (
  id CHAR(36) PRIMARY KEY,application_id CHAR(36) NOT NULL UNIQUE,customer_id CHAR(36) NOT NULL,
  ${picFields.map(f => `\`${picColumn(f.key)}\` ${fieldType(f)} NULL`).join(',')},
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at TIMESTAMP(3) NULL,
  CONSTRAINT fk_customer_pic_application FOREIGN KEY(application_id) REFERENCES all_applications(application_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  for (const col of ['rt', 'rw']) {
    const [hasCol] = await pool.query<any[]>(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='new_application_fap_stage' AND column_name=?`,
      [col],
    );
    if (!hasCol.length)
      await pool.query(`ALTER TABLE new_application_fap_stage ADD COLUMN \`${col}\` TEXT NULL`);
    const [hasBpCol] = await pool.query<any[]>(
      `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='master_cust_n_pic_business_partner' AND column_name=?`,
      [col],
    );
    if (!hasBpCol.length)
      await pool.query(`ALTER TABLE master_cust_n_pic_business_partner ADD COLUMN \`${col}\` TEXT NULL`);
  }
  // Profile fields added after the table was created (financing purpose, reference comments, proposal JSON, asset summary).
  const [preColumns] = await pool.query<any[]>(
    `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='new_application_pre_analisis'`,
  );
  const preHave = new Set(preColumns.map(r => String(r.COLUMN_NAME)));
  for (const f of preFields) {
    const col = column(f.key);
    if (preHave.has(col)) continue;
    const type = ['referenceComments', 'financingProposalJson'].includes(f.key) ? 'LONGTEXT' : fieldType(f);
    await pool.query(`ALTER TABLE new_application_pre_analisis ADD COLUMN \`${col}\` ${type} NULL`);
  }
  await migrateCustomerPicLocations();
}

/** Store customer PIC location labels as plaintext while keeping the UI's
 * dropdown values linked to the location masters. Safe to rerun on startup. */
export async function migrateCustomerPicLocations() {
  if (!pool) return;
  const [exists] = await pool.query<any[]>(
    `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='customer_pic'`,
  );
  if (!exists.length) return;
  let columns = new Set(exists.map(r => String(r.COLUMN_NAME)));
  const migrations = [
    ['district', 'kecamatan', 'master_location_kecamatan'],
    ['village', 'kelurahan', 'master_location_kelurahan_desa'],
  ] as const;
  for (const [oldName, newName, table] of migrations) {
    const current = columns.has(newName) ? newName : columns.has(oldName) ? oldName : null;
    if (!current) continue;
    const [unmapped] = await pool.query<any[]>(
      `SELECT COUNT(*) AS n FROM customer_pic p WHERE p.\`${current}\` REGEXP '^[0-9a-fA-F-]{32,36}$' AND NOT EXISTS (SELECT 1 FROM ${table} m WHERE m.id=p.\`${current}\`)`,
    );
    if (Number(unmapped[0]?.n || 0) > 0)
      throw new Error(`Tidak dapat memetakan ${unmapped[0].n} nilai ${current} ke master lokasi.`);
  }
  const [updateTrigger] = await pool.query<any[]>(
    `SELECT TRIGGER_NAME FROM information_schema.triggers WHERE trigger_schema=DATABASE() AND event_object_table='customer_pic' AND trigger_name='audit_customer_pic_update'`,
  );
  if (updateTrigger.length) {
    try {
      await pool.query('DROP TRIGGER IF EXISTS audit_customer_pic_update');
    } catch (e) {
      console.warn('Could not drop audit_customer_pic_update:', e);
    }
  }
  for (const [oldName, newName, table] of migrations) {
    const current = columns.has(newName) ? newName : columns.has(oldName) ? oldName : null;
    if (!current) continue;
    await pool.query(
      `UPDATE customer_pic p JOIN ${table} m ON m.id=p.\`${current}\` SET p.\`${current}\`=m.name`,
    );
    if (current === oldName) {
      await pool.query(`ALTER TABLE customer_pic CHANGE COLUMN \`${oldName}\` \`${newName}\` TEXT NULL`);
      columns.delete(oldName);
      columns.add(newName);
    }
  }
  if (updateTrigger.length) {
    await auditTable('customer_pic');
  }
  try {
    await pool.query(
      `UPDATE new_application_fap_stage f JOIN master_location_kecamatan d ON d.id=f.district SET f.district=d.name`,
    );
    await pool.query(
      `UPDATE new_application_fap_stage f JOIN master_location_kelurahan_desa v ON v.id=f.village SET f.village=v.name`,
    );
    await pool.query(
      `UPDATE master_cust_n_pic_business_partner bp JOIN master_location_kecamatan d ON d.id=bp.district SET bp.district=d.name`,
    );
    await pool.query(
      `UPDATE master_cust_n_pic_business_partner bp JOIN master_location_kelurahan_desa v ON v.id=bp.village SET bp.village=v.name`,
    );
    await pool.query(
      `UPDATE master_mandatory SET field_label='Establishment Deed No' WHERE field_key='establishmentActNo'`,
    );
  } catch (migErr) {
    console.warn('Location plaintext migration note:', migErr);
  }
}
