-- Run this migration once on databases that still have the original
-- study_time/terms schema. The current development database was migrated
-- manually and must not run this file again.

ALTER TABLE study_time
  MODIFY COLUMN end_time DATETIME NULL,
  MODIFY COLUMN time_spent DECIMAL(5,2) NULL,
  ADD COLUMN session_status
    ENUM('running', 'paused', 'completed', 'interrupted', 'cancelled') NULL
    AFTER time_spent,
  ADD COLUMN running_since DATETIME NULL
    AFTER session_status,
  ADD COLUMN accumulated_seconds INT UNSIGNED NOT NULL DEFAULT 0
    AFTER running_since,
  ADD COLUMN last_seen_at DATETIME NULL
    AFTER accumulated_seconds,
  ADD COLUMN version INT UNSIGNED NOT NULL DEFAULT 1
    AFTER last_seen_at,
  ADD COLUMN updated_at DATETIME NOT NULL
    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    AFTER version;

UPDATE study_time
SET
  session_status = CASE
    WHEN end_time IS NOT NULL THEN 'completed'
    ELSE 'interrupted'
  END,
  accumulated_seconds = CASE
    WHEN time_spent IS NOT NULL THEN ROUND(time_spent * 60)
    ELSE 0
  END,
  running_since = CASE
    WHEN end_time IS NULL THEN start_time
    ELSE NULL
  END,
  last_seen_at = COALESCE(end_time, start_time)
WHERE study_time_id > 0
  AND session_status IS NULL;

ALTER TABLE study_time
  MODIFY COLUMN session_status
    ENUM('running', 'paused', 'completed', 'interrupted', 'cancelled')
    NOT NULL DEFAULT 'running';

CREATE INDEX idx_study_time_status_seen
  ON study_time (session_status, last_seen_at);

ALTER TABLE terms
  ADD COLUMN created_at DATETIME NULL
  AFTER term_status;

UPDATE terms term_record
LEFT JOIN (
  SELECT schedule.term_id, MIN(study.start_time) AS first_study_at
  FROM schedule_time schedule
  INNER JOIN study_time study
    ON study.schedule_time_id = schedule.schedule_time_id
  GROUP BY schedule.term_id
) first_study ON first_study.term_id = term_record.term_id
SET term_record.created_at = COALESCE(
  first_study.first_study_at,
  CURRENT_TIMESTAMP
)
WHERE term_record.term_id > 0
  AND term_record.created_at IS NULL;

ALTER TABLE terms
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
