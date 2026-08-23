-- Weekly rule-based schedule recommendations.
-- This migration mirrors the production schema created in MySQL Workbench.
-- It is safe to run when the three tables already exist.

CREATE TABLE IF NOT EXISTS weekly_recommendation (
  recommendation_id INT NOT NULL AUTO_INCREMENT COMMENT 'รหัสคำแนะนำรายสัปดาห์',
  user_id INT NOT NULL COMMENT 'รหัสผู้ใช้เจ้าของคำแนะนำ',
  term_id INT NOT NULL COMMENT 'รหัสเทอมที่คำแนะนำนี้ใช้งาน',
  previous_recommendation_id INT NULL COMMENT 'รหัสคำแนะนำเวอร์ชันก่อนหน้า ใช้เชื่อมประวัติเมื่อมีการคำนวณใหม่',
  exam_score_history_id INT NULL COMMENT 'รหัสผลแบบทดสอบที่ทำให้คำนวณใหม่ กรณี trigger_type เป็น exam_submitted',
  workload_id INT NULL COMMENT 'รหัสงานที่ทำให้คำนวณใหม่ กรณีเพิ่ม แก้ไข ทำเสร็จ หรือลบงาน',
  week_start DATE NOT NULL COMMENT 'วันจันทร์ซึ่งเป็นวันเริ่มต้นของสัปดาห์เป้าหมาย',
  week_end DATE NOT NULL COMMENT 'วันอาทิตย์ซึ่งเป็นวันสิ้นสุดของสัปดาห์เป้าหมาย',
  version INT NOT NULL DEFAULT 1 COMMENT 'หมายเลขเวอร์ชันคำแนะนำภายในสัปดาห์เดียวกัน',
  trigger_type ENUM(
    'weekend',
    'exam_submitted',
    'workload_changed',
    'constraint_changed',
    'manual'
  ) NOT NULL DEFAULT 'weekend' COMMENT 'เหตุการณ์ที่ทำให้ Rule Engine สร้างคำแนะนำใหม่',
  rule_version VARCHAR(30) NOT NULL COMMENT 'เวอร์ชันกฎที่ใช้คำนวณ เพื่อให้ตรวจสอบผลย้อนหลังได้',
  status ENUM('pending', 'accepted', 'rejected', 'superseded')
    NOT NULL DEFAULT 'pending' COMMENT 'สถานะคำแนะนำ',
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่ Rule Engine สร้างคำแนะนำ',
  accepted_at DATETIME NULL COMMENT 'วันและเวลาที่ผู้ใช้ยอมรับคำแนะนำ',
  rejected_at DATETIME NULL COMMENT 'วันและเวลาที่ผู้ใช้ปฏิเสธคำแนะนำ',
  superseded_at DATETIME NULL COMMENT 'วันและเวลาที่คำแนะนำถูกแทนที่ด้วยเวอร์ชันใหม่',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่ข้อมูลคำแนะนำถูกแก้ไขล่าสุด',
  PRIMARY KEY (recommendation_id),
  UNIQUE KEY uq_weekly_recommendation_version
    (user_id, term_id, week_start, version),
  KEY idx_weekly_recommendation_lookup (user_id, week_start, status),
  KEY idx_weekly_recommendation_term (term_id, week_start),
  KEY idx_weekly_recommendation_previous (previous_recommendation_id),
  KEY idx_weekly_recommendation_exam_source (exam_score_history_id),
  KEY idx_weekly_recommendation_workload_source (workload_id),
  CONSTRAINT fk_weekly_recommendation_user
    FOREIGN KEY (user_id) REFERENCES user(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_recommendation_term
    FOREIGN KEY (term_id) REFERENCES terms(term_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_recommendation_previous
    FOREIGN KEY (previous_recommendation_id)
    REFERENCES weekly_recommendation(recommendation_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_recommendation_exam_source
    FOREIGN KEY (exam_score_history_id)
    REFERENCES exam_score_history(exam_score_history_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_recommendation_workload_source
    FOREIGN KEY (workload_id) REFERENCES workloads(workload_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_weekly_recommendation_dates CHECK (week_end >= week_start),
  CONSTRAINT chk_weekly_recommendation_version CHECK (version > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='หัวคำแนะนำตารางรายสัปดาห์และประวัติเวอร์ชัน';

CREATE TABLE IF NOT EXISTS weekly_recommendation_item (
  recommendation_item_id INT NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายการคำแนะนำรายวิชาและรายประเภทกิจกรรม',
  recommendation_id INT NOT NULL COMMENT 'รหัสหัวคำแนะนำรายสัปดาห์',
  subject_id VARCHAR(20) NOT NULL COMMENT 'รหัสวิชาที่ได้รับคำแนะนำ',
  schedule_type_id INT NOT NULL COMMENT 'ประเภทกิจกรรม โดย 2 คือทบทวน และ 3 คือทำการบ้าน',
  current_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลารวมที่มีอยู่ก่อนสร้างคำแนะนำ',
  base_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาพื้นฐานก่อนรวมปัจจัยอื่น',
  score_gap_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาที่เพิ่มจากช่องว่างคะแนน',
  weak_topic_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาที่เพิ่มจากเรื่องอ่อน',
  exam_proximity_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาที่เพิ่มจากความใกล้ช่วงสอบ',
  quiz_floor_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาทบทวนขั้นต่ำเมื่อมี Quiz',
  workload_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาฐานจาก Assignment และ Project',
  deadline_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาที่เพิ่มจากความใกล้กำหนดส่ง',
  raw_target_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาเป้าหมายก่อนใช้เพดานรายวิชา',
  max_target_minutes INT NOT NULL DEFAULT 0 COMMENT 'เพดานเวลารายวิชา',
  target_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาเป้าหมายหลังใช้เพดานรายวิชา',
  allocated_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาที่จัดลงตารางได้จริง',
  unallocated_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาที่ยังจัดไม่ได้',
  difference_minutes INT NOT NULL DEFAULT 0 COMMENT 'เวลาที่จัดได้จริงลบด้วยเวลาปัจจุบัน',
  primary_action ENUM(
    'create',
    'increase',
    'decrease',
    'keep',
    'remove',
    'move',
    'mixed'
  ) NOT NULL DEFAULT 'keep' COMMENT 'การเปลี่ยนแปลงหลัก',
  cap_applied TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'เวลาเป้าหมายติดเพดานรายวิชาหรือไม่',
  capacity_limited TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'เวลาว่างไม่พอจัดครบหรือไม่',
  reasons_json JSON NULL COMMENT 'รายละเอียดเหตุผลของคำแนะนำ',
  changes_json JSON NULL COMMENT 'รายการสร้าง ย้าย ขยาย ลด หรือนำบล็อกออก',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างรายการคำแนะนำ',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขรายการล่าสุด',
  PRIMARY KEY (recommendation_item_id),
  UNIQUE KEY uq_weekly_item_subject_type
    (recommendation_id, subject_id, schedule_type_id),
  KEY idx_weekly_item_subject (subject_id, schedule_type_id),
  KEY idx_weekly_item_action (recommendation_id, primary_action),
  KEY fk_weekly_item_schedule_type (schedule_type_id),
  CONSTRAINT fk_weekly_item_recommendation
    FOREIGN KEY (recommendation_id)
    REFERENCES weekly_recommendation(recommendation_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_item_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_item_schedule_type
    FOREIGN KEY (schedule_type_id) REFERENCES schedule_types(schedule_type_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_weekly_item_schedule_type CHECK (schedule_type_id IN (2, 3)),
  CONSTRAINT chk_weekly_item_current_minutes CHECK (current_minutes >= 0),
  CONSTRAINT chk_weekly_item_base_minutes CHECK (base_minutes >= 0),
  CONSTRAINT chk_weekly_item_score_gap_minutes CHECK (score_gap_minutes >= 0),
  CONSTRAINT chk_weekly_item_weak_topic_minutes CHECK (weak_topic_minutes >= 0),
  CONSTRAINT chk_weekly_item_exam_minutes CHECK (exam_proximity_minutes >= 0),
  CONSTRAINT chk_weekly_item_quiz_minutes CHECK (quiz_floor_minutes >= 0),
  CONSTRAINT chk_weekly_item_workload_minutes CHECK (workload_minutes >= 0),
  CONSTRAINT chk_weekly_item_deadline_minutes CHECK (deadline_minutes >= 0),
  CONSTRAINT chk_weekly_item_targets CHECK (
    raw_target_minutes >= 0 AND max_target_minutes >= 0 AND target_minutes >= 0
  ),
  CONSTRAINT chk_weekly_item_allocation CHECK (
    allocated_minutes >= 0 AND unallocated_minutes >= 0
  ),
  CONSTRAINT chk_weekly_item_boolean_flags CHECK (
    cap_applied IN (0, 1) AND capacity_limited IN (0, 1)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='ผลคำแนะนำเพิ่ม ลด และจัดสรรเวลารายวิชา';

CREATE TABLE IF NOT EXISTS weekly_schedule_block (
  weekly_block_id INT NOT NULL AUTO_INCREMENT COMMENT 'รหัสบล็อกเวลารายสัปดาห์',
  recommendation_id INT NOT NULL COMMENT 'รหัสหัวคำแนะนำรายสัปดาห์ที่เป็นเจ้าของบล็อกนี้',
  recommendation_item_id INT NULL COMMENT 'รหัสรายการคำแนะนำรายวิชาที่สร้างบล็อกนี้',
  schedule_time_id INT NULL COMMENT 'รหัสบล็อกตั้งต้นจาก schedule_time',
  source_weekly_block_id INT NULL COMMENT 'รหัสบล็อกจากแผนเวอร์ชันก่อนหน้า',
  user_id INT NOT NULL COMMENT 'รหัสผู้ใช้เจ้าของบล็อกเวลา',
  term_id INT NOT NULL COMMENT 'รหัสเทอมที่บล็อกเวลานี้ใช้งาน',
  subject_id VARCHAR(20) NOT NULL COMMENT 'รหัสวิชาของบล็อกเวลา',
  schedule_type_id INT NOT NULL COMMENT 'ประเภทบล็อก โดย 2 คือทบทวน และ 3 คือทำการบ้าน',
  scheduled_date DATE NOT NULL COMMENT 'วันที่จริงที่บล็อกเกิดขึ้นภายในสัปดาห์เป้าหมาย',
  start_time TIME NOT NULL COMMENT 'เวลาเริ่มต้นของบล็อก',
  end_time TIME NOT NULL COMMENT 'เวลาสิ้นสุดของบล็อก',
  source ENUM(
    'generated',
    'copied_base',
    'copied_previous',
    'user_adjusted',
    'user_added'
  ) NOT NULL DEFAULT 'generated' COMMENT 'แหล่งที่มาของบล็อก',
  is_user_modified TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'ผู้ใช้เคยแก้บล็อกนี้เองหรือไม่',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างบล็อก',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บล็อกถูกแก้ไขล่าสุด',
  PRIMARY KEY (weekly_block_id),
  KEY idx_weekly_block_recommendation
    (recommendation_id, scheduled_date, start_time),
  KEY idx_weekly_block_user_date (user_id, scheduled_date, start_time),
  KEY idx_weekly_block_subject
    (subject_id, schedule_type_id, scheduled_date),
  KEY idx_weekly_block_item (recommendation_item_id),
  KEY idx_weekly_block_source_schedule (schedule_time_id),
  KEY idx_weekly_block_source_weekly (source_weekly_block_id),
  KEY fk_weekly_block_term (term_id),
  KEY fk_weekly_block_schedule_type (schedule_type_id),
  CONSTRAINT fk_weekly_block_recommendation
    FOREIGN KEY (recommendation_id)
    REFERENCES weekly_recommendation(recommendation_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_item
    FOREIGN KEY (recommendation_item_id)
    REFERENCES weekly_recommendation_item(recommendation_item_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_source_schedule
    FOREIGN KEY (schedule_time_id) REFERENCES schedule_time(schedule_time_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_source_weekly
    FOREIGN KEY (source_weekly_block_id)
    REFERENCES weekly_schedule_block(weekly_block_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_user
    FOREIGN KEY (user_id) REFERENCES user(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_term
    FOREIGN KEY (term_id) REFERENCES terms(term_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_subject
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_weekly_block_schedule_type
    FOREIGN KEY (schedule_type_id) REFERENCES schedule_types(schedule_type_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_weekly_block_schedule_type CHECK (schedule_type_id IN (2, 3)),
  CONSTRAINT chk_weekly_block_time CHECK (start_time < end_time),
  CONSTRAINT chk_weekly_block_user_modified CHECK (is_user_modified IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='บล็อกเวลา Preview และแผนรายสัปดาห์ที่ผู้ใช้ยอมรับ';
