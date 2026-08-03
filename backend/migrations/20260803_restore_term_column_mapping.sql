-- Restore the terms schema used by the application database:
-- academic_year = year level, semester = academic year, term = term number.
-- This migration reverses 20260728_normalize_term_fields.sql while preserving data.
-- It is a no-op when year_level is not present and the schema is already correct.

SET @needs_term_column_restore = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'terms'
    AND column_name = 'year_level'
);

SET @add_semester_sql = IF(
  @needs_term_column_restore = 1,
  'ALTER TABLE terms ADD COLUMN semester VARCHAR(4) NULL AFTER term',
  'SELECT 1'
);
PREPARE add_semester_statement FROM @add_semester_sql;
EXECUTE add_semester_statement;
DEALLOCATE PREPARE add_semester_statement;

SET @move_term_data_sql = IF(
  @needs_term_column_restore = 1,
  'UPDATE terms SET semester = CAST(academic_year AS CHAR), academic_year = year_level',
  'SELECT 1'
);
PREPARE move_term_data_statement FROM @move_term_data_sql;
EXECUTE move_term_data_statement;
DEALLOCATE PREPARE move_term_data_statement;

SET @restore_term_columns_sql = IF(
  @needs_term_column_restore = 1,
  'ALTER TABLE terms MODIFY COLUMN academic_year INT NOT NULL, MODIFY COLUMN semester VARCHAR(4) NOT NULL, DROP COLUMN year_level',
  'SELECT 1'
);
PREPARE restore_term_columns_statement FROM @restore_term_columns_sql;
EXECUTE restore_term_columns_statement;
DEALLOCATE PREPARE restore_term_columns_statement;
