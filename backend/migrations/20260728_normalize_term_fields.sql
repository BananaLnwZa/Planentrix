-- Legacy migration retained for chronological compatibility.
--
-- The old `terms` column mapping was replaced by:
--   academic_terms.academic_year / academic_terms.semester_no
--   student_terms.year_level
-- The current database baseline already uses these fields.
SELECT 1;
