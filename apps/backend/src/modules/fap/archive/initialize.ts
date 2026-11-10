/** Creates the archive tables. */
import {pool} from '../../../core/db/pool';

export async function initializeFapArchive(): Promise<void> {
  if (!pool) return;
  try {
    // Drop freeze triggers as requested: "fap_submission_archive tidak jadi di freeze"
    try {
      await pool.query('DROP TRIGGER IF EXISTS trg_fap_archive_no_update');
      await pool.query('DROP TRIGGER IF EXISTS trg_fap_archive_no_delete');
    } catch {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fap_submission_archive (
        id CHAR(36) PRIMARY KEY,
        application_id CHAR(36) NOT NULL,
        
        -- Identitas Debitur & Header FAP
        fap_registration_number VARCHAR(80) NULL,
        application_date DATE NULL,
        branch_code VARCHAR(30) NULL,
        customer_status VARCHAR(30) NULL,
        customer_id CHAR(36) NULL,
        company_name VARCHAR(255) NULL,
        company_type VARCHAR(50) NULL,
        nib VARCHAR(32) NULL,
        nib_date DATE NULL,
        npwp VARCHAR(32) NULL,
        skt_no VARCHAR(100) NULL,
        sppkp_no VARCHAR(100) NULL,
        establishment_act_no VARCHAR(100) NULL,
        establishment_date DATE NULL,
        latest_deed_no VARCHAR(100) NULL,
        latest_deed_date DATE NULL,
        
        -- Alamat & Domisili Perusahaan
        company_address TEXT NULL,
        rt VARCHAR(10) NULL,
        rw VARCHAR(10) NULL,
        city VARCHAR(150) NULL,
        province VARCHAR(150) NULL,
        postal_code VARCHAR(20) NULL,
        phone_fax VARCHAR(50) NULL,
        email VARCHAR(255) NULL,
        website VARCHAR(255) NULL,
        
        -- Profil Usaha & Pengalaman
        main_business TEXT NULL,
        experience_years INT NULL DEFAULT 0,
        experience_months INT NULL DEFAULT 0,
        location_status VARCHAR(50) NULL,
        repayment_source TEXT NULL,
        industry_segment VARCHAR(100) NULL,
        business_role VARCHAR(100) NULL,
        
        -- Summary Asset Unit (LiuGong & Non-LiuGong)
        asset_summary_he_liu_gong INT NULL DEFAULT 0,
        asset_summary_truck_liu_gong INT NULL DEFAULT 0,
        asset_summary_he_non_liu_gong INT NULL DEFAULT 0,
        asset_summary_truck_non_liu_gong INT NULL DEFAULT 0,
        
        -- PIC (Person in Charge) Form
        pic_name VARCHAR(150) NULL,
        pic_position VARCHAR(100) NULL,
        pic_phone VARCHAR(50) NULL,
        pic_email VARCHAR(255) NULL,
        pic_current_address TEXT NULL,
        pic_rt VARCHAR(10) NULL,
        pic_rw VARCHAR(10) NULL,
        pic_city VARCHAR(150) NULL,
        pic_province VARCHAR(150) NULL,
        pic_postal_code VARCHAR(20) NULL,
        pic_id_number VARCHAR(50) NULL,
        pic_gender VARCHAR(20) NULL,
        pic_birth_place VARCHAR(100) NULL,
        pic_birth_date DATE NULL,
        
        -- Halaman 2 FAP (Proyek, Pemegang Saham, Pengajuan Pembiayaan, Fasilitas Bank, Unit)
        projects JSON NULL,
        stakeholders JSON NULL,
        bank_references JSON NULL,
        financing_value DECIMAL(20,2) NULL,
        tenor_months INT NULL,
        interest_rate DECIMAL(8,4) NULL,
        down_payment_value DECIMAL(20,2) NULL,
        payment_method VARCHAR(50) NULL,
        estimated_monthly_installment DECIMAL(20,2) NULL,
        equipment_units JSON NULL,
        financial_statements JSON NULL,
        fap_stage_data JSON NOT NULL,
        
        -- Extra Columns Sesuai Request User
        ocr_discrepancies JSON NULL,
        ocr_raw_data JSON NULL,
        comparison_remarks TEXT NULL,
        ocr_document_path VARCHAR(500) NULL,
        ocr_document_filename VARCHAR(255) NULL,
        
        -- Workflow & Audit Metadata
        stage_at_submission VARCHAR(50) NOT NULL DEFAULT 'PRE_ANALYSIS',
        submitted_by_user_id VARCHAR(100) NULL,
        submitted_by_user_name VARCHAR(150) NULL,
        submitted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        
        INDEX idx_fap_archive_app_id (application_id),
        INDEX idx_fap_archive_fap_no (fap_registration_number),
        INDEX idx_fap_archive_submitted_at (submitted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✓ fap_submission_archive table initialized with full exact FAP form columns (unfrozen)');
  } catch (err) {
    console.warn('initializeFapArchive error:', err);
  }
}
