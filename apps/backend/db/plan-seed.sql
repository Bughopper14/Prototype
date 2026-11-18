-- =====================================================================
-- plan-seed.sql : DATA ONLY (no schema change). Approval authorities, rows of users_authorities and users_role_authorities.
-- Name pattern: APPCODE_DEPTCODE_SUBJECT_ACTION. The subject is what is approved and never changes with a name: a FORM code for a stage
-- (CRM_BS_FAP-FORM_APPROVE), a master DOCUMENT code for a document (CRM_BS_KTP_APPROVE) or GROUP for a stage group (CRM_BS_GROUP_APPROVE).
-- One authority covers approve and reject, one per department (Business Support, Credit Analyst, Legal, Management); the role of that department
-- holds it. Which authorities a workflow editor may choose for a place is in crm_workflow_authority_options (plan-schema.sql Part 4).
-- Run after plan-schema.sql; safe to run again (INSERT IGNORE). The users tables belong to the users developer: hand this file over.
-- =====================================================================
SET NAMES utf8mb4;
SET @crm = (SELECT `id` FROM `users_applications` WHERE `app_name` LIKE 'CRM%' LIMIT 1);

INSERT IGNORE INTO `users_authorities` (`app_id`, `authority_name`, `description`) VALUES
  (@crm, 'CRM_BS_GROUP_APPROVE', 'Approve or reject a stage group as Business Support'),
  (@crm, 'CRM_BS_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Business Support'),
  (@crm, 'CRM_BS_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Business Support'),
  (@crm, 'CRM_BS_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Business Support'),
  (@crm, 'CRM_BS_FAP_APPROVE', 'Approve or reject the document FAP as Business Support'),
  (@crm, 'CRM_BS_ICLF_APPROVE', 'Approve or reject the document ICLF as Business Support'),
  (@crm, 'CRM_BS_BANK_APPROVE', 'Approve or reject the document BANK as Business Support'),
  (@crm, 'CRM_BS_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Business Support'),
  (@crm, 'CRM_BS_DEED_APPROVE', 'Approve or reject the document DEED as Business Support'),
  (@crm, 'CRM_BS_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Business Support'),
  (@crm, 'CRM_BS_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Business Support'),
  (@crm, 'CRM_BS_KTP_APPROVE', 'Approve or reject the document KTP as Business Support'),
  (@crm, 'CRM_BS_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Business Support'),
  (@crm, 'CRM_BS_NIB_APPROVE', 'Approve or reject the document NIB as Business Support'),
  (@crm, 'CRM_BS_NPWP_APPROVE', 'Approve or reject the document NPWP as Business Support'),
  (@crm, 'CRM_BS_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Business Support'),
  (@crm, 'CRM_BS_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Business Support'),
  (@crm, 'CRM_CA_GROUP_APPROVE', 'Approve or reject a stage group as Credit Analyst'),
  (@crm, 'CRM_CA_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Credit Analyst'),
  (@crm, 'CRM_CA_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Credit Analyst'),
  (@crm, 'CRM_CA_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Credit Analyst'),
  (@crm, 'CRM_CA_FAP_APPROVE', 'Approve or reject the document FAP as Credit Analyst'),
  (@crm, 'CRM_CA_ICLF_APPROVE', 'Approve or reject the document ICLF as Credit Analyst'),
  (@crm, 'CRM_CA_BANK_APPROVE', 'Approve or reject the document BANK as Credit Analyst'),
  (@crm, 'CRM_CA_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Credit Analyst'),
  (@crm, 'CRM_CA_DEED_APPROVE', 'Approve or reject the document DEED as Credit Analyst'),
  (@crm, 'CRM_CA_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Credit Analyst'),
  (@crm, 'CRM_CA_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Credit Analyst'),
  (@crm, 'CRM_CA_KTP_APPROVE', 'Approve or reject the document KTP as Credit Analyst'),
  (@crm, 'CRM_CA_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Credit Analyst'),
  (@crm, 'CRM_CA_NIB_APPROVE', 'Approve or reject the document NIB as Credit Analyst'),
  (@crm, 'CRM_CA_NPWP_APPROVE', 'Approve or reject the document NPWP as Credit Analyst'),
  (@crm, 'CRM_CA_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Credit Analyst'),
  (@crm, 'CRM_CA_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Credit Analyst'),
  (@crm, 'CRM_LEGAL_GROUP_APPROVE', 'Approve or reject a stage group as Legal'),
  (@crm, 'CRM_LEGAL_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Legal'),
  (@crm, 'CRM_LEGAL_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Legal'),
  (@crm, 'CRM_LEGAL_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Legal'),
  (@crm, 'CRM_LEGAL_FAP_APPROVE', 'Approve or reject the document FAP as Legal'),
  (@crm, 'CRM_LEGAL_ICLF_APPROVE', 'Approve or reject the document ICLF as Legal'),
  (@crm, 'CRM_LEGAL_BANK_APPROVE', 'Approve or reject the document BANK as Legal'),
  (@crm, 'CRM_LEGAL_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Legal'),
  (@crm, 'CRM_LEGAL_DEED_APPROVE', 'Approve or reject the document DEED as Legal'),
  (@crm, 'CRM_LEGAL_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Legal'),
  (@crm, 'CRM_LEGAL_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Legal'),
  (@crm, 'CRM_LEGAL_KTP_APPROVE', 'Approve or reject the document KTP as Legal'),
  (@crm, 'CRM_LEGAL_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Legal'),
  (@crm, 'CRM_LEGAL_NIB_APPROVE', 'Approve or reject the document NIB as Legal'),
  (@crm, 'CRM_LEGAL_NPWP_APPROVE', 'Approve or reject the document NPWP as Legal'),
  (@crm, 'CRM_LEGAL_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Legal'),
  (@crm, 'CRM_LEGAL_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Legal'),
  (@crm, 'CRM_MANAGEMENT_GROUP_APPROVE', 'Approve or reject a stage group as Management'),
  (@crm, 'CRM_MANAGEMENT_FAP-FORM_APPROVE', 'Approve or reject a stage that shows the FAP form as Management'),
  (@crm, 'CRM_MANAGEMENT_PRE-ANALYSIS-FORM_APPROVE', 'Approve or reject a stage that shows the Pre-analysis form as Management'),
  (@crm, 'CRM_MANAGEMENT_ICLF-FORM_APPROVE', 'Approve or reject a stage that shows the ICLF form as Management'),
  (@crm, 'CRM_MANAGEMENT_FAP_APPROVE', 'Approve or reject the document FAP as Management'),
  (@crm, 'CRM_MANAGEMENT_ICLF_APPROVE', 'Approve or reject the document ICLF as Management'),
  (@crm, 'CRM_MANAGEMENT_BANK_APPROVE', 'Approve or reject the document BANK as Management'),
  (@crm, 'CRM_MANAGEMENT_CONTRACT_APPROVE', 'Approve or reject the document CONTRACT as Management'),
  (@crm, 'CRM_MANAGEMENT_DEED_APPROVE', 'Approve or reject the document DEED as Management'),
  (@crm, 'CRM_MANAGEMENT_EKITAS_APPROVE', 'Approve or reject the document EKITAS as Management'),
  (@crm, 'CRM_MANAGEMENT_FINANCIALS_APPROVE', 'Approve or reject the document FINANCIALS as Management'),
  (@crm, 'CRM_MANAGEMENT_KTP_APPROVE', 'Approve or reject the document KTP as Management'),
  (@crm, 'CRM_MANAGEMENT_LEGAL-OPINION_APPROVE', 'Approve or reject the document LEGAL-OPINION as Management'),
  (@crm, 'CRM_MANAGEMENT_NIB_APPROVE', 'Approve or reject the document NIB as Management'),
  (@crm, 'CRM_MANAGEMENT_NPWP_APPROVE', 'Approve or reject the document NPWP as Management'),
  (@crm, 'CRM_MANAGEMENT_PREANALYSIS_APPROVE', 'Approve or reject the document PREANALYSIS as Management'),
  (@crm, 'CRM_MANAGEMENT_QUOTATION_APPROVE', 'Approve or reject the document QUOTATION as Management');

