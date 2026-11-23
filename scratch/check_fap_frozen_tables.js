const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '123987',
    database: 'crm_liugong'
  });

  const fapTables = [
    'crm_frozen_fap_applications',
    'crm_frozen_fap_bank_facilities',
    'crm_frozen_fap_doc_requirements',
    'crm_frozen_fap_document_checklists',
    'crm_frozen_fap_equipment_units',
    'crm_frozen_fap_financial_statements',
    'crm_frozen_fap_financing_proposals',
    'crm_frozen_fap_financing_purposes',
    'crm_frozen_fap_legal_deed_remark_categories',
    'crm_frozen_fap_legal_deeds',
    'crm_frozen_fap_legal_stakeholders',
    'crm_frozen_fap_ocr_discrepancies',
    'crm_frozen_fap_primary_contacts',
    'crm_frozen_fap_project_contracts'
  ];

  for (const t of fapTables) {
    try {
      const [cols] = await conn.query(`SHOW COLUMNS FROM \`${t}\``);
      const colNames = cols.map(c => c.Field);
      console.log(`${t}: exists, columns has freeze_id=${colNames.includes('freeze_id')}, has fap_freeze_id=${colNames.includes('fap_freeze_id')}`);
    } catch (e) {
      console.log(`${t}: NOT FOUND (${e.message})`);
    }
  }

  await conn.end();
})();
