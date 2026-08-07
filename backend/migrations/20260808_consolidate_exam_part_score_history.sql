-- Consolidate per-Part exam results into the original part_score_history
-- table and remove the temporary duplicate table.

SET @has_study_type_column := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'part_score_history'
    AND COLUMN_NAME = 'study_type_id'
);
SET @sql := IF(
  @has_study_type_column = 0,
  'ALTER TABLE part_score_history ADD COLUMN study_type_id INT NULL AFTER part_score',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_unique_key := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'part_score_history'
    AND INDEX_NAME = 'uq_part_score_attempt'
);
SET @sql := IF(
  @has_unique_key = 0,
  'ALTER TABLE part_score_history ADD UNIQUE KEY uq_part_score_attempt (exam_score_history_id, exam_part_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_study_type_fk := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'part_score_history'
    AND CONSTRAINT_NAME = 'fk_part_score_study_type'
);
SET @sql := IF(
  @has_study_type_fk = 0,
  'ALTER TABLE part_score_history ADD KEY idx_part_score_study_type (study_type_id), ADD CONSTRAINT fk_part_score_study_type FOREIGN KEY (study_type_id) REFERENCES study_types(study_type_id) ON DELETE RESTRICT',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_temporary_topic_table := (
  SELECT COUNT(*)
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'exam_topic_score_history'
);
SET @sql := IF(
  @has_temporary_topic_table > 0,
  'INSERT INTO part_score_history (exam_score_history_id, exam_part_id, part_score, study_type_id)
   SELECT etsh.exam_score_history_id, etsh.exam_part_id, etsh.actual_score,
     CASE
       WHEN etsh.percentage >= 80 THEN NULL
       WHEN etsh.percentage < 50 THEN (SELECT study_type_id FROM study_types WHERE LOWER(study_type_name) = ''practice'' LIMIT 1)
       WHEN etsh.percentage < 65 THEN (SELECT study_type_id FROM study_types WHERE LOWER(study_type_name) = ''review'' LIMIT 1)
       ELSE (SELECT study_type_id FROM study_types WHERE LOWER(study_type_name) = ''reading'' LIMIT 1)
     END
   FROM exam_topic_score_history etsh
   ON DUPLICATE KEY UPDATE
     part_score = VALUES(part_score),
     study_type_id = VALUES(study_type_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE exam_part ep
SET
  ep.total_question = (
    SELECT COUNT(*) FROM question q WHERE q.exam_part_id = ep.exam_part_id
  ),
  ep.part_score = (
    SELECT COALESCE(SUM(q.question_score), 0)
    FROM question q WHERE q.exam_part_id = ep.exam_part_id
  );

UPDATE exam_repository er
SET
  er.total_question = (
    SELECT COUNT(*)
    FROM question q
    INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
    WHERE ep.exam_repository_id = er.exam_repository_id
  ),
  er.total_score = (
    SELECT COALESCE(SUM(q.question_score), 0)
    FROM question q
    INNER JOIN exam_part ep ON ep.exam_part_id = q.exam_part_id
    WHERE ep.exam_repository_id = er.exam_repository_id
  );

UPDATE exam_checkpoint ec
INNER JOIN (
  SELECT scored.*,
    CASE
      WHEN scored.very_weak_topic_count > 0 OR scored.weak_topic_count >= 3 THEN 1
      WHEN scored.weak_topic_count > 0 THEN 2
      WHEN scored.overall_percentage < 80 THEN 3
      ELSE 4
    END AS new_interval_weeks,
    CASE
      WHEN scored.weak_topic_count >= 3 THEN 30
      WHEN scored.weak_topic_count > 0 THEN 20
      WHEN scored.overall_percentage >= 80 THEN -10
      ELSE 0
    END AS new_review_minutes_delta
  FROM (
    SELECT latest.user_id, latest.schedule_time_id,
      latest.exam_repository_id, latest.exam_date,
      CASE
        WHEN latest.exam_max_score <= 0 THEN 0
        ELSE (latest.actual_score / latest.exam_max_score) * 100
      END AS overall_percentage,
      SUM(
        CASE
          WHEN ep.part_score > 0
            AND (psh.part_score / ep.part_score) * 100 < 80 THEN 1
          ELSE 0
        END
      ) AS weak_topic_count,
      SUM(
        CASE
          WHEN ep.part_score > 0
            AND (psh.part_score / ep.part_score) * 100 < 50 THEN 1
          ELSE 0
        END
      ) AS very_weak_topic_count
    FROM (
      SELECT st.user_id, esh.exam_score_history_id,
        esh.schedule_time_id, esh.exam_repository_id,
        esh.actual_score, esh.exam_max_score, esh.exam_date,
        ROW_NUMBER() OVER (
          PARTITION BY st.user_id, esh.schedule_time_id,
            esh.exam_repository_id
          ORDER BY esh.exam_date DESC, esh.exam_score_history_id DESC
        ) AS attempt_order
      FROM exam_score_history esh
      INNER JOIN schedule_time st
        ON st.schedule_time_id = esh.schedule_time_id
    ) latest
    INNER JOIN part_score_history psh
      ON psh.exam_score_history_id = latest.exam_score_history_id
    INNER JOIN exam_part ep ON ep.exam_part_id = psh.exam_part_id
    WHERE latest.attempt_order = 1
    GROUP BY latest.user_id, latest.schedule_time_id,
      latest.exam_repository_id, latest.exam_date,
      latest.actual_score, latest.exam_max_score
  ) scored
) summary
  ON summary.user_id = ec.user_id
  AND summary.schedule_time_id = ec.schedule_time_id
  AND summary.exam_repository_id = ec.exam_repository_id
SET
  ec.weak_topic_count = summary.weak_topic_count,
  ec.interval_weeks = summary.new_interval_weeks,
  ec.review_minutes_delta = summary.new_review_minutes_delta,
  ec.next_checkpoint_at = DATE_ADD(
    summary.exam_date,
    INTERVAL summary.new_interval_weeks WEEK
  );

DROP TABLE IF EXISTS exam_topic_score_history;
