-- 7-merge-decisions-into-steps.sql (2026-11-23)
--
-- Brings a database made from the previous 1-schema.sql (commit e033b2e and older) up to the current 1-schema.sql.
-- A database made from the current 1-schema.sql does NOT need this file.
-- RUN IT ONCE (it drops crm_application_approval_decisions, so a second run stops at the first statement that needs it).
-- Take a backup of crm_application_approval_decisions first if the history matters.
--
-- Run it with the database selected, for example:  mysql -u root -p crm_liugong < 7-merge-decisions-into-steps.sql
--
-- A step is closed by ONE decision (one step, one authority, one decision), so the decision lives on the step instead of in a table of its own:
--   decision, decided_by_user_id, decided_at, decided_via, decision_remarks (all NULL until the step is decided).
-- The status of the step already says approved or rejected; `decision` is kept because a step that was APPROVED and is then opened again (its group
-- was rejected) becomes REJECTED while its decision stays APPROVED: that is how "opened again" is told apart from "rejected by somebody".
-- The decision columns are never overwritten, not even when the step is opened again.

-- 1. the columns (same order as 1-schema.sql: right after completed_at)
ALTER TABLE `crm_application_approval_steps`
  ADD COLUMN `decision` enum('APPROVED','REJECTED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `completed_at`,
  ADD COLUMN `decided_by_user_id` int DEFAULT NULL AFTER `decision`,
  ADD COLUMN `decided_at` timestamp(3) NULL DEFAULT NULL AFTER `decided_by_user_id`,
  ADD COLUMN `decided_via` enum('WEB','LARK') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `decided_at`,
  ADD COLUMN `decision_remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci AFTER `decided_via`;

-- 2. copy the decisions onto their steps (a step with more than one decision keeps the newest)
UPDATE `crm_application_approval_steps` s
JOIN (
  SELECT x.`application_step_id`, x.`decision`, x.`user_id`, x.`decided_at`, x.`decided_via`, x.`remarks`
  FROM (SELECT d.*, ROW_NUMBER() OVER (PARTITION BY d.`application_step_id` ORDER BY d.`decided_at` DESC, d.`id` DESC) AS rn
        FROM `crm_application_approval_decisions` d) x
  WHERE x.rn = 1
) d ON d.`application_step_id` = s.`id`
SET s.`decision` = d.`decision`, s.`decided_by_user_id` = d.`user_id`, s.`decided_at` = d.`decided_at`,
    s.`decided_via` = d.`decided_via`, s.`decision_remarks` = d.`remarks`;

-- 3. steps that were opened again by the rejection of their group had their completed_at overwritten with the time they were opened again:
--    put back the time they were approved
UPDATE `crm_application_approval_steps`
SET `completed_at` = `decided_at`
WHERE `status` = 'REJECTED' AND `decision` = 'APPROVED' AND `completed_at` > `decided_at`;

-- 4. the keys and the rule (a rejection needs its reason), after the data is in
ALTER TABLE `crm_application_approval_steps`
  ADD KEY `idx_app_apstep_decider` (`decided_by_user_id`,`decision`),
  ADD CONSTRAINT `fk_app_apstep_decider` FOREIGN KEY (`decided_by_user_id`) REFERENCES `users_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `chk_app_apstep_reject_remarks` CHECK (((`decision` is null) or (`decision` <> _utf8mb4'REJECTED') or ((`decision_remarks` is not null) and (char_length(trim(`decision_remarks`)) > 0))));

-- 5. the table of decisions is no longer needed
DROP TABLE `crm_application_approval_decisions`;
