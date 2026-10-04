-- Preserve the seed used to select each student's deterministic question set.
-- Existing attempts remain NULL because their historical seed is unknown.

SET @has_exam_attempt_random_seed := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'exam_attempts'
    AND COLUMN_NAME = 'random_seed'
);

SET @add_exam_attempt_random_seed_sql := IF(
  @has_exam_attempt_random_seed = 0,
  'ALTER TABLE exam_attempts ADD COLUMN random_seed VARCHAR(64) NULL AFTER exam_period',
  'SELECT 1'
);

PREPARE add_exam_attempt_random_seed_statement
  FROM @add_exam_attempt_random_seed_sql;
EXECUTE add_exam_attempt_random_seed_statement;
DEALLOCATE PREPARE add_exam_attempt_random_seed_statement;