-- holders: the role of the department that approves (Super Admin approves anything without holding them)
INSERT IGNORE INTO `users_role_authorities` (`role_id`, `authority_id`) SELECT r.`id`, a.`id` FROM `users_roles` r JOIN `users_authorities` a ON a.`app_id` = @crm AND a.`authority_name` IN ('CRM_BS_GROUP_APPROVE','CRM_BS_FAP-FORM_APPROVE','CRM_BS_PRE-ANALYSIS-FORM_APPROVE','CRM_BS_ICLF-FORM_APPROVE','CRM_BS_FAP_APPROVE','CRM_BS_ICLF_APPROVE','CRM_BS_BANK_APPROVE','CRM_BS_CONTRACT_APPROVE','CRM_BS_DEED_APPROVE','CRM_BS_EKITAS_APPROVE','CRM_BS_FINANCIALS_APPROVE','CRM_BS_KTP_APPROVE','CRM_BS_LEGAL-OPINION_APPROVE','CRM_BS_NIB_APPROVE','CRM_BS_NPWP_APPROVE','CRM_BS_PREANALYSIS_APPROVE','CRM_BS_QUOTATION_APPROVE') WHERE r.`app_id` = @crm AND r.`role_name` = 'Business Support (BS)';
INSERT IGNORE INTO `users_role_authorities` (`role_id`, `authority_id`) SELECT r.`id`, a.`id` FROM `users_roles` r JOIN `users_authorities` a ON a.`app_id` = @crm AND a.`authority_name` IN ('CRM_CA_GROUP_APPROVE','CRM_CA_FAP-FORM_APPROVE','CRM_CA_PRE-ANALYSIS-FORM_APPROVE','CRM_CA_ICLF-FORM_APPROVE','CRM_CA_FAP_APPROVE','CRM_CA_ICLF_APPROVE','CRM_CA_BANK_APPROVE','CRM_CA_CONTRACT_APPROVE','CRM_CA_DEED_APPROVE','CRM_CA_EKITAS_APPROVE','CRM_CA_FINANCIALS_APPROVE','CRM_CA_KTP_APPROVE','CRM_CA_LEGAL-OPINION_APPROVE','CRM_CA_NIB_APPROVE','CRM_CA_NPWP_APPROVE','CRM_CA_PREANALYSIS_APPROVE','CRM_CA_QUOTATION_APPROVE') WHERE r.`app_id` = @crm AND r.`role_name` = 'Credit Analyst (CA)';
INSERT IGNORE INTO `users_role_authorities` (`role_id`, `authority_id`) SELECT r.`id`, a.`id` FROM `users_roles` r JOIN `users_authorities` a ON a.`app_id` = @crm AND a.`authority_name` IN ('CRM_LEGAL_GROUP_APPROVE','CRM_LEGAL_FAP-FORM_APPROVE','CRM_LEGAL_PRE-ANALYSIS-FORM_APPROVE','CRM_LEGAL_ICLF-FORM_APPROVE','CRM_LEGAL_FAP_APPROVE','CRM_LEGAL_ICLF_APPROVE','CRM_LEGAL_BANK_APPROVE','CRM_LEGAL_CONTRACT_APPROVE','CRM_LEGAL_DEED_APPROVE','CRM_LEGAL_EKITAS_APPROVE','CRM_LEGAL_FINANCIALS_APPROVE','CRM_LEGAL_KTP_APPROVE','CRM_LEGAL_LEGAL-OPINION_APPROVE','CRM_LEGAL_NIB_APPROVE','CRM_LEGAL_NPWP_APPROVE','CRM_LEGAL_PREANALYSIS_APPROVE','CRM_LEGAL_QUOTATION_APPROVE') WHERE r.`app_id` = @crm AND r.`role_name` = 'Legal Officer (LEGAL)';
INSERT IGNORE INTO `users_role_authorities` (`role_id`, `authority_id`) SELECT r.`id`, a.`id` FROM `users_roles` r JOIN `users_authorities` a ON a.`app_id` = @crm AND a.`authority_name` IN ('CRM_LEGAL_GROUP_APPROVE','CRM_LEGAL_FAP-FORM_APPROVE','CRM_LEGAL_PRE-ANALYSIS-FORM_APPROVE','CRM_LEGAL_ICLF-FORM_APPROVE','CRM_LEGAL_FAP_APPROVE','CRM_LEGAL_ICLF_APPROVE','CRM_LEGAL_BANK_APPROVE','CRM_LEGAL_CONTRACT_APPROVE','CRM_LEGAL_DEED_APPROVE','CRM_LEGAL_EKITAS_APPROVE','CRM_LEGAL_FINANCIALS_APPROVE','CRM_LEGAL_KTP_APPROVE','CRM_LEGAL_LEGAL-OPINION_APPROVE','CRM_LEGAL_NIB_APPROVE','CRM_LEGAL_NPWP_APPROVE','CRM_LEGAL_PREANALYSIS_APPROVE','CRM_LEGAL_QUOTATION_APPROVE') WHERE r.`app_id` = @crm AND r.`role_name` = 'Legal Approval';
INSERT IGNORE INTO `users_role_authorities` (`role_id`, `authority_id`) SELECT r.`id`, a.`id` FROM `users_roles` r JOIN `users_authorities` a ON a.`app_id` = @crm AND a.`authority_name` IN ('CRM_MANAGEMENT_GROUP_APPROVE','CRM_MANAGEMENT_FAP-FORM_APPROVE','CRM_MANAGEMENT_PRE-ANALYSIS-FORM_APPROVE','CRM_MANAGEMENT_ICLF-FORM_APPROVE','CRM_MANAGEMENT_FAP_APPROVE','CRM_MANAGEMENT_ICLF_APPROVE','CRM_MANAGEMENT_BANK_APPROVE','CRM_MANAGEMENT_CONTRACT_APPROVE','CRM_MANAGEMENT_DEED_APPROVE','CRM_MANAGEMENT_EKITAS_APPROVE','CRM_MANAGEMENT_FINANCIALS_APPROVE','CRM_MANAGEMENT_KTP_APPROVE','CRM_MANAGEMENT_LEGAL-OPINION_APPROVE','CRM_MANAGEMENT_NIB_APPROVE','CRM_MANAGEMENT_NPWP_APPROVE','CRM_MANAGEMENT_PREANALYSIS_APPROVE','CRM_MANAGEMENT_QUOTATION_APPROVE') WHERE r.`app_id` = @crm AND r.`role_name` = 'Credit Committee';

