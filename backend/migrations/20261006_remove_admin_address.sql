-- Admin and instructor accounts no longer collect or store postal addresses.
-- This migration is safe to run when the column has already been removed.
SET @has_admin_address := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin'
    AND COLUMN_NAME = 'address'
);

SET @drop_admin_address_sql := IF(
  @has_admin_address > 0,
  'ALTER TABLE admin DROP COLUMN address',
  'SELECT 1'
);

PREPARE drop_admin_address_statement FROM @drop_admin_address_sql;
EXECUTE drop_admin_address_statement;
DEALLOCATE PREPARE drop_admin_address_statement;
