-- The master form fields are exactly the fields the forms have. These had no input in any form (seed leftovers) and are removed.
-- Already done in 2-seed.sql; this is only for a database made before.
DELETE FROM `crm_master_form_fields` WHERE `section_code` = 'EQUIPMENT-UNITS' OR `field_key` IN ('notaryName', 'businessDevBackground', 'holdingGroup');
DELETE FROM `crm_master_form_sections` WHERE `code` = 'EQUIPMENT-UNITS';
