-- ============================================================================
-- RESET DATA — deletes every row of every table in the CURRENT database and
-- keeps the structure exactly as it is (tables, columns, indexes, foreign keys,
-- audit triggers). AUTO_INCREMENT counters restart at 1. This cannot be undone.
--
--   1. Back up first:   mysqldump -u root -p <db> > backup.sql
--   2. Run it:          mysql -u root -p <db> < db/reset-data.sql
--
-- The script works on whatever database you connect to; it never names one.
--
-- To keep some tables (for example the Indonesian location masters, which are
-- slow to re-import), list them in @keep_tables, comma separated, no spaces:
--   SET @keep_tables = 'master_location_provinsi,master_location_kabupaten_kota,master_location_kecamatan,master_location_kelurahan_desa,master_location_kode_pos';
--
-- After a full reset:
--   npm run db:setup                     reference data (apps, roles, authorities, mandatory rules, master data)
--   npm run user:create -- admin "<password>" "System Admin" --admin
--   location masters: re-import (backup/data-import/wilayah.sql, kodepos.sql) unless you kept them above
-- ============================================================================

SET @keep_tables = '';

DROP PROCEDURE IF EXISTS reset_all_data;

DELIMITER $$
CREATE PROCEDURE reset_all_data(IN keep_list TEXT)
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE tbl VARCHAR(128);
  DECLARE emptied INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT TABLE_NAME FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  SET FOREIGN_KEY_CHECKS = 0;
  OPEN cur;
  table_loop: LOOP
    FETCH cur INTO tbl;
    IF done = 1 THEN LEAVE table_loop; END IF;
    IF FIND_IN_SET(tbl, REPLACE(keep_list, ' ', '')) = 0 THEN
      SET @reset_sql = CONCAT('TRUNCATE TABLE `', tbl, '`');
      PREPARE reset_stmt FROM @reset_sql;
      EXECUTE reset_stmt;
      DEALLOCATE PREPARE reset_stmt;
      SET emptied = emptied + 1;
    END IF;
  END LOOP;
  CLOSE cur;
  SET FOREIGN_KEY_CHECKS = 1;

  SELECT emptied AS tables_emptied, DATABASE() AS in_database;
END$$
DELIMITER ;

CALL reset_all_data(@keep_tables);
DROP PROCEDURE reset_all_data;
