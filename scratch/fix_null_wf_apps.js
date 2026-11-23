const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123987',
    database: 'crm_liugong'
  });

  // Find active workflow freeze
  const [rows] = await conn.query(`
    SELECT f.id, f.source_workflow_code 
    FROM crm_frozen_workflows f 
    JOIN crm_workflows w ON w.code = f.source_workflow_code 
    WHERE w.is_active = 1 AND f.is_latest_freeze = 1 
    LIMIT 1
  `);

  if (rows.length > 0) {
    const activeFid = rows[0].id;
    console.log('Active workflow freeze ID:', activeFid);
    const [res] = await conn.query(
      'UPDATE crm_applications SET workflow_freeze_id = ? WHERE workflow_freeze_id IS NULL',
      [activeFid]
    );
    console.log(`Updated ${res.affectedRows} applications with NULL workflow_freeze_id to active freeze ${activeFid}`);
  } else {
    console.log('No active workflow freeze found!');
  }

  await conn.end();
})();
