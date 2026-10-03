-- Superseded by the canonical question-bank and attempt snapshot schema in
-- 20260807_add_exam_checkpoint_insights.sql. The former exam_repository,
-- exam_part, part_score_history, and singular exam_checkpoint model is no
-- longer part of the application schema. This migration is intentionally a
-- no-op so a fresh migration run does not reference removed tables.
SELECT 1;
