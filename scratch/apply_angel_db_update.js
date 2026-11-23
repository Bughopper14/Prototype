const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123987',
    database: 'crm_liugong',
    multipleStatements: true,
  });

  console.log('Connected to crm_liugong database.');

  // 1. Create crm_workflow_logs table if not exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`crm_workflow_logs\` (
      \`id\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      \`workflow_code\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      \`workflow_name\` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`action\` enum('CREATE','EDIT','RENAME','ACTIVATE','DEACTIVATE','DELETE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      \`summary\` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      \`freeze_version\` int DEFAULT NULL,
      \`actor_name\` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      \`acted_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      KEY \`idx_wf_logs_workflow\` (\`workflow_code\`,\`acted_at\`),
      KEY \`idx_wf_logs_time\` (\`acted_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ crm_workflow_logs table checked/created.');

  // Helper to rename column if it has old name
  async function renameColIfOld(table, oldCol, newCol, colDef) {
    const [cols] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
    const names = cols.map(c => c.Field);
    if (names.includes(oldCol) && !names.includes(newCol)) {
      console.log(`Renaming ${table}.${oldCol} -> ${newCol}...`);
      await conn.query(`ALTER TABLE \`${table}\` CHANGE COLUMN \`${oldCol}\` \`${newCol}\` ${colDef}`);
      console.log(`✓ Renamed ${table}.${oldCol} -> ${newCol}`);
    } else {
      console.log(`- ${table}: already has ${newCol} (or no ${oldCol})`);
    }
  }

  // Renames
  await renameColIfOld('crm_frozen_approval_levels', 'freeze_id', 'approval_freeze_id', 'char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL');
  await renameColIfOld('crm_frozen_workflow_stage_groups', 'freeze_id', 'workflow_freeze_id', 'char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL');
  await renameColIfOld('crm_frozen_workflow_stages', 'freeze_id', 'workflow_freeze_id', 'char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL');
  await renameColIfOld('crm_frozen_workflow_stage_fields', 'freeze_id', 'workflow_freeze_id', 'char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL');
  await renameColIfOld('crm_frozen_workflow_stage_documents', 'freeze_id', 'workflow_freeze_id', 'char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL');
  await renameColIfOld('crm_frozen_workflow_approval_assignments', 'freeze_id', 'workflow_freeze_id', 'char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL');

  // Check child tables of frozen fap applications
  const fapChildTables = [
    'crm_frozen_bank_facilities',
    'crm_frozen_doc_requirements',
    'crm_frozen_document_checklists',
    'crm_frozen_equipment_units',
    'crm_frozen_financial_statements',
    'crm_frozen_financing_facilities_requested',
    'crm_frozen_financing_purposes',
    'crm_frozen_legal_deed_remark_categories',
    'crm_frozen_legal_deeds',
    'crm_frozen_legal_stakeholders',
    'crm_frozen_ocr_discrepancies',
    'crm_frozen_primary_contacts',
    'crm_frozen_project_contracts'
  ];

  for (const t of fapChildTables) {
    try {
      await renameColIfOld(t, 'freeze_id', 'fap_freeze_id', 'char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL');
    } catch (e) {
      console.log(`Note on ${t}:`, e.message);
    }
  }

  // Add initial logs if table empty
  const [logRows] = await conn.query('SELECT COUNT(*) as cnt FROM crm_workflow_logs');
  if (logRows[0].cnt === 0) {
    await conn.query(`
      INSERT IGNORE INTO \`crm_workflow_logs\` (\`id\`,\`workflow_code\`,\`workflow_name\`,\`action\`,\`summary\`,\`freeze_version\`,\`actor_name\`)
        SELECT UUID(),\`code\`,\`name\`,'CREATE',CONCAT('Created the workflow ',\`name\`),1,'seed' FROM \`crm_workflows\`;
      INSERT IGNORE INTO \`crm_workflow_logs\` (\`id\`,\`workflow_code\`,\`workflow_name\`,\`action\`,\`summary\`,\`freeze_version\`,\`actor_name\`)
        SELECT UUID(),\`code\`,\`name\`,'ACTIVATE','Set active (new applications start here now)',1,'seed' FROM \`crm_workflows\` WHERE \`is_active\`=1;
    `);
    console.log('✓ Seeded crm_workflow_logs initial history.');
  }

  console.log('Database migration successfully finished!');
  await conn.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
