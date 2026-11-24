-- Application number A-CCC-YY-NNNNN: CCC = customer number (1st customer = 001, kept for all its applications),
-- YY = year of creation, NNNNN = running number, +1 for every new application.
-- Only for a database made before this change (1-schema.sql already has the columns).
ALTER TABLE `crm_master_business_partners` ADD COLUMN `customer_no` int DEFAULT NULL AFTER `code`;
ALTER TABLE `crm_applications` ADD COLUMN `application_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER `id`;

-- customers that already have applications are numbered in the order of their first application
UPDATE `crm_master_business_partners` bp
JOIN (SELECT business_partner_id, ROW_NUMBER() OVER (ORDER BY MIN(created_at), business_partner_id) AS no FROM `crm_applications` GROUP BY business_partner_id) f ON f.business_partner_id = bp.id
SET bp.customer_no = f.no;

-- applications are numbered in the order they were created
UPDATE `crm_applications` a
JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS no FROM `crm_applications`) r ON r.id = a.id
JOIN `crm_master_business_partners` bp ON bp.id = a.business_partner_id
SET a.application_number = CONCAT('A-', LPAD(bp.customer_no, 3, '0'), '-', DATE_FORMAT(a.created_at, '%y'), '-', LPAD(r.no, 5, '0'));

ALTER TABLE `crm_applications` ADD UNIQUE KEY `uq_app_number` (`application_number`);
