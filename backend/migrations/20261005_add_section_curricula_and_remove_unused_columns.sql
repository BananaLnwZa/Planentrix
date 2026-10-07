-- Planentrix schema update (MySQL 8.0+)
-- 1) Allow one Section to be shared by multiple curriculum entries.
-- 2) Remove admin.address.
-- 3) Remove obsolete question-bank draw-count and time-limit settings.
--
-- The cleanup procedure checks the current schema first, so this migration can
-- also be run when one or more of the old columns/constraints were removed
-- manually beforehand.

CREATE TABLE IF NOT EXISTS `section_curriculum_subjects` (
  `section_id` INT NOT NULL COMMENT 'กลุ่มเรียนที่เปิดสอน',
  `curriculum_subject_id` INT NOT NULL
    COMMENT 'รายการวิชาในหลักสูตรที่สามารถเลือกกลุ่มเรียนนี้ได้',
  `assigned_by_admin_id` INT NOT NULL
    COMMENT 'เจ้าหน้าที่ผู้กำหนดหลักสูตรให้กลุ่มเรียน',
  `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    COMMENT 'วันที่และเวลาที่กำหนดหลักสูตรให้กลุ่มเรียน',
  PRIMARY KEY (`section_id`, `curriculum_subject_id`),
  KEY `idx_section_curriculum_curriculum`
    (`curriculum_subject_id`, `section_id`),
  KEY `idx_section_curriculum_assigned_by`
    (`assigned_by_admin_id`),
  CONSTRAINT `fk_section_curriculum_section`
    FOREIGN KEY (`section_id`)
    REFERENCES `course_sections` (`section_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_section_curriculum_curriculum_subject`
    FOREIGN KEY (`curriculum_subject_id`)
    REFERENCES `curriculum_subjects` (`curriculum_subject_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_section_curriculum_assigned_by`
    FOREIGN KEY (`assigned_by_admin_id`)
    REFERENCES `admin` (`admin_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='หลักสูตร สาขา และชั้นปีที่สามารถเลือกแต่ละกลุ่มเรียนได้';

DROP PROCEDURE IF EXISTS `migrate_20261005_remove_unused_columns`;

DELIMITER $$

CREATE PROCEDURE `migrate_20261005_remove_unused_columns`()
BEGIN
  -- A CHECK constraint must be removed before its referenced column.
  IF EXISTS (
    SELECT 1
    FROM `information_schema`.`table_constraints`
    WHERE `constraint_schema` = DATABASE()
      AND `table_name` = 'question_banks'
      AND `constraint_name` = 'chk_question_banks_draw_count'
      AND `constraint_type` = 'CHECK'
  ) THEN
    ALTER TABLE `question_banks`
      DROP CHECK `chk_question_banks_draw_count`;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM `information_schema`.`table_constraints`
    WHERE `constraint_schema` = DATABASE()
      AND `table_name` = 'question_banks'
      AND `constraint_name` = 'chk_question_banks_time_limit'
      AND `constraint_type` = 'CHECK'
  ) THEN
    ALTER TABLE `question_banks`
      DROP CHECK `chk_question_banks_time_limit`;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM `information_schema`.`columns`
    WHERE `table_schema` = DATABASE()
      AND `table_name` = 'admin'
      AND `column_name` = 'address'
  ) THEN
    ALTER TABLE `admin`
      DROP COLUMN `address`;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM `information_schema`.`columns`
    WHERE `table_schema` = DATABASE()
      AND `table_name` = 'question_banks'
      AND `column_name` = 'default_draw_count'
  ) THEN
    ALTER TABLE `question_banks`
      DROP COLUMN `default_draw_count`;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM `information_schema`.`columns`
    WHERE `table_schema` = DATABASE()
      AND `table_name` = 'question_banks'
      AND `column_name` = 'time_limit_minutes'
  ) THEN
    ALTER TABLE `question_banks`
      DROP COLUMN `time_limit_minutes`;
  END IF;
END$$

DELIMITER ;

CALL `migrate_20261005_remove_unused_columns`();
DROP PROCEDURE `migrate_20261005_remove_unused_columns`;

-- Existing Sections are intentionally not mapped automatically because the
-- correct department/year curriculum entry cannot be inferred safely.
