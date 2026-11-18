-- =====================================================================
-- plan-schema.sql : approval layer inside the modular workflow (PLAN, not applied yet)
-- Continues from current-schema.sql (crm_liugong, MySQL 8). Run ONCE, after the database is in the state of current-schema.sql.
-- Design source: approval-added.xlsx. Nothing in the users_* tables is touched: users are referenced by id only.
--
-- What the approval layer is
--   * It replaces the global status machine (crm_master_workflow: DRAFT > SUBMITTED-TO-BS > ... > APPROVED / REJECTED).
--   * A workflow defines approval STEPS. A step belongs to a stage group, to a stage or to one document of a stage (the admin chooses),
--     and has a sort_order: the same sort_order runs in parallel, the next sort_order waits for all of the previous one.
--   * WHO approves is only an AUTHORITY, no department or role rule and nobody picked per application: whoever holds the authority of
--     the step can act, and the system notifies all of them. The authority is CHOSEN from the authorities that already exist in User
--     Management (users_authorities, the CRM ones), it is not made up from the workflow: e.g. crm_workflow_verify_documents for Business
--     Support, crm_workflow_recommend_credit for Credit Analyst, crm_workflow_recommend_legal for Legal, crm_workflow_final_decision for
--     the credit committee. Several steps may use the same authority.
--   * An approver can only APPROVE or REJECT. REJECT needs remarks. One APPROVE completes a step, one REJECT rejects it. After a reject the
--     application goes back to the stage that failed and is submitted again; the approval of that stage / group / document then
--     starts again from its first step (a new round).
--   * A decision is marked WEB or LARK (an approver can also act from a Lark message, matched to the user by email).
--   * The application has a PIC marketing (one user, set when the application is entered, a label afterwards). The approval request of
--     a step can be sent to the Lark / email of that PIC; the other steps notify everyone holding the step's authority.
--
-- Part 0  DATA: delete every application and the test workflows (the old status machine goes away, so old applications cannot stay)
-- Part 1  CREATE the approval tables (steps, rounds, decisions) and the table of authorities a place may use
-- Part 2  ALTER the tables that pointed at the old status machine (stage progress, master document types, applications), add
--         crm_applications.mkt_pic_id (PIC marketing) and drop the maker columns
-- Part 3  DROP the old status machine: crm_master_workflow, crm_master_workflow_statuses, crm_master_workflow_stages,
--         crm_master_reject_reason_codes, crm_application_stage_transitions, crm_application_signoffs
-- Part 4  DATA: the approval steps of the default workflow (the old process: BS verifies, CA and Legal recommend, the committee decides)
-- =====================================================================
USE `crm_liugong`;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- Part 0. Data. Every application is deleted (what hangs on it goes with it through ON DELETE CASCADE: FAP data, documents, progress,
-- activity, notifications), and so are the test workflows. The default workflow stays. The frozen FAP copies have no foreign key to
-- the application (source_application_id is a plain column) and RESTRICT among themselves, so they are emptied by name, detail
-- tables first. The cascades only run with foreign key checks ON, so the first and the third statement run before checks go off.
-- ---------------------------------------------------------------------
DELETE FROM `crm_applications`;
DELETE FROM `crm_frozen_fap_ocr_discrepancies`;
DELETE FROM `crm_frozen_fap_document_checklists`;
DELETE FROM `crm_frozen_fap_doc_requirements`;
DELETE FROM `crm_frozen_fap_legal_deed_remark_categories`;
DELETE FROM `crm_frozen_fap_legal_stakeholders`;
DELETE FROM `crm_frozen_fap_legal_deeds`;
DELETE FROM `crm_frozen_fap_bank_facilities`;
DELETE FROM `crm_frozen_fap_equipment_units`;
DELETE FROM `crm_frozen_fap_financial_statements`;
DELETE FROM `crm_frozen_fap_financing_proposals`;
DELETE FROM `crm_frozen_fap_financing_purposes`;
DELETE FROM `crm_frozen_fap_primary_contacts`;
DELETE FROM `crm_frozen_fap_project_contracts`;
DELETE FROM `crm_frozen_fap_applications`;
-- stages first: they point at their group with RESTRICT, so a workflow delete (which cascades to its groups) would be blocked
DELETE FROM `crm_workflow_stages` WHERE `workflow_code` <> 'DEFAULT-WORKFLOW';
DELETE FROM `crm_workflows` WHERE `code` <> 'DEFAULT-WORKFLOW';

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Part 1. New tables
-- ---------------------------------------------------------------------

