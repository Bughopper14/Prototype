import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: '123987', database: 'crm_liugong',
  });

  const appId = '7b230038-383b-4109-bbf3-bd72a5d1f90b';

  // Check checklist for FAP
  const [chk] = await conn.query('SELECT * FROM crm_application_document_checklists WHERE application_id = ? AND document_code = "FAP"', [appId]);
  console.log('Checklist for FAP:', chk);

  // Check files for this application
  const [files] = await conn.query('SELECT * FROM crm_application_document_files WHERE application_id = ? AND deleted_at IS NULL', [appId]);
  console.log('Files for application:', files);

  await conn.end();
}
main().catch(console.error);
