-- Weekly rule-based schedule recommendations for the current database model.
-- Prerequisites: student_terms, enrollments, schedule_types, exam_attempts,
-- workloads, and the rest of the current Planentrix baseline.

CREATE TABLE IF NOT EXISTS weekly_recommendation (
  recommendation_id INT NOT NULL AUTO_INCREMENT
    COMMENT 'รหัสคำแนะนำรายสัปดาห์',
  student_term_id INT NOT NULL
    COMMENT 'ภาคเรียนของนักศึกษา',
  previous_recommendation_id INT NULL
    COMMENT 'คำแนะนำเวอร์ชันก่อนหน้า',
  source_exam_attempt_id INT NULL
    COMMENT 'ครั้งสอบที่กระตุ้นการคำนวณใหม่',
  source_workload_id INT NULL
    COMMENT 'ภาระงานที่กระตุ้นการคำนวณใหม่',
  week_start_date DATE NOT NULL
    COMMENT 'วันเริ่มสัปดาห์ของคำแนะนำ',
  week_end_date DATE NOT NULL
    COMMENT 'วันสิ้นสุดสัปดาห์ของคำแนะนำ',
  version INT UNSIGNED NOT NULL DEFAULT 1
    COMMENT 'เวอร์ชันคำแนะนำภายในสัปดาห์',
  trigger_type ENUM(
    'weekend',
    'exam_submitted',
    'workload_changed',
    'constraint_changed',
    'manual'
  ) NOT NULL COMMENT 'เหตุผลที่สร้างคำแนะนำ',
  rule_version VARCHAR(30) NOT NULL
    COMMENT 'เวอร์ชันกฎที่ใช้คำนวณ',
  status ENUM('pending', 'accepted', 'rejected', 'superseded')
    NOT NULL DEFAULT 'pending' COMMENT 'สถานะคำแนะนำ',
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT 'เวลาที่ระบบสร้างคำแนะนำ',
  accepted_at DATETIME NULL COMMENT 'เวลาที่ผู้ใช้ยอมรับ',
  rejected_at DATETIME NULL COMMENT 'เวลาที่ผู้ใช้ปฏิเสธ',
  superseded_at DATETIME NULL COMMENT 'เวลาที่ถูกแทนด้วยเวอร์ชันใหม่',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT 'วันและเวลาที่สร้างข้อมูล',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (recommendation_id),
  UNIQUE KEY uq_weekly_recommendation_version
    (student_term_id, week_start_date, version),
  KEY idx_weekly_recommendation_lookup
    (student_term_id, week_start_date, status),
  KEY idx_weekly_recommendation_previous (previous_recommendation_id),
  KEY idx_weekly_recommendation_exam_source (source_exam_attempt_id),
  KEY idx_weekly_recommendation_workload_source (source_workload_id),
  CONSTRAINT fk_weekly_recommendation_student_term
    FOREIGN KEY (student_term_id)
    REFERENCES student_terms(student_term_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_recommendation_previous
    FOREIGN KEY (previous_recommendation_id)
    REFERENCES weekly_recommendation(recommendation_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_recommendation_exam_source
    FOREIGN KEY (source_exam_attempt_id)
    REFERENCES exam_attempts(exam_attempt_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_recommendation_workload_source
    FOREIGN KEY (source_workload_id)
    REFERENCES workloads(workload_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_weekly_recommendation_dates
    CHECK (week_end_date >= week_start_date),
  CONSTRAINT chk_weekly_recommendation_version CHECK (version > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='หัวรายการคำแนะนำรายสัปดาห์และประวัติเวอร์ชัน';

CREATE TABLE IF NOT EXISTS weekly_recommendation_item (
  recommendation_item_id INT NOT NULL AUTO_INCREMENT
    COMMENT 'รหัสรายละเอียดคำแนะนำ',
  recommendation_id INT NOT NULL COMMENT 'หัวรายการคำแนะนำ',
  enrollment_id INT NOT NULL COMMENT 'รายวิชาที่ลงทะเบียน',
  schedule_type_id INT NOT NULL COMMENT 'ประเภทกิจกรรมที่แนะนำ',
  current_minutes INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'เวลาก่อนปรับคำแนะนำ',
  base_minutes INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'เวลาพื้นฐานตามกฎ',
  score_gap_minutes INT NOT NULL DEFAULT 0
    COMMENT 'เวลาที่ปรับจากช่องว่างคะแนน',
  weak_topic_minutes INT NOT NULL DEFAULT 0
    COMMENT 'เวลาที่ปรับจากหัวข้ออ่อน',
  exam_proximity_minutes INT NOT NULL DEFAULT 0
    COMMENT 'เวลาที่ปรับตามความใกล้ช่วงสอบ',
  quiz_floor_minutes INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'เวลาขั้นต่ำจากกฎแบบทดสอบ',
  workload_minutes INT NOT NULL DEFAULT 0
    COMMENT 'เวลาที่ปรับจากปริมาณภาระงาน',
  deadline_minutes INT NOT NULL DEFAULT 0
    COMMENT 'เวลาที่ปรับจากความใกล้กำหนดส่ง',
  behavior_adjustment_minutes INT NOT NULL DEFAULT 0
    COMMENT 'เวลาที่ปรับจากพฤติกรรมอ่านจริง',
  previous_actual_minutes INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'เวลาอ่านจริงรวมสัปดาห์ก่อน',
  previous_adherent_minutes INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'เวลาอ่านจริงที่ทับซ้อนบล็อกแผนที่ยอมรับ',
  previous_adherence_rate DECIMAL(5,2) NULL
    COMMENT 'อัตราการทำตามแผนสัปดาห์ก่อน',
  raw_minutes INT NOT NULL DEFAULT 0
    COMMENT 'ผลรวมเวลาก่อนใช้เพดาน',
  max_minutes INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'เวลาสูงสุดตามเพดานกฎ',
  target_minutes INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'เวลาเป้าหมายหลังใช้เพดาน',
  allocated_minutes INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'เวลาที่จัดลงตารางได้',
  unallocated_minutes INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'เวลาที่ยังจัดลงตารางไม่ได้',
  difference_minutes INT NOT NULL DEFAULT 0
    COMMENT 'ผลต่างจากเวลาปัจจุบัน',
  primary_action ENUM(
    'create',
    'increase',
    'decrease',
    'keep',
    'remove',
    'move',
    'mixed'
  ) NOT NULL COMMENT 'การเปลี่ยนแปลงหลักที่เสนอ',
  cap_applied TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'มีการใช้เพดานเวลาหรือไม่',
  capacity_limited TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'ถูกจำกัดด้วยเวลาว่างหรือไม่',
  reasons_json JSON NOT NULL COMMENT 'เหตุผลและกฎที่ส่งผลต่อคำแนะนำ',
  changes_json JSON NULL COMMENT 'รายละเอียดการเปลี่ยนแปลงจากเวอร์ชันก่อน',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT 'วันและเวลาที่สร้างข้อมูล',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (recommendation_item_id),
  UNIQUE KEY uq_weekly_item_enrollment_type
    (recommendation_id, enrollment_id, schedule_type_id),
  KEY idx_weekly_item_enrollment (enrollment_id, schedule_type_id),
  KEY idx_weekly_item_action (recommendation_id, primary_action),
  KEY idx_weekly_item_schedule_type (schedule_type_id),
  CONSTRAINT fk_weekly_item_recommendation
    FOREIGN KEY (recommendation_id)
    REFERENCES weekly_recommendation(recommendation_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_item_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_item_schedule_type
    FOREIGN KEY (schedule_type_id) REFERENCES schedule_types(schedule_type_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_weekly_item_adherence_rate CHECK (
    previous_adherence_rate IS NULL
    OR previous_adherence_rate BETWEEN 0 AND 100
  ),
  CONSTRAINT chk_weekly_item_allocated
    CHECK (allocated_minutes <= target_minutes),
  CONSTRAINT chk_weekly_item_flags CHECK (
    cap_applied IN (0, 1) AND capacity_limited IN (0, 1)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='ผลคำนวณคำแนะนำระดับรายวิชาและประเภทกิจกรรม';

CREATE TABLE IF NOT EXISTS weekly_schedule_block (
  weekly_block_id INT NOT NULL AUTO_INCREMENT COMMENT 'รหัสบล็อกเวลา',
  recommendation_id INT NOT NULL COMMENT 'คำแนะนำเจ้าของบล็อก',
  recommendation_item_id INT NULL
    COMMENT 'รายละเอียดคำแนะนำที่สร้างบล็อก',
  enrollment_id INT NOT NULL COMMENT 'รายวิชาที่จะอ่านหรือทำงาน',
  schedule_type_id INT NOT NULL COMMENT 'ประเภทกิจกรรมของบล็อก',
  source_weekly_block_id INT NULL
    COMMENT 'บล็อกต้นทางเมื่อนำมาคัดลอกหรือปรับ',
  scheduled_date DATE NOT NULL COMMENT 'วันที่ของบล็อกเวลา',
  start_time TIME NOT NULL COMMENT 'เวลาเริ่มบล็อก',
  end_time TIME NOT NULL COMMENT 'เวลาสิ้นสุดบล็อก',
  source ENUM(
    'generated',
    'copied_previous',
    'user_adjusted',
    'user_added'
  ) NOT NULL COMMENT 'ที่มาของบล็อก',
  is_user_modified TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'ผู้ใช้แก้ไขบล็อกหรือไม่',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT 'วันและเวลาที่สร้างบล็อก',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (weekly_block_id),
  KEY idx_weekly_block_recommendation
    (recommendation_id, scheduled_date, start_time),
  KEY idx_weekly_block_item (recommendation_item_id),
  KEY idx_weekly_block_enrollment
    (enrollment_id, scheduled_date, start_time),
  KEY idx_weekly_block_schedule_type (schedule_type_id),
  KEY idx_weekly_block_source (source_weekly_block_id),
  CONSTRAINT fk_weekly_block_recommendation
    FOREIGN KEY (recommendation_id)
    REFERENCES weekly_recommendation(recommendation_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_item
    FOREIGN KEY (recommendation_item_id)
    REFERENCES weekly_recommendation_item(recommendation_item_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_schedule_type
    FOREIGN KEY (schedule_type_id) REFERENCES schedule_types(schedule_type_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_source
    FOREIGN KEY (source_weekly_block_id)
    REFERENCES weekly_schedule_block(weekly_block_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_weekly_block_modified
    CHECK (is_user_modified IN (0, 1)),
  CONSTRAINT chk_weekly_block_time CHECK (start_time < end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='บล็อกเวลาที่ระบบจัดให้หรือผู้ใช้ปรับ';