-- Approval steps of a workflow (the template). scope_type says what the step approves: GROUP (a whole stage group, stage_group_id is
-- set), STAGE (one stage, stage_id is set) or DOCUMENT (one document of a stage, workflow_stage_document_id is set; every workflow
-- document belongs to a stage). The backend checks that only the id of the scope is set.
-- Steps with the same sort_order inside the same scope run in parallel; the next sort_order starts when all of them are approved.
-- WHO may approve is only an authority: authority_name is the name of an existing users_authorities row, picked by the administrator in the
-- workflow editor (the CRM never writes users_*, so it is a name, not a foreign key; the backend checks it exists when the workflow is saved).
-- Anyone holding the authority can act. Several steps may name the same authority.
CREATE TABLE IF NOT EXISTS `crm_workflow_approval_steps` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workflow_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_type` enum('GROUP','STAGE','DOCUMENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_group_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stage_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `workflow_stage_document_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `group_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_code` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '1',
  `authority_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wf_apstep_code` (`workflow_code`, `code`),
  KEY `idx_wf_apstep_order` (`workflow_code`, `scope_type`, `sort_order`),
  KEY `idx_wf_apstep_authority_name` (`authority_name`),
  KEY `fk_wf_apstep_group` (`stage_group_id`, `workflow_code`),
  KEY `fk_wf_apstep_stage` (`stage_id`, `workflow_code`),
  KEY `fk_wf_apstep_doc` (`workflow_stage_document_id`),
  KEY `fk_wf_apstep_group_code` (`workflow_code`, `group_code`),
  KEY `fk_wf_apstep_stage_code` (`workflow_code`, `stage_code`),
  KEY `fk_wf_apstep_doc_code` (`workflow_code`, `stage_code`, `document_code`),
  CONSTRAINT `fk_wf_apstep_wf` FOREIGN KEY (`workflow_code`) REFERENCES `crm_workflows` (`code`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wf_apstep_group` FOREIGN KEY (`stage_group_id`, `workflow_code`) REFERENCES `crm_workflow_stage_groups` (`id`, `workflow_code`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wf_apstep_stage` FOREIGN KEY (`stage_id`, `workflow_code`) REFERENCES `crm_workflow_stages` (`id`, `workflow_code`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wf_apstep_doc` FOREIGN KEY (`workflow_stage_document_id`) REFERENCES `crm_workflow_stage_documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wf_apstep_group_code` FOREIGN KEY (`workflow_code`, `group_code`) REFERENCES `crm_workflow_stage_groups` (`workflow_code`, `code`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wf_apstep_stage_code` FOREIGN KEY (`workflow_code`, `stage_code`) REFERENCES `crm_workflow_stages` (`workflow_code`, `code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Master list of the forms a stage can show (the Form dropdown of a stage). A form never changes with a stage name, so approvals connect to it.
CREATE TABLE IF NOT EXISTS `crm_master_forms` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_master_form_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO `crm_master_forms` (`id`, `code`, `name`, `sort_order`, `created_by`) VALUES
  (UUID(), 'FAP-FORM', 'FAP form', 1, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Pre-analysis form', 2, 'migration'),
  (UUID(), 'ICLF-FORM', 'ICLF form', 3, 'migration');

-- The authorities a workflow editor may choose for a place. The place is what is approved and is connected to a MASTER, never to a name:
-- a stage -> the form it shows (form_code -> crm_master_forms), a document -> its master document (document_code -> crm_master_document_types),
-- a group -> nothing (generic, one per department). One authority per department for each place, so several authorities can approve one
-- application. The editor offers only the ones of the place it is editing and the backend refuses any other. Seeded in Part 4.
CREATE TABLE IF NOT EXISTS `crm_workflow_authority_options` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_type` enum('GROUP','STAGE','DOCUMENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_code` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `authority_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wf_auth_opt_code` (`code`),
  UNIQUE KEY `uk_wf_auth_opt_authority` (`authority_name`),
  KEY `idx_wf_auth_opt_form` (`form_code`),
  KEY `idx_wf_auth_opt_doc` (`document_code`),
  CONSTRAINT `fk_wf_auth_opt_form` FOREIGN KEY (`form_code`) REFERENCES `crm_master_forms` (`code`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wf_auth_opt_doc` FOREIGN KEY (`document_code`) REFERENCES `crm_master_document_types` (`code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per step per round of approval of an application. A new round (after a reject and a resubmit) adds a new set of rows;
-- the older rounds stay as history. status: WAITING (an earlier sort_order is not done), PENDING (anyone holding the authority can act
-- now), APPROVED, REJECTED, CANCELLED (closed because another step was rejected). code, name, sort_order and authority_name
-- are copies of the workflow step at the time the round started. For a DOCUMENT step, document_checklist_id is the application's
-- document the step is about.
CREATE TABLE IF NOT EXISTS `crm_application_approval_steps` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `workflow_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `round_no` int NOT NULL DEFAULT '1',
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_type` enum('GROUP','STAGE','DOCUMENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `stage_group_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stage_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_checklist_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `group_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `document_code` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '1',
  `authority_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('WAITING','PENDING','APPROVED','REJECTED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WAITING',
  `started_at` timestamp(3) NULL DEFAULT NULL,
  `completed_at` timestamp(3) NULL DEFAULT NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_apstep_round` (`application_id`, `round_no`, `code`),
  KEY `idx_app_apstep_status` (`application_id`, `status`),
  KEY `idx_app_apstep_authority` (`authority_name`, `status`),
  KEY `fk_app_apstep_wfstep` (`workflow_code`, `code`),
  KEY `fk_app_apstep_group` (`stage_group_id`),
  KEY `fk_app_apstep_stage` (`stage_id`),
  KEY `fk_app_apstep_checklist` (`document_checklist_id`),
  CONSTRAINT `fk_app_apstep_app` FOREIGN KEY (`application_id`) REFERENCES `crm_applications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_app_apstep_wfstep` FOREIGN KEY (`workflow_code`, `code`) REFERENCES `crm_workflow_approval_steps` (`workflow_code`, `code`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_app_apstep_group` FOREIGN KEY (`stage_group_id`) REFERENCES `crm_workflow_stage_groups` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_app_apstep_stage` FOREIGN KEY (`stage_id`) REFERENCES `crm_workflow_stages` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_app_apstep_checklist` FOREIGN KEY (`document_checklist_id`) REFERENCES `crm_application_document_checklists` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every approval table has a code that the backend builds (never typed by a user): a decision is <step code>-R<round>-<user>. The decision of the person who acted on a step of a round. There is no row until someone acts: anyone holding the authority of the
-- step may. The first APPROVED completes the step, the first REJECTED rejects it (a reject needs remarks). decided_via marks where the
-- decision was made: WEB (the website) or LARK (a Lark message; the Lark person is matched to the user by email).
CREATE TABLE IF NOT EXISTS `crm_application_approval_decisions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_step_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `decision` enum('APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `decided_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `decided_via` enum('WEB','LARK') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WEB',
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_decision_person` (`application_step_id`, `user_id`),
  UNIQUE KEY `uk_app_decision_code` (`application_step_id`, `code`),
  KEY `idx_app_decision_user` (`user_id`, `decision`),
  CONSTRAINT `fk_app_decision_step` FOREIGN KEY (`application_step_id`) REFERENCES `crm_application_approval_steps` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_app_decision_user` FOREIGN KEY (`user_id`) REFERENCES `users_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_app_decision_reject_remarks` CHECK (`decision` <> 'REJECTED' OR (`remarks` IS NOT NULL AND CHAR_LENGTH(TRIM(`remarks`)) > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Part 2. Tables that pointed at the old status machine
-- ---------------------------------------------------------------------

-- Stage progress pointed at crm_master_workflow_stages (the global stages) and carried a status. Every workflow has its own stages
-- (crm_workflow_stages), so it points there now, and it has no status: what an application is waiting for comes from the approval
-- rounds. (The default workflow reused the old stage ids, so no row would be lost, but Part 0 left none anyway.)
ALTER TABLE `crm_application_stage_progress` DROP FOREIGN KEY `fk_app_stg_prog_stat`;
ALTER TABLE `crm_application_stage_progress` DROP FOREIGN KEY `fk_app_stg_prog_stg`;
ALTER TABLE `crm_application_stage_progress` DROP COLUMN `status_id`;
ALTER TABLE `crm_application_stage_progress`
  ADD CONSTRAINT `fk_app_stg_prog_stg` FOREIGN KEY (`stage_id`) REFERENCES `crm_workflow_stages` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- An application has no global status any more.
ALTER TABLE `crm_applications` DROP FOREIGN KEY `fk_app_cur_status`;
ALTER TABLE `crm_applications` DROP INDEX `idx_app_status`, DROP COLUMN `current_status_id`;

-- The stage of a document type came from the global stages. The stage of a document is set by the workflow
-- (crm_workflow_stage_documents) and kept on the application checklist (crm_application_document_checklists.stage_id).
ALTER TABLE `crm_master_document_types` DROP FOREIGN KEY `fk_master_doc_type_stage`;
ALTER TABLE `crm_master_document_types` DROP INDEX `idx_master_doc_type_stage`, DROP COLUMN `stage_id`;

-- PIC marketing of the application: one user, chosen when the application is entered and shown as a label afterwards (changing it is
-- the handover, planned later with its own history table). NULL for an application that has none. Same change as the users developer's
-- database (mkt_pic_id), and the maker columns go: who created an application is created_by (a stage also keeps using created_by).
ALTER TABLE `crm_applications`
  ADD COLUMN `mkt_pic_id` INT NULL AFTER `workflow_code`,
  ADD KEY `idx_app_mkt_pic` (`mkt_pic_id`),
  ADD CONSTRAINT `fk_app_mkt_pic` FOREIGN KEY (`mkt_pic_id`) REFERENCES `users_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `crm_applications`
  DROP FOREIGN KEY `fk_app_maker`,
  DROP KEY `idx_app_maker`,
  DROP COLUMN `maker_user_id`,
  DROP COLUMN `maker_name`;

-- A document of a stage that has no department has no responsible department: assigned_role may be empty (it used to be filled with a made-up 'MKT').
ALTER TABLE `crm_application_document_checklists` MODIFY COLUMN `assigned_role` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL;

-- The per-department document verification (BS / CA / LEGAL columns, dates, summary, notes) is gone: a document is approved through its
-- approval step (the status VERIFIED / REJECTED follows that approval). The old data of those columns is dropped with them.
ALTER TABLE `crm_application_document_checklists`
  DROP COLUMN `checked_by_mkt`, DROP COLUMN `checked_by_bs`, DROP COLUMN `checked_by_ca`, DROP COLUMN `checked_by_legal`,
  DROP COLUMN `registration_date`, DROP COLUMN `expired_date`, DROP COLUMN `data_summary`, DROP COLUMN `notes`;
ALTER TABLE `crm_frozen_fap_document_checklists`
  DROP COLUMN `checked_by_mkt`, DROP COLUMN `checked_by_bs`, DROP COLUMN `checked_by_ca`, DROP COLUMN `checked_by_legal`,
  DROP COLUMN `registration_date`, DROP COLUMN `expired_date`, DROP COLUMN `data_summary`, DROP COLUMN `notes`;

-- The workflow tables are also connected by CODE (workflow_code + the group, stage and document code), next to the ids that stay as they are
-- (a redundant id does no harm). The backend fills every code from the row it belongs to; nobody types them.
ALTER TABLE `crm_workflow_stages` ADD COLUMN `group_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `stage_group_id`;
UPDATE `crm_workflow_stages` s JOIN `crm_workflow_stage_groups` g ON g.`id` = s.`stage_group_id` SET s.`group_code` = g.`code`;
ALTER TABLE `crm_workflow_stages` MODIFY COLUMN `group_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  ADD CONSTRAINT `fk_wf_stage_group_code` FOREIGN KEY (`workflow_code`, `group_code`) REFERENCES `crm_workflow_stage_groups` (`workflow_code`, `code`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `crm_workflow_stage_fields` ADD COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `stage_id`;
UPDATE `crm_workflow_stage_fields` f JOIN `crm_workflow_stages` s ON s.`id` = f.`stage_id` SET f.`stage_code` = s.`code`;
ALTER TABLE `crm_workflow_stage_fields` MODIFY COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  ADD CONSTRAINT `fk_wf_sfield_stage_code` FOREIGN KEY (`workflow_code`, `stage_code`) REFERENCES `crm_workflow_stages` (`workflow_code`, `code`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `crm_workflow_stage_documents`
  ADD COLUMN `group_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `group_id`,
  ADD COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `stage_id`,
  ADD COLUMN `document_code` varchar(60) COLLATE utf8mb4_unicode_ci NULL AFTER `document_type_id`;
UPDATE `crm_workflow_stage_documents` d JOIN `crm_workflow_stage_groups` g ON g.`id` = d.`group_id` JOIN `crm_workflow_stages` s ON s.`id` = d.`stage_id` JOIN `crm_master_document_types` t ON t.`id` = d.`document_type_id`
   SET d.`group_code` = g.`code`, d.`stage_code` = s.`code`, d.`document_code` = t.`code`;
ALTER TABLE `crm_workflow_stage_documents`
  MODIFY COLUMN `group_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY COLUMN `document_code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  ADD UNIQUE KEY `uk_wf_stage_doc_code` (`workflow_code`, `stage_code`, `document_code`),
  ADD CONSTRAINT `fk_wf_sdoc_group_code` FOREIGN KEY (`workflow_code`, `group_code`) REFERENCES `crm_workflow_stage_groups` (`workflow_code`, `code`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wf_sdoc_stage_code` FOREIGN KEY (`workflow_code`, `stage_code`) REFERENCES `crm_workflow_stages` (`workflow_code`, `code`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wf_sdoc_type_code` FOREIGN KEY (`document_code`) REFERENCES `crm_master_document_types` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `crm_application_approval_steps`
  ADD CONSTRAINT `fk_app_apstep_group_code` FOREIGN KEY (`workflow_code`, `group_code`) REFERENCES `crm_workflow_stage_groups` (`workflow_code`, `code`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_app_apstep_stage_code` FOREIGN KEY (`workflow_code`, `stage_code`) REFERENCES `crm_workflow_stages` (`workflow_code`, `code`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_app_apstep_doc_code` FOREIGN KEY (`workflow_code`, `stage_code`, `document_code`) REFERENCES `crm_workflow_stage_documents` (`workflow_code`, `stage_code`, `document_code`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `crm_workflow_approval_steps`
  ADD CONSTRAINT `fk_wf_apstep_doc_code` FOREIGN KEY (`workflow_code`, `stage_code`, `document_code`) REFERENCES `crm_workflow_stage_documents` (`workflow_code`, `stage_code`, `document_code`) ON DELETE CASCADE ON UPDATE CASCADE;

-- The per-application tables that point at the workflow are connected by workflow_code + code too (the ids stay): stage progress, document
-- checklist and document overrides. The backend fills the codes.
ALTER TABLE `crm_application_stage_progress` ADD COLUMN `workflow_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `application_id`, ADD COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `stage_id`;
UPDATE `crm_application_stage_progress` p JOIN `crm_workflow_stages` s ON s.`id` = p.`stage_id` SET p.`workflow_code` = s.`workflow_code`, p.`stage_code` = s.`code`;
ALTER TABLE `crm_application_stage_progress` MODIFY COLUMN `workflow_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, MODIFY COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  ADD CONSTRAINT `fk_app_stg_prog_stage_code` FOREIGN KEY (`workflow_code`, `stage_code`) REFERENCES `crm_workflow_stages` (`workflow_code`, `code`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `crm_application_document_checklists` ADD COLUMN `workflow_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `application_id`, ADD COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `stage_id`, ADD COLUMN `document_code` varchar(60) COLLATE utf8mb4_unicode_ci NULL AFTER `document_type_id`;
UPDATE `crm_application_document_checklists` c JOIN `crm_workflow_stages` s ON s.`id` = c.`stage_id` LEFT JOIN `crm_master_document_types` t ON t.`id` = c.`document_type_id` SET c.`workflow_code` = s.`workflow_code`, c.`stage_code` = s.`code`, c.`document_code` = t.`code`;
ALTER TABLE `crm_application_document_checklists` MODIFY COLUMN `workflow_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, MODIFY COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  ADD CONSTRAINT `fk_app_doc_chk_stage_code` FOREIGN KEY (`workflow_code`, `stage_code`) REFERENCES `crm_workflow_stages` (`workflow_code`, `code`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_app_doc_chk_type_code` FOREIGN KEY (`document_code`) REFERENCES `crm_master_document_types` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `crm_application_document_overrides` ADD COLUMN `workflow_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `application_id`, ADD COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL AFTER `stage_id`, ADD COLUMN `document_code` varchar(60) COLLATE utf8mb4_unicode_ci NULL AFTER `document_type_id`;
UPDATE `crm_application_document_overrides` o JOIN `crm_workflow_stages` s ON s.`id` = o.`stage_id` LEFT JOIN `crm_master_document_types` t ON t.`id` = o.`document_type_id` LEFT JOIN `crm_workflow_stage_documents` d ON d.`id` = o.`workflow_stage_document_id`
   SET o.`workflow_code` = s.`workflow_code`, o.`stage_code` = s.`code`, o.`document_code` = COALESCE(t.`code`, d.`document_code`);
ALTER TABLE `crm_application_document_overrides` MODIFY COLUMN `workflow_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, MODIFY COLUMN `stage_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  ADD CONSTRAINT `fk_app_doc_ovr_stage_code` FOREIGN KEY (`workflow_code`, `stage_code`) REFERENCES `crm_workflow_stages` (`workflow_code`, `code`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_app_doc_ovr_type_code` FOREIGN KEY (`document_code`) REFERENCES `crm_master_document_types` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- The stage that had no form (ICLF) shows the ICLF form, and a stage's form and the form fields are connected to the master form list.
UPDATE `crm_workflow_stages` SET `form_code` = 'ICLF-FORM' WHERE `code` = 'ICLF' AND `form_code` IS NULL;
ALTER TABLE `crm_workflow_stages` ADD CONSTRAINT `fk_wf_stage_form` FOREIGN KEY (`form_code`) REFERENCES `crm_master_forms` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `crm_master_form_fields` ADD CONSTRAINT `fk_form_field_form` FOREIGN KEY (`form_code`) REFERENCES `crm_master_forms` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- Part 3. Dropped: the old status machine
-- ---------------------------------------------------------------------

-- History and sign-offs of the old approval (empty after Part 0). The decisions of the approval layer replace them.
DROP TABLE IF EXISTS `crm_application_stage_transitions`;
DROP TABLE IF EXISTS `crm_application_signoffs`;

-- The old rules (before status + users authority + action > after status), the statuses they moved between, the global stages and
-- the reject reason codes (a reject now carries free remarks). The crm_workflow_* authorities in users_authorities are no longer read by
-- the CRM (left alone: users tables).
DROP TABLE IF EXISTS `crm_master_workflow`;
DROP TABLE IF EXISTS `crm_master_workflow_statuses`;
DROP TABLE IF EXISTS `crm_master_workflow_stages`;
DROP TABLE IF EXISTS `crm_master_reject_reason_codes`;

-- ---------------------------------------------------------------------
-- Part 4. Approval steps of the default workflow: the process the old status machine had, on the authorities that already exist. Business
-- Support verifies the FAP stage; at ICLF Credit Analyst and Legal recommend (same order = at the same time), then the credit committee decides.
-- Pre-analysis has no approval step.
-- ---------------------------------------------------------------------
-- The authorities a workflow editor may choose for a place: one per department for each form, each master document and the groups. The authorities
-- themselves are created in plan-seed.sql (User Management data). The default workflow's ICLF stage shows the ICLF form.
INSERT INTO `crm_workflow_authority_options` (`id`, `code`, `scope_type`, `form_code`, `document_code`, `department_code`, `authority_name`, `description`, `created_by`) VALUES
  (UUID(), 'CRM-BS-GROUP-APPROVE', 'GROUP', NULL, NULL, 'BS', 'CRM_BS_GROUP_APPROVE', 'Approve or reject a stage group as Business Support', 'migration'),
  (UUID(), 'CRM-BS-FAP-FORM-APPROVE', 'STAGE', 'FAP-FORM', NULL, 'BS', 'CRM_BS_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Business Support', 'migration'),
  (UUID(), 'CRM-BS-PRE-ANALYSIS-FORM-APPROVE', 'STAGE', 'PRE-ANALYSIS-FORM', NULL, 'BS', 'CRM_BS_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Business Support', 'migration'),
  (UUID(), 'CRM-BS-ICLF-FORM-APPROVE', 'STAGE', 'ICLF-FORM', NULL, 'BS', 'CRM_BS_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Business Support', 'migration'),
  (UUID(), 'CRM-BS-FAP-APPROVE', 'DOCUMENT', NULL, 'FAP', 'BS', 'CRM_BS_FAP_APPROVE', 'Approve or reject the document FAP as Business Support', 'migration'),
  (UUID(), 'CRM-BS-ICLF-APPROVE', 'DOCUMENT', NULL, 'ICLF', 'BS', 'CRM_BS_ICLF_APPROVE', 'Approve or reject the document ICLF as Business Support', 'migration'),
  (UUID(), 'CRM-BS-BANK-APPROVE', 'DOCUMENT', NULL, 'BANK', 'BS', 'CRM_BS_BANK_APPROVE', 'Approve or reject the document BANK as Business Support', 'migration'),
  (UUID(), 'CRM-BS-CONTRACT-APPROVE', 'DOCUMENT', NULL, 'CONTRACT', 'BS', 'CRM_BS_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Business Support', 'migration'),
  (UUID(), 'CRM-BS-DEED-APPROVE', 'DOCUMENT', NULL, 'DEED', 'BS', 'CRM_BS_DEED_APPROVE', 'Approve or reject the document DEED as Business Support', 'migration'),
  (UUID(), 'CRM-BS-EKITAS-APPROVE', 'DOCUMENT', NULL, 'EKITAS', 'BS', 'CRM_BS_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Business Support', 'migration'),
  (UUID(), 'CRM-BS-FINANCIALS-APPROVE', 'DOCUMENT', NULL, 'FINANCIALS', 'BS', 'CRM_BS_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Business Support', 'migration'),
  (UUID(), 'CRM-BS-KTP-APPROVE', 'DOCUMENT', NULL, 'KTP', 'BS', 'CRM_BS_KTP_APPROVE', 'Approve or reject the document KTP as Business Support', 'migration'),
  (UUID(), 'CRM-BS-LEGAL-OPINION-APPROVE', 'DOCUMENT', NULL, 'LEGAL-OPINION', 'BS', 'CRM_BS_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Business Support', 'migration'),
  (UUID(), 'CRM-BS-NIB-APPROVE', 'DOCUMENT', NULL, 'NIB', 'BS', 'CRM_BS_NIB_APPROVE', 'Approve or reject the document NIB as Business Support', 'migration'),
  (UUID(), 'CRM-BS-NPWP-APPROVE', 'DOCUMENT', NULL, 'NPWP', 'BS', 'CRM_BS_NPWP_APPROVE', 'Approve or reject the document NPWP as Business Support', 'migration'),
  (UUID(), 'CRM-BS-PREANALYSIS-APPROVE', 'DOCUMENT', NULL, 'PREANALYSIS', 'BS', 'CRM_BS_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Business Support', 'migration'),
  (UUID(), 'CRM-BS-QUOTATION-APPROVE', 'DOCUMENT', NULL, 'QUOTATION', 'BS', 'CRM_BS_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Business Support', 'migration'),
  (UUID(), 'CRM-CA-GROUP-APPROVE', 'GROUP', NULL, NULL, 'CA', 'CRM_CA_GROUP_APPROVE', 'Approve or reject a stage group as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-FAP-FORM-APPROVE', 'STAGE', 'FAP-FORM', NULL, 'CA', 'CRM_CA_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-PRE-ANALYSIS-FORM-APPROVE', 'STAGE', 'PRE-ANALYSIS-FORM', NULL, 'CA', 'CRM_CA_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-ICLF-FORM-APPROVE', 'STAGE', 'ICLF-FORM', NULL, 'CA', 'CRM_CA_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-FAP-APPROVE', 'DOCUMENT', NULL, 'FAP', 'CA', 'CRM_CA_FAP_APPROVE', 'Approve or reject the document FAP as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-ICLF-APPROVE', 'DOCUMENT', NULL, 'ICLF', 'CA', 'CRM_CA_ICLF-FORM_APPROVE', 'Approve or reject the document ICLF as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-BANK-APPROVE', 'DOCUMENT', NULL, 'BANK', 'CA', 'CRM_CA_BANK_APPROVE', 'Approve or reject the document BANK as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-CONTRACT-APPROVE', 'DOCUMENT', NULL, 'CONTRACT', 'CA', 'CRM_CA_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-DEED-APPROVE', 'DOCUMENT', NULL, 'DEED', 'CA', 'CRM_CA_DEED_APPROVE', 'Approve or reject the document DEED as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-EKITAS-APPROVE', 'DOCUMENT', NULL, 'EKITAS', 'CA', 'CRM_CA_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-FINANCIALS-APPROVE', 'DOCUMENT', NULL, 'FINANCIALS', 'CA', 'CRM_CA_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-KTP-APPROVE', 'DOCUMENT', NULL, 'KTP', 'CA', 'CRM_CA_KTP_APPROVE', 'Approve or reject the document KTP as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-LEGAL-OPINION-APPROVE', 'DOCUMENT', NULL, 'LEGAL-OPINION', 'CA', 'CRM_CA_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-NIB-APPROVE', 'DOCUMENT', NULL, 'NIB', 'CA', 'CRM_CA_NIB_APPROVE', 'Approve or reject the document NIB as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-NPWP-APPROVE', 'DOCUMENT', NULL, 'NPWP', 'CA', 'CRM_CA_NPWP_APPROVE', 'Approve or reject the document NPWP as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-PREANALYSIS-APPROVE', 'DOCUMENT', NULL, 'PREANALYSIS', 'CA', 'CRM_CA_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Credit Analyst', 'migration'),
  (UUID(), 'CRM-CA-QUOTATION-APPROVE', 'DOCUMENT', NULL, 'QUOTATION', 'CA', 'CRM_CA_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Credit Analyst', 'migration'),
  (UUID(), 'CRM-LEGAL-GROUP-APPROVE', 'GROUP', NULL, NULL, 'LEGAL', 'CRM_LEGAL_GROUP_APPROVE', 'Approve or reject a stage group as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-FAP-FORM-APPROVE', 'STAGE', 'FAP-FORM', NULL, 'LEGAL', 'CRM_LEGAL_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-PRE-ANALYSIS-FORM-APPROVE', 'STAGE', 'PRE-ANALYSIS-FORM', NULL, 'LEGAL', 'CRM_LEGAL_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-ICLF-FORM-APPROVE', 'STAGE', 'ICLF-FORM', NULL, 'LEGAL', 'CRM_LEGAL_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-FAP-APPROVE', 'DOCUMENT', NULL, 'FAP', 'LEGAL', 'CRM_LEGAL_FAP_APPROVE', 'Approve or reject the document FAP as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-ICLF-APPROVE', 'DOCUMENT', NULL, 'ICLF', 'LEGAL', 'CRM_LEGAL_ICLF-FORM_APPROVE', 'Approve or reject the document ICLF as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-BANK-APPROVE', 'DOCUMENT', NULL, 'BANK', 'LEGAL', 'CRM_LEGAL_BANK_APPROVE', 'Approve or reject the document BANK as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-CONTRACT-APPROVE', 'DOCUMENT', NULL, 'CONTRACT', 'LEGAL', 'CRM_LEGAL_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-DEED-APPROVE', 'DOCUMENT', NULL, 'DEED', 'LEGAL', 'CRM_LEGAL_DEED_APPROVE', 'Approve or reject the document DEED as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-EKITAS-APPROVE', 'DOCUMENT', NULL, 'EKITAS', 'LEGAL', 'CRM_LEGAL_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-FINANCIALS-APPROVE', 'DOCUMENT', NULL, 'FINANCIALS', 'LEGAL', 'CRM_LEGAL_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-KTP-APPROVE', 'DOCUMENT', NULL, 'KTP', 'LEGAL', 'CRM_LEGAL_KTP_APPROVE', 'Approve or reject the document KTP as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-LEGAL-OPINION-APPROVE', 'DOCUMENT', NULL, 'LEGAL-OPINION', 'LEGAL', 'CRM_LEGAL_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-NIB-APPROVE', 'DOCUMENT', NULL, 'NIB', 'LEGAL', 'CRM_LEGAL_NIB_APPROVE', 'Approve or reject the document NIB as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-NPWP-APPROVE', 'DOCUMENT', NULL, 'NPWP', 'LEGAL', 'CRM_LEGAL_NPWP_APPROVE', 'Approve or reject the document NPWP as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-PREANALYSIS-APPROVE', 'DOCUMENT', NULL, 'PREANALYSIS', 'LEGAL', 'CRM_LEGAL_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Legal', 'migration'),
  (UUID(), 'CRM-LEGAL-QUOTATION-APPROVE', 'DOCUMENT', NULL, 'QUOTATION', 'LEGAL', 'CRM_LEGAL_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Legal', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-GROUP-APPROVE', 'GROUP', NULL, NULL, 'MANAGEMENT', 'CRM_MANAGEMENT_GROUP_APPROVE', 'Approve or reject a stage group as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-FAP-FORM-APPROVE', 'STAGE', 'FAP-FORM', NULL, 'MANAGEMENT', 'CRM_MANAGEMENT_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-PRE-ANALYSIS-FORM-APPROVE', 'STAGE', 'PRE-ANALYSIS-FORM', NULL, 'MANAGEMENT', 'CRM_MANAGEMENT_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-ICLF-FORM-APPROVE', 'STAGE', 'ICLF-FORM', NULL, 'MANAGEMENT', 'CRM_MANAGEMENT_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-FAP-APPROVE', 'DOCUMENT', NULL, 'FAP', 'MANAGEMENT', 'CRM_MANAGEMENT_FAP_APPROVE', 'Approve or reject the document FAP as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-ICLF-APPROVE', 'DOCUMENT', NULL, 'ICLF', 'MANAGEMENT', 'CRM_MANAGEMENT_ICLF-FORM_APPROVE', 'Approve or reject the document ICLF as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-BANK-APPROVE', 'DOCUMENT', NULL, 'BANK', 'MANAGEMENT', 'CRM_MANAGEMENT_BANK_APPROVE', 'Approve or reject the document BANK as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-CONTRACT-APPROVE', 'DOCUMENT', NULL, 'CONTRACT', 'MANAGEMENT', 'CRM_MANAGEMENT_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-DEED-APPROVE', 'DOCUMENT', NULL, 'DEED', 'MANAGEMENT', 'CRM_MANAGEMENT_DEED_APPROVE', 'Approve or reject the document DEED as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-EKITAS-APPROVE', 'DOCUMENT', NULL, 'EKITAS', 'MANAGEMENT', 'CRM_MANAGEMENT_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-FINANCIALS-APPROVE', 'DOCUMENT', NULL, 'FINANCIALS', 'MANAGEMENT', 'CRM_MANAGEMENT_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-KTP-APPROVE', 'DOCUMENT', NULL, 'KTP', 'MANAGEMENT', 'CRM_MANAGEMENT_KTP_APPROVE', 'Approve or reject the document KTP as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-LEGAL-OPINION-APPROVE', 'DOCUMENT', NULL, 'LEGAL-OPINION', 'MANAGEMENT', 'CRM_MANAGEMENT_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-NIB-APPROVE', 'DOCUMENT', NULL, 'NIB', 'MANAGEMENT', 'CRM_MANAGEMENT_NIB_APPROVE', 'Approve or reject the document NIB as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-NPWP-APPROVE', 'DOCUMENT', NULL, 'NPWP', 'MANAGEMENT', 'CRM_MANAGEMENT_NPWP_APPROVE', 'Approve or reject the document NPWP as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-PREANALYSIS-APPROVE', 'DOCUMENT', NULL, 'PREANALYSIS', 'MANAGEMENT', 'CRM_MANAGEMENT_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Management', 'migration'),
  (UUID(), 'CRM-MANAGEMENT-QUOTATION-APPROVE', 'DOCUMENT', NULL, 'QUOTATION', 'MANAGEMENT', 'CRM_MANAGEMENT_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Management', 'migration');

INSERT INTO `crm_workflow_approval_steps` (`id`, `workflow_code`, `code`, `name`, `scope_type`, `stage_id`, `stage_code`, `sort_order`, `authority_name`, `created_by`)
SELECT UUID(), s.`workflow_code`, x.`code`, x.`name`, 'STAGE', s.`id`, s.`code`, x.`sort_order`, x.`authority_name`, 'migration'
FROM `crm_workflow_stages` s
JOIN (
  SELECT 'FAP-STAGE' AS stage_code, 'BS-VERIFICATION' AS code, 'BS verification' AS name, 1 AS sort_order, 'CRM_BS_FAP-FORM_APPROVE' AS authority_name
  UNION ALL SELECT 'ICLF', 'CA-RECOMMENDATION', 'CA recommendation', 1, 'CRM_CA_ICLF-FORM_APPROVE'
  UNION ALL SELECT 'ICLF', 'LEGAL-RECOMMENDATION', 'Legal recommendation', 1, 'CRM_LEGAL_ICLF-FORM_APPROVE'
  UNION ALL SELECT 'ICLF', 'CREDIT-COMMITTEE-DECISION', 'Credit committee decision', 2, 'CRM_MANAGEMENT_ICLF-FORM_APPROVE'
) x ON x.stage_code = s.`code`
WHERE s.`workflow_code` = 'DEFAULT-WORKFLOW';

-- Every document of the default workflow has to be approved too, with the same name pattern plus the document code:
-- CRM_<DEPT>_<DOCUMENT>_APPROVE (Legal for the deed and the legal opinion, Management for ICLF, Business Support for the rest). The authorities are in plan-seed.sql.
INSERT INTO `crm_workflow_approval_steps` (`id`, `workflow_code`, `code`, `name`, `scope_type`, `workflow_stage_document_id`, `stage_code`, `document_code`, `sort_order`, `authority_name`, `created_by`)
SELECT UUID(), sd.`workflow_code`, CONCAT(t.`code`, '-APPROVAL'), CONCAT('Approval of ', t.`name`), 'DOCUMENT', sd.`id`, st.`code`, t.`code`, 1,
       CONCAT('CRM_', IF(st.`code` = 'ICLF', 'MANAGEMENT', IF(t.`code` IN ('DEED', 'LEGAL-OPINION'), 'LEGAL', 'BS')), '_', t.`code`, '_APPROVE'), 'migration'
FROM `crm_workflow_stage_documents` sd
JOIN `crm_master_document_types` t ON t.`id` = sd.`document_type_id`
JOIN `crm_workflow_stages` st ON st.`id` = sd.`stage_id`
WHERE sd.`workflow_code` = 'DEFAULT-WORKFLOW';

SET FOREIGN_KEY_CHECKS = 1;
