-- Keep the physical choice table aligned with the documented schema and
-- allow imported Word questions to retain images attached to choices.

SET @has_choice_image_path := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'choice'
    AND COLUMN_NAME = 'choice_image_path'
);

SET @sql := IF(
  @has_choice_image_path = 0,
  'ALTER TABLE choice ADD COLUMN choice_image_path VARCHAR(255) NULL AFTER choice_text',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
