const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123987',
    database: 'crm_liugong'
  });

  const [apps] = await conn.query(`
    SELECT a.id, a.workflow_freeze_id, f.id AS freeze_exists
    FROM crm_applications a
    LEFT JOIN crm_frozen_workflows f ON f.id = a.workflow_freeze_id
    WHERE a.deleted_at IS NULL
  `);

  const invalid = apps.filter(a => !a.freeze_exists);
  console.log(`Total active applications: ${apps.length}`);
  console.log(`Applications with invalid or null workflow_freeze_id: ${invalid.length}`);
  console.log('Invalid sample:', invalid.slice(0, 10));

  await conn.end();
})();
