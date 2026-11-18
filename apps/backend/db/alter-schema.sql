-- =====================================================================
-- alter-schema.sql : modular workflow (admin-configurable), as an ALTER on the old database
-- Continues from old-schema.sql (crm_liugong, MySQL 8). Run ONCE, in order, after old-schema.sql + old-seed.sql.
-- old-schema.sql / old-seed.sql are NOT modified. Design source: workflow-added.xlsx
-- The result of old-schema.sql + old-seed.sql + this file is the database in current-schema.sql / current-seed.sql
-- (a fresh install only needs those two). The script targets whatever database is selected: it has no USE line of its own
-- beyond the one below, so edit it (or remove it and pick the database with `mysql <name>`) to run it on a copy.
--
-- Part 1  CREATE new tables (workflows, groups, stages, stage fields, stage documents, overrides, logs)
-- Part 2  The default workflow: group MKT (FAP and Pre-analysis in parallel), then group CA (ICLF). Legacy stage IDs are reused,
--         so existing application rows keep valid references
-- Part 3  ALTER crm_applications (workflow_code) and the document checklist; approval tables are untouched
-- Part 4  users_* tables and rows from the users developer's branch (axel-mapping-new-db), including users_departments and users_users.dept_id; no crm_ table is touched there. Departments stay plain codes on the CRM side
-- Part 5  Business partners: partner_code to code, customer_relationship dropped, crm_applications.customer_id to business_partner_id
-- Part 6  Codes: empty codes filled (provinces, cities, districts, villages, business partners); hyphens instead of underscores in the workflow layer
-- Part 12 crm_fap_proposal_terms and crm_frozen_fap_proposal_terms dropped (terms come from the financing proposal)
-- Part 11 crm_workflows.deleted_at/deleted_by and crm_application_stage_progress.started_at dropped (unused)
-- Part 10 is_active dropped from the workflow groups, stages, fields, documents and form fields (the workflow status decides)
-- Part 9  crm_master_document_types: department_code, is_mandatory and is_active dropped (they follow the workflow)
-- Part 8  crm_application_document_checklists.is_mandatory dropped (mandatory follows the workflow)
-- Part 7  Master codes with hyphens instead of underscores (frozen and activity copies follow); frozen source_customer_id becomes source_business_partner_id
-- crm_master_field_mandatory_rules is KEPT (Pre-analysis rules live only there).
-- Pre-analysis form fields are intentionally NOT in the field catalog yet.
--
-- Conventions of the workflow tables
--   * every workflow table has a `code` column; the backend builds it (name trimmed and upper-case)
--   * no levels: `sort_order` orders groups, and groups with the same sort_order run in parallel; stages are ordered inside their group
--   * the form field catalog has no label and no default mandatory
-- =====================================================================
USE `crm_liugong`;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Part 1. New tables
-- ---------------------------------------------------------------------

