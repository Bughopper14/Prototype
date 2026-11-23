-- 8-stakeholder-mandatory-in-workflow.sql (2026-11-23)
-- For a database made before this change. A database made from the current 2-seed.sql already has these rows; running it again changes nothing (INSERT IGNORE).

-- Stakeholder fields that used to be required by the code (email, mobile phone, primary capital, ID number) are now rules of the workflow:
-- mandatory on the stage that shows the FAP form, in every workflow and every frozen workflow. They can be changed in Workflow setup (new workflows).
INSERT IGNORE INTO `crm_workflow_stage_fields` (`id`,`workflow_code`,`stage_code`,`form_field_code`,`is_mandatory`,`created_by`)
  SELECT UUID(),s.`workflow_code`,s.`code`,f.`code`,1,'seed' FROM `crm_workflow_stages` s
  JOIN `crm_master_form_fields` f ON f.`code` IN ('SHAREHOLDERS-MANAGEMENT-EMAIL','SHAREHOLDERS-MANAGEMENT-MOBILE-PHONE','SHAREHOLDERS-MANAGEMENT-PRIMARY-CAPITAL','SHAREHOLDERS-MANAGEMENT-ID-NUMBER')
  WHERE s.`form_code`='FAP-FORM';
INSERT IGNORE INTO `crm_frozen_workflow_stage_fields` (`id`,`workflow_freeze_id`,`stage_code`,`form_field_code`,`is_mandatory`)
  SELECT UUID(),s.`workflow_freeze_id`,s.`code`,f.`code`,1 FROM `crm_frozen_workflow_stages` s
  JOIN `crm_master_form_fields` f ON f.`code` IN ('SHAREHOLDERS-MANAGEMENT-EMAIL','SHAREHOLDERS-MANAGEMENT-MOBILE-PHONE','SHAREHOLDERS-MANAGEMENT-PRIMARY-CAPITAL','SHAREHOLDERS-MANAGEMENT-ID-NUMBER')
  WHERE s.`form_code`='FAP-FORM';
