-- New instructor accounts receive a temporary password from university staff.
-- This flag keeps the first-login password change persistent across sessions.

SET @has_must_change_password := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin'
    AND COLUMN_NAME = 'must_change_password'
);

SET @sql := IF(
  @has_must_change_password = 0,
  'ALTER TABLE admin ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER admin_password',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