-- A workflow is DRAFT (being built), ACTIVE (the one new applications start in; only one) or INACTIVE (deactivated: it was
-- active, or was switched off; applications that started in it keep running on it). Activating another workflow
-- deactivates the current one. Only a DRAFT with no application is edited. Nothing is hard-deleted: a workflow is
-- soft-deleted (deleted_at). There is no publish step and no clone.
CREATE TABLE IF NOT EXISTS `crm_workflows` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `version_no` INT NOT NULL DEFAULT 1,
  `status` ENUM('DRAFT','ACTIVE','INACTIVE') NOT NULL DEFAULT 'DRAFT',
  `activated_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `activated_by` VARCHAR(150) DEFAULT NULL,
  `deleted_at` TIMESTAMP(3) NULL DEFAULT NULL,
  `deleted_by` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(150) DEFAULT NULL,
  `updated_by` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wf_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `crm_workflow_stage_groups` (
  `id` CHAR(36) NOT NULL,
  `workflow_code` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `description` VARCHAR(500) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(150) DEFAULT NULL,
  `updated_by` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wf_group_code` (`workflow_code`, `code`),
  UNIQUE KEY `uk_wf_group_id_wf` (`id`, `workflow_code`),
  KEY `idx_wf_group_order` (`workflow_code`, `sort_order`),
  CONSTRAINT `fk_wf_group_wf` FOREIGN KEY (`workflow_code`) REFERENCES `crm_workflows` (`code`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `crm_workflow_stages` (
  `id` CHAR(36) NOT NULL,
  `workflow_code` VARCHAR(50) NOT NULL,
  `stage_group_id` CHAR(36) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `department_code` VARCHAR(50) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `form_code` VARCHAR(60) DEFAULT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(150) DEFAULT NULL,
  `updated_by` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wf_stage_code` (`workflow_code`, `code`),
  UNIQUE KEY `uk_wf_stage_id_wf` (`id`, `workflow_code`),
  KEY `idx_wf_stage_order` (`stage_group_id`, `sort_order`),
  CONSTRAINT `fk_wf_stage_wf` FOREIGN KEY (`workflow_code`) REFERENCES `crm_workflows` (`code`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_wf_stage_group` FOREIGN KEY (`stage_group_id`, `workflow_code`) REFERENCES `crm_workflow_stage_groups` (`id`, `workflow_code`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Field catalog of a workflow stage's form. `code` was field_key (backend: trimmed, upper-case); `stage_id` links the field to the
-- workflow stage (it takes the place of field_key as the link). No label and no default mandatory.
CREATE TABLE IF NOT EXISTS `crm_master_form_fields` (
  `id` CHAR(36) NOT NULL,
  `stage_id` CHAR(36) NOT NULL,
  `form_code` VARCHAR(60) NOT NULL,
  `section_name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(150) DEFAULT NULL,
  `updated_by` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_form_field` (`stage_id`, `form_code`, `section_name`, `code`),
  CONSTRAINT `fk_form_field_stage` FOREIGN KEY (`stage_id`) REFERENCES `crm_workflow_stages` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `crm_workflow_stage_fields` (
  `id` CHAR(36) NOT NULL,
  `workflow_code` VARCHAR(50) NOT NULL,
  `stage_id` CHAR(36) NOT NULL,
  `form_field_id` CHAR(36) NOT NULL,
  `is_mandatory` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(150) DEFAULT NULL,
  `updated_by` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wf_stage_field` (`stage_id`, `form_field_id`),
  KEY `idx_wf_stage_field_wf` (`workflow_code`),
  CONSTRAINT `fk_wf_sfield_wf` FOREIGN KEY (`workflow_code`) REFERENCES `crm_workflows` (`code`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_wf_sfield_stage` FOREIGN KEY (`stage_id`, `workflow_code`) REFERENCES `crm_workflow_stages` (`id`, `workflow_code`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_wf_sfield_field` FOREIGN KEY (`form_field_id`) REFERENCES `crm_master_form_fields` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Three levels: workflow_code, group_id, stage_id (a workflow is referenced by its code, not by its id).
CREATE TABLE IF NOT EXISTS `crm_workflow_stage_documents` (
  `id` CHAR(36) NOT NULL,
  `workflow_code` VARCHAR(50) NOT NULL,
  `group_id` CHAR(36) NOT NULL,
  `stage_id` CHAR(36) NOT NULL,
  `document_type_id` CHAR(36) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 1,
  `is_mandatory` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(150) DEFAULT NULL,
  `updated_by` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wf_stage_doc` (`stage_id`, `document_type_id`),
  KEY `idx_wf_stage_doc_wf` (`workflow_code`, `stage_id`, `is_default`),
  KEY `idx_wf_stage_doc_group` (`group_id`, `workflow_code`),
  CONSTRAINT `fk_wf_sdoc_wf` FOREIGN KEY (`workflow_code`) REFERENCES `crm_workflows` (`code`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_wf_sdoc_group` FOREIGN KEY (`group_id`, `workflow_code`) REFERENCES `crm_workflow_stage_groups` (`id`, `workflow_code`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_wf_sdoc_stage` FOREIGN KEY (`stage_id`, `workflow_code`) REFERENCES `crm_workflow_stages` (`id`, `workflow_code`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_wf_sdoc_type` FOREIGN KEY (`document_type_id`) REFERENCES `crm_master_document_types` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NOTE: FKs on columns used in the CHECK constraints use RESTRICT (MySQL rejects CASCADE there).
-- The department is asked here, when a user adds a document to the checklist of one application: required for every ADD.
CREATE TABLE IF NOT EXISTS `crm_application_document_overrides` (
  `id` CHAR(36) NOT NULL,
  `application_id` CHAR(36) NOT NULL,
  `stage_id` CHAR(36) NOT NULL,
  `action` ENUM('ADD','REMOVE') NOT NULL,
  `workflow_stage_document_id` CHAR(36) DEFAULT NULL,
  `document_type_id` CHAR(36) DEFAULT NULL,
  `custom_name` VARCHAR(150) DEFAULT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `department_code` VARCHAR(50) DEFAULT NULL,
  `is_mandatory` TINYINT(1) DEFAULT NULL,
  `reason` VARCHAR(500) DEFAULT NULL,
  `added_by_user_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(150) DEFAULT NULL,
  `updated_by` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_doc_ovr_wsd` (`application_id`, `workflow_stage_document_id`),
  KEY `idx_app_doc_ovr_app` (`application_id`, `stage_id`),
  KEY `idx_app_doc_ovr_doc` (`document_type_id`),
  KEY `idx_app_doc_ovr_dept` (`department_code`),
  CONSTRAINT `fk_app_doc_ovr_app` FOREIGN KEY (`application_id`) REFERENCES `crm_applications` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_app_doc_ovr_stage` FOREIGN KEY (`stage_id`) REFERENCES `crm_workflow_stages` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_app_doc_ovr_wsd` FOREIGN KEY (`workflow_stage_document_id`) REFERENCES `crm_workflow_stage_documents` (`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_app_doc_ovr_type` FOREIGN KEY (`document_type_id`) REFERENCES `crm_master_document_types` (`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT `fk_app_doc_ovr_user` FOREIGN KEY (`added_by_user_id`) REFERENCES `users_users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `chk_app_doc_ovr_source` CHECK (
    (`action` = 'REMOVE' AND `workflow_stage_document_id` IS NOT NULL AND `document_type_id` IS NULL AND `custom_name` IS NULL)
    OR (`action` = 'ADD' AND ((`workflow_stage_document_id` IS NOT NULL) + (`document_type_id` IS NOT NULL) + (`custom_name` IS NOT NULL)) = 1)
  ),
  CONSTRAINT `chk_app_doc_ovr_dept` CHECK (`action` <> 'ADD' OR `department_code` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The log keeps a snapshot of the workflow instead of a link, so it stays complete when the workflow is later changed.
CREATE TABLE IF NOT EXISTS `crm_workflow_activation_logs` (
  `id` CHAR(36) NOT NULL,
  `workflow_json` JSON NOT NULL,
  `previous_workflow_json` JSON DEFAULT NULL,
  `action` ENUM('ACTIVATE','DEACTIVATE','DELETE') NOT NULL,
  `actor_user_id` INT DEFAULT NULL,
  `actor_name` VARCHAR(150) NOT NULL,
  `note` VARCHAR(500) DEFAULT NULL,
  `acted_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_wf_act_at` (`acted_at`),
  CONSTRAINT `fk_wf_act_user` FOREIGN KEY (`actor_user_id`) REFERENCES `users_users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Part 2. The default workflow
-- Needs a single session (uses @wf_id). It is the only workflow after this script. Legacy stage IDs are reused as the new
-- stage IDs, so existing application rows keep valid references. A workflow only defines stages, required fields and
-- documents. The approval part (statuses, actions, authorities) is not part of it and keeps running on the legacy tables.
--   group MKT (order 1): stages FAP_STAGE and PRE_ANALYSIS, same order = they run in parallel
--   group CA  (order 2): stage ICLF, after the MKT group is done
-- ---------------------------------------------------------------------
SET @wf_id = UUID();
SET @wf_code = 'DEFAULT-WORKFLOW';
SET @g_mkt = UUID();
SET @g_ca = UUID();

INSERT INTO `crm_workflows` (`id`, `code`, `name`, `description`, `version_no`, `status`, `activated_at`, `activated_by`, `created_by`)
VALUES (@wf_id, @wf_code, 'Default workflow', 'FAP and Pre-analysis in parallel (MKT), then ICLF (CA)', 1, 'ACTIVE', NOW(3), 'migration', 'migration');

INSERT INTO `crm_workflow_stage_groups` (`id`, `workflow_code`, `code`, `name`, `sort_order`, `created_by`) VALUES
  (@g_mkt, @wf_code, 3, 'Marketing', 1, 'migration'),
  (@g_ca, @wf_code, 'CA', 'Credit Analyst', 2, 'migration');

INSERT INTO `crm_workflow_stages` (`id`, `workflow_code`, `stage_group_id`, `code`, `name`, `department_code`, `sort_order`, `form_code`, `is_active`, `created_by`)
SELECT s.`id`, @wf_code, IF(s.`code` = 'ICLF', @g_ca, @g_mkt), s.`code`, s.`name`, IF(s.`code` = 'ICLF', 'CA', 'MKT'), 1, IF(s.`code` = 'FAP_STAGE', 'FAP_FORM', NULL), s.`is_active`, 'migration'
FROM `crm_master_workflow_stages` s;

-- Field catalog of the FAP stage: the fields of the legacy mandatory rules (includes Legal Deeds & Amendments and
-- Shareholders & Management). `code` is the legacy field_key, trimmed and upper-case. Pre-analysis rules are not copied (they stay
-- in crm_master_field_mandatory_rules).
INSERT INTO `crm_master_form_fields` (`id`, `stage_id`, `form_code`, `section_name`, `code`, `sort_order`, `is_active`, `created_by`)
SELECT UUID(), r.`stage_id`, 'FAP_FORM', r.`section_name`, UPPER(TRIM(r.`field_key`)),
       ROW_NUMBER() OVER (ORDER BY r.`created_at`, r.`section_name`, r.`field_key`), r.`is_active`, 'migration'
FROM `crm_master_field_mandatory_rules` r
JOIN `crm_master_workflow_stages` s ON s.`id` = r.`stage_id` AND s.`code` = 'FAP_STAGE'
-- notaryCity and shareholderDeedRef exist in no form and no table, so nothing could check them
WHERE r.`field_key` NOT IN ('notaryCity', 'shareholderDeedRef');

-- Form fields that had no rule row yet (units of the financing proposal, deed remark categories, purpose detail):
-- the catalog holds every input of the FAP form, so each one can be made mandatory in Workflow setup.
SET @fap_stage = (SELECT `id` FROM `crm_master_workflow_stages` WHERE `code` = 'FAP_STAGE');
INSERT INTO `crm_master_form_fields` (`id`, `stage_id`, `form_code`, `section_name`, `code`, `sort_order`, `created_by`) VALUES
  (UUID(), @fap_stage, 'FAP_FORM', 'Equipment Units', 'UNITCATEGORY', 1001, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Equipment Units', 'BRAND', 1002, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Equipment Units', 'UNITTYPE', 1003, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Equipment Units', 'MODELNAME', 1004, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Equipment Units', 'ASSETNAME', 1005, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Equipment Units', 'CLASSTON', 1006, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Equipment Units', 'QUANTITY', 1007, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Equipment Units', 'YEARS', 1008, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Equipment Units', 'SPECIFICATIONS', 1009, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Legal Deeds & Amendments', 'REMARKCATEGORYIDS', 1010, 'migration'),
  (UUID(), @fap_stage, 'FAP_FORM', 'Purpose of Financing & Fixed Assets', 'FINANCINGPURPOSEDETAIL', 1011, 'migration');

INSERT INTO `crm_workflow_stage_fields` (`id`, `workflow_code`, `stage_id`, `form_field_id`, `is_mandatory`, `is_active`, `created_by`)
SELECT UUID(), @wf_code, r.`stage_id`, ff.`id`, r.`is_mandatory`, r.`is_active`, 'migration'
FROM `crm_master_field_mandatory_rules` r
JOIN `crm_master_workflow_stages` s ON s.`id` = r.`stage_id` AND s.`code` = 'FAP_STAGE'
JOIN `crm_master_form_fields` ff ON ff.`stage_id` = r.`stage_id` AND ff.`section_name` = r.`section_name` AND ff.`code` = UPPER(TRIM(r.`field_key`));

-- Legacy master document types that had a stage become default documents of that stage (and of its group).
INSERT INTO `crm_workflow_stage_documents` (`id`, `workflow_code`, `group_id`, `stage_id`, `document_type_id`, `is_default`, `is_mandatory`, `sort_order`, `is_active`, `created_by`)
SELECT UUID(), @wf_code, st.`stage_group_id`, dt.`stage_id`, dt.`id`, 1, dt.`is_mandatory`, dt.`sort_order`, dt.`is_active`, 'migration'
FROM `crm_master_document_types` dt
JOIN `crm_workflow_stages` st ON st.`id` = dt.`stage_id` AND st.`workflow_code` = @wf_code
WHERE dt.`stage_id` IS NOT NULL;

INSERT INTO `crm_workflow_activation_logs` (`id`, `workflow_json`, `previous_workflow_json`, `action`, `actor_name`, `note`)
SELECT UUID(), JSON_OBJECT('id', w.`id`, 'code', w.`code`, 'name', w.`name`, 'version_no', w.`version_no`, 'status', w.`status`), NULL,
       a.`action`, 'migration', 'Initial workflow migrated from global tables'
FROM `crm_workflows` w
JOIN (SELECT 'ACTIVATE' AS `action`) a
WHERE w.`id` = @wf_id;

-- ---------------------------------------------------------------------
-- Part 3. ALTER existing CRM tables
-- The approval part (statuses, actions, authorities: crm_master_workflow_*, crm_application_stage_progress / _transitions /
-- _signoffs, crm_applications.current_status_id) is NOT touched. An application only gets the workflow that defines
-- its stages, required fields and documents.
-- ---------------------------------------------------------------------

ALTER TABLE `crm_applications`
  ADD COLUMN `workflow_code` VARCHAR(50) NULL AFTER `branch_id`;
UPDATE `crm_applications` SET `workflow_code` = @wf_code WHERE `workflow_code` IS NULL;
ALTER TABLE `crm_applications`
  MODIFY COLUMN `workflow_code` VARCHAR(50) NOT NULL,
  ADD KEY `idx_app_workflow` (`workflow_code`),
  ADD CONSTRAINT `fk_app_workflow` FOREIGN KEY (`workflow_code`) REFERENCES `crm_workflows` (`code`) ON UPDATE CASCADE ON DELETE RESTRICT;

-- The FAP registration number belongs to the FAP (crm_fap_application_profiles, one row per application), not to the
-- application: it is empty until a user generates it (Pre-analysis can run first). UNIQUE holds for the numbers that exist.
-- An application is identified by its id; the number is only what is shown once it exists.
-- The other FAP-only columns of the application move with it: signed FAP uploaded, FAP form locked, latest freeze version.
ALTER TABLE `crm_fap_application_profiles`
  ADD COLUMN `fap_registration_number` VARCHAR(80) NULL AFTER `application_id`,
  ADD COLUMN `is_fap_doc_uploaded` TINYINT(1) NOT NULL DEFAULT 0 AFTER `fap_registration_number`,
  ADD COLUMN `is_fap_form_locked` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_fap_doc_uploaded`,
  ADD COLUMN `latest_freeze_version` INT NOT NULL DEFAULT 0 AFTER `is_fap_form_locked`;
UPDATE `crm_fap_application_profiles` p JOIN `crm_applications` a ON a.`id` = p.`application_id`
SET p.`fap_registration_number` = a.`fap_registration_number`, p.`is_fap_doc_uploaded` = a.`is_fap_doc_uploaded`,
    p.`is_fap_form_locked` = a.`is_fap_form_locked`, p.`latest_freeze_version` = a.`latest_freeze_version`;
ALTER TABLE `crm_fap_application_profiles` ADD UNIQUE KEY `uk_fap_profile_reg_no` (`fap_registration_number`);
ALTER TABLE `crm_applications`
  DROP INDEX `uk_app_fap_reg_no`,
  DROP COLUMN `fap_registration_number`,
  DROP COLUMN `is_fap_doc_uploaded`,
  DROP COLUMN `is_fap_form_locked`,
  DROP COLUMN `latest_freeze_version`;

-- crm_application_document_checklists: stage, source, links to workflow documents / overrides
-- Pre-check (should return 0 before running the NOT NULL step below):
--   SELECT COUNT(*) FROM crm_application_document_checklists c JOIN crm_master_document_types d ON d.id = c.document_type_id WHERE d.stage_id IS NULL;
ALTER TABLE `crm_application_document_checklists`
  ADD COLUMN `stage_id` CHAR(36) NULL AFTER `application_id`,
  ADD COLUMN `source_type` ENUM('DEFAULT','ADDED') NOT NULL DEFAULT 'DEFAULT' AFTER `document_type_id`,
  ADD COLUMN `workflow_stage_document_id` CHAR(36) NULL AFTER `source_type`,
  ADD COLUMN `override_id` CHAR(36) NULL AFTER `workflow_stage_document_id`,
  MODIFY COLUMN `document_type_id` CHAR(36) NULL;
UPDATE `crm_application_document_checklists` c
JOIN `crm_workflow_stage_documents` sd ON sd.`workflow_code` = @wf_code AND sd.`document_type_id` = c.`document_type_id`
SET c.`stage_id` = sd.`stage_id`, c.`workflow_stage_document_id` = sd.`id`
WHERE c.`stage_id` IS NULL;
ALTER TABLE `crm_application_document_checklists`
  MODIFY COLUMN `stage_id` CHAR(36) NOT NULL,
  DROP INDEX `uk_app_doc_chk`,
  ADD UNIQUE KEY `uk_app_doc_chk_wf` (`application_id`, `workflow_stage_document_id`),
  ADD UNIQUE KEY `uk_app_doc_chk_override` (`application_id`, `override_id`),
  ADD KEY `idx_app_doc_chk_stage` (`stage_id`),
  ADD CONSTRAINT `fk_app_doc_chk_stage` FOREIGN KEY (`stage_id`) REFERENCES `crm_workflow_stages` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_app_doc_chk_wsd` FOREIGN KEY (`workflow_stage_document_id`) REFERENCES `crm_workflow_stage_documents` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_app_doc_chk_override` FOREIGN KEY (`override_id`) REFERENCES `crm_application_document_overrides` (`id`) ON UPDATE CASCADE ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- Part 4. users_* tables (departments table, users_users.dept_id instead of a department text), taken from the users developer's branch (axel-mapping-new-db). Only users_* tables and rows are
-- touched here; no crm_ table is changed by this part, and the CRM code stays as in this project.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users_departments` (
  `dept_id` int NOT NULL AUTO_INCREMENT,
  `department_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT 'System Admin',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`dept_id`),
  UNIQUE KEY `uk_users_dept_code` (`department_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `users_users`
  ADD COLUMN `dept_id` INT NULL DEFAULT NULL AFTER `position`,
  ADD KEY `idx_users_dept` (`dept_id`),
  ADD CONSTRAINT `fk_users_dept` FOREIGN KEY (`dept_id`) REFERENCES `users_departments` (`dept_id`) ON DELETE SET NULL,
  ADD COLUMN `phone` VARCHAR(50) NULL DEFAULT NULL AFTER `email`,
  ADD COLUMN `is_admin` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`,
  ADD COLUMN `is_placeholder` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_admin`,
  ADD COLUMN `last_login_at` DATETIME NULL DEFAULT NULL AFTER `force_logout_at`,
  ADD COLUMN `updated_at` TIMESTAMP(3) NULL DEFAULT NULL AFTER `created_at`,
  ADD COLUMN `created_by` VARCHAR(150) NULL DEFAULT NULL AFTER `updated_at`,
  ADD COLUMN `updated_by` VARCHAR(150) NULL DEFAULT NULL AFTER `created_by`,
  ADD COLUMN `session_timeout_minutes` INT NULL DEFAULT 15 AFTER `updated_by`;

ALTER TABLE `users_session_logs`
  ADD COLUMN `last_activity` DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER `is_invalidated`,
  ADD COLUMN `expires_at` DATETIME NULL DEFAULT NULL AFTER `last_activity`,
  ADD KEY `idx_users_sess_token` (`session_id`),
  ADD KEY `idx_users_sess_last_act` (`last_activity`),
  ADD KEY `idx_users_sess_expires` (`expires_at`);

-- The push subscription JSON is split into its parts; existing rows are converted.
ALTER TABLE `users_web_push_subscriptions`
  ADD COLUMN `endpoint` VARCHAR(500) NOT NULL DEFAULT '' AFTER `user_id`,
  ADD COLUMN `expiration_time` BIGINT NULL DEFAULT NULL AFTER `endpoint`,
  ADD COLUMN `p256dh_key` VARCHAR(255) NOT NULL DEFAULT '' AFTER `expiration_time`,
  ADD COLUMN `auth_key` VARCHAR(255) NOT NULL DEFAULT '' AFTER `p256dh_key`;
UPDATE `users_web_push_subscriptions` SET
  `endpoint` = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`subscription_json`, '$.endpoint')), ''),
  `expiration_time` = JSON_EXTRACT(`subscription_json`, '$.expirationTime'),
  `p256dh_key` = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`subscription_json`, '$.keys.p256dh')), ''),
  `auth_key` = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`subscription_json`, '$.keys.auth')), '')
WHERE JSON_VALID(`subscription_json`);
ALTER TABLE `users_web_push_subscriptions` DROP COLUMN `subscription_json`;

-- users_* seed rows of the users branch (roles, authorities, the users list); INSERT IGNORE keeps rows that already exist.
INSERT IGNORE INTO `users_applications` (`id`, `app_name`, `url_path`, `description`, `icon_class`) VALUES
  (1, 'User Management', '/user-management', 'Kelola semua user dan aplikasi', 'fas fa-users-cog'),
  (2, 'CRM Dashboard', '/crm-dashboard/', 'Sistem Customer Relationship Management & Pembiayaan Liugong', 'fas fa-handshake');
INSERT IGNORE INTO `users_roles` (`id`, `app_id`, `role_name`, `description`) VALUES
  (1, 1, 'Super Admin', 'Full system management access'),
  (2, 2, 'Super Admin', 'Full access to CRM Dashboard'),
  (3, 2, 'Marketing (MKT)', 'Inisiasi aplikasi, customer profile, PIC, kalkulasi pembiayaan, dan pengajuan'),
  (4, 2, 'Business Support (BS)', 'Verifikasi berkas, document desk, validasi kelengkapan awal, dan verifikasi akta'),
  (5, 2, 'Credit Analyst (CA)', 'Analisis kelayakan kredit, spreading laporan keuangan 3 tahun, dan sign off kredit'),
  (6, 2, 'Legal Officer (LEGAL)', 'Analisis dan validasi aspek hukum, akta pendirian, akta perubahan, SK menteri, dan sign off legal'),
  (7, 2, 'Credit Committee', 'Peninjauan komprehensif seluruh seksi aplikasi dan pengambilan keputusan akhir (Approve/Reject)'),
  (8, 2, 'Quality Assurance (QA)', 'mengecek kualitas data'),
  (9, 2, 'Finance', 'mengatur financial'),
  (10, 2, 'Legal Approval', 'Memeriksa dan menyetujui/menolak akta yang diajukan dari tab Legal');
INSERT IGNORE INTO `users_authorities` (`id`, `app_id`, `authority_name`, `description`) VALUES
  (1, 1, 'manage_system', 'Akses Penuh Manajemen Sistem'),
  (2, 1, 'manage_users', 'Mengelola User, Role, dan Otoritas'),
  (3, 2, 'access_crm_dashboard', 'Akses Operasional CRM Dashboard'),
  (4, 2, 'crm_view_overview', 'Melihat tab dan ringkasan metrik Overview CRM'),
  (5, 2, 'crm_view_applications', 'Melihat menu dan daftar pengajuan Applications'),
  (6, 2, 'crm_create_application', 'Membuat draf aplikasi pembiayaan baru (+ New application)'),
  (7, 2, 'crm_view_document_desk', 'Melihat menu dan antrean berkas Document Desk'),
  (8, 2, 'crm_manage_document_desk', 'Mengelola dan memeriksa berkas pada Document Desk'),
  (9, 2, 'crm_view_customers', 'Melihat menu dan database profil Customers'),
  (10, 2, 'crm_manage_customers', 'Menambah, mengedit, dan mengelola database Customers'),
  (11, 2, 'crm_view_master_data', 'Melihat tab dan daftar Customize Master Data'),
  (12, 2, 'crm_manage_master_data', 'Menambah, mengedit, dan mengaktifkan/menonaktifkan Customize Master Data'),
  (13, 2, 'crm_view_notifications', 'Melihat menu dan daftar Notifikasi sistem CRM'),
  (14, 2, 'crm_view_activity', 'Melihat menu riwayat aktivitas (Activity Audit Trail) CRM'),
  (15, 2, 'crm_quick_add_master_option', 'Menambah opsi baru langsung ke master data via tombol \'+ Tambah Pilihan\''),
  (16, 2, 'crm_view_app_customer_pic', 'Melihat seksi 1 (Customer & PIC) pada aplikasi pembiayaan'),
  (17, 2, 'crm_view_app_legal', 'Melihat seksi 2 (Legal & Akta) pada aplikasi pembiayaan'),
  (18, 2, 'crm_view_app_stakeholders', 'Melihat seksi 3 (Stakeholders / Susunan Pengurus) pada aplikasi'),
  (19, 2, 'crm_view_app_business_banks', 'Melihat seksi 4 (Business & Banks / Proyek & Rekening) pada aplikasi'),
  (20, 2, 'crm_view_app_financial', 'Melihat seksi 5 (Financial Statements / Laporan Keuangan) pada aplikasi'),
  (21, 2, 'crm_view_app_documents', 'Melihat seksi 6 (Documents / Berkas Checklist) pada aplikasi'),
  (22, 2, 'crm_view_app_financing_units', 'Melihat seksi rincian pembiayaan & unit alat berat (Equipment Units)'),
  (23, 2, 'crm_view_app_activity', 'Melihat seksi log audit dan riwayat persetujuan aplikasi'),
  (24, 2, 'crm_edit_app_customer_pic', 'Mengedit dan menyimpan perubahan seksi Customer & PIC'),
  (25, 2, 'crm_edit_app_legal', 'Mengedit dan menyimpan data Legal (Akta Pendirian, Perubahan, & SK)'),
  (26, 2, 'crm_edit_app_stakeholders', 'Mengedit dan menyimpan data Stakeholders serta porsi kepemilikan saham'),
  (27, 2, 'crm_edit_app_business_banks', 'Mengedit dan menyimpan kontrak proyek serta fasilitas pinjaman bank'),
  (28, 2, 'crm_edit_app_financing_units', 'Mengedit dan menyimpan ketentuan pembiayaan serta unit alat (Equipment)'),
  (29, 2, 'crm_edit_app_financial', 'Mengedit dan menyimpan spreading laporan keuangan 3 tahun (Balance check)'),
  (30, 2, 'crm_upload_app_documents', 'Mengunggah (upload) file dokumen pendukung aplikasi'),
  (31, 2, 'crm_delete_app_documents', 'Menghapus (delete) file dokumen yang telah diunggah'),
  (32, 2, 'crm_verify_app_documents', 'Melakukan verifikasi (Lolos/Tolak) dokumen checklist per departemen'),
  (33, 2, 'crm_workflow_submit', 'Mengajukan draf aplikasi pembiayaan ke tahap verifikasi berkas (Submit)'),
  (34, 2, 'crm_workflow_verify_documents', 'Menyelesaikan pemeriksaan kelengkapan berkas aplikasi (Complete Verification)'),
  (35, 2, 'crm_workflow_start_review', 'Memulai peninjauan analisis kredit dan legal (Start Review)'),
  (36, 2, 'crm_workflow_recommend_credit', 'Memberikan rekomendasi persetujuan dari sisi analisis kredit (Recommend Credit)'),
  (37, 2, 'crm_workflow_recommend_legal', 'Memberikan rekomendasi persetujuan dari sisi legal (Recommend Legal)'),
  (38, 2, 'crm_workflow_final_decision', 'Memberikan keputusan akhir aplikasi (Approve / Reject)'),
  (39, 2, 'crm_workflow_return', 'Mengembalikan aplikasi ke tahap sebelumnya untuk perbaikan (Return)'),
  (40, 2, 'crm_deed_approve', 'Memeriksa, menyetujui, atau menolak akta yang diajukan (Deed Review)');
INSERT IGNORE INTO `users_role_authorities` (`role_id`, `authority_id`) VALUES
  (1, 1),
  (2, 1),
  (1, 2),
  (2, 2),
  (2, 3),
  (3, 3),
  (4, 3),
  (5, 3),
  (6, 3),
  (7, 3),
  (8, 3),
  (9, 3),
  (10, 3),
  (2, 4),
  (3, 4),
  (4, 4),
  (5, 4),
  (6, 4),
  (7, 4),
  (9, 4),
  (10, 4),
  (2, 5),
  (3, 5),
  (4, 5),
  (5, 5),
  (6, 5),
  (7, 5),
  (8, 5),
  (9, 5),
  (10, 5),
  (2, 6),
  (3, 6),
  (2, 7),
  (4, 7),
  (5, 7),
  (6, 7),
  (7, 7),
  (8, 7),
  (2, 8),
  (4, 8),
  (2, 9),
  (3, 9),
  (4, 9),
  (5, 9),
  (6, 9),
  (7, 9),
  (8, 9),
  (10, 9),
  (2, 10),
  (3, 10),
  (4, 10),
  (2, 11),
  (4, 11),
  (2, 12),
  (4, 12),
  (2, 13),
  (3, 13),
  (4, 13),
  (5, 13),
  (6, 13),
  (7, 13),
  (8, 13),
  (10, 13),
  (2, 14),
  (4, 14),
  (5, 14),
  (6, 14),
  (7, 14),
  (8, 14),
  (10, 14),
  (2, 15),
  (3, 15),
  (4, 15),
  (2, 16),
  (3, 16),
  (4, 16),
  (5, 16),
  (7, 16),
  (8, 16),
  (10, 16),
  (2, 17),
  (3, 17),
  (4, 17),
  (5, 17),
  (6, 17),
  (7, 17),
  (8, 17),
  (10, 17),
  (2, 18),
  (3, 18),
  (4, 18),
  (5, 18),
  (6, 18),
  (7, 18),
  (8, 18),
  (10, 18),
  (2, 19),
  (3, 19),
  (4, 19),
  (5, 19),
  (6, 19),
  (7, 19),
  (8, 19),
  (2, 20),
  (3, 20),
  (4, 20),
  (5, 20),
  (6, 20),
  (7, 20),
  (8, 20),
  (9, 20),
  (2, 21),
  (3, 21),
  (4, 21),
  (5, 21),
  (7, 21),
  (8, 21),
  (9, 21),
  (10, 21),
  (2, 22),
  (3, 22),
  (4, 22),
  (5, 22),
  (7, 22),
  (8, 22),
  (9, 22),
  (2, 23),
  (3, 23),
  (4, 23),
  (5, 23),
  (7, 23),
  (8, 23),
  (9, 23),
  (10, 23),
  (2, 24),
  (3, 24),
  (4, 24),
  (2, 25),
  (3, 25),
  (4, 25),
  (6, 25),
  (2, 26),
  (3, 26),
  (6, 26),
  (2, 27),
  (3, 27),
  (5, 27),
  (9, 27),
  (2, 28),
  (3, 28),
  (9, 28),
  (2, 29),
  (3, 29),
  (5, 29),
  (9, 29),
  (2, 30),
  (3, 30),
  (2, 31),
  (3, 31),
  (2, 32),
  (4, 32),
  (5, 32),
  (2, 33),
  (3, 33),
  (2, 34),
  (3, 34),
  (4, 34),
  (2, 35),
  (4, 35),
  (5, 35),
  (8, 35),
  (2, 36),
  (5, 36),
  (2, 37),
  (6, 37),
  (2, 38),
  (7, 38),
  (2, 39),
  (4, 39),
  (5, 39),
  (6, 39),
  (7, 39),
  (2, 40),
  (6, 40),
  (10, 40);
INSERT IGNORE INTO `users_departments` (`dept_id`, `department_code`, `department_name`, `description`, `is_active`) VALUES
  (1, 'IT', 'Information Technology', NULL, 1),
  (2, 'MANAGEMENT', 'Management', NULL, 1),
  (3, 'MKT', 'Marketing', NULL, 1),
  (4, 'LEGAL', 'Legal', NULL, 1);
INSERT IGNORE INTO `users_users` (`id`, `username`, `password_hash`, `full_name`, `position`, `dept_id`, `email`, `phone`, `is_active`, `is_admin`, `is_placeholder`, `force_logout_at`, `last_login_at`, `created_at`, `updated_at`, `created_by`, `updated_by`, `session_timeout_minutes`) VALUES
  (1, 'admin', 'scrypt:32768:8:1$NjYHO4cM7fc1JtIn$727e85e62d6e56c9768d0967525c016e0d5f4fd84441129d9e3558230e80234c2260de39ee8f94a263e19a8ff04bb14a6dc5f8b1dc399aad8d19c04310de0511', 'System Admin', 'Administrator', 1, 'admin@liugong.co.id', NULL, 1, 1, 0, NULL, '2026-11-12 06:28:16.000', '2026-11-12 01:18:30.000', '2026-11-13 01:57:40.329', NULL, NULL, 0),
  (2, 'axel@liugongfinance.com', 'scrypt:32768:8:1$slUT53YRJXzXAfEv$9df8f642b06fcfc8b64e67a578e230b85943a5c1513056f32e7143cae11483c880a36a890b85c0d424c67a5d463085e08a8c3cdd7365938ed40a8b498dad48a7', 'Axel Matthew', 'ASD', 2, 'axel@liugong.com', NULL, 1, 1, 0, NULL, NULL, '2026-11-12 01:18:30.000', NULL, NULL, NULL, 60),
  (3, 'testmkt', 'scrypt:32768:8:1$Rc2oSTBpzwJi7OwP$86e0e5da036bcd477fc2aa26e862a94e99fb97a1cf9c9f4a003d8c2219477c647d6a132899b375a8f52e21620ccfdcdc63b36443b5705e8882741547ce137057', 'Mkt', 'mkt', 3, 'mkt@liugong.com', NULL, 1, 0, 0, NULL, '2026-11-12 03:23:34.000', '2026-11-12 01:18:30.000', '2026-11-12 03:23:38.649', NULL, NULL, 60),
  (4, 'testlegal', 'scrypt:32768:8:1$tXFJpDUZ7pgiF5Gj$319d9a255a53779b400801b1196559d8c26057e3ec1c67bcc22802d5457242b0f4b5fe534475c7aed63480bb45fa7e217f6886ec131b6e00bb751bd98100ca22', 'Legal', 'Legal', 4, 'legal@liugong.com', NULL, 1, 0, 0, NULL, '2026-11-12 03:23:34.000', '2026-11-12 01:18:30.000', '2026-11-12 03:23:36.842', NULL, NULL, 60);
INSERT IGNORE INTO `users_user_app_roles` (`user_id`, `app_id`, `role_id`) VALUES
  (1, 1, 1),
  (2, 1, 1),
  (1, 2, 2),
  (2, 2, 2),
  (3, 2, 3),
  (4, 2, 6);

-- ---------------------------------------------------------------------
-- Part 5. Business partners (the customer master keeps its name crm_master_business_partners): partner_code becomes
-- code, customer_relationship is dropped (the New / Existing choice stays on crm_applications.customer_category), and
-- crm_applications.customer_id becomes business_partner_id (named after the table it points at).
-- ---------------------------------------------------------------------
ALTER TABLE `crm_master_business_partners`
  DROP INDEX `uk_mbp_partner_code`,
  CHANGE COLUMN `partner_code` `code` VARCHAR(50) NULL DEFAULT NULL,
  DROP COLUMN `customer_relationship`,
  ADD UNIQUE KEY `uk_mbp_code` (`code`);
ALTER TABLE `crm_applications` DROP FOREIGN KEY `fk_app_customer`;
ALTER TABLE `crm_applications`
  RENAME COLUMN `customer_id` TO `business_partner_id`,
  RENAME INDEX `idx_app_customer` TO `idx_app_business_partner`;
ALTER TABLE `crm_applications`
  ADD CONSTRAINT `fk_app_business_partner` FOREIGN KEY (`business_partner_id`) REFERENCES `crm_master_business_partners` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- Part 6. Codes: no empty codes, and hyphens instead of underscores in the workflow layer.
-- ---------------------------------------------------------------------
-- crm_master_provinces: every row gets a code built from its name (upper-case, hyphens); a repeated name gets -2, -3...
UPDATE `crm_master_provinces` t JOIN (
  SELECT id, CONCAT(base, IF(rn > 1, CONCAT('-', rn), '')) AS new_code FROM (
    SELECT id, base, ROW_NUMBER() OVER (PARTITION BY base ORDER BY id) AS rn FROM (
      SELECT id, LEFT(COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(UPPER(TRIM(`name`)), '[^A-Z0-9]+', '-')), ''), 'ITEM'), 44) AS base
      FROM `crm_master_provinces` WHERE `code` IS NULL OR TRIM(`code`) = ''
    ) x
  ) y
) z ON z.id = t.id SET t.`code` = z.new_code;
-- crm_master_cities: every row gets a code built from its name (upper-case, hyphens); a repeated name gets -2, -3...
UPDATE `crm_master_cities` t JOIN (
  SELECT id, CONCAT(base, IF(rn > 1, CONCAT('-', rn), '')) AS new_code FROM (
    SELECT id, base, ROW_NUMBER() OVER (PARTITION BY base ORDER BY id) AS rn FROM (
      SELECT id, LEFT(COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(UPPER(TRIM(`name`)), '[^A-Z0-9]+', '-')), ''), 'ITEM'), 44) AS base
      FROM `crm_master_cities` WHERE `code` IS NULL OR TRIM(`code`) = ''
    ) x
  ) y
) z ON z.id = t.id SET t.`code` = z.new_code;
-- crm_master_districts: every row gets a code built from its name (upper-case, hyphens); a repeated name gets -2, -3...
UPDATE `crm_master_districts` t JOIN (
  SELECT id, CONCAT(base, IF(rn > 1, CONCAT('-', rn), '')) AS new_code FROM (
    SELECT id, base, ROW_NUMBER() OVER (PARTITION BY base ORDER BY id) AS rn FROM (
      SELECT id, LEFT(COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(UPPER(TRIM(`name`)), '[^A-Z0-9]+', '-')), ''), 'ITEM'), 44) AS base
      FROM `crm_master_districts` WHERE `code` IS NULL OR TRIM(`code`) = ''
    ) x
  ) y
) z ON z.id = t.id SET t.`code` = z.new_code;
-- crm_master_villages: every row gets a code built from its name (upper-case, hyphens); a repeated name gets -2, -3...
UPDATE `crm_master_villages` t JOIN (
  SELECT id, CONCAT(base, IF(rn > 1, CONCAT('-', rn), '')) AS new_code FROM (
    SELECT id, base, ROW_NUMBER() OVER (PARTITION BY base ORDER BY id) AS rn FROM (
      SELECT id, LEFT(COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(UPPER(TRIM(`name`)), '[^A-Z0-9]+', '-')), ''), 'ITEM'), 44) AS base
      FROM `crm_master_villages` WHERE `code` IS NULL OR TRIM(`code`) = ''
    ) x
  ) y
) z ON z.id = t.id SET t.`code` = z.new_code;
-- crm_master_business_partners: every row gets a code built from its name (upper-case, hyphens); a repeated name gets -2, -3...
UPDATE `crm_master_business_partners` t JOIN (
  SELECT id, CONCAT(base, IF(rn > 1, CONCAT('-', rn), '')) AS new_code FROM (
    SELECT id, base, ROW_NUMBER() OVER (PARTITION BY base ORDER BY id) AS rn FROM (
      SELECT id, LEFT(COALESCE(NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(UPPER(TRIM(`company_name`)), '[^A-Z0-9]+', '-')), ''), 'ITEM'), 44) AS base
      FROM `crm_master_business_partners` WHERE `code` IS NULL OR TRIM(`code`) = ''
    ) x
  ) y
) z ON z.id = t.id SET t.`code` = z.new_code;

