-- Columns that came with the axel-mapping-new-db branch (already in 1-schema.sql; this is only for a database made before):
-- the full company address read by OCR, and the free-text remarks of an approval step.
ALTER TABLE `crm_application_approval_steps` ADD COLUMN `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL;
ALTER TABLE `crm_fap_application_profiles` ADD COLUMN `company_full_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `crm_frozen_fap_applications` ADD COLUMN `company_full_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `crm_master_business_partners` ADD COLUMN `company_full_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
