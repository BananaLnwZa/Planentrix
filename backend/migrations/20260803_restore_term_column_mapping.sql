-- Legacy migration retained for chronological compatibility.
--
-- The current schema uses `academic_terms` and `student_terms`; it must not
-- recreate or modify the removed `terms` table.
SELECT 1;
