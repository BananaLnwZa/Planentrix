-- Add the timestamp used for optimistic locking by the admin user editor.
-- The current database baseline already contains this column, so guard the
-- ALTER to keep the migration safe to rerun.
SET @has_user_updated_at := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user'
    AND COLUMN_NAME = 'updated_at'
);

SET @add_user_updated_at_sql := IF(
  @has_user_updated_at = 0,
  'ALTER TABLE `user` ADD COLUMN `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)',
  'SELECT 1'
);

PREPARE add_user_updated_at_statement FROM @add_user_updated_at_sql;
EXECUTE add_user_updated_at_statement;
DEALLOCATE PREPARE add_user_updated_at_statement;
