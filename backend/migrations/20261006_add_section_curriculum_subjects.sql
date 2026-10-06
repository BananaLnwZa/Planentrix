-- Allow one course section to be available to multiple curriculum entries.
-- Safe to run when the table was already created manually.
CREATE TABLE IF NOT EXISTS `section_curriculum_subjects` (
  `section_id` INT NOT NULL COMMENT 'กลุ่มเรียนที่เปิดสอน',
  `curriculum_subject_id` INT NOT NULL COMMENT 'รายการวิชาในหลักสูตรที่เลือกกลุ่มเรียนนี้ได้',
  `assigned_by_admin_id` INT NOT NULL COMMENT 'เจ้าหน้าที่ผู้กำหนดกลุ่มเป้าหมายของกลุ่มเรียน',
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT 'วันและเวลาที่กำหนดให้กลุ่มเรียนรองรับหลักสูตรนี้',
  PRIMARY KEY (`section_id`, `curriculum_subject_id`),
  KEY `idx_section_curriculum_curriculum`
    (`curriculum_subject_id`, `section_id`),
  KEY `idx_section_curriculum_assigned_by`
    (`assigned_by_admin_id`),
  CONSTRAINT `fk_section_curriculum_section`
    FOREIGN KEY (`section_id`) REFERENCES `course_sections` (`section_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_section_curriculum_curriculum_subject`
    FOREIGN KEY (`curriculum_subject_id`)
    REFERENCES `curriculum_subjects` (`curriculum_subject_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_section_curriculum_assigned_by`
    FOREIGN KEY (`assigned_by_admin_id`) REFERENCES `admin` (`admin_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='หลักสูตร สาขา และชั้นปีที่สามารถเลือกแต่ละกลุ่มเรียนได้';

-- Existing sections are intentionally not mapped automatically. University
-- staff must choose the correct department/year entries in the admin flow.
