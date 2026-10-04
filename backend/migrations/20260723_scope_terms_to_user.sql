-- Legacy migration retained for chronological compatibility.
--
-- The current database no longer has the former `terms` table. Term ownership
-- is represented by `student_terms.user_id`, while university term dates live
-- in `academic_terms`. The new baseline already contains both relationships,
-- so there is nothing to alter here.
SELECT 1;
