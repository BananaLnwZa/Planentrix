-- Store the next adaptive checkpoint for each user. Per-Part scores use the
-- existing part_score_history table and are upgraded in the next migration.

CREATE TABLE IF NOT EXISTS exam_checkpoint (
  exam_checkpoint_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  schedule_time_id INT NOT NULL,
  exam_repository_id INT NOT NULL,
  next_checkpoint_at DATETIME NOT NULL,
  interval_weeks INT NOT NULL,
  weak_topic_count INT NOT NULL DEFAULT 0,
  review_minutes_delta INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (exam_checkpoint_id),
  UNIQUE KEY uq_user_exam_checkpoint (
    user_id,
    schedule_time_id,
    exam_repository_id
  ),
  KEY idx_checkpoint_due (user_id, next_checkpoint_at),
  CONSTRAINT fk_exam_checkpoint_user
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_checkpoint_schedule
    FOREIGN KEY (schedule_time_id)
    REFERENCES schedule_time(schedule_time_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_exam_checkpoint_exam
    FOREIGN KEY (exam_repository_id)
    REFERENCES exam_repository(exam_repository_id)
    ON DELETE CASCADE
);
