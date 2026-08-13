-- Remove the obsolete morning/afternoon/evening scheduling preference.
SET @has_time_preference := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'constraint'
    AND COLUMN_NAME = 'time_preference'
);

SET @drop_time_preference_sql := IF(
  @has_time_preference > 0,
  'ALTER TABLE `constraint` DROP COLUMN `time_preference`',
  'SELECT 1'
);

PREPARE drop_time_preference_statement FROM @drop_time_preference_sql;
EXECUTE drop_time_preference_statement;
DEALLOCATE PREPARE drop_time_preference_statement;
