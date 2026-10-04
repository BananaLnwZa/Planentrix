# Planentrix database migrations

These migrations target the current database model. Import the current
Planentrix baseline schema first, then run the files in filename order.

Current term and schedule ownership is represented by:

- `academic_terms`: university term calendar
- `student_terms`: one student's term and year level
- `enrollments`: subjects selected for a student term
- `study_sessions`: recorded study timer sessions
- `weekly_recommendation`: one recommendation version for a student term
- `weekly_recommendation_item`: recommendation totals per enrollment
- `weekly_schedule_block`: generated or user-adjusted time blocks

The migrations dated 20260723 through 20260806 are retained as safe no-ops.
They originally targeted the removed `terms`, `schedule_time`, and
`study_time` tables and must not recreate those legacy structures. Migration
20260922 is also a safe no-op because the study-method selector and the
`study_sessions.study_method` column were removed from the product.

All active migrations are designed to be safe when the target object already
exists. Review and back up production data before applying any schema change.

Migration 20261004 adds `exam_attempts.random_seed`. New attempts store this
seed so their deterministic 100-point question selection can be audited and
replayed with the same question-bank contents.
