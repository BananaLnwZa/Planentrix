-- Canonical question-bank, attempt snapshot, and adaptive checkpoint schema.
-- Core tables referenced here (subjects, admin, enrollments) must exist first.

CREATE TABLE IF NOT EXISTS question_banks (
  question_bank_id INT NOT NULL AUTO_INCREMENT,
  subject_id VARCHAR(20) NOT NULL,
  owner_instructor_id INT NOT NULL,
  bank_name VARCHAR(200) NOT NULL,
  exam_period ENUM('midterm', 'final') NOT NULL,
  default_draw_count SMALLINT UNSIGNED NOT NULL,
  time_limit_minutes SMALLINT UNSIGNED NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (question_bank_id),
  KEY idx_question_banks_subject_period_status (subject_id, exam_period, status),
  KEY idx_question_banks_owner (owner_instructor_id, status),
  CONSTRAINT fk_question_banks_owner
    FOREIGN KEY (owner_instructor_id) REFERENCES admin(admin_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_question_banks_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_question_banks_draw_count CHECK (default_draw_count > 0),
  CONSTRAINT chk_question_banks_time_limit CHECK (time_limit_minutes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS question (
  question_id INT NOT NULL AUTO_INCREMENT,
  question_bank_id INT NOT NULL,
  question_text TEXT NOT NULL,
  question_image_path VARCHAR(255) NULL,
  question_score DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (question_id),
  KEY idx_question_bank_active (question_bank_id, is_active),
  CONSTRAINT fk_question_bank
    FOREIGN KEY (question_bank_id) REFERENCES question_banks(question_bank_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_question_active CHECK (is_active IN (0, 1)),
  CONSTRAINT chk_question_score CHECK (question_score > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS choice (
  choice_id INT NOT NULL AUTO_INCREMENT,
  question_id INT NOT NULL,
  choice_order TINYINT UNSIGNED NOT NULL,
  choice_text TEXT NOT NULL,
  choice_image_path VARCHAR(255) NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (choice_id),
  UNIQUE KEY uq_choice_question_order (question_id, choice_order),
  KEY idx_choice_question_active (question_id, is_active),
  CONSTRAINT fk_choice_question
    FOREIGN KEY (question_id) REFERENCES question(question_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_choice_flags
    CHECK (is_correct IN (0, 1) AND is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- The checkpoint foreign key is added after exam_checkpoints because the two
-- tables intentionally reference each other.
CREATE TABLE IF NOT EXISTS exam_attempts (
  exam_attempt_id INT NOT NULL AUTO_INCREMENT,
  enrollment_id INT NOT NULL,
  source_checkpoint_id INT NULL,
  exam_period ENUM('midterm', 'final') NOT NULL,
  random_seed VARCHAR(64) NULL,
  started_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  actual_score DECIMAL(8,2) NULL,
  max_score DECIMAL(8,2) NULL,
  weak_topic_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('in_progress', 'submitted', 'expired', 'cancelled')
    NOT NULL DEFAULT 'in_progress',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (exam_attempt_id),
  KEY idx_exam_attempts_enrollment_history (enrollment_id, submitted_at, status),
  KEY idx_exam_attempts_source_checkpoint (source_checkpoint_id),
  CONSTRAINT fk_exam_attempts_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_exam_attempts_scores CHECK (
    (actual_score IS NULL AND max_score IS NULL)
    OR (actual_score >= 0 AND max_score > 0 AND actual_score <= max_score)
  ),
  CONSTRAINT chk_exam_attempts_submitted CHECK (
    (status = 'submitted' AND submitted_at IS NOT NULL
      AND actual_score IS NOT NULL AND max_score IS NOT NULL)
    OR status <> 'submitted'
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS exam_attempt_questions (
  attempt_question_id INT NOT NULL AUTO_INCREMENT,
  exam_attempt_id INT NOT NULL,
  source_question_id INT NULL,
  source_bank_id INT NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  question_text_snapshot TEXT NOT NULL,
  image_path_snapshot VARCHAR(255) NULL,
  question_score_snapshot DECIMAL(6,2) NOT NULL,
  choices_snapshot JSON NOT NULL,
  selected_choice_order TINYINT UNSIGNED NULL,
  is_correct TINYINT(1) NULL,
  awarded_score DECIMAL(6,2) NULL,
  answered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attempt_question_id),
  UNIQUE KEY uq_attempt_questions_order (exam_attempt_id, display_order),
  KEY idx_attempt_questions_source_question (source_question_id),
  KEY idx_attempt_questions_source_bank (source_bank_id),
  CONSTRAINT fk_attempt_questions_attempt
    FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(exam_attempt_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attempt_questions_source_bank
    FOREIGN KEY (source_bank_id) REFERENCES question_banks(question_bank_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_attempt_questions_source_question
    FOREIGN KEY (source_question_id) REFERENCES question(question_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_attempt_questions_result CHECK (
    (is_correct IS NULL OR is_correct IN (0, 1))
    AND (awarded_score IS NULL OR (
      awarded_score >= 0 AND awarded_score <= question_score_snapshot
    ))
  ),
  CONSTRAINT chk_attempt_questions_score CHECK (question_score_snapshot > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS exam_attempt_bank_results (
  bank_result_id INT NOT NULL AUTO_INCREMENT,
  exam_attempt_id INT NOT NULL,
  question_bank_id INT NULL,
  bank_name_snapshot VARCHAR(200) NOT NULL,
  actual_score DECIMAL(8,2) NOT NULL,
  max_score DECIMAL(8,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  is_weak_topic TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bank_result_id),
  UNIQUE KEY uq_bank_results_attempt_bank (exam_attempt_id, question_bank_id),
  KEY idx_bank_results_weak (exam_attempt_id, is_weak_topic, percentage),
  KEY idx_bank_results_bank (question_bank_id),
  CONSTRAINT fk_bank_results_attempt
    FOREIGN KEY (exam_attempt_id) REFERENCES exam_attempts(exam_attempt_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bank_results_bank
    FOREIGN KEY (question_bank_id) REFERENCES question_banks(question_bank_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_bank_results_percentage CHECK (percentage BETWEEN 0 AND 100),
  CONSTRAINT chk_bank_results_scores CHECK (
    actual_score >= 0 AND max_score > 0 AND actual_score <= max_score
  ),
  CONSTRAINT chk_bank_results_weak CHECK (is_weak_topic IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS exam_checkpoints (
  exam_checkpoint_id INT NOT NULL AUTO_INCREMENT,
  enrollment_id INT NOT NULL,
  source_exam_attempt_id INT NOT NULL,
  exam_period ENUM('midterm', 'final') NOT NULL,
  weak_topic_count SMALLINT UNSIGNED NOT NULL,
  interval_weeks TINYINT UNSIGNED NOT NULL,
  next_checkpoint_at DATETIME NOT NULL,
  status ENUM('pending', 'completed', 'superseded', 'cancelled')
    NOT NULL DEFAULT 'pending',
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (exam_checkpoint_id),
  UNIQUE KEY uq_exam_checkpoints_source_attempt (source_exam_attempt_id),
  KEY idx_exam_checkpoints_due (enrollment_id, status, next_checkpoint_at),
  CONSTRAINT fk_exam_checkpoints_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_exam_checkpoints_source_attempt
    FOREIGN KEY (source_exam_attempt_id) REFERENCES exam_attempts(exam_attempt_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_exam_checkpoints_completed CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR status <> 'completed'
  ),
  CONSTRAINT chk_exam_checkpoints_interval CHECK (interval_weeks IN (1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

SET @has_attempt_checkpoint_fk := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'exam_attempts'
    AND CONSTRAINT_NAME = 'fk_exam_attempts_source_checkpoint'
);
SET @sql := IF(
  @has_attempt_checkpoint_fk = 0,
  'ALTER TABLE exam_attempts ADD CONSTRAINT fk_exam_attempts_source_checkpoint FOREIGN KEY (source_checkpoint_id) REFERENCES exam_checkpoints(exam_checkpoint_id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
