-- Remove the obsolete scheduling preference from the current constraint table.
-- This is safe on databases where the column has already been removed.
SET @has_time_preference := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_constraints'
    AND COLUMN_NAME = 'time_preference'
);

SET @drop_time_preference_sql := IF(
  @has_time_preference > 0,
  'ALTER TABLE user_constraints DROP COLUMN time_preference',
  'SELECT 1'
);

PREPARE drop_time_preference_statement FROM @drop_time_preference_sql;
EXECUTE drop_time_preference_statement;
DEALLOCATE PREPARE drop_time_preference_statement;