-- Workflow layer codes use hyphens: the stage codes (and the approval stage codes they follow), the form code and the field codes.
UPDATE `crm_master_workflow_stages` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_workflow_stages` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_workflow_stage_groups` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_workflow_stages` SET `form_code` = REPLACE(`form_code`, '_', '-') WHERE `form_code` LIKE '%\_%';
UPDATE `crm_master_form_fields` SET `form_code` = REPLACE(`form_code`, '_', '-'), `code` = REPLACE(`code`, '_', '-');
UPDATE `crm_application_activity_logs` SET `stage_code` = REPLACE(`stage_code`, '_', '-') WHERE `stage_code` LIKE '%\_%';
UPDATE `crm_frozen_fap_applications` SET `stage_code_at_freeze` = REPLACE(`stage_code_at_freeze`, '_', '-') WHERE `stage_code_at_freeze` LIKE '%\_%';
-- the activation snapshots (JSON) name stages, forms and fields by code
UPDATE `crm_workflow_activation_logs` SET
  `workflow_json` = CAST(REGEXP_REPLACE(CAST(`workflow_json` AS CHAR), '(FAP|PRE)_(STAGE|FORM|ANALYSIS)', '$1-$2') AS JSON),
  `previous_workflow_json` = CAST(REGEXP_REPLACE(CAST(`previous_workflow_json` AS CHAR), '(FAP|PRE)_(STAGE|FORM|ANALYSIS)', '$1-$2') AS JSON);

-- ---------------------------------------------------------------------
-- Part 7. Master codes use hyphens, not underscores (SUBMITTED_TO_BS becomes SUBMITTED-TO-BS). The frozen FAP history and the
-- activity log keep the codes they copied, so they follow. Transition action codes and role codes (domain constants used in
-- the program) are not changed. The frozen application also names its source business partner like the table.
-- ---------------------------------------------------------------------
ALTER TABLE `crm_frozen_fap_applications` RENAME COLUMN `source_customer_id` TO `source_business_partner_id`;
UPDATE `crm_master_business_categories` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_business_roles` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_document_types` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_equipment_types` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_facility_purposes` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_fap_document_requirements` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_financial_institutions` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_financing_methods` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_financing_purpose_options` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_industry_segments` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_legal_designations` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_legal_remark_categories` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_legal_representative_types` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_payment_timings` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_pic_positions` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_project_roles` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_reject_reason_codes` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_stakeholder_positions` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_master_workflow_statuses` SET `code` = REPLACE(`code`, '_', '-') WHERE `code` LIKE '%\_%';
UPDATE `crm_frozen_fap_applications` SET `business_category_code` = REPLACE(`business_category_code`, '_', '-') WHERE `business_category_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_applications` SET `branch_code` = REPLACE(`branch_code`, '_', '-') WHERE `branch_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_applications` SET `premise_status_code` = REPLACE(`premise_status_code`, '_', '-') WHERE `premise_status_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_applications` SET `country_code` = REPLACE(`country_code`, '_', '-') WHERE `country_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_applications` SET `industry_segment_code` = REPLACE(`industry_segment_code`, '_', '-') WHERE `industry_segment_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_applications` SET `business_role_code` = REPLACE(`business_role_code`, '_', '-') WHERE `business_role_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_bank_facilities` SET `institution_code` = REPLACE(`institution_code`, '_', '-') WHERE `institution_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_bank_facilities` SET `currency_code` = REPLACE(`currency_code`, '_', '-') WHERE `currency_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_doc_requirements` SET `requirement_code` = REPLACE(`requirement_code`, '_', '-') WHERE `requirement_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_document_checklists` SET `document_code` = REPLACE(`document_code`, '_', '-') WHERE `document_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_equipment_units` SET `unit_category_code` = REPLACE(`unit_category_code`, '_', '-') WHERE `unit_category_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_equipment_units` SET `brand_code` = REPLACE(`brand_code`, '_', '-') WHERE `brand_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_equipment_units` SET `unit_type_code` = REPLACE(`unit_type_code`, '_', '-') WHERE `unit_type_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_equipment_units` SET `model_code` = REPLACE(`model_code`, '_', '-') WHERE `model_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_equipment_units` SET `asset_code` = REPLACE(`asset_code`, '_', '-') WHERE `asset_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_financing_proposals` SET `facility_purpose_code` = REPLACE(`facility_purpose_code`, '_', '-') WHERE `facility_purpose_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_financing_proposals` SET `financing_method_code` = REPLACE(`financing_method_code`, '_', '-') WHERE `financing_method_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_financing_proposals` SET `currency_code` = REPLACE(`currency_code`, '_', '-') WHERE `currency_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_financing_proposals` SET `payment_timing_code` = REPLACE(`payment_timing_code`, '_', '-') WHERE `payment_timing_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_financing_proposals` SET `application_source_code` = REPLACE(`application_source_code`, '_', '-') WHERE `application_source_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_financing_purposes` SET `purpose_code` = REPLACE(`purpose_code`, '_', '-') WHERE `purpose_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_legal_deed_remark_categories` SET `category_code` = REPLACE(`category_code`, '_', '-') WHERE `category_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_legal_stakeholders` SET `representative_type_code` = REPLACE(`representative_type_code`, '_', '-') WHERE `representative_type_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_legal_stakeholders` SET `position_code` = REPLACE(`position_code`, '_', '-') WHERE `position_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_legal_stakeholders` SET `designation_code` = REPLACE(`designation_code`, '_', '-') WHERE `designation_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_primary_contacts` SET `position_code` = REPLACE(`position_code`, '_', '-') WHERE `position_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_project_contracts` SET `project_role_code` = REPLACE(`project_role_code`, '_', '-') WHERE `project_role_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_proposal_terms` SET `financing_method_code` = REPLACE(`financing_method_code`, '_', '-') WHERE `financing_method_code` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_frozen_fap_applications` SET `status_code_at_freeze` = REPLACE(`status_code_at_freeze`, '_', '-') WHERE `status_code_at_freeze` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_application_activity_logs` SET `previous_status` = REPLACE(`previous_status`, '_', '-') WHERE `previous_status` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_application_activity_logs` SET `new_status` = REPLACE(`new_status`, '_', '-') WHERE `new_status` IN ('AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT_OTHER', 'AMENDMENT_SHARE_CHANGE', 'AUDITED_FINANCIAL_STATEMENTS', 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED_SIGNATORY', 'BANK_BCA', 'BANK_BNI', 'BANK_BRI', 'BANK_FINANCING_FACILITY', 'BANK_HSBC', 'BANK_MANDIRI', 'BANK_STATEMENTS', 'BOARD_OF_DIRECTORS', 'BS_VERIFIED', 'BUSINESS_ACTIVITY', 'COMPANY_PROFILE', 'CONS_OWNER', 'COPY_ID_BOD_SHAREHOLDER', 'CREDIT_COMMITTEE_REVIEW', 'DECREE_MINISTRY_OF_LAW', 'DEED_ESTABLISHMENT', 'ERR_KTP_NPWP_INVALID', 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR_MANDATORY_DOC_EXPIRED', 'ERR_OTHER', 'ERR_SHAREHOLDER_MISMATCH', 'ERR_SK_MENKUMHAM_MISSING', 'ESTABLISHMENT_DEED', 'FINANCE_DIRECTOR', 'FINANCIAL_LEASE', 'HYDRAULIC_EXCAVATOR', 'INSTALLMENT_FINANCING', 'IN_ADVANCE', 'IN_ARREAR', 'IN_CA_LEGAL_REVIEW', 'LEGAL_OPINION', 'LIST_OF_FIXED_ASSETS', 'LIUGONG_USER', 'MAIN_COMMISSIONER', 'MAIN_CONTRACTOR', 'MAIN_DIRECTOR', 'OIL_AND_GAS', 'PRESIDENT_DIRECTOR', 'PRODUCTION_REPORT', 'PROJECT_CONTRACTS', 'PROJECT_CO_OWNER', 'PROJECT_OWNER', 'SALE_AND_LEASE_BACK', 'SUBMITTED_TO_BS', 'SUB_CONT', 'WAKIL_MANAGER', 'WORKING_CAPITAL');
UPDATE `crm_application_activity_logs` SET `title` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`title`, 'AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT-ARTICLES-CHANGE'), 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT-BUSINESS-ACTIVITY-CHANGE'), 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT-MANAGEMENT-CHANGE'), 'AMENDMENT_OTHER', 'AMENDMENT-OTHER'), 'AMENDMENT_SHARE_CHANGE', 'AMENDMENT-SHARE-CHANGE'), 'AUDITED_FINANCIAL_STATEMENTS', 'AUDITED-FINANCIAL-STATEMENTS'), 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED-REPRESENTATIVE'), 'AUTHORIZED_SIGNATORY', 'AUTHORIZED-SIGNATORY'), 'BANK_BCA', 'BANK-BCA'), 'BANK_BNI', 'BANK-BNI'), 'BANK_BRI', 'BANK-BRI'), 'BANK_FINANCING_FACILITY', 'BANK-FINANCING-FACILITY'), 'BANK_HSBC', 'BANK-HSBC'), 'BANK_MANDIRI', 'BANK-MANDIRI'), 'BANK_STATEMENTS', 'BANK-STATEMENTS'), 'BOARD_OF_DIRECTORS', 'BOARD-OF-DIRECTORS'), 'BS_VERIFIED', 'BS-VERIFIED'), 'BUSINESS_ACTIVITY', 'BUSINESS-ACTIVITY'), 'COMPANY_PROFILE', 'COMPANY-PROFILE'), 'CONS_OWNER', 'CONS-OWNER'), 'COPY_ID_BOD_SHAREHOLDER', 'COPY-ID-BOD-SHAREHOLDER'), 'CREDIT_COMMITTEE_REVIEW', 'CREDIT-COMMITTEE-REVIEW'), 'DECREE_MINISTRY_OF_LAW', 'DECREE-MINISTRY-OF-LAW'), 'DEED_ESTABLISHMENT', 'DEED-ESTABLISHMENT'), 'ERR_KTP_NPWP_INVALID', 'ERR-KTP-NPWP-INVALID'), 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR-LEGAL-DEED-INCOMPLETE'), 'ERR_MANDATORY_DOC_EXPIRED', 'ERR-MANDATORY-DOC-EXPIRED'), 'ERR_OTHER', 'ERR-OTHER'), 'ERR_SHAREHOLDER_MISMATCH', 'ERR-SHAREHOLDER-MISMATCH'), 'ERR_SK_MENKUMHAM_MISSING', 'ERR-SK-MENKUMHAM-MISSING'), 'ESTABLISHMENT_DEED', 'ESTABLISHMENT-DEED'), 'FINANCE_DIRECTOR', 'FINANCE-DIRECTOR'), 'FINANCIAL_LEASE', 'FINANCIAL-LEASE'), 'HYDRAULIC_EXCAVATOR', 'HYDRAULIC-EXCAVATOR'), 'INSTALLMENT_FINANCING', 'INSTALLMENT-FINANCING'), 'IN_ADVANCE', 'IN-ADVANCE'), 'IN_ARREAR', 'IN-ARREAR'), 'IN_CA_LEGAL_REVIEW', 'IN-CA-LEGAL-REVIEW'), 'LEGAL_OPINION', 'LEGAL-OPINION'), 'LIST_OF_FIXED_ASSETS', 'LIST-OF-FIXED-ASSETS'), 'LIUGONG_USER', 'LIUGONG-USER'), 'MAIN_COMMISSIONER', 'MAIN-COMMISSIONER'), 'MAIN_CONTRACTOR', 'MAIN-CONTRACTOR'), 'MAIN_DIRECTOR', 'MAIN-DIRECTOR'), 'OIL_AND_GAS', 'OIL-AND-GAS'), 'PRESIDENT_DIRECTOR', 'PRESIDENT-DIRECTOR'), 'PRODUCTION_REPORT', 'PRODUCTION-REPORT'), 'PROJECT_CONTRACTS', 'PROJECT-CONTRACTS'), 'PROJECT_CO_OWNER', 'PROJECT-CO-OWNER'), 'PROJECT_OWNER', 'PROJECT-OWNER'), 'SALE_AND_LEASE_BACK', 'SALE-AND-LEASE-BACK'), 'SUBMITTED_TO_BS', 'SUBMITTED-TO-BS'), 'SUB_CONT', 'SUB-CONT'), 'WAKIL_MANAGER', 'WAKIL-MANAGER'), 'WORKING_CAPITAL', 'WORKING-CAPITAL') WHERE `title` REGEXP 'AMENDMENT_ARTICLES_CHANGE|AMENDMENT_BUSINESS_ACTIVITY_CHANGE|AMENDMENT_MANAGEMENT_CHANGE|AMENDMENT_OTHER|AMENDMENT_SHARE_CHANGE|AUDITED_FINANCIAL_STATEMENTS|AUTHORIZED_REPRESENTATIVE|AUTHORIZED_SIGNATORY|BANK_BCA|BANK_BNI|BANK_BRI|BANK_FINANCING_FACILITY|BANK_HSBC|BANK_MANDIRI|BANK_STATEMENTS|BOARD_OF_DIRECTORS|BS_VERIFIED|BUSINESS_ACTIVITY|COMPANY_PROFILE|CONS_OWNER|COPY_ID_BOD_SHAREHOLDER|CREDIT_COMMITTEE_REVIEW|DECREE_MINISTRY_OF_LAW|DEED_ESTABLISHMENT|ERR_KTP_NPWP_INVALID|ERR_LEGAL_DEED_INCOMPLETE|ERR_MANDATORY_DOC_EXPIRED|ERR_OTHER|ERR_SHAREHOLDER_MISMATCH|ERR_SK_MENKUMHAM_MISSING|ESTABLISHMENT_DEED|FINANCE_DIRECTOR|FINANCIAL_LEASE|HYDRAULIC_EXCAVATOR|INSTALLMENT_FINANCING|IN_ADVANCE|IN_ARREAR|IN_CA_LEGAL_REVIEW|LEGAL_OPINION|LIST_OF_FIXED_ASSETS|LIUGONG_USER|MAIN_COMMISSIONER|MAIN_CONTRACTOR|MAIN_DIRECTOR|OIL_AND_GAS|PRESIDENT_DIRECTOR|PRODUCTION_REPORT|PROJECT_CONTRACTS|PROJECT_CO_OWNER|PROJECT_OWNER|SALE_AND_LEASE_BACK|SUBMITTED_TO_BS|SUB_CONT|WAKIL_MANAGER|WORKING_CAPITAL';
UPDATE `crm_application_activity_logs` SET `details` = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`details`, 'AMENDMENT_ARTICLES_CHANGE', 'AMENDMENT-ARTICLES-CHANGE'), 'AMENDMENT_BUSINESS_ACTIVITY_CHANGE', 'AMENDMENT-BUSINESS-ACTIVITY-CHANGE'), 'AMENDMENT_MANAGEMENT_CHANGE', 'AMENDMENT-MANAGEMENT-CHANGE'), 'AMENDMENT_OTHER', 'AMENDMENT-OTHER'), 'AMENDMENT_SHARE_CHANGE', 'AMENDMENT-SHARE-CHANGE'), 'AUDITED_FINANCIAL_STATEMENTS', 'AUDITED-FINANCIAL-STATEMENTS'), 'AUTHORIZED_REPRESENTATIVE', 'AUTHORIZED-REPRESENTATIVE'), 'AUTHORIZED_SIGNATORY', 'AUTHORIZED-SIGNATORY'), 'BANK_BCA', 'BANK-BCA'), 'BANK_BNI', 'BANK-BNI'), 'BANK_BRI', 'BANK-BRI'), 'BANK_FINANCING_FACILITY', 'BANK-FINANCING-FACILITY'), 'BANK_HSBC', 'BANK-HSBC'), 'BANK_MANDIRI', 'BANK-MANDIRI'), 'BANK_STATEMENTS', 'BANK-STATEMENTS'), 'BOARD_OF_DIRECTORS', 'BOARD-OF-DIRECTORS'), 'BS_VERIFIED', 'BS-VERIFIED'), 'BUSINESS_ACTIVITY', 'BUSINESS-ACTIVITY'), 'COMPANY_PROFILE', 'COMPANY-PROFILE'), 'CONS_OWNER', 'CONS-OWNER'), 'COPY_ID_BOD_SHAREHOLDER', 'COPY-ID-BOD-SHAREHOLDER'), 'CREDIT_COMMITTEE_REVIEW', 'CREDIT-COMMITTEE-REVIEW'), 'DECREE_MINISTRY_OF_LAW', 'DECREE-MINISTRY-OF-LAW'), 'DEED_ESTABLISHMENT', 'DEED-ESTABLISHMENT'), 'ERR_KTP_NPWP_INVALID', 'ERR-KTP-NPWP-INVALID'), 'ERR_LEGAL_DEED_INCOMPLETE', 'ERR-LEGAL-DEED-INCOMPLETE'), 'ERR_MANDATORY_DOC_EXPIRED', 'ERR-MANDATORY-DOC-EXPIRED'), 'ERR_OTHER', 'ERR-OTHER'), 'ERR_SHAREHOLDER_MISMATCH', 'ERR-SHAREHOLDER-MISMATCH'), 'ERR_SK_MENKUMHAM_MISSING', 'ERR-SK-MENKUMHAM-MISSING'), 'ESTABLISHMENT_DEED', 'ESTABLISHMENT-DEED'), 'FINANCE_DIRECTOR', 'FINANCE-DIRECTOR'), 'FINANCIAL_LEASE', 'FINANCIAL-LEASE'), 'HYDRAULIC_EXCAVATOR', 'HYDRAULIC-EXCAVATOR'), 'INSTALLMENT_FINANCING', 'INSTALLMENT-FINANCING'), 'IN_ADVANCE', 'IN-ADVANCE'), 'IN_ARREAR', 'IN-ARREAR'), 'IN_CA_LEGAL_REVIEW', 'IN-CA-LEGAL-REVIEW'), 'LEGAL_OPINION', 'LEGAL-OPINION'), 'LIST_OF_FIXED_ASSETS', 'LIST-OF-FIXED-ASSETS'), 'LIUGONG_USER', 'LIUGONG-USER'), 'MAIN_COMMISSIONER', 'MAIN-COMMISSIONER'), 'MAIN_CONTRACTOR', 'MAIN-CONTRACTOR'), 'MAIN_DIRECTOR', 'MAIN-DIRECTOR'), 'OIL_AND_GAS', 'OIL-AND-GAS'), 'PRESIDENT_DIRECTOR', 'PRESIDENT-DIRECTOR'), 'PRODUCTION_REPORT', 'PRODUCTION-REPORT'), 'PROJECT_CONTRACTS', 'PROJECT-CONTRACTS'), 'PROJECT_CO_OWNER', 'PROJECT-CO-OWNER'), 'PROJECT_OWNER', 'PROJECT-OWNER'), 'SALE_AND_LEASE_BACK', 'SALE-AND-LEASE-BACK'), 'SUBMITTED_TO_BS', 'SUBMITTED-TO-BS'), 'SUB_CONT', 'SUB-CONT'), 'WAKIL_MANAGER', 'WAKIL-MANAGER'), 'WORKING_CAPITAL', 'WORKING-CAPITAL') WHERE `details` REGEXP 'AMENDMENT_ARTICLES_CHANGE|AMENDMENT_BUSINESS_ACTIVITY_CHANGE|AMENDMENT_MANAGEMENT_CHANGE|AMENDMENT_OTHER|AMENDMENT_SHARE_CHANGE|AUDITED_FINANCIAL_STATEMENTS|AUTHORIZED_REPRESENTATIVE|AUTHORIZED_SIGNATORY|BANK_BCA|BANK_BNI|BANK_BRI|BANK_FINANCING_FACILITY|BANK_HSBC|BANK_MANDIRI|BANK_STATEMENTS|BOARD_OF_DIRECTORS|BS_VERIFIED|BUSINESS_ACTIVITY|COMPANY_PROFILE|CONS_OWNER|COPY_ID_BOD_SHAREHOLDER|CREDIT_COMMITTEE_REVIEW|DECREE_MINISTRY_OF_LAW|DEED_ESTABLISHMENT|ERR_KTP_NPWP_INVALID|ERR_LEGAL_DEED_INCOMPLETE|ERR_MANDATORY_DOC_EXPIRED|ERR_OTHER|ERR_SHAREHOLDER_MISMATCH|ERR_SK_MENKUMHAM_MISSING|ESTABLISHMENT_DEED|FINANCE_DIRECTOR|FINANCIAL_LEASE|HYDRAULIC_EXCAVATOR|INSTALLMENT_FINANCING|IN_ADVANCE|IN_ARREAR|IN_CA_LEGAL_REVIEW|LEGAL_OPINION|LIST_OF_FIXED_ASSETS|LIUGONG_USER|MAIN_COMMISSIONER|MAIN_CONTRACTOR|MAIN_DIRECTOR|OIL_AND_GAS|PRESIDENT_DIRECTOR|PRODUCTION_REPORT|PROJECT_CONTRACTS|PROJECT_CO_OWNER|PROJECT_OWNER|SALE_AND_LEASE_BACK|SUBMITTED_TO_BS|SUB_CONT|WAKIL_MANAGER|WORKING_CAPITAL';

