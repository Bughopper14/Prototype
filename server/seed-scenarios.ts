import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { query, transaction, dataDir } from './db';

async function seedScenarios() {
  console.log('Seeding rich scenario dummy data into database...');

  const fapBytes = fs.readFileSync('C:/Users/k1zuu/AppData/Local/Temp/dummy_files/fap.pdf');
  const preBytes = fs.readFileSync('C:/Users/k1zuu/AppData/Local/Temp/dummy_files/preanalysis.pdf');
  const iclfBytes = fs.readFileSync('C:/Users/k1zuu/AppData/Local/Temp/dummy_files/iclf.pdf');
  const ktpB64 = fs.readFileSync('C:/Users/k1zuu/AppData/Local/Temp/dummy_files/ktp_b64.txt', 'utf8').trim();

  // Ensure files directory exists
  const filesDir = path.join(dataDir, 'files');
  fs.mkdirSync(filesDir, { recursive: true });

  const fapKey = crypto.randomUUID();
  const preKey = crypto.randomUUID();
  const iclfKey = crypto.randomUUID();

  fs.writeFileSync(path.join(filesDir, fapKey), fapBytes);
  fs.writeFileSync(path.join(filesDir, preKey), preBytes);
  fs.writeFileSync(path.join(filesDir, iclfKey), iclfBytes);

  await transaction(async q => {
    // 1. Get Application 1
    const appRes = await q('SELECT a.id, a.customer_id FROM applications a WHERE a.fap_number = $1 OR a.id = $2', 
      ['001/AF/IX/2026', '6db11551-7511-40b5-a0f9-b7a697225fcb']);
    if (!appRes.rows.length) throw new Error('Application 1 not found');
    const appId = appRes.rows[0].id;
    const custId = appRes.rows[0].customer_id;

    // 2. Update Customer details
    await q(`UPDATE customers SET 
      company_name = 'PT Nusantara Mining Pratama',
      company_type = 'CORPORATE',
      nib = '1209260000012',
      npwp = '0123456789012000',
      establishment_act_no = 'AHU-0012890.AH.01.01.2018',
      establishment_date = '2018-03-15'
      WHERE id = $1`, [custId]);

    // 3. Update Application details (Rows 1-63 in Excel)
    await q(`UPDATE applications SET 
      branch_code = 'JKT01',
      customer_status = 'EXISTING',
      company_address = 'Gedung Menara Batavia Lt. 18, Jl. K.H. Mas Mansyur Kav. 126',
      city = 'Jakarta Pusat',
      province = 'DKI Jakarta',
      postal_code = '10220',
      phone_fax = '021-5727188',
      email = 'corporate.finance@nusantaraming.co.id',
      website = 'www.nusantaraming.co.id',
      main_business = 'Kontraktor Penambangan & Penyewaan Alat Berat',
      experience_years = 8,
      experience_months = 6,
      location_status = 'OWNED',
      repayment_source = 'Arus Kas Operasional Kontrak Tambang PT Vale Indonesia Tbk & PT Antam Tbk',
      latest_deed_no = 'AHU-0045612.AH.01.02.2024',
      latest_deed_date = '2024-06-20',
      industry_segment = 'MINING',
      business_role = 'CONTRACTORS'
      WHERE id = $1`, [appId]);

    // 4. Update PIC
    await q(`DELETE FROM application_pics WHERE application_id = $1`, [appId]);
    await q(`INSERT INTO application_pics(application_id, pic_name, position, phone, email, current_address, city, province, postal_code)
      VALUES($1, 'Budi Santoso, S.E.', 'Direktur Keuangan / CFO', '08118899223', 'budi.santoso@nusantaraming.co.id', 'Jl. Senopati No. 45, RT 05 / RW 02', 'Jakarta Selatan', 'DKI Jakarta', '12190')`, [appId]);

    // 5. Update Stakeholders in Table
    await q(`DELETE FROM stakeholders WHERE application_id = $1`, [appId]);
    await q(`INSERT INTO stakeholders(application_id, name, position, stakeholder_type, nationality_type, id_type, id_number, share_amount, share_percentage, email, mobile_phone, primary_capital, first_name, last_name, citizenship)
      VALUES 
      ($1, 'Budi Santoso', 'Direktur Utama', 'INDIVIDUAL', 'WNI', 'KTP', '3174011505880003', 4500000000, 45.00, 'budi.santoso@nusantaraming.co.id', '08118899223', 4500000000, 'Budi', 'Santoso', 'INDONESIAN'),
      ($1, 'Hendra Wijaya', 'Komisaris Utama', 'INDIVIDUAL', 'WNI', 'KTP', '3171052010850002', 3500000000, 35.00, 'hendra.wijaya@nusantaraming.co.id', '08129988771', 3500000000, 'Hendra', 'Wijaya', 'INDONESIAN'),
      ($1, 'PT Investama Karya Mandiri', 'Pemegang Saham Badan', 'CORPORATE', 'WNI', 'NPWP', '019887766554000', 2000000000, 20.00, 'legal@investamakarya.com', '021-5299881', 2000000000, 'PT Investama', 'Karya Mandiri', 'INDONESIAN')`, [appId]);

    // 6. Update Project Contracts (Rows 55-63)
    await q(`DELETE FROM project_contracts WHERE application_id = $1`, [appId]);
    await q(`INSERT INTO project_contracts(application_id, project_owner, project_location, project_role, contract_status)
      VALUES
      ($1, 'PT Vale Indonesia Tbk', 'Sorowako, Sulawesi Selatan', 'Main Contractor Penambangan Nikel', 'EXISTING'),
      ($1, 'PT Aneka Tambang Tbk', 'Pomalaa, Sulawesi Tenggara', 'Kontraktor Hauling & Overburden', 'EXISTING'),
      ($1, 'PT Bukit Asam Tbk', 'Tanjung Enim, Sumatera Selatan', 'Subkontraktor Rental Alat Berat', 'NEW')`, [appId]);

    // 7. Update Bank References (Rows 64-72)
    await q(`DELETE FROM bank_references WHERE application_id = $1`, [appId]);
    await q(`INSERT INTO bank_references(application_id, bank_or_fin_institution, currency, credit_facility, monthly_installment, year_started, interest_rate, payment_record, facility_status)
      VALUES
      ($1, 'Bank Mandiri', 'IDR', 15000000000, 485000000, 2021, 9.75, 'Lancar (Kol-1)', 'ACTIVE'),
      ($1, 'Bank BCA', 'IDR', 10000000000, 320000000, 2022, 9.50, 'Lancar (Kol-1)', 'ACTIVE')`, [appId]);

    // 8. Update Financing Proposal (Rows 74-86)
    await q(`DELETE FROM financing_proposals WHERE application_id = $1`, [appId]);
    const propId = crypto.randomUUID();
    await q(`INSERT INTO financing_proposals(id, application_id, facility_purpose, financing_method, currency, financing_value, down_payment_value, interest_rate, tenor_months, payment_method, application_source)
      VALUES($1, $2, 'INVESTMENT', 'FINANCIAL_LEASE', 'IDR', 12500000000, 2500000000, 10.50, 36, 'In Arrear', 'Direct')`, [propId, appId]);

    await q(`DELETE FROM financing_unit_items WHERE proposal_id = $1`, [propId]);
    await q(`INSERT INTO financing_unit_items(proposal_id, unit_category, brand, model_name, quantity, unit_price, total_price)
      VALUES
      ($1, 'HE', 'LiuGong', '936E', 2, 6250000000, 12500000000)`, [propId]);

    // 9. Update Financial Statements (Rows 89-100)
    await q(`DELETE FROM financial_statements WHERE application_id = $1`, [appId]);
    await q(`INSERT INTO financial_statements(application_id, fiscal_year, is_audited, current_assets, non_current_assets, total_assets, current_liabilities, non_current_liabilities, total_liabilities, equity, total_liab_and_equity, revenue, gross_margin, operating_margin, tax, net_income)
      VALUES
      ($1, 2023, true, 18500000000, 32000000000, 50500000000, 12000000000, 15000000000, 27000000000, 23500000000, 50500000000, 68000000000, 18500000000, 12200000000, 2440000000, 9760000000),
      ($1, 2024, true, 24000000000, 41000000000, 65000000000, 14500000000, 18000000000, 32500000000, 32500000000, 65000000000, 85000000000, 23800000000, 16500000000, 3300000000, 13200000000),
      ($1, 2025, true, 31000000000, 52000000000, 83000000000, 17000000000, 22000000000, 39000000000, 44000000000, 83000000000, 108000000000, 31200000000, 22400000000, 4480000000, 17920000000)`, [appId]);

    // 10. Update Legal Deeds with Multi-Categories & Single Remarks, plus KTP in Stakeholder
    const legalJson = {
      deeds: [
        {
          id: 'deed-est-001',
          type: 'establishment',
          deedNo: 'AHU-0012890.AH.01.01.2018',
          deedDate: '2018-03-15',
          notaryName: 'Siti Aminah, S.H., M.Kn.',
          notaryLocation: 'Jakarta Pusat',
          remarkCategoryIds: ['establishment-deed'],
          remarks: 'Akta pendirian perseroan terbatas PT Nusantara Mining Pratama dihadapan Notaris Siti Aminah.',
          stakeholders: [
            {
              id: 'sh-deed-1',
              name: 'Budi Santoso',
              firstName: 'Budi',
              lastName: 'Santoso',
              position: 'Direktur Utama',
              idType: 'KTP',
              idNumber: '3174011505880003',
              sharePercentage: 50.00,
              depositedCapital: 5000000000,
              citizenship: 'INDONESIAN',
              ktpUrl: ktpB64,
              ktpFileName: 'KTP_Budi_Santoso_Dirut.png',
              ktpMime: 'image/png'
            },
            {
              id: 'sh-deed-2',
              name: 'Hendra Wijaya',
              firstName: 'Hendra',
              lastName: 'Wijaya',
              position: 'Komisaris',
              idType: 'KTP',
              idNumber: '3171052010850002',
              sharePercentage: 50.00,
              depositedCapital: 5000000000,
              citizenship: 'INDONESIAN'
            }
          ]
        },
        {
          id: 'deed-amd-002',
          type: 'amendment',
          deedNo: 'AHU-0045612.AH.01.02.2024',
          deedDate: '2024-06-20',
          notaryName: 'Bambang Soeprapto, S.H., M.Kn.',
          notaryLocation: 'Jakarta Selatan',
          remarkCategoryIds: ['amendment-share-change', 'amendment-management-change', 'amendment-articles-change'],
          remarks: '1. Penyesuaian modal disetor dan komposisi kepemilikan saham perseroan sehubungan masuknya PT Investama Karya Mandiri.\n2. Pengangkatan Budi Santoso selaku Direktur Utama dan Hendra Wijaya selaku Komisaris Utama.\n3. Perubahan Pasal 3 Anggaran Dasar mengenai penambahan kegiatan usaha jasa pertambangan batubara (KBLI 09900).',
          parties: {
            firstParty: 'Budi Santoso (Mewakili Direksi)',
            secondParty: 'PT Investama Karya Mandiri',
            signatories: 'Budi Santoso & Hendra Wijaya'
          },
          stakeholders: [
            {
              id: 'sh-deed-3',
              name: 'Budi Santoso',
              firstName: 'Budi',
              lastName: 'Santoso',
              position: 'Direktur Utama',
              idType: 'KTP',
              idNumber: '3174011505880003',
              sharePercentage: 45.00,
              depositedCapital: 4500000000,
              citizenship: 'INDONESIAN',
              ktpUrl: ktpB64,
              ktpFileName: 'KTP_Budi_Santoso_Dirut.png',
              ktpMime: 'image/png'
            },
            {
              id: 'sh-deed-4',
              name: 'Hendra Wijaya',
              firstName: 'Hendra',
              lastName: 'Wijaya',
              position: 'Komisaris Utama',
              idType: 'KTP',
              idNumber: '3171052010850002',
              sharePercentage: 35.00,
              depositedCapital: 3500000000,
              citizenship: 'INDONESIAN'
            },
            {
              id: 'sh-deed-5',
              name: 'PT Investama Karya Mandiri',
              firstName: 'PT Investama',
              lastName: 'Karya Mandiri',
              position: 'Pemegang Saham Badan',
              idType: 'NPWP',
              idNumber: '019887766554000',
              sharePercentage: 20.00,
              depositedCapital: 2000000000,
              citizenship: 'INDONESIAN'
            }
          ]
        }
      ],
      selectedDeedId: 'deed-amd-002',
      selectedDeedNo: 'AHU-0045612.AH.01.02.2024'
    };

    await q('UPDATE applications SET legal = $1 WHERE id = $2', [JSON.stringify(legalJson), appId]);

    // 11. Seed Evidence Files for FAP, PREANALYSIS, and ICLF
    const fapChk = (await q('SELECT id FROM document_checklists WHERE application_id = $1 AND document_code = $2', [appId, 'FAP'])).rows[0];
    const preChk = (await q('SELECT id FROM document_checklists WHERE application_id = $1 AND document_code = $2', [appId, 'PREANALYSIS'])).rows[0];
    const iclfChk = (await q('SELECT id FROM document_checklists WHERE application_id = $1 AND document_code = $2', [appId, 'ICLF'])).rows[0];

    if (fapChk) {
      await q('DELETE FROM document_files WHERE checklist_id = $1', [fapChk.id]);
      await q(`INSERT INTO document_files(checklist_id, file_name, file_key, file_size, mime_type, uploaded_by)
        VALUES($1, 'FAP-Formulir-Aplikasi-001-Signed.pdf', $2, $3, 'application/pdf', 'Marketing Officer')`, 
        [fapChk.id, fapKey, fapBytes.length]);
      await q(`UPDATE document_checklists SET status = 'UPLOADED', checked_by_mkt = true WHERE id = $1`, [fapChk.id]);
    }

    if (preChk) {
      await q('DELETE FROM document_files WHERE checklist_id = $1', [preChk.id]);
      await q(`INSERT INTO document_files(checklist_id, file_name, file_key, file_size, mime_type, uploaded_by)
        VALUES($1, 'Pre-Analysis-Memorandum-CA-Review.pdf', $2, $3, 'application/pdf', 'Credit Analyst')`, 
        [preChk.id, preKey, preBytes.length]);
      await q(`UPDATE document_checklists SET status = 'UPLOADED', checked_by_ca = true WHERE id = $1`, [preChk.id]);
    }

    if (iclfChk) {
      await q('DELETE FROM document_files WHERE checklist_id = $1', [iclfChk.id]);
      await q(`INSERT INTO document_files(checklist_id, file_name, file_key, file_size, mime_type, uploaded_by)
        VALUES($1, 'ICLF-Committee-Approval-Sheet.pdf', $2, $3, 'application/pdf', 'Credit Committee')`, 
        [iclfChk.id, iclfKey, iclfBytes.length]);
      await q(`UPDATE document_checklists SET status = 'UPLOADED', checked_by_bs = true WHERE id = $1`, [iclfChk.id]);
    }

    console.log('Seeded all rich scenario data into Application 1 successfully!');
  });
}

seedScenarios().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
