-- Retained as a safe no-op for migration ordering.
--
-- The study-method selector was removed from the product. Study sessions now
-- record their duration and schedule relationship without classifying the
-- activity as reading, practice, video, or review. Do not recreate the
-- deprecated study_sessions.study_method column.

SELECT 1;
