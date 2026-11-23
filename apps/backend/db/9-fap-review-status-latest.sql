-- 9-fap-review-status-latest.sql (2026-11-23)
-- The FAP review no longer has a "dismissed" step: it closes (APPROVED) only when the FAP stage is submitted. Rows left as DISMISSED are brought to the
-- current meaning. Remarks and discrepancies are kept. Running it again changes nothing (no DISMISSED row is left).
--   FAP stage submitted      -> APPROVED, discrepancies stay NOTED
--   FAP stage not submitted  -> the review is open again: discrepancies OPEN, status HAS_DIFFERENCES (MATCHED when there are none), not reviewed

UPDATE `crm_fap_document_ocr_comparisons` c SET c.`comparison_status`='APPROVED'
WHERE c.`comparison_status`='DISMISSED' AND EXISTS (
  SELECT 1 FROM `crm_application_stage_progress` sp
  JOIN `crm_frozen_workflow_stages` fs ON fs.`workflow_freeze_id`=sp.`workflow_freeze_id` AND fs.`code`=sp.`stage_code` AND fs.`form_code`='FAP-FORM'
  WHERE sp.`application_id`=c.`application_id` AND sp.`submitted_at` IS NOT NULL);

UPDATE `crm_fap_document_ocr_discrepancies` d JOIN `crm_fap_document_ocr_comparisons` c ON c.`id`=d.`comparison_id`
SET d.`resolution_status`='OPEN' WHERE c.`comparison_status`='DISMISSED' AND d.`resolution_status`='NOTED';

UPDATE `crm_fap_document_ocr_comparisons` c
SET c.`has_differences`=EXISTS (SELECT 1 FROM `crm_fap_document_ocr_discrepancies` d WHERE d.`comparison_id`=c.`id`),
    c.`comparison_status`=IF(EXISTS (SELECT 1 FROM `crm_fap_document_ocr_discrepancies` d WHERE d.`comparison_id`=c.`id`),'HAS_DIFFERENCES','MATCHED'),
    c.`reviewed_by`=NULL, c.`reviewed_at`=NULL
WHERE c.`comparison_status`='DISMISSED';
