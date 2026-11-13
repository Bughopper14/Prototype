-- CRM_Liugong1 Incremental Patch (aligned with CRM_Liugong_Diff_Report.xlsx)
-- Generated to fix remaining gaps without touching original plan-schema.sql / plan-seed.sql / internaltest1

ALTER TABLE users_users ADD COLUMN `department` VARCHAR(100) NULL AFTER position;
ALTER TABLE users_users ADD COLUMN `phone` VARCHAR(50) NULL AFTER email;
ALTER TABLE users_users ADD COLUMN `is_admin` TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;
ALTER TABLE users_users ADD COLUMN `is_placeholder` TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin;
ALTER TABLE users_users ADD COLUMN `last_login_at` DATETIME NULL AFTER force_logout_at;
ALTER TABLE users_users ADD COLUMN `updated_at` TIMESTAMP(3) NULL AFTER created_at;
ALTER TABLE users_users ADD COLUMN `created_by` VARCHAR(150) NULL AFTER updated_at;
ALTER TABLE users_users ADD COLUMN `updated_by` VARCHAR(150) NULL AFTER created_by;
UPDATE users_users u
    JOIN users_user_app_roles uar ON uar.user_id = u.id AND uar.app_id = 2 AND uar.role_id = 2
    SET u.is_admin = 1;
UPDATE users_users SET
    department = CASE
      WHEN username = 'admin' THEN 'IT'
      WHEN username LIKE 'axel%' THEN 'MANAGEMENT'
      WHEN username = 'testmkt' THEN 'MKT'
      WHEN username = 'testlegal' THEN 'LEGAL'
      ELSE department
    END
    WHERE department IS NULL;
ALTER TABLE crm_pre_analysis_forms MODIFY COLUMN group_structure_image LONGTEXT NULL;
ALTER TABLE crm_pre_analysis_forms MODIFY COLUMN qa_document_file LONGTEXT NULL;
ALTER TABLE crm_pre_analysis_slik_reviews MODIFY COLUMN entity_key VARCHAR(191) NOT NULL;
UPDATE crm_master_equipment_brands SET name = 'LiuGong' WHERE code = 'LiuGong';
UPDATE crm_master_equipment_types SET code = 'Hydraulic Excavator', name = 'Hydraulic Excavator' WHERE LOWER(code) = 'hydraulic excavator';
UPDATE crm_master_equipment_models SET name = '936E' WHERE code = '936E';
