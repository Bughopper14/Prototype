const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123987',
    database: 'crm_liugong'
  });

  const [cols] = await conn.query('SHOW COLUMNS FROM crm_frozen_workflow_stages');
  console.log('crm_frozen_workflow_stages columns:', cols.map(c => c.Field));

  const [tables] = await conn.query("SHOW TABLES LIKE 'crm_workflow_logs'");
  console.log('crm_workflow_logs exists:', tables.length > 0);

  const [tablesSample] = await conn.query("SHOW TABLES LIKE 'crm_applications'");
  const [appCols] = await conn.query('SHOW COLUMNS FROM crm_applications');
  console.log('crm_applications columns:', appCols.map(c => c.Field));

  await conn.end();
})();
