-- 6-alter-deed-review-status.sql (2026-11-23)
--
-- Brings a database made from the previous 1-schema.sql (commit 9be2b09 and older) up to the current 1-schema.sql.
-- A database made from the current 1-schema.sql does NOT need this file.
-- Only one enum column changes; no table or column is added or removed. Safe to run again (every statement is idempotent).
--
-- Run it with the database selected, for example:  mysql -u root -p crm_liugong < 6-alter-deed-review-status.sql
--
-- crm_fap_legal_deed_reviews.review_status: NEEDS_REVISION is renamed REJECTED (a deed has Approve and Reject only).
-- The frozen copy (crm_frozen_fap_legal_deeds.review_status, plain text) is renamed too.
--
-- (A step that the rejection of its group opened again is NOT a new status: it stays REJECTED in crm_application_approval_steps and is told apart from
--  a step somebody rejected by its decisions: it only has an APPROVED decision and no REJECTED one.)

-- The enum is changed in two steps so no row ever holds a value the column does not allow.
ALTER TABLE `crm_fap_legal_deed_reviews`
  MODIFY COLUMN `review_status` enum('PENDING','APPROVED','NEEDS_REVISION','REJECTED')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING';

UPDATE `crm_fap_legal_deed_reviews` SET `review_status` = 'REJECTED' WHERE `review_status` = 'NEEDS_REVISION';

ALTER TABLE `crm_fap_legal_deed_reviews`
  MODIFY COLUMN `review_status` enum('PENDING','APPROVED','REJECTED')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING';

UPDATE `crm_frozen_fap_legal_deeds` SET `review_status` = 'REJECTED' WHERE `review_status` = 'NEEDS_REVISION';
