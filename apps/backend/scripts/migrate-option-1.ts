import mysql from 'mysql2/promise';

async function colExists(conn: mysql.Connection, table: string, col: string): Promise<boolean> {
  const [rows] = await conn.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [col]);
  return (rows as any[]).length > 0;
}

async function tableExists(conn: mysql.Connection, table: string): Promise<boolean> {
  const [rows] = await conn.query(`SHOW TABLES LIKE ?`, [table]);
  return (rows as any[]).length > 0;
}

async function dropFkIfExists(conn: mysql.Connection, table: string, fkName: string) {
  try {
    await conn.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${fkName}\``);
    console.log(`Dropped FK ${fkName} from ${table}`);
  } catch (err: any) {
    // ignore if doesn't exist
  }
}

async function dropIndexIfExists(conn: mysql.Connection, table: string, idxName: string) {
  try {
    await conn.query(`ALTER TABLE \`${table}\` DROP INDEX \`${idxName}\``);
    console.log(`Dropped index ${idxName} from ${table}`);
  } catch (err: any) {
    // ignore if doesn't exist
  }
}

async function dropColIfExists(conn: mysql.Connection, table: string, colName: string) {
  if (await colExists(conn, table, colName)) {
    try {
      await conn.query(`ALTER TABLE \`${table}\` DROP COLUMN \`${colName}\``);
      console.log(`Dropped column ${colName} from ${table}`);
    } catch (err: any) {
      console.warn(`Could not drop column ${colName} from ${table}:`, err.message);
    }
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '123987',
    database: 'crm_liugong',
    multipleStatements: true,
  });

  console.log('Connected to MySQL crm_liugong. Starting Option 1 migration (preserving applications)...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

  // 1. Create crm_master_forms
  console.log('Step 1: crm_master_forms');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`crm_master_forms\` (
      \`id\` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`code\` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`name\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`sort_order\` int NOT NULL DEFAULT '0',
      \`created_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
      \`created_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`updated_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_master_form_code\` (\`code\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await conn.query(`
    INSERT IGNORE INTO \`crm_master_forms\` (\`id\`, \`code\`, \`name\`, \`sort_order\`, \`created_by\`) VALUES
      (UUID(), 'FAP-FORM', 'FAP form', 1, 'migration'),
      (UUID(), 'PRE-ANALYSIS-FORM', 'Pre-analysis form', 2, 'migration'),
      (UUID(), 'ICLF-FORM', 'ICLF form', 3, 'migration');
  `);

  // 2. Create crm_workflow_approval_steps
  console.log('Step 2: crm_workflow_approval_steps');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`crm_workflow_approval_steps\` (
      \`id\` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`workflow_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`name\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`scope_type\` enum('GROUP','STAGE','DOCUMENT') COLLATE utf8mb4_unicode_ci NOT NULL,
      \`stage_group_id\` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`stage_id\` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`workflow_stage_document_id\` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`group_code\` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`document_code\` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`sort_order\` int NOT NULL DEFAULT '1',
      \`authority_name\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`created_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
      \`created_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`updated_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_wf_apstep_code\` (\`workflow_code\`, \`code\`),
      KEY \`idx_wf_apstep_order\` (\`workflow_code\`, \`scope_type\`, \`sort_order\`),
      KEY \`idx_wf_apstep_authority_name\` (\`authority_name\`),
      KEY \`fk_wf_apstep_group\` (\`stage_group_id\`, \`workflow_code\`),
      KEY \`fk_wf_apstep_stage\` (\`stage_id\`, \`workflow_code\`),
      KEY \`fk_wf_apstep_doc\` (\`workflow_stage_document_id\`),
      KEY \`fk_wf_apstep_group_code\` (\`workflow_code\`, \`group_code\`),
      KEY \`fk_wf_apstep_stage_code\` (\`workflow_code\`, \`stage_code\`),
      KEY \`fk_wf_apstep_doc_code\` (\`workflow_code\`, \`stage_code\`, \`document_code\`),
      CONSTRAINT \`fk_wf_apstep_wf\` FOREIGN KEY (\`workflow_code\`) REFERENCES \`crm_workflows\` (\`code\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Create crm_workflow_authority_options
  console.log('Step 3: crm_workflow_authority_options');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`crm_workflow_authority_options\` (
      \`id\` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`code\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`scope_type\` enum('GROUP','STAGE','DOCUMENT') COLLATE utf8mb4_unicode_ci NOT NULL,
      \`form_code\` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`document_code\` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`department_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`authority_name\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`description\` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`created_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
      \`created_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`updated_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_wf_auth_opt_code\` (\`code\`),
      UNIQUE KEY \`uk_wf_auth_opt_authority\` (\`authority_name\`),
      KEY \`idx_wf_auth_opt_form\` (\`form_code\`),
      KEY \`idx_wf_auth_opt_doc\` (\`document_code\`),
      CONSTRAINT \`fk_wf_auth_opt_form\` FOREIGN KEY (\`form_code\`) REFERENCES \`crm_master_forms\` (\`code\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_wf_auth_opt_doc\` FOREIGN KEY (\`document_code\`) REFERENCES \`crm_master_document_types\` (\`code\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Create crm_application_approval_steps
  console.log('Step 4: crm_application_approval_steps');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`crm_application_approval_steps\` (
      \`id\` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`application_id\` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`workflow_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`round_no\` int NOT NULL DEFAULT '1',
      \`code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`name\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`scope_type\` enum('GROUP','STAGE','DOCUMENT') COLLATE utf8mb4_unicode_ci NOT NULL,
      \`stage_group_id\` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`stage_id\` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`document_checklist_id\` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`group_code\` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`document_code\` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`sort_order\` int NOT NULL DEFAULT '1',
      \`authority_name\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`status\` enum('WAITING','PENDING','APPROVED','REJECTED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WAITING',
      \`started_at\` timestamp(3) NULL DEFAULT NULL,
      \`completed_at\` timestamp(3) NULL DEFAULT NULL,
      \`created_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
      \`created_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`updated_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_app_apstep_round\` (\`application_id\`, \`round_no\`, \`code\`),
      KEY \`idx_app_apstep_status\` (\`application_id\`, \`status\`),
      KEY \`idx_app_apstep_authority\` (\`authority_name\`, \`status\`),
      KEY \`fk_app_apstep_wfstep\` (\`workflow_code\`, \`code\`),
      KEY \`fk_app_apstep_group\` (\`stage_group_id\`),
      KEY \`fk_app_apstep_stage\` (\`stage_id\`),
      KEY \`fk_app_apstep_checklist\` (\`document_checklist_id\`),
      CONSTRAINT \`fk_app_apstep_app\` FOREIGN KEY (\`application_id\`) REFERENCES \`crm_applications\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Create crm_application_approval_decisions
  console.log('Step 5: crm_application_approval_decisions');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`crm_application_approval_decisions\` (
      \`id\` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`code\` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`application_step_id\` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      \`user_id\` int NOT NULL,
      \`decision\` enum('APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL,
      \`remarks\` text COLLATE utf8mb4_unicode_ci,
      \`decided_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`decided_via\` enum('WEB','LARK') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WEB',
      \`created_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
      \`created_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`updated_by\` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_app_decision_person\` (\`application_step_id\`, \`user_id\`),
      UNIQUE KEY \`uk_app_decision_code\` (\`application_step_id\`, \`code\`),
      KEY \`idx_app_decision_user\` (\`user_id\`, \`decision\`),
      CONSTRAINT \`fk_app_decision_step\` FOREIGN KEY (\`application_step_id\`) REFERENCES \`crm_application_approval_steps\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`fk_app_decision_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users_users\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Alter crm_workflow_stages
  console.log('Step 6: Alter crm_workflow_stages');
  if (!(await colExists(conn, 'crm_workflow_stages', 'group_code'))) {
    await conn.query(`ALTER TABLE \`crm_workflow_stages\` ADD COLUMN \`group_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`stage_group_id\``);
    await conn.query(`UPDATE \`crm_workflow_stages\` s JOIN \`crm_workflow_stage_groups\` g ON g.\`id\` = s.\`stage_group_id\` SET s.\`group_code\` = g.\`code\``);
    await conn.query(`ALTER TABLE \`crm_workflow_stages\` MODIFY COLUMN \`group_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL`);
  }
  await conn.query(`UPDATE \`crm_workflow_stages\` SET \`form_code\` = 'ICLF-FORM' WHERE \`code\` = 'ICLF' AND (\`form_code\` IS NULL OR \`form_code\` = '')`);

  // 7. Alter crm_workflow_stage_fields
  console.log('Step 7: Alter crm_workflow_stage_fields');
  if (!(await colExists(conn, 'crm_workflow_stage_fields', 'stage_code'))) {
    await conn.query(`ALTER TABLE \`crm_workflow_stage_fields\` ADD COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`stage_id\``);
    await conn.query(`UPDATE \`crm_workflow_stage_fields\` f JOIN \`crm_workflow_stages\` s ON s.\`id\` = f.\`stage_id\` SET f.\`stage_code\` = s.\`code\``);
    await conn.query(`ALTER TABLE \`crm_workflow_stage_fields\` MODIFY COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL`);
  }

  // 8. Alter crm_workflow_stage_documents
  console.log('Step 8: Alter crm_workflow_stage_documents');
  if (!(await colExists(conn, 'crm_workflow_stage_documents', 'group_code'))) {
    await conn.query(`
      ALTER TABLE \`crm_workflow_stage_documents\`
        ADD COLUMN \`group_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`group_id\`,
        ADD COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`stage_id\`,
        ADD COLUMN \`document_code\` varchar(60) COLLATE utf8mb4_unicode_ci NULL AFTER \`document_type_id\`;
    `);
    await conn.query(`
      UPDATE \`crm_workflow_stage_documents\` d
      JOIN \`crm_workflow_stage_groups\` g ON g.\`id\` = d.\`group_id\`
      JOIN \`crm_workflow_stages\` s ON s.\`id\` = d.\`stage_id\`
      JOIN \`crm_master_document_types\` t ON t.\`id\` = d.\`document_type_id\`
      SET d.\`group_code\` = g.\`code\`, d.\`stage_code\` = s.\`code\`, d.\`document_code\` = t.\`code\`;
    `);
    await conn.query(`
      ALTER TABLE \`crm_workflow_stage_documents\`
        MODIFY COLUMN \`group_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
        MODIFY COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
        MODIFY COLUMN \`document_code\` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL;
    `);
  }

  // 9. Alter crm_application_stage_progress
  console.log('Step 9: Alter crm_application_stage_progress');
  await dropFkIfExists(conn, 'crm_application_stage_progress', 'fk_app_stg_prog_stat');
  await dropFkIfExists(conn, 'crm_application_stage_progress', 'fk_app_stg_prog_stg');
  await dropColIfExists(conn, 'crm_application_stage_progress', 'status_id');

  if (!(await colExists(conn, 'crm_application_stage_progress', 'workflow_code'))) {
    await conn.query(`
      ALTER TABLE \`crm_application_stage_progress\`
        ADD COLUMN \`workflow_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`application_id\`,
        ADD COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`stage_id\`;
    `);
    await conn.query(`
      UPDATE \`crm_application_stage_progress\` p
      JOIN \`crm_workflow_stages\` s ON s.\`id\` = p.\`stage_id\`
      SET p.\`workflow_code\` = s.\`workflow_code\`, p.\`stage_code\` = s.\`code\`;
    `);
    await conn.query(`
      ALTER TABLE \`crm_application_stage_progress\`
        MODIFY COLUMN \`workflow_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
        MODIFY COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL;
    `);
  }

  // 10. Alter crm_applications
  console.log('Step 10: Alter crm_applications');
  await dropFkIfExists(conn, 'crm_applications', 'fk_app_cur_status');
  await dropIndexIfExists(conn, 'crm_applications', 'idx_app_status');
  await dropColIfExists(conn, 'crm_applications', 'current_status_id');

  // 11. Alter crm_master_document_types
  console.log('Step 11: Alter crm_master_document_types');
  await dropFkIfExists(conn, 'crm_master_document_types', 'fk_master_doc_type_stage');
  await dropIndexIfExists(conn, 'crm_master_document_types', 'idx_master_doc_type_stage');
  await dropColIfExists(conn, 'crm_master_document_types', 'stage_id');

  // 12. Alter crm_application_document_checklists
  console.log('Step 12: Alter crm_application_document_checklists');
  await conn.query(`ALTER TABLE \`crm_application_document_checklists\` MODIFY COLUMN \`assigned_role\` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL;`);
  
  for (const col of ['checked_by_mkt', 'checked_by_bs', 'checked_by_ca', 'checked_by_legal', 'registration_date', 'expired_date', 'data_summary', 'notes']) {
    await dropColIfExists(conn, 'crm_application_document_checklists', col);
    if (await tableExists(conn, 'crm_frozen_fap_document_checklists')) {
      await dropColIfExists(conn, 'crm_frozen_fap_document_checklists', col);
    }
  }

  if (!(await colExists(conn, 'crm_application_document_checklists', 'workflow_code'))) {
    await conn.query(`
      ALTER TABLE \`crm_application_document_checklists\`
        ADD COLUMN \`workflow_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`application_id\`,
        ADD COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`stage_id\`,
        ADD COLUMN \`document_code\` varchar(60) COLLATE utf8mb4_unicode_ci NULL AFTER \`document_type_id\`;
    `);
    await conn.query(`
      UPDATE \`crm_application_document_checklists\` c
      JOIN \`crm_workflow_stages\` s ON s.\`id\` = c.\`stage_id\`
      LEFT JOIN \`crm_master_document_types\` t ON t.\`id\` = c.\`document_type_id\`
      SET c.\`workflow_code\` = s.\`workflow_code\`, c.\`stage_code\` = s.\`code\`, c.\`document_code\` = t.\`code\`;
    `);
    await conn.query(`
      ALTER TABLE \`crm_application_document_checklists\`
        MODIFY COLUMN \`workflow_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
        MODIFY COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL;
    `);
  }

  // 13. Alter crm_application_document_overrides
  console.log('Step 13: Alter crm_application_document_overrides');
  if (!(await colExists(conn, 'crm_application_document_overrides', 'workflow_code'))) {
    await conn.query(`
      ALTER TABLE \`crm_application_document_overrides\`
        ADD COLUMN \`workflow_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`application_id\`,
        ADD COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER \`stage_id\`,
        ADD COLUMN \`document_code\` varchar(60) COLLATE utf8mb4_unicode_ci NULL AFTER \`document_type_id\`;
    `);
    await conn.query(`
      UPDATE \`crm_application_document_overrides\` o
      JOIN \`crm_workflow_stages\` s ON s.\`id\` = o.\`stage_id\`
      LEFT JOIN \`crm_master_document_types\` t ON t.\`id\` = o.\`document_type_id\`
      LEFT JOIN \`crm_workflow_stage_documents\` d ON d.\`id\` = o.\`workflow_stage_document_id\`
      SET o.\`workflow_code\` = s.\`workflow_code\`, o.\`stage_code\` = s.\`code\`, o.\`document_code\` = COALESCE(t.\`code\`, d.\`document_code\`);
    `);
    await conn.query(`
      ALTER TABLE \`crm_application_document_overrides\`
        MODIFY COLUMN \`workflow_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
        MODIFY COLUMN \`stage_code\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL;
    `);
  }

  // 14. Drop old status machine tables
  console.log('Step 14: Drop old status machine tables');
  await conn.query(`DROP TABLE IF EXISTS \`crm_application_stage_transitions\`;`);
  await conn.query(`DROP TABLE IF EXISTS \`crm_application_signoffs\`;`);
  await conn.query(`DROP TABLE IF EXISTS \`crm_master_workflow\`;`);
  await conn.query(`DROP TABLE IF EXISTS \`crm_master_workflow_statuses\`;`);
  await conn.query(`DROP TABLE IF EXISTS \`crm_master_workflow_stages\`;`);
  await conn.query(`DROP TABLE IF EXISTS \`crm_master_reject_reason_codes\`;`);

  // 15. Seed crm_workflow_authority_options
  console.log('Step 15: Seed crm_workflow_authority_options');
  const authOptsSql = `
    INSERT IGNORE INTO \`crm_workflow_authority_options\` (\`id\`, \`code\`, \`scope_type\`, \`form_code\`, \`document_code\`, \`department_code\`, \`authority_name\`, \`description\`, \`created_by\`) VALUES
      (UUID(), 'CRM-BS-GROUP-APPROVE', 'GROUP', NULL, NULL, 'BS', 'CRM_BS_GROUP_APPROVE', 'Approve or reject a stage group as Business Support', 'migration'),
      (UUID(), 'CRM-BS-FAP-FORM-APPROVE', 'STAGE', 'FAP-FORM', NULL, 'BS', 'CRM_BS_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Business Support', 'migration'),
      (UUID(), 'CRM-BS-PRE-ANALYSIS-FORM-APPROVE', 'STAGE', 'PRE-ANALYSIS-FORM', NULL, 'BS', 'CRM_BS_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Business Support', 'migration'),
      (UUID(), 'CRM-BS-ICLF-FORM-APPROVE', 'STAGE', 'ICLF-FORM', NULL, 'BS', 'CRM_BS_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Business Support', 'migration'),
      (UUID(), 'CRM-BS-FAP-APPROVE', 'DOCUMENT', NULL, 'FAP', 'BS', 'CRM_BS_FAP_APPROVE', 'Approve or reject the document FAP as Business Support', 'migration'),
      (UUID(), 'CRM-BS-ICLF-APPROVE', 'DOCUMENT', NULL, 'ICLF', 'BS', 'CRM_BS_ICLF_APPROVE', 'Approve or reject the document ICLF as Business Support', 'migration'),
      (UUID(), 'CRM-BS-BANK-APPROVE', 'DOCUMENT', NULL, 'BANK', 'BS', 'CRM_BS_BANK_APPROVE', 'Approve or reject the document BANK as Business Support', 'migration'),
      (UUID(), 'CRM-BS-CONTRACT-APPROVE', 'DOCUMENT', NULL, 'CONTRACT', 'BS', 'CRM_BS_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Business Support', 'migration'),
      (UUID(), 'CRM-BS-DEED-APPROVE', 'DOCUMENT', NULL, 'DEED', 'BS', 'CRM_BS_DEED_APPROVE', 'Approve or reject the document DEED as Business Support', 'migration'),
      (UUID(), 'CRM-BS-EKITAS-APPROVE', 'DOCUMENT', NULL, 'EKITAS', 'BS', 'CRM_BS_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Business Support', 'migration'),
      (UUID(), 'CRM-BS-FINANCIALS-APPROVE', 'DOCUMENT', NULL, 'FINANCIALS', 'BS', 'CRM_BS_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Business Support', 'migration'),
      (UUID(), 'CRM-BS-KTP-APPROVE', 'DOCUMENT', NULL, 'KTP', 'BS', 'CRM_BS_KTP_APPROVE', 'Approve or reject the document KTP as Business Support', 'migration'),
      (UUID(), 'CRM-BS-LEGAL-OPINION-APPROVE', 'DOCUMENT', NULL, 'LEGAL-OPINION', 'BS', 'CRM_BS_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Business Support', 'migration'),
      (UUID(), 'CRM-BS-NIB-APPROVE', 'DOCUMENT', NULL, 'NIB', 'BS', 'CRM_BS_NIB_APPROVE', 'Approve or reject the document NIB as Business Support', 'migration'),
      (UUID(), 'CRM-BS-NPWP-APPROVE', 'DOCUMENT', NULL, 'NPWP', 'BS', 'CRM_BS_NPWP_APPROVE', 'Approve or reject the document NPWP as Business Support', 'migration'),
      (UUID(), 'CRM-BS-PREANALYSIS-APPROVE', 'DOCUMENT', NULL, 'PREANALYSIS', 'BS', 'CRM_BS_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Business Support', 'migration'),
      (UUID(), 'CRM-BS-QUOTATION-APPROVE', 'DOCUMENT', NULL, 'QUOTATION', 'BS', 'CRM_BS_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Business Support', 'migration'),
      (UUID(), 'CRM-CA-GROUP-APPROVE', 'GROUP', NULL, NULL, 'CA', 'CRM_CA_GROUP_APPROVE', 'Approve or reject a stage group as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-FAP-FORM-APPROVE', 'STAGE', 'FAP-FORM', NULL, 'CA', 'CRM_CA_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-PRE-ANALYSIS-FORM-APPROVE', 'STAGE', 'PRE-ANALYSIS-FORM', NULL, 'CA', 'CRM_CA_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-ICLF-FORM-APPROVE', 'STAGE', 'ICLF-FORM', NULL, 'CA', 'CRM_CA_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-FAP-APPROVE', 'DOCUMENT', NULL, 'FAP', 'CA', 'CRM_CA_FAP_APPROVE', 'Approve or reject the document FAP as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-ICLF-APPROVE', 'DOCUMENT', NULL, 'ICLF', 'CA', 'CRM_CA_ICLF_APPROVE', 'Approve or reject the document ICLF as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-BANK-APPROVE', 'DOCUMENT', NULL, 'BANK', 'CA', 'CRM_CA_BANK_APPROVE', 'Approve or reject the document BANK as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-CONTRACT-APPROVE', 'DOCUMENT', NULL, 'CONTRACT', 'CA', 'CRM_CA_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-DEED-APPROVE', 'DOCUMENT', NULL, 'DEED', 'CA', 'CRM_CA_DEED_APPROVE', 'Approve or reject the document DEED as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-EKITAS-APPROVE', 'DOCUMENT', NULL, 'EKITAS', 'CA', 'CRM_CA_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-FINANCIALS-APPROVE', 'DOCUMENT', NULL, 'FINANCIALS', 'CA', 'CRM_CA_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-KTP-APPROVE', 'DOCUMENT', NULL, 'KTP', 'CA', 'CRM_CA_KTP_APPROVE', 'Approve or reject the document KTP as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-LEGAL-OPINION-APPROVE', 'DOCUMENT', NULL, 'LEGAL-OPINION', 'CA', 'CRM_CA_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-NIB-APPROVE', 'DOCUMENT', NULL, 'NIB', 'CA', 'CRM_CA_NIB_APPROVE', 'Approve or reject the document NIB as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-NPWP-APPROVE', 'DOCUMENT', NULL, 'NPWP', 'CA', 'CRM_CA_NPWP_APPROVE', 'Approve or reject the document NPWP as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-PREANALYSIS-APPROVE', 'DOCUMENT', NULL, 'PREANALYSIS', 'CA', 'CRM_CA_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Credit Analyst', 'migration'),
      (UUID(), 'CRM-CA-QUOTATION-APPROVE', 'DOCUMENT', NULL, 'QUOTATION', 'CA', 'CRM_CA_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Credit Analyst', 'migration'),
      (UUID(), 'CRM-LEGAL-GROUP-APPROVE', 'GROUP', NULL, NULL, 'LEGAL', 'CRM_LEGAL_GROUP_APPROVE', 'Approve or reject a stage group as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-FAP-FORM-APPROVE', 'STAGE', 'FAP-FORM', NULL, 'LEGAL', 'CRM_LEGAL_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-PRE-ANALYSIS-FORM-APPROVE', 'STAGE', 'PRE-ANALYSIS-FORM', NULL, 'LEGAL', 'CRM_LEGAL_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-ICLF-FORM-APPROVE', 'STAGE', 'ICLF-FORM', NULL, 'LEGAL', 'CRM_LEGAL_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-FAP-APPROVE', 'DOCUMENT', NULL, 'FAP', 'LEGAL', 'CRM_LEGAL_FAP_APPROVE', 'Approve or reject the document FAP as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-ICLF-APPROVE', 'DOCUMENT', NULL, 'ICLF', 'LEGAL', 'CRM_LEGAL_ICLF_APPROVE', 'Approve or reject the document ICLF as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-BANK-APPROVE', 'DOCUMENT', NULL, 'BANK', 'LEGAL', 'CRM_LEGAL_BANK_APPROVE', 'Approve or reject the document BANK as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-CONTRACT-APPROVE', 'DOCUMENT', NULL, 'CONTRACT', 'LEGAL', 'CRM_LEGAL_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-DEED-APPROVE', 'DOCUMENT', NULL, 'DEED', 'LEGAL', 'CRM_LEGAL_DEED_APPROVE', 'Approve or reject the document DEED as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-EKITAS-APPROVE', 'DOCUMENT', NULL, 'EKITAS', 'LEGAL', 'CRM_LEGAL_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-FINANCIALS-APPROVE', 'DOCUMENT', NULL, 'FINANCIALS', 'LEGAL', 'CRM_LEGAL_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-KTP-APPROVE', 'DOCUMENT', NULL, 'KTP', 'LEGAL', 'CRM_LEGAL_KTP_APPROVE', 'Approve or reject the document KTP as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-LEGAL-OPINION-APPROVE', 'DOCUMENT', NULL, 'LEGAL-OPINION', 'LEGAL', 'CRM_LEGAL_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-NIB-APPROVE', 'DOCUMENT', NULL, 'NIB', 'LEGAL', 'CRM_LEGAL_NIB_APPROVE', 'Approve or reject the document NIB as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-NPWP-APPROVE', 'DOCUMENT', NULL, 'NPWP', 'LEGAL', 'CRM_LEGAL_NPWP_APPROVE', 'Approve or reject the document NPWP as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-PREANALYSIS-APPROVE', 'DOCUMENT', NULL, 'PREANALYSIS', 'LEGAL', 'CRM_LEGAL_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Legal', 'migration'),
      (UUID(), 'CRM-LEGAL-QUOTATION-APPROVE', 'DOCUMENT', NULL, 'QUOTATION', 'LEGAL', 'CRM_LEGAL_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Legal', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-GROUP-APPROVE', 'GROUP', NULL, NULL, 'MANAGEMENT', 'CRM_MANAGEMENT_GROUP_APPROVE', 'Approve or reject a stage group as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-FAP-FORM-APPROVE', 'STAGE', 'FAP-FORM', NULL, 'MANAGEMENT', 'CRM_MANAGEMENT_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-PRE-ANALYSIS-FORM-APPROVE', 'STAGE', 'PRE-ANALYSIS-FORM', NULL, 'MANAGEMENT', 'CRM_MANAGEMENT_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-ICLF-FORM-APPROVE', 'STAGE', 'ICLF-FORM', NULL, 'MANAGEMENT', 'CRM_MANAGEMENT_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-FAP-APPROVE', 'DOCUMENT', NULL, 'FAP', 'MANAGEMENT', 'CRM_MANAGEMENT_FAP_APPROVE', 'Approve or reject the document FAP as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-ICLF-APPROVE', 'DOCUMENT', NULL, 'ICLF', 'MANAGEMENT', 'CRM_MANAGEMENT_ICLF_APPROVE', 'Approve or reject the document ICLF as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-BANK-APPROVE', 'DOCUMENT', NULL, 'BANK', 'MANAGEMENT', 'CRM_MANAGEMENT_BANK_APPROVE', 'Approve or reject the document BANK as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-CONTRACT-APPROVE', 'DOCUMENT', NULL, 'CONTRACT', 'MANAGEMENT', 'CRM_MANAGEMENT_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-DEED-APPROVE', 'DOCUMENT', NULL, 'DEED', 'MANAGEMENT', 'CRM_MANAGEMENT_DEED_APPROVE', 'Approve or reject the document DEED as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-EKITAS-APPROVE', 'DOCUMENT', NULL, 'EKITAS', 'MANAGEMENT', 'CRM_MANAGEMENT_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-FINANCIALS-APPROVE', 'DOCUMENT', NULL, 'FINANCIALS', 'MANAGEMENT', 'CRM_MANAGEMENT_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-KTP-APPROVE', 'DOCUMENT', NULL, 'KTP', 'MANAGEMENT', 'CRM_MANAGEMENT_KTP_APPROVE', 'Approve or reject the document KTP as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-LEGAL-OPINION-APPROVE', 'DOCUMENT', NULL, 'LEGAL-OPINION', 'MANAGEMENT', 'CRM_MANAGEMENT_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-NIB-APPROVE', 'DOCUMENT', NULL, 'NIB', 'MANAGEMENT', 'CRM_MANAGEMENT_NIB_APPROVE', 'Approve or reject the document NIB as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-NPWP-APPROVE', 'DOCUMENT', NULL, 'NPWP', 'MANAGEMENT', 'CRM_MANAGEMENT_NPWP_APPROVE', 'Approve or reject the document NPWP as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-PREANALYSIS-APPROVE', 'DOCUMENT', NULL, 'PREANALYSIS', 'MANAGEMENT', 'CRM_MANAGEMENT_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Management', 'migration'),
      (UUID(), 'CRM-MANAGEMENT-QUOTATION-APPROVE', 'DOCUMENT', NULL, 'QUOTATION', 'MANAGEMENT', 'CRM_MANAGEMENT_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Management', 'migration');
  `;
  await conn.query(authOptsSql);

  // 16. Seed crm_workflow_approval_steps
  console.log('Step 16: Seed crm_workflow_approval_steps for DEFAULT-WORKFLOW');
  await conn.query(`
    INSERT IGNORE INTO \`crm_workflow_approval_steps\` (\`id\`, \`workflow_code\`, \`code\`, \`name\`, \`scope_type\`, \`stage_id\`, \`stage_code\`, \`sort_order\`, \`authority_name\`, \`created_by\`)
    SELECT UUID(), s.\`workflow_code\`, x.\`code\`, x.\`name\`, 'STAGE', s.\`id\`, s.\`code\`, x.\`sort_order\`, x.\`authority_name\`, 'migration'
    FROM \`crm_workflow_stages\` s
    JOIN (
      SELECT 'FAP-STAGE' AS stage_code, 'BS-VERIFICATION' AS code, 'BS verification' AS name, 1 AS sort_order, 'CRM_BS_FAP-FORM_APPROVE' AS authority_name
      UNION ALL SELECT 'ICLF', 'CA-RECOMMENDATION', 'CA recommendation', 1, 'CRM_CA_ICLF-FORM_APPROVE'
      UNION ALL SELECT 'ICLF', 'LEGAL-RECOMMENDATION', 'Legal recommendation', 1, 'CRM_LEGAL_ICLF-FORM_APPROVE'
      UNION ALL SELECT 'ICLF', 'CREDIT-COMMITTEE-DECISION', 'Credit committee decision', 2, 'CRM_MANAGEMENT_ICLF-FORM_APPROVE'
    ) x ON x.stage_code = s.\`code\`
    WHERE s.\`workflow_code\` = 'DEFAULT-WORKFLOW';
  `);

  await conn.query(`
    INSERT IGNORE INTO \`crm_workflow_approval_steps\` (\`id\`, \`workflow_code\`, \`code\`, \`name\`, \`scope_type\`, \`workflow_stage_document_id\`, \`stage_code\`, \`document_code\`, \`sort_order\`, \`authority_name\`, \`created_by\`)
    SELECT UUID(), sd.\`workflow_code\`, CONCAT(t.\`code\`, '-APPROVAL'), CONCAT('Approval of ', t.\`name\`), 'DOCUMENT', sd.\`id\`, st.\`code\`, t.\`code\`, 1,
           CONCAT('CRM_', IF(st.\`code\` = 'ICLF', 'MANAGEMENT', IF(t.\`code\` IN ('DEED', 'LEGAL-OPINION'), 'LEGAL', 'BS')), '_', t.\`code\`, '_APPROVE'), 'migration'
    FROM \`crm_workflow_stage_documents\` sd
    JOIN \`crm_master_document_types\` t ON t.\`id\` = sd.\`document_type_id\`
    JOIN \`crm_workflow_stages\` st ON st.\`id\` = sd.\`stage_id\`
    WHERE sd.\`workflow_code\` = 'DEFAULT-WORKFLOW';
  `);

  // 17. Seed user authorities and role mappings from plan-seed.sql
  console.log('Step 17: Seed user authorities & role authorities');
  const [crmApps] = await conn.query<any[]>('SELECT id FROM users_applications WHERE app_name LIKE "CRM%" LIMIT 1');
  if (crmApps.length > 0) {
    const crmId = crmApps[0].id;
    const authList: [string, string][] = [
      ['CRM_BS_GROUP_APPROVE', 'Approve or reject a stage group as Business Support'],
      ['CRM_BS_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Business Support'],
      ['CRM_BS_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Business Support'],
      ['CRM_BS_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Business Support'],
      ['CRM_BS_FAP_APPROVE', 'Approve or reject the document FAP as Business Support'],
      ['CRM_BS_ICLF_APPROVE', 'Approve or reject the document ICLF as Business Support'],
      ['CRM_BS_BANK_APPROVE', 'Approve or reject the document BANK as Business Support'],
      ['CRM_BS_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Business Support'],
      ['CRM_BS_DEED_APPROVE', 'Approve or reject the document DEED as Business Support'],
      ['CRM_BS_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Business Support'],
      ['CRM_BS_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Business Support'],
      ['CRM_BS_KTP_APPROVE', 'Approve or reject the document KTP as Business Support'],
      ['CRM_BS_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Business Support'],
      ['CRM_BS_NIB_APPROVE', 'Approve or reject the document NIB as Business Support'],
      ['CRM_BS_NPWP_APPROVE', 'Approve or reject the document NPWP as Business Support'],
      ['CRM_BS_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Business Support'],
      ['CRM_BS_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Business Support'],
      ['CRM_CA_GROUP_APPROVE', 'Approve or reject a stage group as Credit Analyst'],
      ['CRM_CA_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Credit Analyst'],
      ['CRM_CA_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Credit Analyst'],
      ['CRM_CA_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Credit Analyst'],
      ['CRM_CA_FAP_APPROVE', 'Approve or reject the document FAP as Credit Analyst'],
      ['CRM_CA_ICLF_APPROVE', 'Approve or reject the document ICLF as Credit Analyst'],
      ['CRM_CA_BANK_APPROVE', 'Approve or reject the document BANK as Credit Analyst'],
      ['CRM_CA_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Credit Analyst'],
      ['CRM_CA_DEED_APPROVE', 'Approve or reject the document DEED as Credit Analyst'],
      ['CRM_CA_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Credit Analyst'],
      ['CRM_CA_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Credit Analyst'],
      ['CRM_CA_KTP_APPROVE', 'Approve or reject the document KTP as Credit Analyst'],
      ['CRM_CA_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Credit Analyst'],
      ['CRM_CA_NIB_APPROVE', 'Approve or reject the document NIB as Credit Analyst'],
      ['CRM_CA_NPWP_APPROVE', 'Approve or reject the document NPWP as Credit Analyst'],
      ['CRM_CA_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Credit Analyst'],
      ['CRM_CA_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Credit Analyst'],
      ['CRM_LEGAL_GROUP_APPROVE', 'Approve or reject a stage group as Legal'],
      ['CRM_LEGAL_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Legal'],
      ['CRM_LEGAL_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Legal'],
      ['CRM_LEGAL_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Legal'],
      ['CRM_LEGAL_FAP_APPROVE', 'Approve or reject the document FAP as Legal'],
      ['CRM_LEGAL_ICLF_APPROVE', 'Approve or reject the document ICLF as Legal'],
      ['CRM_LEGAL_BANK_APPROVE', 'Approve or reject the document BANK as Legal'],
      ['CRM_LEGAL_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Legal'],
      ['CRM_LEGAL_DEED_APPROVE', 'Approve or reject the document DEED as Legal'],
      ['CRM_LEGAL_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Legal'],
      ['CRM_LEGAL_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Legal'],
      ['CRM_LEGAL_KTP_APPROVE', 'Approve or reject the document KTP as Legal'],
      ['CRM_LEGAL_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Legal'],
      ['CRM_LEGAL_NIB_APPROVE', 'Approve or reject the document NIB as Legal'],
      ['CRM_LEGAL_NPWP_APPROVE', 'Approve or reject the document NPWP as Legal'],
      ['CRM_LEGAL_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Legal'],
      ['CRM_LEGAL_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Legal'],
      ['CRM_MANAGEMENT_GROUP_APPROVE', 'Approve or reject a stage group as Management'],
      ['CRM_MANAGEMENT_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Management'],
      ['CRM_MANAGEMENT_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Management'],
      ['CRM_MANAGEMENT_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Management'],
      ['CRM_MANAGEMENT_FAP_APPROVE', 'Approve or reject the document FAP as Management'],
      ['CRM_MANAGEMENT_ICLF_APPROVE', 'Approve or reject the document ICLF as Management'],
      ['CRM_MANAGEMENT_BANK_APPROVE', 'Approve or reject the document BANK as Management'],
      ['CRM_MANAGEMENT_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Management'],
      ['CRM_MANAGEMENT_DEED_APPROVE', 'Approve or reject the document DEED as Management'],
      ['CRM_MANAGEMENT_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Management'],
      ['CRM_MANAGEMENT_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Management'],
      ['CRM_MANAGEMENT_KTP_APPROVE', 'Approve or reject the document KTP as Management'],
      ['CRM_MANAGEMENT_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Management'],
      ['CRM_MANAGEMENT_NIB_APPROVE', 'Approve or reject the document NIB as Management'],
      ['CRM_MANAGEMENT_NPWP_APPROVE', 'Approve or reject the document NPWP as Management'],
      ['CRM_MANAGEMENT_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Management'],
      ['CRM_MANAGEMENT_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Management'],
      ['crm_workflow_submit', 'Submit a stage or document for approval in the CRM workflow'],
    ];

    for (const [name, desc] of authList) {
      await conn.query('INSERT IGNORE INTO users_authorities (app_id, authority_name, description) VALUES (?, ?, ?)', [crmId, name, desc]);
    }

    // Role mapping
    await conn.query(`
      INSERT IGNORE INTO users_role_authorities (role_id, authority_id)
      SELECT r.id, a.id FROM users_roles r
      JOIN users_authorities a ON a.app_id = ? AND a.authority_name LIKE 'CRM_BS_%'
      WHERE r.app_id = ? AND r.role_name = 'Business Support (BS)';
    `, [crmId, crmId]);

    await conn.query(`
      INSERT IGNORE INTO users_role_authorities (role_id, authority_id)
      SELECT r.id, a.id FROM users_roles r
      JOIN users_authorities a ON a.app_id = ? AND a.authority_name LIKE 'CRM_CA_%'
      WHERE r.app_id = ? AND r.role_name = 'Credit Analyst (CA)';
    `, [crmId, crmId]);

    await conn.query(`
      INSERT IGNORE INTO users_role_authorities (role_id, authority_id)
      SELECT r.id, a.id FROM users_roles r
      JOIN users_authorities a ON a.app_id = ? AND a.authority_name LIKE 'CRM_LEGAL_%'
      WHERE r.app_id = ? AND r.role_name IN ('Legal Officer (LEGAL)', 'Legal Approval');
    `, [crmId, crmId]);

    await conn.query(`
      INSERT IGNORE INTO users_role_authorities (role_id, authority_id)
      SELECT r.id, a.id FROM users_roles r
      JOIN users_authorities a ON a.app_id = ? AND a.authority_name LIKE 'CRM_MANAGEMENT_%'
      WHERE r.app_id = ? AND r.role_name = 'Credit Committee';
    `, [crmId, crmId]);

    await conn.query(`
      INSERT IGNORE INTO users_role_authorities (role_id, authority_id)
      SELECT r.id, a.id FROM users_roles r
      JOIN users_authorities a ON a.app_id = ? AND a.authority_name = 'crm_workflow_submit'
      WHERE r.app_id = ? AND r.role_name IN ('Business Support (BS)', 'Credit Analyst (CA)', 'Legal Officer (LEGAL)', 'Super Admin');
    `, [crmId, crmId]);
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('Option 1 migration executed successfully!');

  // Verify applications still exist
  const [appCount] = await conn.query('SELECT count(*) as count FROM crm_applications');
  console.log('crm_applications count after migration:', (appCount as any[])[0].count);

  await conn.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
