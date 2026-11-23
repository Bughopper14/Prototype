const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123987',
    database: 'crm_liugong'
  });
  const [users] = await conn.query('SELECT id, username, email FROM users LIMIT 10');
  console.log('Users:', users);

  // Check login logic in session/auth
  // Also check applications with workflow_freeze_id IS NULL
  const [nullWfApps] = await conn.query('SELECT id, company_name FROM crm_applications WHERE workflow_freeze_id IS NULL');
  console.log('Apps with NULL workflow_freeze_id:', nullWfApps);

  await conn.end();
})();
