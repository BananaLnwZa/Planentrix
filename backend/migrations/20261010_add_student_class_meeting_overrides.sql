-- Personal recurring class schedule changes for each student enrollment.
-- Prerequisites: enrollments and class_meetings.
-- NULL in an override column means use the value from class_meetings.
-- The application must verify that both IDs belong to the same section and
-- that the enrollment belongs to the signed-in student before writing.

CREATE TABLE IF NOT EXISTS `student_class_meeting_overrides` (
  `enrollment_id` INT NOT NULL
    COMMENT 'รายการลงทะเบียนของนักศึกษา',
  `class_meeting_id` INT NOT NULL
    COMMENT 'บล็อกเวลาเรียนจากตารางกลาง',
  `override_day_of_week` ENUM(
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'
  ) NULL COMMENT 'วันเรียนส่วนตัว; NULL หมายถึงใช้วันจากตารางกลาง',
  `override_start_time` TIME NULL
    COMMENT 'เวลาเริ่มส่วนตัว; NULL หมายถึงใช้เวลาจากตารางกลาง',
  `override_end_time` TIME NULL
    COMMENT 'เวลาสิ้นสุดส่วนตัว; NULL หมายถึงใช้เวลาจากตารางกลาง',
  `override_classroom` VARCHAR(100) NULL
    COMMENT 'ห้องเรียนส่วนตัว; NULL หมายถึงใช้ห้องจากตารางกลาง',
  `note` VARCHAR(500) NULL
    COMMENT 'โน้ตส่วนตัวของบล็อกเรียน เช่น สิ่งที่ต้องนำมาเรียน',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`enrollment_id`, `class_meeting_id`),
  KEY `idx_student_class_meeting_overrides_meeting` (`class_meeting_id`),
  CONSTRAINT `fk_scmo_enrollment`
    FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_scmo_class_meeting`
    FOREIGN KEY (`class_meeting_id`)
    REFERENCES `class_meetings` (`class_meeting_id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='วัน เวลา ห้องเรียน และโน้ตที่นักศึกษาแก้สำหรับบล็อกเรียนของตน';
