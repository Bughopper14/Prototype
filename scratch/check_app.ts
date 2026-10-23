import {pool} from '../server/mysql-store';

async function main() {
  const [rows]: any = await pool!.query(
    `SELECT a.application_id, f.company_name, f.fap_registration_number, p.application_status, l.is_locked, l.fap_doc_uploaded, l.stage
     FROM all_applications a
     JOIN new_application_fap_stage f ON f.id_fap_stage = a.id_fap_stage
     JOIN new_application_pre_analisis p ON p.id_pre_analysis = a.id_pre_analysis
     LEFT JOIN application_submit_lock l ON l.application_id = a.application_id
     WHERE f.company_name LIKE ?`,
    ['%Daya Mandiri%']
  );
  console.log('Result for Daya Mandiri:', JSON.stringify(rows, null, 2));

  const [allJoined]: any = await pool!.query(
    `SELECT a.application_id, f.company_name, f.fap_registration_number, p.application_status, l.is_locked, l.fap_doc_uploaded, l.stage
     FROM all_applications a
     JOIN new_application_fap_stage f ON f.id_fap_stage = a.id_fap_stage
     JOIN new_application_pre_analisis p ON p.id_pre_analysis = a.id_pre_analysis
     LEFT JOIN application_submit_lock l ON l.application_id = a.application_id`
  );
  console.log('All joined applications count:', allJoined.length);
  console.log('All applications summary:', JSON.stringify(allJoined, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