-- ---------------------------------------------------------------------
-- Old status-machine authorities: removed. The approval layer replaced them (who approves comes from the authorities above).
--   crm_verify_app_documents          verification per department   -> replaced by the approval of each document
--   crm_workflow_verify_documents, crm_workflow_recommend_credit, crm_workflow_recommend_legal, crm_workflow_final_decision, crm_workflow_return
--                                     steps of the old global status machine -> replaced by approval steps of the workflow
-- Kept as plain permissions (not approvals): crm_workflow_submit (submit a stage, ask the approval of a document), crm_workflow_start_review
-- (pre-analysis), crm_deed_approve (deed review; its approval layer is planned for later).
-- The roles that used to submit through crm_verify_app_documents (BS, CA, Legal) now hold crm_workflow_submit.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO `users_role_authorities` (`role_id`, `authority_id`)
SELECT r.`id`, a.`id` FROM `users_roles` r JOIN `users_authorities` a ON a.`app_id` = @crm AND a.`authority_name` = 'crm_workflow_submit'
WHERE r.`app_id` = @crm AND r.`role_name` IN ('Business Support (BS)', 'Credit Analyst (CA)', 'Legal Officer (LEGAL)');
DELETE ra FROM `users_role_authorities` ra JOIN `users_authorities` a ON a.`id` = ra.`authority_id`
WHERE a.`app_id` = @crm AND a.`authority_name` IN ('crm_verify_app_documents', 'crm_workflow_verify_documents', 'crm_workflow_recommend_credit', 'crm_workflow_recommend_legal', 'crm_workflow_final_decision', 'crm_workflow_return');
DELETE FROM `users_authorities`
WHERE `app_id` = @crm AND `authority_name` IN ('crm_verify_app_documents', 'crm_workflow_verify_documents', 'crm_workflow_recommend_legal', 'crm_workflow_recommend_credit', 'crm_workflow_final_decision', 'crm_workflow_return');
