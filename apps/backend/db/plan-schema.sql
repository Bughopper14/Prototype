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

-- =====================================================================
-- Part 5: the authority of an approval step is a real reference (FK), and the copied description of an option is gone.
-- =====================================================================
-- The authority of an approval step is a real reference now.
--   crm_workflow_authority_options is the one bridge to User Management: (app_id, authority_name) is a FK to users_authorities. Renaming an authority there
--   follows here (ON UPDATE CASCADE); an authority that a workflow place offers cannot be deleted there (ON DELETE RESTRICT).
--   The steps of a workflow and the steps of an application refer to the option by authority_name, so they follow the same rename and block the same delete.
-- The description of an option is gone: it was a copy of users_authorities.description and nothing read it.
-- Needs the authorities of plan-seed.sql: run plan-seed.sql first, then this part.
ALTER TABLE `crm_workflow_authority_options` ADD COLUMN `app_id` INT NOT NULL DEFAULT 0 AFTER `code`;
UPDATE `crm_workflow_authority_options` SET `app_id` = (SELECT `id` FROM `users_applications` WHERE `app_name` LIKE 'CRM%' LIMIT 1);
ALTER TABLE `crm_workflow_authority_options` ALTER COLUMN `app_id` DROP DEFAULT;
ALTER TABLE `crm_workflow_authority_options` DROP COLUMN `description`;
ALTER TABLE `crm_workflow_authority_options` ADD CONSTRAINT `fk_wf_auth_opt_authority` FOREIGN KEY (`app_id`, `authority_name`) REFERENCES `users_authorities` (`app_id`, `authority_name`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `crm_workflow_approval_steps` ADD CONSTRAINT `fk_wf_apstep_authority` FOREIGN KEY (`authority_name`) REFERENCES `crm_workflow_authority_options` (`authority_name`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `crm_application_approval_steps` ADD CONSTRAINT `fk_app_apstep_authority` FOREIGN KEY (`authority_name`) REFERENCES `crm_workflow_authority_options` (`authority_name`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Part 6: the code column of the authority options is gone.
-- =====================================================================
-- The code of an authority option was only authority_name in capitals with hyphens: dropped. The authority_name is the key.
ALTER TABLE `crm_workflow_authority_options` DROP INDEX `uk_wf_auth_opt_code`, DROP COLUMN `code`;

-- =====================================================================
-- Part 7: crm_master_form_fields is a real master (one row per field of a form: section, code, key, label, enforceable).
-- The per-stage copies are gone; crm_workflow_stage_fields points at the master field.
-- =====================================================================
-- The field catalog is a real master now. crm_master_form_fields used to hold one row per field per STAGE (a copy for every workflow); that table is replaced.
-- crm_workflow_stage_fields now points straight at the master field. Run after plan-seed.sql is not needed: this part is self-contained.
RENAME TABLE `crm_master_form_fields` TO `crm_stage_form_fields_old`;

CREATE TABLE `crm_master_form_fields` (
  `id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_code` VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `section_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_key` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enforceable` TINYINT(1) NOT NULL DEFAULT '0',
  `sort_order` INT NOT NULL DEFAULT '0',
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_by` VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_master_form_field` (`form_code`, `section_name`, `code`),
  CONSTRAINT `fk_master_form_field_form` FOREIGN KEY (`form_code`) REFERENCES `crm_master_forms` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `crm_master_form_fields` (`id`, `form_code`, `section_name`, `code`, `field_key`, `label`, `is_enforceable`, `sort_order`, `created_by`) VALUES
  (UUID(), 'FAP-FORM', 'Bank Facilities & References', 'BANKORFININSTITUTION', 'bankOrFinInstitution', 'Bank or Financial Institution', 1, 1, 'migration'),
  (UUID(), 'FAP-FORM', 'Bank Facilities & References', 'CREDITFACILITY', 'creditFacility', 'Credit Facility Limit', 1, 2, 'migration'),
  (UUID(), 'FAP-FORM', 'Bank Facilities & References', 'CURRENCY', 'currency', 'Bank Facility Currency', 1, 3, 'migration'),
  (UUID(), 'FAP-FORM', 'Bank Facilities & References', 'FACILITYSTATUS', 'facilityStatus', 'Facility Status', 1, 4, 'migration'),
  (UUID(), 'FAP-FORM', 'Bank Facilities & References', 'INTERESTRATE', 'interestRate', 'Facility Interest Rate', 1, 5, 'migration'),
  (UUID(), 'FAP-FORM', 'Bank Facilities & References', 'MONTHLYINSTALLMENT', 'monthlyInstallment', 'Monthly Installment', 1, 6, 'migration'),
  (UUID(), 'FAP-FORM', 'Bank Facilities & References', 'PAYMENTRECORD', 'paymentRecord', 'Payment Record (Collectibility)', 1, 7, 'migration'),
  (UUID(), 'FAP-FORM', 'Bank Facilities & References', 'REFERENCECOMMENTS', 'referenceComments', 'Bank Reference Comments', 1, 8, 'migration'),
  (UUID(), 'FAP-FORM', 'Bank Facilities & References', 'YEARSTARTED', 'yearStarted', 'Facility Year Started', 1, 9, 'migration'),
  (UUID(), 'FAP-FORM', 'Business Profile & Deed Legality', 'BUSINESSROLE', 'businessRole', 'Business Role', 1, 10, 'migration'),
  (UUID(), 'FAP-FORM', 'Business Profile & Deed Legality', 'EXPERIENCEMONTHS', 'experienceMonths', 'Experience · Months', 1, 11, 'migration'),
  (UUID(), 'FAP-FORM', 'Business Profile & Deed Legality', 'EXPERIENCEYEARS', 'experienceYears', 'Experience · Years', 1, 12, 'migration'),
  (UUID(), 'FAP-FORM', 'Business Profile & Deed Legality', 'INDUSTRYSEGMENT', 'industrySegment', 'Industry', 1, 13, 'migration'),
  (UUID(), 'FAP-FORM', 'Business Profile & Deed Legality', 'LATESTDEEDDATE', 'latestDeedDate', 'Latest Deed Date', 1, 14, 'migration'),
  (UUID(), 'FAP-FORM', 'Business Profile & Deed Legality', 'LATESTDEEDNO', 'latestDeedNo', 'Latest Deed Number', 1, 15, 'migration'),
  (UUID(), 'FAP-FORM', 'Business Profile & Deed Legality', 'MAINBUSINESS', 'mainBusiness', 'Main Business', 1, 16, 'migration'),
  (UUID(), 'FAP-FORM', 'Business Profile & Deed Legality', 'REPAYMENTSOURCE', 'repaymentSource', 'Source of Repayment', 1, 17, 'migration'),
  (UUID(), 'FAP-FORM', 'Debtor Identity & Classification', 'COMPANYNAME', 'companyName', 'Company Name', 1, 18, 'migration'),
  (UUID(), 'FAP-FORM', 'Debtor Identity & Classification', 'COMPANYTYPE', 'companyType', 'Business Category', 1, 19, 'migration'),
  (UUID(), 'FAP-FORM', 'Debtor Identity & Classification', 'CUSTOMERCATEGORY', 'customerCategory', 'Customer Category', 1, 20, 'migration'),
  (UUID(), 'FAP-FORM', 'Debtor Identity & Classification', 'ESTABLISHMENTACTNO', 'establishmentActNo', 'Establishment Deed No', 1, 21, 'migration'),
  (UUID(), 'FAP-FORM', 'Debtor Identity & Classification', 'ESTABLISHMENTDATE', 'establishmentDate', 'Establishment Deed Date', 1, 22, 'migration'),
  (UUID(), 'FAP-FORM', 'Debtor Identity & Classification', 'NIB', 'nib', 'NIB', 1, 23, 'migration'),
  (UUID(), 'FAP-FORM', 'Debtor Identity & Classification', 'NIBDATE', 'nibDate', 'NIB Established Date', 1, 24, 'migration'),
  (UUID(), 'FAP-FORM', 'Debtor Identity & Classification', 'NPWP', 'npwp', 'NPWP', 1, 25, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'CURRENTASSETS', 'currentAssets', 'Balance Sheet - Current Assets', 1, 26, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'CURRENTLIABILITIES', 'currentLiabilities', 'Balance Sheet - Current Liabilities', 1, 27, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'EQUITY', 'equity', 'Balance Sheet - Equity', 1, 28, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'FINANCIALAUDITED', 'financialAudited', 'Audited Financial Statements (Global Check)', 1, 29, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'FISCALYEAR', 'fiscalYear', 'Fiscal Year', 1, 30, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'GROSSMARGIN', 'grossMargin', 'Income Statement - Gross Profit', 1, 31, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'NETINCOME', 'netIncome', 'Income Statement - Net Income', 1, 32, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'NONCURRENTASSETS', 'nonCurrentAssets', 'Balance Sheet - Non-Current Assets', 1, 33, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'NONCURRENTLIABILITIES', 'nonCurrentLiabilities', 'Balance Sheet - Non-Current Liabilities', 1, 34, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'OPERATINGMARGIN', 'operatingMargin', 'Income Statement - Operating Profit (EBIT)', 1, 35, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'REVENUE', 'revenue', 'Income Statement - Revenue', 1, 36, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'TAX', 'tax', 'Income Statement - Tax', 1, 37, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'TOTALASSETS', 'totalAssets', 'Balance Sheet - Total Assets', 1, 38, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'TOTALLIABANDEQUITY', 'totalLiabAndEquity', 'Balance Sheet - Total Liabilities & Equity', 1, 39, 'migration'),
  (UUID(), 'FAP-FORM', 'Financial Statements', 'TOTALLIABILITIES', 'totalLiabilities', 'Balance Sheet - Total Liabilities', 1, 40, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'APPLICATIONSOURCE', 'applicationSource', 'Application Source', 1, 41, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'AUDITED-FINANCIAL-STATEMENTS', 'AUDITED-FINANCIAL-STATEMENTS', 'Doc Req - Audited Financial Statements', 1, 42, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'BANK-FINANCING-FACILITY', 'BANK-FINANCING-FACILITY', 'Doc Req - Bank or Financing Facility', 1, 43, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'BANK-STATEMENTS', 'BANK-STATEMENTS', 'Doc Req - Bank Statements', 1, 44, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'COMPANY-PROFILE', 'COMPANY-PROFILE', 'Doc Req - Company Profile', 1, 45, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'COPY-ID-BOD-SHAREHOLDER', 'COPY-ID-BOD-SHAREHOLDER', 'Doc Req - Copy ID, BOD, & Shareholder', 1, 46, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'CURRENCYCHOICE', 'currencyChoice', 'Mata Uang / Currency Choice (IDR/USD)', 1, 47, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'DECREE-MINISTRY-OF-LAW', 'DECREE-MINISTRY-OF-LAW', 'Doc Req - Decree of Ministry of Law', 1, 48, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'DEED-ESTABLISHMENT', 'DEED-ESTABLISHMENT', 'Doc Req - Deed Establishment & Amendments', 1, 49, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'FINANCINGMETHOD', 'financingMethod', 'Cara Pembiayaan / Financing Method', 1, 50, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'FINANCINGVALUEPROP', 'financingValueProp', 'Nilai Pembiayaan / Financing Value', 1, 51, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'FLCURRENCY', 'flCurrency', 'Financial Lease - Currency', 1, 52, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'FLDEPOSIT', 'flDeposit', 'Financial Lease - Security Deposit', 1, 53, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'FLINVESTMENT', 'flInvestment', 'Financial Lease - Investment Purpose', 1, 54, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'FLPAYMENT', 'flPayment', 'Financial Lease - Payment Method', 1, 55, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'FLRATE', 'flRate', 'Financial Lease - Interest Rate', 1, 56, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'FLTENOR', 'flTenor', 'Financial Lease - Tenor', 1, 57, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'IFCURRENCY', 'ifCurrency', 'Installment Financing - Currency', 1, 58, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'IFDOWNPAYMENT', 'ifDownPayment', 'Installment Financing - Down Payment', 1, 59, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'IFPAYMENT', 'ifPayment', 'Installment Financing - Payment Method', 1, 60, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'IFPURPOSE', 'ifPurpose', 'Installment Financing - Purpose', 1, 61, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'IFRATE', 'ifRate', 'Installment Financing - Interest Rate', 1, 62, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'IFTENOR', 'ifTenor', 'Installment Financing - Tenor', 1, 63, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'LEGALITY', 'LEGALITY', 'Doc Req - Legality (NIB, SIUJK, SIUP)', 1, 64, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'LIST-OF-FIXED-ASSETS', 'LIST-OF-FIXED-ASSETS', 'Doc Req - List of Fixed Assets', 1, 65, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'PRODUCTION-REPORT', 'PRODUCTION-REPORT', 'Doc Req - Production Report', 1, 66, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'PROJECT-CONTRACTS', 'PROJECT-CONTRACTS', 'Doc Req - Project Contracts', 1, 67, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'PROPASSETLGHE', 'propAssetLgHe', 'Unit Realization - LiuGong Heavy Equipment', 1, 68, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'PROPASSETLGTRUCK', 'propAssetLgTruck', 'Unit Realization - LiuGong Truck', 1, 69, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'PROPASSETNLGHE', 'propAssetNlgHe', 'Unit Realization - Non-LiuGong Heavy Equipment', 1, 70, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'PROPASSETNLGTRUCK', 'propAssetNlgTruck', 'Unit Realization - Non-LiuGong Truck', 1, 71, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'PROPOSALNOTES', 'proposalNotes', 'Financing Proposal - Notes', 1, 72, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'SLBCURRENCY', 'slbCurrency', 'Sale & Lease Back - Currency', 1, 73, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'SLBDEPOSIT', 'slbDeposit', 'Sale & Lease Back - Security Deposit', 1, 74, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'SLBPAYMENT', 'slbPayment', 'Sale & Lease Back - Payment Method', 1, 75, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'SLBPURPOSE', 'slbPurpose', 'Sale & Lease Back - Purpose', 1, 76, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'SLBRATE', 'slbRate', 'Sale & Lease Back - Interest Rate', 1, 77, 'migration'),
  (UUID(), 'FAP-FORM', 'Financing Proposal', 'SLBTENOR', 'slbTenor', 'Sale & Lease Back - Tenor', 1, 78, 'migration'),
  (UUID(), 'FAP-FORM', 'Industry Segmentation & Active Projects', 'CONTRACTSTATUS', 'contractStatus', 'Contract Status', 1, 79, 'migration'),
  (UUID(), 'FAP-FORM', 'Industry Segmentation & Active Projects', 'PROJECTLOCATION', 'projectLocation', 'Location', 1, 80, 'migration'),
  (UUID(), 'FAP-FORM', 'Industry Segmentation & Active Projects', 'PROJECTOWNER', 'projectOwner', 'Project Owner', 1, 81, 'migration'),
  (UUID(), 'FAP-FORM', 'Industry Segmentation & Active Projects', 'PROJECTROLE', 'projectRole', 'Role In Project', 1, 82, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'DECREEDATE', 'decreeDate', 'Ministerial Decree Date', 1, 83, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'DECREENUMBER', 'decreeNumber', 'Ministerial Decree Number', 1, 84, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'DEEDDATE', 'deedDate', 'Deed Date', 1, 85, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'DEEDNUMBER', 'deedNumber', 'Deed Number', 1, 86, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'MINISTERIALDECREEDATE', 'ministerialDecreeDate', 'Ministerial Decree Date', 1, 87, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'MINISTERIALDECREENUMBER', 'ministerialDecreeNumber', 'Ministerial Decree Number', 1, 88, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'NOTARYNAME', 'notaryName', 'Notary Name', 1, 89, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'REMARKS', 'remarks', 'Deed Notes / Remarks', 1, 90, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'TYPE', 'type', 'Deed Type', 1, 91, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'CITY', 'city', 'City / Regency', 1, 92, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'COUNTRY', 'country', 'Country', 1, 93, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'CURRENTADDRESS', 'currentAddress', 'Full Address', 1, 94, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'DISTRICT', 'district', 'District', 1, 95, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'EMAIL', 'email', 'Email', 1, 96, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'PHONE', 'phone', 'Phone Number', 1, 97, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'PICNAME', 'picName', 'Contact Name', 1, 98, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'POSITION', 'position', 'Position', 1, 99, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'POSTALCODE', 'postalCode', 'ZIP Code', 1, 100, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'PROVINCE', 'province', 'Province', 1, 101, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'RT', 'rt', 'RT', 1, 102, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'RW', 'rw', 'RW', 1, 103, 'migration'),
  (UUID(), 'FAP-FORM', 'Primary Contact / Person in Charge (PIC)', 'VILLAGE', 'village', 'Village / Sub-District', 1, 104, 'migration'),
  (UUID(), 'FAP-FORM', 'Purpose of Financing & Fixed Assets', 'ASSETSUMMARYHELIUGONG', 'assetSummaryHeLiuGong', 'Fixed Asset - LiuGong Heavy Equipment', 1, 105, 'migration'),
  (UUID(), 'FAP-FORM', 'Purpose of Financing & Fixed Assets', 'ASSETSUMMARYHENONLIUGONG', 'assetSummaryHeNonLiuGong', 'Fixed Asset - Non-LiuGong Heavy Equipment', 1, 106, 'migration'),
  (UUID(), 'FAP-FORM', 'Purpose of Financing & Fixed Assets', 'ASSETSUMMARYTRUCKLIUGONG', 'assetSummaryTruckLiuGong', 'Fixed Asset - LiuGong Truck', 1, 107, 'migration'),
  (UUID(), 'FAP-FORM', 'Purpose of Financing & Fixed Assets', 'ASSETSUMMARYTRUCKNONLIUGONG', 'assetSummaryTruckNonLiuGong', 'Fixed Asset - Non-LiuGong Truck', 1, 108, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'BRANCHCODE', 'branchCode', 'Branch', 1, 109, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'CITY', 'city', 'City', 1, 110, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'COMPANYADDRESS', 'companyAddress', 'Company Address', 1, 111, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'DISTRICT', 'district', 'District', 1, 112, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'EMAIL', 'email', 'Company Email', 1, 113, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'LOCATIONSTATUS', 'locationStatus', 'Business Premises', 1, 114, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'PHONEFAX', 'phoneFax', 'Phone / Fax', 1, 115, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'POSTALCODE', 'postalCode', 'Postal Code', 1, 116, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'PROVINCE', 'province', 'Province', 1, 117, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'RT', 'rt', 'RT', 1, 118, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'RW', 'rw', 'RW', 1, 119, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'VILLAGE', 'village', 'Village / Sub-District', 1, 120, 'migration'),
  (UUID(), 'FAP-FORM', 'Registration Office & Company Domicile', 'WEBSITE', 'website', 'Website', 1, 121, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'ADDRESS', 'address', 'Address', 1, 122, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'AGEMONTHS', 'ageMonths', 'Age · Months', 1, 123, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'AGEYEARS', 'ageYears', 'Age · Years', 1, 124, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'CITIZENSHIP', 'citizenship', 'Citizenship', 1, 125, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'CITYREGENCY', 'cityRegency', 'City / Regency', 1, 126, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'COUNTRY', 'country', 'Country', 1, 127, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'DATEOFBIRTH', 'dateOfBirth', 'Date of Birth', 1, 128, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'DEPOSITEDCAPITAL', 'depositedCapital', 'Deposited Capital (IDR)', 1, 129, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'DESIGNATION', 'designation', 'Designation', 1, 130, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'DISTRICT', 'district', 'District', 1, 131, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'EMAIL', 'email', 'Email', 1, 132, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'FIRSTNAME', 'firstName', 'First Name', 1, 133, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'GENDER', 'gender', 'Gender', 1, 134, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'IDNUMBER', 'idNumber', 'ID Number (NIK / Passport)', 1, 135, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'IDNUMBERSECONDARY', 'idNumberSecondary', 'ID Number - [NPWP or KITAS]', 1, 136, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'IDTYPE', 'idType', 'ID Type', 1, 137, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'LASTNAME', 'lastName', 'Last Name', 1, 138, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'MARITALSTATUS', 'maritalStatus', 'Marital Status', 1, 139, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'MIDDLENAME', 'middleName', 'Middle Name', 1, 140, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'MOBILEPHONE', 'mobilePhone', 'Mobile Phone', 1, 141, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'NATIONALITYTYPE', 'nationalityType', 'Nationality Type (WNI/WNA)', 1, 142, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'OCCUPATION', 'occupation', 'Occupation', 1, 143, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'POSTALCODE', 'postalCode', 'Postal / ZIP Code', 1, 144, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'PRIMARYCAPITAL', 'primaryCapital', 'Primary Capital (IDR)', 1, 145, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'PROVINCE', 'province', 'Province', 1, 146, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'REPRESENTATIVETYPE', 'representativeType', 'Representative Type', 1, 147, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'RT', 'rt', 'RT', 1, 148, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'RW', 'rw', 'RW', 1, 149, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'SHAREAMOUNT', 'shareAmount', 'Share Amount / Capital (IDR)', 1, 150, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'SHAREHOLDERNAME', 'shareholderName', 'Shareholder Name', 1, 151, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'SHAREHOLDERPOSITION', 'shareholderPosition', 'Shareholder Position / Role', 1, 152, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'SHAREPERCENTAGE', 'sharePercentage', 'Share Percentage (%)', 1, 153, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'SIGNATORY', 'signatory', 'Signatory', 1, 154, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'STAKEHOLDERTYPE', 'stakeholderType', 'Stakeholder Type (Individual/Corporate)', 1, 155, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'TAXNUMBER', 'taxNumber', 'NPWP Number', 1, 156, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'TITLE', 'title', 'Title', 1, 157, 'migration'),
  (UUID(), 'FAP-FORM', 'Shareholders & Management', 'VILLAGE', 'village', 'Village / Sub-District', 1, 158, 'migration'),
  (UUID(), 'FAP-FORM', 'Equipment Units', 'UNITCATEGORY', 'unitCategory', 'Unit Category', 1, 159, 'migration'),
  (UUID(), 'FAP-FORM', 'Equipment Units', 'BRAND', 'brand', 'Brand', 1, 160, 'migration'),
  (UUID(), 'FAP-FORM', 'Equipment Units', 'UNITTYPE', 'unitType', 'Unit Type', 1, 161, 'migration'),
  (UUID(), 'FAP-FORM', 'Equipment Units', 'MODELNAME', 'modelName', 'Model', 1, 162, 'migration'),
  (UUID(), 'FAP-FORM', 'Equipment Units', 'ASSETNAME', 'assetName', 'Asset', 1, 163, 'migration'),
  (UUID(), 'FAP-FORM', 'Equipment Units', 'CLASSTON', 'classTon', 'Class (Ton)', 1, 164, 'migration'),
  (UUID(), 'FAP-FORM', 'Equipment Units', 'QUANTITY', 'quantity', 'Quantity', 1, 165, 'migration'),
  (UUID(), 'FAP-FORM', 'Equipment Units', 'YEARS', 'years', 'Unit Year', 1, 166, 'migration'),
  (UUID(), 'FAP-FORM', 'Equipment Units', 'SPECIFICATIONS', 'specifications', 'Specifications', 1, 167, 'migration'),
  (UUID(), 'FAP-FORM', 'Legal Deeds & Amendments', 'REMARKCATEGORYIDS', 'remarkCategoryIds', 'Remark Categories', 1, 168, 'migration'),
  (UUID(), 'FAP-FORM', 'Purpose of Financing & Fixed Assets', 'FINANCINGPURPOSEDETAIL', 'financingPurposeDetail', 'Financing Purpose Detail', 1, 169, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Cross-Check with Dealer / LMI', 'APPLICANTPEFINDOCHECK', 'applicantPefindoCheck', 'Applicant Pefindo Check', 1, 170, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Cross-Check with Dealer / LMI', 'DEALERCHECK', 'dealerCheck', 'Dealer Payment & Performance Check', 1, 171, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Cross-Check with Dealer / LMI', 'LMIARCHECK', 'lmiArCheck', 'LMI Internal AR Check', 1, 172, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Cross-Check with Dealer / LMI', 'TOPDEALERTOCUSTOMER', 'topDealerToCustomer', 'TOP Dealer to Customer', 1, 173, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Cross-Check with Dealer / LMI', 'TOPLMITODEALER', 'topLmiToDealer', 'TOP LMI to Dealer', 1, 174, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Customer & Group Background', 'BUSINESSDEVBACKGROUND', 'businessDevBackground', 'Business Development Background', 1, 175, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Customer & Group Background', 'COMPANYBACKGROUND', 'companyBackground', 'Company Background', 1, 176, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Customer & Group Background', 'EXISTINGFINCOBACKUP', 'existingFincoBackup', 'Existing Finco Backup', 1, 177, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Customer & Group Background', 'UBOINFO', 'uboInfo', 'Ultimate Beneficial Owner (UBO)', 1, 178, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Equipment Possibility of Success', 'EQUIPMENTJOBFIT', 'equipmentJobFit', 'Equipment-to-Job Fit', 1, 179, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Equipment Possibility of Success', 'PRIORLIUGONGEXPERIENCE', 'priorLiugongExperience', 'Prior LiuGong Experience', 1, 180, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Equipment Possibility of Success', 'SERVICEAGREEMENTFMC', 'serviceAgreementFmc', 'Have Service Agreement / FMC', 1, 181, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Equipment Possibility of Success', 'UTILIZATIONDURATION', 'utilizationDuration', 'Utilization vs Project Duration', 1, 182, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Expert Judgement Conclusion', 'APPROVEDBY', 'approvedBy', 'Approved By (Approver)', 1, 183, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Expert Judgement Conclusion', 'PROPOSEDBY', 'proposedBy', 'Proposed By (Pengusul)', 1, 184, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Expert Judgement Conclusion', 'RECOMMENDATION', 'recommendation', 'Credit Recommendation', 1, 185, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Expert Judgement Conclusion', 'REVIEWEDBY', 'reviewedBy', 'Reviewed By (Reviewer)', 1, 186, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'CUSTOMERAREA', 'customerArea', 'Customer Area', 1, 187, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'CUSTOMERPIC', 'customerPic', 'Customer PIC', 1, 188, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'CUSTOMERPROJECTNAME', 'customerProjectName', 'Customer / Project Name', 1, 189, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'DEALERPIC', 'dealerPic', 'Dealer PIC', 1, 190, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'EQUITY', 'equity', 'Equity', 1, 191, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'FAPNUMBER', 'fapNumber', 'FAP Number', 1, 192, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'LEADSOURCE', 'leadSource', 'Lead Source', 1, 193, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'LFIPIC', 'lfiPic', 'LFI PIC', 1, 194, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'LMIPIC', 'lmiPic', 'LMI PIC', 1, 195, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'PAIDUPCAPITAL', 'paidUpCapital', 'Paid up Capital', 1, 196, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'PREANALYSISDATE', 'preAnalysisDate', 'Pre-Analysis Date', 1, 197, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'PREANALYSISNO', 'preAnalysisNo', 'Pre-Analysis No', 1, 198, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'SOURCEOFREPAYMENT', 'sourceOfRepayment', 'Source of Repayment', 1, 199, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'General Information', 'TAXID', 'taxId', 'Tax ID (NPWP)', 1, 200, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Project Information', 'CUSTOMERROLE', 'customerRole', 'Role of Customer', 1, 201, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Project Information', 'FINANCINGSCHEMEREQUESTED', 'financingSchemeRequested', 'Financing Scheme Requested', 1, 202, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Project Information', 'HOLDINGGROUP', 'holdingGroup', 'Holding Group / Parent Company', 1, 203, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Project Information', 'OTHERCONTRACTORS', 'otherContractors', 'Other Contractor work in same bowheer', 1, 204, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Project Information', 'PROJECTLOCATION', 'projectLocation', 'Project Location (Lokasi Proyek)', 1, 205, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Project Information', 'PROJECTNAME', 'projectName', 'Project Name (Nama Objek Proyek)', 1, 206, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Project Information', 'PROJECTSTATUS', 'projectStatus', 'Project Status', 1, 207, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Unit Delivery Status & QA Check', 'DELIVERYDATE', 'deliveryDate', 'Delivery Date', 1, 208, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Unit Delivery Status & QA Check', 'DELIVERYSTATUS', 'deliveryStatus', 'Delivery Status', 1, 209, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Unit Delivery Status & QA Check', 'QACONCLUSION', 'qaConclusion', 'QA Conclusion', 1, 210, 'migration'),
  (UUID(), 'PRE-ANALYSIS-FORM', 'Unit Delivery Status & QA Check', 'QAILINKCOMMENT', 'qaIlinkComment', 'QA Comment — iLink/GPS Check', 1, 211, 'migration');

ALTER TABLE `crm_workflow_stage_fields` DROP FOREIGN KEY `fk_wf_sfield_field`;
UPDATE `crm_workflow_stage_fields` sf
  JOIN `crm_stage_form_fields_old` o ON o.`id` = sf.`form_field_id`
  JOIN `crm_master_form_fields` m ON m.`form_code` = o.`form_code` AND m.`section_name` = o.`section_name` AND m.`code` = o.`code`
  SET sf.`form_field_id` = m.`id`;
ALTER TABLE `crm_workflow_stage_fields` ADD CONSTRAINT `fk_wf_sfield_field` FOREIGN KEY (`form_field_id`) REFERENCES `crm_master_form_fields` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
DROP TABLE `crm_stage_form_fields_old`;

-- =====================================================================
-- Part 8: one unique code per master field (section + field) and the stage stores it (form_field_code, FK) instead of an id.
-- =====================================================================
-- A field has ONE unique code: the section and the field (e.g. REGISTRATION-OFFICE-COMPANY-DOMICILE-PROVINCE). The same field name in another section (the PROVINCE of the PIC,
-- of the office, of a shareholder) was one code before, so a stage could not say which one it meant. A stage now stores the code of the master field (form_field_code, FK).
UPDATE `crm_master_form_fields` SET `code` = 'BANK-FACILITIES-REFERENCES-BANK-OR-FIN-INSTITUTION' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Bank Facilities & References' AND `code` = 'BANKORFININSTITUTION';
UPDATE `crm_master_form_fields` SET `code` = 'BANK-FACILITIES-REFERENCES-CREDIT-FACILITY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Bank Facilities & References' AND `code` = 'CREDITFACILITY';
UPDATE `crm_master_form_fields` SET `code` = 'BANK-FACILITIES-REFERENCES-CURRENCY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Bank Facilities & References' AND `code` = 'CURRENCY';
UPDATE `crm_master_form_fields` SET `code` = 'BANK-FACILITIES-REFERENCES-FACILITY-STATUS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Bank Facilities & References' AND `code` = 'FACILITYSTATUS';
UPDATE `crm_master_form_fields` SET `code` = 'BANK-FACILITIES-REFERENCES-INTEREST-RATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Bank Facilities & References' AND `code` = 'INTERESTRATE';
UPDATE `crm_master_form_fields` SET `code` = 'BANK-FACILITIES-REFERENCES-MONTHLY-INSTALLMENT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Bank Facilities & References' AND `code` = 'MONTHLYINSTALLMENT';
UPDATE `crm_master_form_fields` SET `code` = 'BANK-FACILITIES-REFERENCES-PAYMENT-RECORD' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Bank Facilities & References' AND `code` = 'PAYMENTRECORD';
UPDATE `crm_master_form_fields` SET `code` = 'BANK-FACILITIES-REFERENCES-REFERENCE-COMMENTS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Bank Facilities & References' AND `code` = 'REFERENCECOMMENTS';
UPDATE `crm_master_form_fields` SET `code` = 'BANK-FACILITIES-REFERENCES-YEAR-STARTED' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Bank Facilities & References' AND `code` = 'YEARSTARTED';
UPDATE `crm_master_form_fields` SET `code` = 'BUSINESS-PROFILE-DEED-LEGALITY-BUSINESS-ROLE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Business Profile & Deed Legality' AND `code` = 'BUSINESSROLE';
UPDATE `crm_master_form_fields` SET `code` = 'BUSINESS-PROFILE-DEED-LEGALITY-EXPERIENCE-MONTHS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Business Profile & Deed Legality' AND `code` = 'EXPERIENCEMONTHS';
UPDATE `crm_master_form_fields` SET `code` = 'BUSINESS-PROFILE-DEED-LEGALITY-EXPERIENCE-YEARS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Business Profile & Deed Legality' AND `code` = 'EXPERIENCEYEARS';
UPDATE `crm_master_form_fields` SET `code` = 'BUSINESS-PROFILE-DEED-LEGALITY-INDUSTRY-SEGMENT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Business Profile & Deed Legality' AND `code` = 'INDUSTRYSEGMENT';
UPDATE `crm_master_form_fields` SET `code` = 'BUSINESS-PROFILE-DEED-LEGALITY-LATEST-DEED-DATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Business Profile & Deed Legality' AND `code` = 'LATESTDEEDDATE';
UPDATE `crm_master_form_fields` SET `code` = 'BUSINESS-PROFILE-DEED-LEGALITY-LATEST-DEED-NO' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Business Profile & Deed Legality' AND `code` = 'LATESTDEEDNO';
UPDATE `crm_master_form_fields` SET `code` = 'BUSINESS-PROFILE-DEED-LEGALITY-MAIN-BUSINESS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Business Profile & Deed Legality' AND `code` = 'MAINBUSINESS';
UPDATE `crm_master_form_fields` SET `code` = 'BUSINESS-PROFILE-DEED-LEGALITY-REPAYMENT-SOURCE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Business Profile & Deed Legality' AND `code` = 'REPAYMENTSOURCE';
UPDATE `crm_master_form_fields` SET `code` = 'DEBTOR-IDENTITY-CLASSIFICATION-COMPANY-NAME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Debtor Identity & Classification' AND `code` = 'COMPANYNAME';
UPDATE `crm_master_form_fields` SET `code` = 'DEBTOR-IDENTITY-CLASSIFICATION-COMPANY-TYPE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Debtor Identity & Classification' AND `code` = 'COMPANYTYPE';
UPDATE `crm_master_form_fields` SET `code` = 'DEBTOR-IDENTITY-CLASSIFICATION-CUSTOMER-CATEGORY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Debtor Identity & Classification' AND `code` = 'CUSTOMERCATEGORY';
UPDATE `crm_master_form_fields` SET `code` = 'DEBTOR-IDENTITY-CLASSIFICATION-ESTABLISHMENT-ACT-NO' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Debtor Identity & Classification' AND `code` = 'ESTABLISHMENTACTNO';
UPDATE `crm_master_form_fields` SET `code` = 'DEBTOR-IDENTITY-CLASSIFICATION-ESTABLISHMENT-DATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Debtor Identity & Classification' AND `code` = 'ESTABLISHMENTDATE';
UPDATE `crm_master_form_fields` SET `code` = 'DEBTOR-IDENTITY-CLASSIFICATION-NIB' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Debtor Identity & Classification' AND `code` = 'NIB';
UPDATE `crm_master_form_fields` SET `code` = 'DEBTOR-IDENTITY-CLASSIFICATION-NIB-DATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Debtor Identity & Classification' AND `code` = 'NIBDATE';
UPDATE `crm_master_form_fields` SET `code` = 'DEBTOR-IDENTITY-CLASSIFICATION-NPWP' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Debtor Identity & Classification' AND `code` = 'NPWP';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-CURRENT-ASSETS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'CURRENTASSETS';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-CURRENT-LIABILITIES' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'CURRENTLIABILITIES';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-EQUITY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'EQUITY';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-FINANCIAL-AUDITED' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'FINANCIALAUDITED';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-FISCAL-YEAR' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'FISCALYEAR';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-GROSS-MARGIN' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'GROSSMARGIN';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-NET-INCOME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'NETINCOME';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-NON-CURRENT-ASSETS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'NONCURRENTASSETS';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-NON-CURRENT-LIABILITIES' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'NONCURRENTLIABILITIES';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-OPERATING-MARGIN' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'OPERATINGMARGIN';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-REVENUE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'REVENUE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-TAX' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'TAX';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-TOTAL-ASSETS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'TOTALASSETS';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-TOTAL-LIAB-AND-EQUITY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'TOTALLIABANDEQUITY';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCIAL-STATEMENTS-TOTAL-LIABILITIES' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financial Statements' AND `code` = 'TOTALLIABILITIES';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-APPLICATION-SOURCE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'APPLICATIONSOURCE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-AUDITED-FINANCIAL-STATEMENTS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'AUDITED-FINANCIAL-STATEMENTS';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-BANK-FINANCING-FACILITY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'BANK-FINANCING-FACILITY';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-BANK-STATEMENTS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'BANK-STATEMENTS';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-COMPANY-PROFILE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'COMPANY-PROFILE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-COPY-ID-BOD-SHAREHOLDER' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'COPY-ID-BOD-SHAREHOLDER';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-CURRENCY-CHOICE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'CURRENCYCHOICE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-DECREE-MINISTRY-OF-LAW' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'DECREE-MINISTRY-OF-LAW';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-DEED-ESTABLISHMENT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'DEED-ESTABLISHMENT';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-FINANCING-METHOD' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'FINANCINGMETHOD';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-FINANCING-VALUE-PROP' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'FINANCINGVALUEPROP';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-FL-CURRENCY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'FLCURRENCY';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-FL-DEPOSIT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'FLDEPOSIT';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-FL-INVESTMENT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'FLINVESTMENT';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-FL-PAYMENT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'FLPAYMENT';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-FL-RATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'FLRATE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-FL-TENOR' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'FLTENOR';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-IF-CURRENCY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'IFCURRENCY';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-IF-DOWN-PAYMENT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'IFDOWNPAYMENT';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-IF-PAYMENT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'IFPAYMENT';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-IF-PURPOSE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'IFPURPOSE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-IF-RATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'IFRATE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-IF-TENOR' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'IFTENOR';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-LEGALITY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'LEGALITY';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-LIST-OF-FIXED-ASSETS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'LIST-OF-FIXED-ASSETS';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-PRODUCTION-REPORT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'PRODUCTION-REPORT';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-PROJECT-CONTRACTS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'PROJECT-CONTRACTS';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-PROP-ASSET-LG-HE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'PROPASSETLGHE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-PROP-ASSET-LG-TRUCK' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'PROPASSETLGTRUCK';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-PROP-ASSET-NLG-HE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'PROPASSETNLGHE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-PROP-ASSET-NLG-TRUCK' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'PROPASSETNLGTRUCK';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-PROPOSAL-NOTES' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'PROPOSALNOTES';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-SLB-CURRENCY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'SLBCURRENCY';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-SLB-DEPOSIT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'SLBDEPOSIT';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-SLB-PAYMENT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'SLBPAYMENT';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-SLB-PURPOSE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'SLBPURPOSE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-SLB-RATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'SLBRATE';
UPDATE `crm_master_form_fields` SET `code` = 'FINANCING-PROPOSAL-SLB-TENOR' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Financing Proposal' AND `code` = 'SLBTENOR';
UPDATE `crm_master_form_fields` SET `code` = 'INDUSTRY-SEGMENTATION-ACTIVE-PROJECTS-CONTRACT-STATUS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Industry Segmentation & Active Projects' AND `code` = 'CONTRACTSTATUS';
UPDATE `crm_master_form_fields` SET `code` = 'INDUSTRY-SEGMENTATION-ACTIVE-PROJECTS-PROJECT-LOCATION' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Industry Segmentation & Active Projects' AND `code` = 'PROJECTLOCATION';
UPDATE `crm_master_form_fields` SET `code` = 'INDUSTRY-SEGMENTATION-ACTIVE-PROJECTS-PROJECT-OWNER' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Industry Segmentation & Active Projects' AND `code` = 'PROJECTOWNER';
UPDATE `crm_master_form_fields` SET `code` = 'INDUSTRY-SEGMENTATION-ACTIVE-PROJECTS-PROJECT-ROLE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Industry Segmentation & Active Projects' AND `code` = 'PROJECTROLE';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-DECREE-DATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'DECREEDATE';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-DECREE-NUMBER' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'DECREENUMBER';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-DEED-DATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'DEEDDATE';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-DEED-NUMBER' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'DEEDNUMBER';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-MINISTERIAL-DECREE-DATE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'MINISTERIALDECREEDATE';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-MINISTERIAL-DECREE-NUMBER' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'MINISTERIALDECREENUMBER';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-NOTARY-NAME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'NOTARYNAME';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-REMARKS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'REMARKS';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-TYPE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'TYPE';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-CITY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'CITY';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-COUNTRY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'COUNTRY';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-CURRENT-ADDRESS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'CURRENTADDRESS';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-DISTRICT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'DISTRICT';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-EMAIL' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'EMAIL';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-PHONE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'PHONE';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-PIC-NAME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'PICNAME';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-POSITION' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'POSITION';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-POSTAL-CODE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'POSTALCODE';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-PROVINCE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'PROVINCE';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-RT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'RT';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-RW' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'RW';
UPDATE `crm_master_form_fields` SET `code` = 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC-VILLAGE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Primary Contact / Person in Charge (PIC)' AND `code` = 'VILLAGE';
UPDATE `crm_master_form_fields` SET `code` = 'PURPOSE-OF-FINANCING-FIXED-ASSETS-ASSET-SUMMARY-HE-LIU-GONG' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Purpose of Financing & Fixed Assets' AND `code` = 'ASSETSUMMARYHELIUGONG';
UPDATE `crm_master_form_fields` SET `code` = 'PURPOSE-OF-FINANCING-FIXED-ASSETS-ASSET-SUMMARY-HE-NON-LIU-GONG' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Purpose of Financing & Fixed Assets' AND `code` = 'ASSETSUMMARYHENONLIUGONG';
UPDATE `crm_master_form_fields` SET `code` = 'PURPOSE-OF-FINANCING-FIXED-ASSETS-ASSET-SUMMARY-TRUCK-LIU-GONG' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Purpose of Financing & Fixed Assets' AND `code` = 'ASSETSUMMARYTRUCKLIUGONG';
UPDATE `crm_master_form_fields` SET `code` = 'PURPOSE-OF-FINANCING-FIXED-ASSETS-ASSET-SUMMARY-TRUCK-NON-LIU-GONG' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Purpose of Financing & Fixed Assets' AND `code` = 'ASSETSUMMARYTRUCKNONLIUGONG';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-BRANCH-CODE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'BRANCHCODE';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-CITY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'CITY';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-COMPANY-ADDRESS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'COMPANYADDRESS';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-DISTRICT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'DISTRICT';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-EMAIL' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'EMAIL';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-LOCATION-STATUS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'LOCATIONSTATUS';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-PHONE-FAX' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'PHONEFAX';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-POSTAL-CODE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'POSTALCODE';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-PROVINCE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'PROVINCE';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-RT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'RT';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-RW' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'RW';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-VILLAGE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'VILLAGE';
UPDATE `crm_master_form_fields` SET `code` = 'REGISTRATION-OFFICE-COMPANY-DOMICILE-WEBSITE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Registration Office & Company Domicile' AND `code` = 'WEBSITE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-ADDRESS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'ADDRESS';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-AGE-MONTHS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'AGEMONTHS';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-AGE-YEARS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'AGEYEARS';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-CITIZENSHIP' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'CITIZENSHIP';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-CITY-REGENCY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'CITYREGENCY';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-COUNTRY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'COUNTRY';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-DATE-OF-BIRTH' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'DATEOFBIRTH';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-DEPOSITED-CAPITAL' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'DEPOSITEDCAPITAL';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-DESIGNATION' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'DESIGNATION';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-DISTRICT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'DISTRICT';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-EMAIL' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'EMAIL';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-FIRST-NAME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'FIRSTNAME';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-GENDER' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'GENDER';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-ID-NUMBER' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'IDNUMBER';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-ID-NUMBER-SECONDARY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'IDNUMBERSECONDARY';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-ID-TYPE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'IDTYPE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-LAST-NAME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'LASTNAME';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-MARITAL-STATUS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'MARITALSTATUS';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-MIDDLE-NAME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'MIDDLENAME';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-MOBILE-PHONE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'MOBILEPHONE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-NATIONALITY-TYPE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'NATIONALITYTYPE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-OCCUPATION' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'OCCUPATION';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-POSTAL-CODE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'POSTALCODE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-PRIMARY-CAPITAL' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'PRIMARYCAPITAL';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-PROVINCE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'PROVINCE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-REPRESENTATIVE-TYPE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'REPRESENTATIVETYPE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-RT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'RT';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-RW' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'RW';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-SHARE-AMOUNT' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'SHAREAMOUNT';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-SHAREHOLDER-NAME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'SHAREHOLDERNAME';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-SHAREHOLDER-POSITION' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'SHAREHOLDERPOSITION';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-SHARE-PERCENTAGE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'SHAREPERCENTAGE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-SIGNATORY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'SIGNATORY';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-STAKEHOLDER-TYPE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'STAKEHOLDERTYPE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-TAX-NUMBER' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'TAXNUMBER';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-TITLE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'TITLE';
UPDATE `crm_master_form_fields` SET `code` = 'SHAREHOLDERS-MANAGEMENT-VILLAGE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Shareholders & Management' AND `code` = 'VILLAGE';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-UNITS-UNIT-CATEGORY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Equipment Units' AND `code` = 'UNITCATEGORY';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-UNITS-BRAND' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Equipment Units' AND `code` = 'BRAND';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-UNITS-UNIT-TYPE' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Equipment Units' AND `code` = 'UNITTYPE';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-UNITS-MODEL-NAME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Equipment Units' AND `code` = 'MODELNAME';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-UNITS-ASSET-NAME' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Equipment Units' AND `code` = 'ASSETNAME';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-UNITS-CLASS-TON' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Equipment Units' AND `code` = 'CLASSTON';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-UNITS-QUANTITY' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Equipment Units' AND `code` = 'QUANTITY';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-UNITS-YEARS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Equipment Units' AND `code` = 'YEARS';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-UNITS-SPECIFICATIONS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Equipment Units' AND `code` = 'SPECIFICATIONS';
UPDATE `crm_master_form_fields` SET `code` = 'LEGAL-DEEDS-AMENDMENTS-REMARK-CATEGORY-IDS' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Legal Deeds & Amendments' AND `code` = 'REMARKCATEGORYIDS';
UPDATE `crm_master_form_fields` SET `code` = 'PURPOSE-OF-FINANCING-FIXED-ASSETS-FINANCING-PURPOSE-DETAIL' WHERE `form_code` = 'FAP-FORM' AND `section_name` = 'Purpose of Financing & Fixed Assets' AND `code` = 'FINANCINGPURPOSEDETAIL';
UPDATE `crm_master_form_fields` SET `code` = 'CROSS-CHECK-WITH-DEALER-LMI-APPLICANT-PEFINDO-CHECK' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Cross-Check with Dealer / LMI' AND `code` = 'APPLICANTPEFINDOCHECK';
UPDATE `crm_master_form_fields` SET `code` = 'CROSS-CHECK-WITH-DEALER-LMI-DEALER-CHECK' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Cross-Check with Dealer / LMI' AND `code` = 'DEALERCHECK';
UPDATE `crm_master_form_fields` SET `code` = 'CROSS-CHECK-WITH-DEALER-LMI-LMI-AR-CHECK' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Cross-Check with Dealer / LMI' AND `code` = 'LMIARCHECK';
UPDATE `crm_master_form_fields` SET `code` = 'CROSS-CHECK-WITH-DEALER-LMI-TOP-DEALER-TO-CUSTOMER' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Cross-Check with Dealer / LMI' AND `code` = 'TOPDEALERTOCUSTOMER';
UPDATE `crm_master_form_fields` SET `code` = 'CROSS-CHECK-WITH-DEALER-LMI-TOP-LMI-TO-DEALER' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Cross-Check with Dealer / LMI' AND `code` = 'TOPLMITODEALER';
UPDATE `crm_master_form_fields` SET `code` = 'CUSTOMER-GROUP-BACKGROUND-BUSINESS-DEV-BACKGROUND' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Customer & Group Background' AND `code` = 'BUSINESSDEVBACKGROUND';
UPDATE `crm_master_form_fields` SET `code` = 'CUSTOMER-GROUP-BACKGROUND-COMPANY-BACKGROUND' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Customer & Group Background' AND `code` = 'COMPANYBACKGROUND';
UPDATE `crm_master_form_fields` SET `code` = 'CUSTOMER-GROUP-BACKGROUND-EXISTING-FINCO-BACKUP' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Customer & Group Background' AND `code` = 'EXISTINGFINCOBACKUP';
UPDATE `crm_master_form_fields` SET `code` = 'CUSTOMER-GROUP-BACKGROUND-UBO-INFO' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Customer & Group Background' AND `code` = 'UBOINFO';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-POSSIBILITY-OF-SUCCESS-EQUIPMENT-JOB-FIT' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Equipment Possibility of Success' AND `code` = 'EQUIPMENTJOBFIT';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-POSSIBILITY-OF-SUCCESS-PRIOR-LIUGONG-EXPERIENCE' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Equipment Possibility of Success' AND `code` = 'PRIORLIUGONGEXPERIENCE';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-POSSIBILITY-OF-SUCCESS-SERVICE-AGREEMENT-FMC' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Equipment Possibility of Success' AND `code` = 'SERVICEAGREEMENTFMC';
UPDATE `crm_master_form_fields` SET `code` = 'EQUIPMENT-POSSIBILITY-OF-SUCCESS-UTILIZATION-DURATION' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Equipment Possibility of Success' AND `code` = 'UTILIZATIONDURATION';
UPDATE `crm_master_form_fields` SET `code` = 'EXPERT-JUDGEMENT-CONCLUSION-APPROVED-BY' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Expert Judgement Conclusion' AND `code` = 'APPROVEDBY';
UPDATE `crm_master_form_fields` SET `code` = 'EXPERT-JUDGEMENT-CONCLUSION-PROPOSED-BY' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Expert Judgement Conclusion' AND `code` = 'PROPOSEDBY';
UPDATE `crm_master_form_fields` SET `code` = 'EXPERT-JUDGEMENT-CONCLUSION-RECOMMENDATION' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Expert Judgement Conclusion' AND `code` = 'RECOMMENDATION';
UPDATE `crm_master_form_fields` SET `code` = 'EXPERT-JUDGEMENT-CONCLUSION-REVIEWED-BY' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Expert Judgement Conclusion' AND `code` = 'REVIEWEDBY';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-CUSTOMER-AREA' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'CUSTOMERAREA';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-CUSTOMER-PIC' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'CUSTOMERPIC';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-CUSTOMER-PROJECT-NAME' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'CUSTOMERPROJECTNAME';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-DEALER-PIC' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'DEALERPIC';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-EQUITY' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'EQUITY';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-FAP-NUMBER' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'FAPNUMBER';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-LEAD-SOURCE' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'LEADSOURCE';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-LFI-PIC' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'LFIPIC';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-LMI-PIC' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'LMIPIC';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-PAID-UP-CAPITAL' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'PAIDUPCAPITAL';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-PRE-ANALYSIS-DATE' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'PREANALYSISDATE';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-PRE-ANALYSIS-NO' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'PREANALYSISNO';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-SOURCE-OF-REPAYMENT' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'SOURCEOFREPAYMENT';
UPDATE `crm_master_form_fields` SET `code` = 'GENERAL-INFORMATION-TAX-ID' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'General Information' AND `code` = 'TAXID';
UPDATE `crm_master_form_fields` SET `code` = 'PROJECT-INFORMATION-CUSTOMER-ROLE' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Project Information' AND `code` = 'CUSTOMERROLE';
UPDATE `crm_master_form_fields` SET `code` = 'PROJECT-INFORMATION-FINANCING-SCHEME-REQUESTED' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Project Information' AND `code` = 'FINANCINGSCHEMEREQUESTED';
UPDATE `crm_master_form_fields` SET `code` = 'PROJECT-INFORMATION-HOLDING-GROUP' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Project Information' AND `code` = 'HOLDINGGROUP';
UPDATE `crm_master_form_fields` SET `code` = 'PROJECT-INFORMATION-OTHER-CONTRACTORS' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Project Information' AND `code` = 'OTHERCONTRACTORS';
UPDATE `crm_master_form_fields` SET `code` = 'PROJECT-INFORMATION-PROJECT-LOCATION' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Project Information' AND `code` = 'PROJECTLOCATION';
UPDATE `crm_master_form_fields` SET `code` = 'PROJECT-INFORMATION-PROJECT-NAME' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Project Information' AND `code` = 'PROJECTNAME';
UPDATE `crm_master_form_fields` SET `code` = 'PROJECT-INFORMATION-PROJECT-STATUS' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Project Information' AND `code` = 'PROJECTSTATUS';
UPDATE `crm_master_form_fields` SET `code` = 'UNIT-DELIVERY-STATUS-QA-CHECK-DELIVERY-DATE' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Unit Delivery Status & QA Check' AND `code` = 'DELIVERYDATE';
UPDATE `crm_master_form_fields` SET `code` = 'UNIT-DELIVERY-STATUS-QA-CHECK-DELIVERY-STATUS' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Unit Delivery Status & QA Check' AND `code` = 'DELIVERYSTATUS';
UPDATE `crm_master_form_fields` SET `code` = 'UNIT-DELIVERY-STATUS-QA-CHECK-QA-CONCLUSION' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Unit Delivery Status & QA Check' AND `code` = 'QACONCLUSION';
UPDATE `crm_master_form_fields` SET `code` = 'UNIT-DELIVERY-STATUS-QA-CHECK-QA-ILINK-COMMENT' WHERE `form_code` = 'PRE-ANALYSIS-FORM' AND `section_name` = 'Unit Delivery Status & QA Check' AND `code` = 'QAILINKCOMMENT';
ALTER TABLE `crm_master_form_fields` ADD UNIQUE KEY `uk_master_form_field_code` (`code`), ADD KEY `idx_master_form_field_form` (`form_code`, `section_name`);
ALTER TABLE `crm_master_form_fields` DROP INDEX `uk_master_form_field`;

ALTER TABLE `crm_workflow_stage_fields` ADD COLUMN `form_field_code` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `stage_code`;
UPDATE `crm_workflow_stage_fields` sf JOIN `crm_master_form_fields` m ON m.`id` = sf.`form_field_id` SET sf.`form_field_code` = m.`code`;
ALTER TABLE `crm_workflow_stage_fields` MODIFY `form_field_code` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE `crm_workflow_stage_fields` DROP FOREIGN KEY `fk_wf_sfield_field`;
ALTER TABLE `crm_workflow_stage_fields` DROP INDEX `uk_wf_stage_field`, DROP COLUMN `form_field_id`;
ALTER TABLE `crm_workflow_stage_fields` ADD UNIQUE KEY `uk_wf_stage_field` (`stage_id`, `form_field_code`);
ALTER TABLE `crm_workflow_stage_fields` ADD CONSTRAINT `fk_wf_sfield_field` FOREIGN KEY (`form_field_code`) REFERENCES `crm_master_form_fields` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE;
