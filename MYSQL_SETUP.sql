-- =========================================================================
-- LIUGONG APPS - MYSQL INITIALIZATION SCRIPT (CLEAN CORE INSTALL)
-- Database Target: liugongapps_db
-- Scope: Authentication, Portal Hub, and User Management
-- =========================================================================

CREATE DATABASE IF NOT EXISTS liugongapps_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE liugongapps_db;

-- 1. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app_name VARCHAR(100) NOT NULL UNIQUE,
    url_path VARCHAR(255) NOT NULL,
    description TEXT,
    icon_class VARCHAR(50) DEFAULT 'fas fa-layer-group'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    position VARCHAR(100) DEFAULT 'Staff',
    email VARCHAR(255) NULL,
    is_active TINYINT(1) DEFAULT 1,
    force_logout_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app_id INT NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Authorities Table
CREATE TABLE IF NOT EXISTS authorities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app_id INT NOT NULL,
    authority_name VARCHAR(100) NOT NULL,
    description TEXT,
    FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Role Authorities Mapping Table
CREATE TABLE IF NOT EXISTS role_authorities (
    role_id INT NOT NULL,
    authority_id INT NOT NULL,
    PRIMARY KEY (role_id, authority_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (authority_id) REFERENCES authorities(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. User Application Roles Mapping Table
CREATE TABLE IF NOT EXISTS user_app_roles (
    user_id INT NOT NULL,
    app_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, app_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (app_id) REFERENCES applications(id) ON DELETE RESTRICT,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action TEXT,
    app_name VARCHAR(100),
    ip_address VARCHAR(45),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Session Tracking Table
CREATE TABLE IF NOT EXISTS session_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    app_name VARCHAR(100) DEFAULT 'Portal Apps',
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    logout_time DATETIME NULL,
    is_invalidated TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. VAPID Keys Table for Push Notifications
CREATE TABLE IF NOT EXISTS vapid_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Web Push Subscriptions Table
CREATE TABLE IF NOT EXISTS web_push_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subscription_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INITIAL SEED DATA
INSERT IGNORE INTO applications (id, app_name, url_path, description, icon_class) 
VALUES 
(1, 'User Management', '/user-management', 'Kelola semua user dan aplikasi', 'fas fa-users-cog'),
(2, 'CRM Dashboard', '/crm-dashboard', 'Sistem Customer Relationship Management & Pembiayaan Liugong', 'fas fa-handshake');

INSERT IGNORE INTO roles (id, app_id, role_name, description) 
VALUES 
(1, 1, 'Super Admin', 'Full system management access'),
(2, 2, 'Super Admin', 'Full access to CRM Dashboard');

INSERT IGNORE INTO authorities (id, app_id, authority_name, description) VALUES 
(1, 1, 'manage_system', 'Akses Penuh Manajemen Sistem'),
(2, 1, 'manage_users', 'Mengelola User, Role, dan Otoritas'),
(3, 2, 'access_crm_dashboard', 'Akses Operasional CRM Dashboard');

INSERT IGNORE INTO role_authorities (role_id, authority_id) VALUES 
(1, 1),
(1, 2),
(2, 3);

-- Initial Administrator Account (Username: admin / Password: admin123)
INSERT IGNORE INTO users (id, username, password_hash, full_name, position, email, is_active)
VALUES (
    1,
    'admin',
    'scrypt:32768:8:1$s8L0Nb8D2bvFGBEX$438e915d1f3cc483ac9ba6f06b345cec5159c4105787f3f91155e6d4161caff83fc9277d5ed92462413a3691f1a17f6f87bec646615935d733dfcbb30d146d57',
    'System Admin',
    'Administrator',
    'admin@liugong.co.id',
    1
);

INSERT IGNORE INTO user_app_roles (user_id, app_id, role_id)
VALUES 
(1, 1, 1),
(1, 2, 2);

-- 8. FAP Form Table (Application Form)
CREATE TABLE IF NOT EXISTS fap_form (
    id CHAR(36) PRIMARY KEY,
    application_id CHAR(36) NULL,
    no_register VARCHAR(100) NULL,
    tanggal DATE NULL,
    cabang VARCHAR(100) NULL,
    customer_status VARCHAR(50) NULL,
    customer_type VARCHAR(50) NULL,
    is_customer_baru BOOLEAN DEFAULT 0,
    is_customer_lama BOOLEAN DEFAULT 0,
    is_corporate BOOLEAN DEFAULT 0,
    is_commercial BOOLEAN DEFAULT 0,
    is_micro BOOLEAN DEFAULT 0,
    is_liugong_user BOOLEAN DEFAULT 0,
    nama_perusahaan VARCHAR(255) NULL,
    alamat_perusahaan TEXT NULL,
    kota VARCHAR(150) NULL,
    provinsi VARCHAR(150) NULL,
    kode_pos VARCHAR(20) NULL,
    phone_fax VARCHAR(50) NULL,
    website VARCHAR(255) NULL,
    email_perusahaan VARCHAR(255) NULL,
    pic_nama VARCHAR(150) NULL,
    pic_jabatan VARCHAR(100) NULL,
    pic_telepon VARCHAR(50) NULL,
    pic_email VARCHAR(255) NULL,
    pic_alamat TEXT NULL,
    pic_kota VARCHAR(150) NULL,
    pic_provinsi VARCHAR(150) NULL,
    pic_kode_pos VARCHAR(20) NULL,
    bisnis_utama TEXT NULL,
    no_akta_pendirian VARCHAR(150) NULL,
    tanggal_akta_pendirian DATE NULL,
    pengalaman_tahun INT DEFAULT 0,
    pengalaman_bulan INT DEFAULT 0,
    no_akta_perubahan_terakhir VARCHAR(150) NULL,
    tanggal_akta_perubahan_terakhir DATE NULL,
    nib VARCHAR(50) NULL,
    npwp VARCHAR(50) NULL,
    berdasarkan_akta_no VARCHAR(150) NULL,
    shareholders_data JSON NULL,
    sumber_pembayaran TEXT NULL,
    status_tempat_usaha VARCHAR(50) NULL,
    tujuan_pembiayaan VARCHAR(50) NULL,
    tujuan_investasi_aktivitas_usaha BOOLEAN DEFAULT 0,
    tujuan_investasi_rehabilitasi BOOLEAN DEFAULT 0,
    tujuan_investasi_modernisasi_ekspansi BOOLEAN DEFAULT 0,
    tujuan_investasi_relokasi BOOLEAN DEFAULT 0,
    tujuan_modal_kerja_siklus_usaha BOOLEAN DEFAULT 0,
    tujuan_pembiayaan_keterangan TEXT NULL,
    asset_liugong_he INT DEFAULT 0,
    asset_liugong_truck INT DEFAULT 0,
    asset_liugong_unit DECIMAL(15,2) DEFAULT 0,
    asset_liugong_percentage DECIMAL(5,2) DEFAULT 0,
    asset_non_liugong_he INT DEFAULT 0,
    asset_non_liugong_truck INT DEFAULT 0,
    asset_non_liugong_unit DECIMAL(15,2) DEFAULT 0,
    asset_non_liugong_percentage DECIMAL(5,2) DEFAULT 0,
    asset_total_unit DECIMAL(15,2) DEFAULT 0,
    asset_total_percentage DECIMAL(5,2) DEFAULT 0,
    segmen_pertambangan BOOLEAN DEFAULT 0,
    segmen_pertanian BOOLEAN DEFAULT 0,
    segmen_kehutanan BOOLEAN DEFAULT 0,
    segmen_konstruksi BOOLEAN DEFAULT 0,
    segmen_oil_gas BOOLEAN DEFAULT 0,
    segmen_lainnya VARCHAR(150) NULL,
    bisnis_cons_owner BOOLEAN DEFAULT 0,
    bisnis_contractors BOOLEAN DEFAULT 0,
    bisnis_sub_cont BOOLEAN DEFAULT 0,
    bisnis_rental BOOLEAN DEFAULT 0,
    bisnis_other VARCHAR(150) NULL,
    projects_data JSON NULL,
    bank_facilities_data JSON NULL,
    references_total DECIMAL(20,2) DEFAULT 0,
    references_comments TEXT NULL,
    cara_pembiayaan VARCHAR(100) NULL,
    nilai_pembiayaan DECIMAL(20,2) DEFAULT 0,
    mata_uang VARCHAR(10) DEFAULT 'IDR',
    application_source VARCHAR(100) NULL,
    unit_realization_plan JSON NULL,
    unit_realization_total INT DEFAULT 0,
    terms_conditions_type VARCHAR(100) NULL,
    terms_currency VARCHAR(10) DEFAULT 'IDR',
    terms_security_deposit DECIMAL(20,2) NULL,
    terms_down_payment DECIMAL(20,2) NULL,
    terms_interest_rate DECIMAL(5,2) NULL,
    terms_tenor_months INT NULL,
    terms_payment_method VARCHAR(50) NULL,
    terms_notes TEXT NULL,
    doc_req_company_profile BOOLEAN DEFAULT 0,
    doc_req_legality BOOLEAN DEFAULT 0,
    doc_req_deed_establishment_amendments BOOLEAN DEFAULT 0,
    doc_req_decree_ministry_of_law BOOLEAN DEFAULT 0,
    doc_req_copy_id_bod_shareholders BOOLEAN DEFAULT 0,
    doc_req_audited_financial_statements BOOLEAN DEFAULT 0,
    doc_req_bank_statements BOOLEAN DEFAULT 0,
    doc_req_bank_financing_facility BOOLEAN DEFAULT 0,
    doc_req_production_report BOOLEAN DEFAULT 0,
    doc_req_list_fixed_assets BOOLEAN DEFAULT 0,
    doc_req_project_contracts BOOLEAN DEFAULT 0,
    document_requirements_data JSON NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
    created_by VARCHAR(150) NULL,
    updated_by VARCHAR(150) NULL,
    INDEX idx_fap_application_id (application_id),
    INDEX idx_fap_no_register (no_register)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS application_submit_lock (
    application_id CHAR(36) PRIMARY KEY,
    is_locked TINYINT(1) NOT NULL DEFAULT 0,
    stage VARCHAR(50) NOT NULL DEFAULT 'FAP_STAGE',
    fap_doc_uploaded TINYINT(1) NOT NULL DEFAULT 0,
    unlocked_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    created_by VARCHAR(150) NULL,
    updated_by VARCHAR(150) NULL,
    INDEX idx_lock_app_id (application_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
