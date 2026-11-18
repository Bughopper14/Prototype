-- Migration: Add Marketing PIC and drop legacy maker columns from crm_applications

-- 1. Add Marketing PIC column and foreign key reference to users_users(id)
ALTER TABLE `crm_applications`
  ADD COLUMN `mkt_pic_id` INT NULL AFTER `current_status_id`,
  ADD KEY `idx_app_mkt_pic` (`mkt_pic_id`),
  ADD CONSTRAINT `fk_app_mkt_pic` FOREIGN KEY (`mkt_pic_id`) REFERENCES `users_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Drop legacy maker_user_id and maker_name columns, foreign key and index
ALTER TABLE `crm_applications`
  DROP FOREIGN KEY `fk_app_maker`,
  DROP KEY `idx_app_maker`,
  DROP COLUMN `maker_user_id`,
  DROP COLUMN `maker_name`;
