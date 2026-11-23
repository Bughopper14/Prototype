const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123987',
    database: 'crm_liugong'
  });

  // Test inserting with fap_freeze_id on crm_frozen_fap_financial_statements
  const testId = 'test-schema-verify-' + Date.now();
  await conn.query(`
    INSERT INTO crm_frozen_fap_financial_statements 
      (id, fap_freeze_id, source_application_id, fiscal_year, is_audited, currency, total_assets)
    VALUES 
      (?, 'b4af7950-a50b-4863-af8a-bf6a9d0fbb95', 'dummy-app', 2025, 1, 'IDR', 1000000)
  `, [testId]);
  
  console.log('✓ Successfully inserted with fap_freeze_id column!');

  // Clean up test row
  await conn.query('DELETE FROM crm_frozen_fap_financial_statements WHERE id = ?', [testId]);
  console.log('✓ Cleaned up test row.');

  await conn.end();
})();
