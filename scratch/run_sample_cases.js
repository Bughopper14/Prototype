const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123987',
    database: 'crm_liugong',
    multipleStatements: true
  });

  const sqlPath = path.join(__dirname, '../apps/backend/db/5-sample-cases.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log(`Executing 5-sample-cases.sql (${(sql.length / 1024).toFixed(1)} KB)...`);
  await conn.query(sql);
  console.log('✓ 5-sample-cases.sql executed successfully without any errors!');

  await conn.end();
}

run().catch(err => {
  console.error('✗ Execution failed:', err);
  process.exit(1);
});
