-- Legacy migration retained for chronological compatibility.
--
-- The old `study_time`, `schedule_time`, and `terms` tables were replaced by
-- `study_sessions`, `enrollments`, and `student_terms`. The current database
-- baseline already provides the timer lifecycle columns and constraints.
SELECT 1;
