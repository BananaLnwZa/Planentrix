-- Persist the one-time post-midterm reminder and the exam round used by each
-- attempt, so adaptive checkpoints cannot collide with pre-exam workflows.
ALTER TABLE student_terms
  ADD COLUMN midterm_followup_notified_at DATETIME NULL
    COMMENT 'เวลาที่แสดงการแจ้งเตือนกรอกคะแนนสอบกลางภาคแล้ว';

ALTER TABLE exam_attempts
  ADD COLUMN workflow_phase ENUM(
    'checkpoint', 'midterm_2w', 'midterm_1w',
    'final_2w', 'final_1w'
  ) NOT NULL DEFAULT 'checkpoint'
    COMMENT 'รอบที่ทำข้อสอบ เพื่อแยกรอบเตรียมสอบออกจาก checkpoint';

CREATE INDEX idx_exam_attempts_workflow_phase
  ON exam_attempts (enrollment_id, exam_period, workflow_phase, status);