-- ---------------------------------------------------------------------
-- Part 8. Whether a checklist document is mandatory follows the workflow, so the checklist no longer stores it: the override of
-- the application, else the workflow stage document, else the document master (the values were identical on every row).
-- ---------------------------------------------------------------------
ALTER TABLE `crm_application_document_checklists` DROP COLUMN `is_mandatory`;

-- ---------------------------------------------------------------------
-- Part 9. Whether a document is active and mandatory, and which department owns it, follow the workflow: the document master
-- (crm_master_document_types) no longer has department_code, is_mandatory or is_active. A checklist row takes its department
-- from the override, else from the department of its stage.
-- ---------------------------------------------------------------------
ALTER TABLE `crm_master_document_types` DROP COLUMN `department_code`, DROP COLUMN `is_mandatory`, DROP COLUMN `is_active`;

-- ---------------------------------------------------------------------
-- Part 10. A group, stage, field or document is in a workflow or it is not: the workflow itself is DRAFT, ACTIVE or INACTIVE
-- (crm_workflows.status), so the parts inside it have no is_active of their own (it was 1 on every row).
-- ---------------------------------------------------------------------
ALTER TABLE `crm_workflow_stage_groups` DROP COLUMN `is_active`;
ALTER TABLE `crm_workflow_stages` DROP COLUMN `is_active`;
ALTER TABLE `crm_workflow_stage_fields` DROP COLUMN `is_active`;
ALTER TABLE `crm_workflow_stage_documents` DROP COLUMN `is_active`;
ALTER TABLE `crm_master_form_fields` DROP COLUMN `is_active`;

-- ---------------------------------------------------------------------
-- Part 11. Columns nothing uses: a workflow is never deleted (it is deactivated), and the stage progress has no started_at.
-- ---------------------------------------------------------------------
ALTER TABLE `crm_workflows` DROP COLUMN `deleted_at`, DROP COLUMN `deleted_by`;
ALTER TABLE `crm_application_stage_progress` DROP COLUMN `started_at`;

-- ---------------------------------------------------------------------
-- Part 12. The terms of a financing proposal live on crm_fap_financing_proposals (one proposal, one financing method): the
-- per-method terms table and its frozen copy are dropped. The form shows only the terms of the chosen method.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `crm_frozen_fap_proposal_terms`;
DROP TABLE IF EXISTS `crm_fap_proposal_terms`;

SET FOREIGN_KEY_CHECKS = 1;
