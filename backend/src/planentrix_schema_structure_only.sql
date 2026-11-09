-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: planentrix
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `planentrix`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `planentrix` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `planentrix`;

--
-- Table structure for table `academic_terms`
--

DROP TABLE IF EXISTS `academic_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `academic_terms` (
  `academic_term_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสภาคการศึกษา',
  `academic_year` smallint unsigned NOT NULL COMMENT 'ปีการศึกษา',
  `semester_no` tinyint unsigned NOT NULL COMMENT 'หมายเลขภาคเรียน',
  `start_date` date NOT NULL COMMENT 'วันเริ่มภาคการศึกษา',
  `end_date` date NOT NULL COMMENT 'วันสิ้นสุดภาคการศึกษา',
  `midterm_start_date` date DEFAULT NULL COMMENT 'วันเริ่มช่วงสอบกลางภาค',
  `midterm_end_date` date DEFAULT NULL COMMENT 'วันสิ้นสุดช่วงสอบกลางภาค',
  `final_start_date` date DEFAULT NULL COMMENT 'วันเริ่มช่วงสอบปลายภาค',
  `final_end_date` date DEFAULT NULL COMMENT 'วันสิ้นสุดช่วงสอบปลายภาค',
  `status` enum('draft','active','completed','archived') NOT NULL DEFAULT 'draft' COMMENT 'สถานะภาคการศึกษา',
  `created_by_admin_id` int NOT NULL COMMENT 'เจ้าหน้าที่ผู้สร้างภาคการศึกษา',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`academic_term_id`),
  UNIQUE KEY `uq_academic_terms_year_semester` (`academic_year`,`semester_no`),
  KEY `idx_academic_terms_status_dates` (`status`,`start_date`,`end_date`),
  KEY `idx_academic_terms_created_by` (`created_by_admin_id`),
  CONSTRAINT `fk_academic_terms_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_academic_terms_dates` CHECK ((`end_date` >= `start_date`)),
  CONSTRAINT `chk_academic_terms_final` CHECK ((((`final_start_date` is null) and (`final_end_date` is null)) or ((`final_start_date` is not null) and (`final_end_date` is not null) and (`final_end_date` >= `final_start_date`)))),
  CONSTRAINT `chk_academic_terms_midterm` CHECK ((((`midterm_start_date` is null) and (`midterm_end_date` is null)) or ((`midterm_start_date` is not null) and (`midterm_end_date` is not null) and (`midterm_end_date` >= `midterm_start_date`)))),
  CONSTRAINT `chk_academic_terms_semester` CHECK ((`semester_no` between 1 and 3))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ปฏิทินภาคการศึกษากลางของมหาวิทยาลัย';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admin`
--

DROP TABLE IF EXISTS `admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin` (
  `admin_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสบัญชีเจ้าหน้าที่หรืออาจารย์',
  `admin_name` varchar(50) NOT NULL COMMENT 'ชื่อบัญชีสำหรับเข้าสู่ระบบเว็บ',
  `admin_password` varchar(255) NOT NULL COMMENT 'รหัสผ่านที่ผ่านการแฮช',
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  `admin_email` varchar(255) NOT NULL COMMENT 'อีเมลของเจ้าหน้าที่หรืออาจารย์',
  `first_name` varchar(100) NOT NULL COMMENT 'ชื่อจริง',
  `last_name` varchar(100) NOT NULL COMMENT 'นามสกุล',
  `phone` varchar(20) DEFAULT NULL COMMENT 'หมายเลขโทรศัพท์',
  `department_id` int DEFAULT NULL COMMENT 'สาขาวิชาที่สังกัด',
  `role` enum('university_staff','instructor') NOT NULL COMMENT 'สิทธิ์ของบัญชีเว็บ',
  `status` enum('active','suspended','archived') NOT NULL DEFAULT 'active' COMMENT 'สถานะบัญชีเว็บ',
  `status_changed_by_admin_id` int DEFAULT NULL COMMENT 'บัญชีเจ้าหน้าที่ผู้เปลี่ยนสถานะล่าสุด',
  `status_changed_at` datetime DEFAULT NULL COMMENT 'วันและเวลาที่เปลี่ยนสถานะล่าสุด',
  `status_reason` varchar(255) DEFAULT NULL COMMENT 'เหตุผลในการเปลี่ยนสถานะ',
  `last_login` datetime DEFAULT NULL COMMENT 'วันและเวลาที่เข้าสู่ระบบเว็บล่าสุด',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างบัญชี',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขข้อมูลล่าสุด',
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uq_admin_name` (`admin_name`),
  UNIQUE KEY `uq_admin_email` (`admin_email`),
  KEY `idx_admin_department_role_status` (`department_id`,`role`,`status`),
  KEY `idx_admin_status_changed_by` (`status_changed_by_admin_id`),
  CONSTRAINT `fk_admin_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_admin_status_changed_by` FOREIGN KEY (`status_changed_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='บัญชีเว็บของเจ้าหน้าที่มหาวิทยาลัยและอาจารย์';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `choice`
--

DROP TABLE IF EXISTS `choice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `choice` (
  `choice_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสตัวเลือก',
  `question_id` int NOT NULL COMMENT 'คำถามเจ้าของตัวเลือก',
  `choice_order` tinyint unsigned NOT NULL COMMENT 'ลำดับตัวเลือกที่ใช้แสดง',
  `choice_text` text NOT NULL COMMENT 'ข้อความตัวเลือก',
  `choice_image_path` varchar(255) DEFAULT NULL COMMENT 'พาธสัมพัทธ์ของรูปประกอบตัวเลือก',
  `is_correct` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'เป็นคำตอบที่ถูกต้องหรือไม่',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะเปิดใช้งานของตัวเลือก',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างตัวเลือก',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`choice_id`),
  UNIQUE KEY `uq_choice_question_order` (`question_id`,`choice_order`),
  KEY `idx_choice_question_active` (`question_id`,`is_active`),
  CONSTRAINT `fk_choice_question` FOREIGN KEY (`question_id`) REFERENCES `question` (`question_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_choice_flags` CHECK (((`is_correct` in (0,1)) and (`is_active` in (0,1))))
) ENGINE=InnoDB AUTO_INCREMENT=5921 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ตัวเลือกและเฉลยของคำถาม';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `class_meetings`
--

DROP TABLE IF EXISTS `class_meetings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `class_meetings` (
  `class_meeting_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสคาบเรียน',
  `section_id` int NOT NULL COMMENT 'กลุ่มเรียนของคาบเรียน',
  `instructor_id` int NOT NULL COMMENT 'อาจารย์ผู้รับผิดชอบคาบนี้',
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL COMMENT 'วันในสัปดาห์',
  `start_time` time NOT NULL COMMENT 'เวลาเริ่มคาบเรียน',
  `end_time` time NOT NULL COMMENT 'เวลาสิ้นสุดคาบเรียน',
  `classroom` varchar(100) DEFAULT NULL COMMENT 'ห้องเรียนหรือสถานที่',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`class_meeting_id`),
  KEY `idx_class_meetings_schedule` (`section_id`,`day_of_week`,`start_time`,`end_time`),
  KEY `idx_class_meetings_instructor_schedule` (`instructor_id`,`day_of_week`,`start_time`),
  KEY `fk_class_meetings_section_instructor` (`section_id`,`instructor_id`),
  CONSTRAINT `fk_class_meetings_section_instructor` FOREIGN KEY (`section_id`, `instructor_id`) REFERENCES `section_instructors` (`section_id`, `instructor_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_class_meetings_time` CHECK ((`start_time` < `end_time`))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='วัน เวลา ห้อง และอาจารย์ของคาบเรียน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `course_sections`
--

DROP TABLE IF EXISTS `course_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_sections` (
  `section_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสกลุ่มเรียน',
  `subject_id` varchar(20) NOT NULL COMMENT 'รายวิชาที่เปิดสอน',
  `academic_term_id` int NOT NULL COMMENT 'ภาคการศึกษาที่เปิดสอน',
  `section_number` varchar(20) NOT NULL COMMENT 'หมายเลขกลุ่มเรียน',
  `capacity` int unsigned DEFAULT NULL COMMENT 'จำนวนนักศึกษาสูงสุด',
  `status` enum('draft','open','closed','completed','cancelled') NOT NULL DEFAULT 'draft' COMMENT 'สถานะกลุ่มเรียน',
  `created_by_admin_id` int NOT NULL COMMENT 'เจ้าหน้าที่ผู้สร้างกลุ่มเรียน',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`section_id`),
  UNIQUE KEY `uq_course_sections_scope` (`subject_id`,`academic_term_id`,`section_number`),
  KEY `idx_course_sections_term_status` (`academic_term_id`,`status`),
  KEY `idx_course_sections_created_by` (`created_by_admin_id`),
  CONSTRAINT `fk_course_sections_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_course_sections_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_course_sections_term` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms` (`academic_term_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_course_sections_capacity` CHECK (((`capacity` is null) or (`capacity` > 0)))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='กลุ่มเรียนที่เปิดจริงในแต่ละภาคการศึกษา';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `curriculum_subjects`
--

DROP TABLE IF EXISTS `curriculum_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `curriculum_subjects` (
  `curriculum_subject_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายการวิชาในหลักสูตร',
  `department_id` int NOT NULL COMMENT 'สาขาวิชาเจ้าของหลักสูตร',
  `subject_id` varchar(20) NOT NULL COMMENT 'รายวิชาในหลักสูตร',
  `year_level` tinyint unsigned NOT NULL COMMENT 'ชั้นปีที่แนะนำให้เรียน',
  `semester_no` tinyint unsigned NOT NULL COMMENT 'ภาคเรียนที่แนะนำให้เรียน',
  `is_required` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'เป็นวิชาบังคับหรือไม่',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะเปิดใช้งานของรายการหลักสูตร',
  `created_by_admin_id` int NOT NULL COMMENT 'เจ้าหน้าที่ผู้เพิ่มรายวิชาในหลักสูตร',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`curriculum_subject_id`),
  UNIQUE KEY `uq_curriculum_subject_scope` (`department_id`,`subject_id`,`year_level`,`semester_no`),
  KEY `idx_curriculum_lookup` (`department_id`,`year_level`,`semester_no`,`is_active`),
  KEY `idx_curriculum_subject` (`subject_id`),
  KEY `idx_curriculum_created_by` (`created_by_admin_id`),
  CONSTRAINT `fk_curriculum_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_curriculum_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_curriculum_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_curriculum_flags` CHECK (((`is_required` in (0,1)) and (`is_active` in (0,1)))),
  CONSTRAINT `chk_curriculum_semester` CHECK ((`semester_no` between 1 and 3)),
  CONSTRAINT `chk_curriculum_year_level` CHECK ((`year_level` between 1 and 8))
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='รายวิชาในหลักสูตรแยกตามสาขา ชั้นปี และภาคเรียน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `department_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสภายในของสาขาวิชา',
  `faculty_id` int NOT NULL COMMENT 'คณะที่สาขาวิชาสังกัด',
  `department_code` varchar(20) NOT NULL COMMENT 'รหัสย่อของสาขาวิชา',
  `department_name` varchar(150) NOT NULL COMMENT 'ชื่อสาขาวิชา',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะเปิดใช้งานของสาขาวิชา',
  `created_by_admin_id` int NOT NULL COMMENT 'เจ้าหน้าที่ผู้สร้างข้อมูลสาขาวิชา',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `uq_departments_code` (`department_code`),
  KEY `idx_departments_faculty_active` (`faculty_id`,`is_active`),
  KEY `idx_departments_created_by` (`created_by_admin_id`),
  CONSTRAINT `fk_departments_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_departments_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`faculty_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_departments_active` CHECK ((`is_active` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ข้อมูลสาขาวิชาภายใต้คณะ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `enrollments`
--

DROP TABLE IF EXISTS `enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollments` (
  `enrollment_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสการลงทะเบียน',
  `student_term_id` int NOT NULL COMMENT 'ภาคเรียนของนักศึกษา',
  `section_id` int NOT NULL COMMENT 'กลุ่มเรียนที่นักศึกษาเลือก',
  `target_grade_code` varchar(5) DEFAULT NULL COMMENT 'เกรดเป้าหมายที่นักศึกษาตั้งไว้',
  `status` enum('enrolled','withdrawn','completed') NOT NULL DEFAULT 'enrolled' COMMENT 'สถานะการลงทะเบียน',
  `enrolled_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่ลงทะเบียน',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`enrollment_id`),
  UNIQUE KEY `uq_enrollments_student_section` (`student_term_id`,`section_id`),
  KEY `idx_enrollments_section_status` (`section_id`,`status`),
  CONSTRAINT `fk_enrollments_section` FOREIGN KEY (`section_id`) REFERENCES `course_sections` (`section_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_enrollments_student_term` FOREIGN KEY (`student_term_id`) REFERENCES `student_terms` (`student_term_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='การลงทะเบียนของนักศึกษาในกลุ่มเรียน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_attempt_bank_results`
--

DROP TABLE IF EXISTS `exam_attempt_bank_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_attempt_bank_results` (
  `bank_result_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสผลคะแนนรายชุด',
  `exam_attempt_id` int NOT NULL COMMENT 'ครั้งสอบเจ้าของผลคะแนน',
  `question_bank_id` int DEFAULT NULL COMMENT 'ชุดข้อสอบต้นฉบับ',
  `bank_name_snapshot` varchar(200) NOT NULL COMMENT 'สำเนาชื่อชุดหรือหัวข้อ ณ เวลาสอบ',
  `actual_score` decimal(8,2) NOT NULL COMMENT 'คะแนนที่ได้ในชุดนี้',
  `max_score` decimal(8,2) NOT NULL COMMENT 'คะแนนเต็มของชุดนี้',
  `percentage` decimal(5,2) NOT NULL COMMENT 'ร้อยละคะแนนของชุดนี้',
  `is_weak_topic` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'เป็นหัวข้ออ่อนหรือไม่',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สรุปผล',
  PRIMARY KEY (`bank_result_id`),
  UNIQUE KEY `uq_bank_results_attempt_bank` (`exam_attempt_id`,`question_bank_id`),
  KEY `idx_bank_results_weak` (`exam_attempt_id`,`is_weak_topic`,`percentage`),
  KEY `idx_bank_results_bank` (`question_bank_id`),
  CONSTRAINT `fk_bank_results_attempt` FOREIGN KEY (`exam_attempt_id`) REFERENCES `exam_attempts` (`exam_attempt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bank_results_bank` FOREIGN KEY (`question_bank_id`) REFERENCES `question_banks` (`question_bank_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_bank_results_percentage` CHECK ((`percentage` between 0 and 100)),
  CONSTRAINT `chk_bank_results_scores` CHECK (((`actual_score` >= 0) and (`max_score` > 0) and (`actual_score` <= `max_score`))),
  CONSTRAINT `chk_bank_results_weak` CHECK ((`is_weak_topic` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=287 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='คะแนนแยกตามชุดหรือหัวข้อของแต่ละครั้งสอบ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_attempt_questions`
--

DROP TABLE IF EXISTS `exam_attempt_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_attempt_questions` (
  `attempt_question_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสคำถามในครั้งสอบ',
  `exam_attempt_id` int NOT NULL COMMENT 'ครั้งสอบเจ้าของคำถาม',
  `source_question_id` int DEFAULT NULL COMMENT 'คำถามต้นฉบับ',
  `source_bank_id` int NOT NULL COMMENT 'ชุดข้อสอบต้นทาง',
  `display_order` smallint unsigned NOT NULL COMMENT 'ลำดับคำถามที่แสดงแก่ผู้ใช้',
  `question_text_snapshot` text NOT NULL COMMENT 'สำเนาข้อความคำถาม ณ เวลาสุ่ม',
  `image_path_snapshot` varchar(255) DEFAULT NULL COMMENT 'สำเนาพาธรูปประกอบ ณ เวลาสุ่ม',
  `question_score_snapshot` decimal(6,2) NOT NULL COMMENT 'สำเนาคะแนนเต็มของคำถาม',
  `choices_snapshot` json NOT NULL COMMENT 'สำเนาตัวเลือกและเฉลยสำหรับตรวจคะแนน',
  `selected_choice_order` tinyint unsigned DEFAULT NULL COMMENT 'ลำดับตัวเลือกที่นักศึกษาเลือก',
  `is_correct` tinyint(1) DEFAULT NULL COMMENT 'ผลว่าตอบถูกหรือไม่',
  `awarded_score` decimal(6,2) DEFAULT NULL COMMENT 'คะแนนที่ได้รับจากข้อนี้',
  `answered_at` datetime DEFAULT NULL COMMENT 'วันและเวลาที่ตอบคำถาม',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึก snapshot',
  PRIMARY KEY (`attempt_question_id`),
  UNIQUE KEY `uq_attempt_questions_order` (`exam_attempt_id`,`display_order`),
  KEY `idx_attempt_questions_source_question` (`source_question_id`),
  KEY `idx_attempt_questions_source_bank` (`source_bank_id`),
  CONSTRAINT `fk_attempt_questions_attempt` FOREIGN KEY (`exam_attempt_id`) REFERENCES `exam_attempts` (`exam_attempt_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_attempt_questions_source_bank` FOREIGN KEY (`source_bank_id`) REFERENCES `question_banks` (`question_bank_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_attempt_questions_source_question` FOREIGN KEY (`source_question_id`) REFERENCES `question` (`question_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_attempt_questions_result` CHECK ((((`is_correct` is null) or (`is_correct` in (0,1))) and ((`awarded_score` is null) or ((`awarded_score` >= 0) and (`awarded_score` <= `question_score_snapshot`))))),
  CONSTRAINT `chk_attempt_questions_score` CHECK ((`question_score_snapshot` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=3891 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Snapshot ของคำถามและตัวเลือกที่สุ่มจริงในแต่ละครั้งสอบ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_attempts`
--

DROP TABLE IF EXISTS `exam_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_attempts` (
  `exam_attempt_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสการทำข้อสอบ',
  `enrollment_id` int NOT NULL COMMENT 'รายวิชาที่ลงทะเบียนซึ่งใช้ทำข้อสอบ',
  `source_checkpoint_id` int DEFAULT NULL COMMENT 'Checkpoint ที่เป็นต้นเหตุของการสอบครั้งนี้',
  `exam_period` enum('midterm','final') NOT NULL COMMENT 'ช่วงข้อสอบที่ระบบเลือก',
  `random_seed` varchar(64) DEFAULT NULL,
  `started_at` datetime NOT NULL COMMENT 'วันและเวลาที่เริ่มทำข้อสอบ',
  `submitted_at` datetime DEFAULT NULL COMMENT 'วันและเวลาที่ส่งข้อสอบ',
  `actual_score` decimal(8,2) DEFAULT NULL COMMENT 'คะแนนรวมที่ได้รับ',
  `max_score` decimal(8,2) DEFAULT NULL COMMENT 'คะแนนเต็มรวม',
  `weak_topic_count` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'จำนวนหัวข้ออ่อนที่พบ',
  `status` enum('in_progress','submitted','expired','cancelled') NOT NULL DEFAULT 'in_progress' COMMENT 'สถานะการทำข้อสอบ',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างรายการ',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  `workflow_phase` enum('checkpoint','midterm_2w','midterm_1w','final_2w','final_1w') NOT NULL DEFAULT 'checkpoint' COMMENT 'รอบที่ทำข้อสอบ เพื่อแยกรอบเตรียมสอบออกจาก checkpoint',
  PRIMARY KEY (`exam_attempt_id`),
  KEY `idx_exam_attempts_enrollment_history` (`enrollment_id`,`submitted_at`,`status`),
  KEY `idx_exam_attempts_source_checkpoint` (`source_checkpoint_id`),
  KEY `idx_exam_attempts_workflow_phase` (`enrollment_id`,`exam_period`,`workflow_phase`,`status`),
  CONSTRAINT `fk_exam_attempts_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_exam_attempts_source_checkpoint` FOREIGN KEY (`source_checkpoint_id`) REFERENCES `exam_checkpoints` (`exam_checkpoint_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_exam_attempts_scores` CHECK ((((`actual_score` is null) and (`max_score` is null)) or ((`actual_score` >= 0) and (`max_score` > 0) and (`actual_score` <= `max_score`)))),
  CONSTRAINT `chk_exam_attempts_submitted` CHECK ((((`status` = _utf8mb4'submitted') and (`submitted_at` is not null) and (`actual_score` is not null) and (`max_score` is not null)) or (`status` <> _utf8mb4'submitted')))
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ประวัติการทำข้อสอบและคะแนนรวม';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_checkpoints`
--

DROP TABLE IF EXISTS `exam_checkpoints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_checkpoints` (
  `exam_checkpoint_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัส Checkpoint',
  `enrollment_id` int NOT NULL COMMENT 'รายวิชาของ Checkpoint',
  `source_exam_attempt_id` int NOT NULL COMMENT 'ครั้งสอบที่ใช้สร้าง Checkpoint',
  `exam_period` enum('midterm','final') NOT NULL COMMENT 'ช่วงข้อสอบที่ใช้ในการสอบติดตาม',
  `weak_topic_count` smallint unsigned NOT NULL COMMENT 'จำนวนหัวข้ออ่อนที่ใช้คำนวณช่วงห่าง',
  `interval_weeks` tinyint unsigned NOT NULL COMMENT 'ช่วงห่าง 1 หรือ 2 สัปดาห์',
  `next_checkpoint_at` datetime NOT NULL COMMENT 'วันและเวลาที่ควรทำข้อสอบครั้งถัดไป',
  `status` enum('pending','completed','superseded','cancelled') NOT NULL DEFAULT 'pending' COMMENT 'สถานะ Checkpoint',
  `completed_at` datetime DEFAULT NULL COMMENT 'วันและเวลาที่ทำ Checkpoint สำเร็จ',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้าง Checkpoint',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`exam_checkpoint_id`),
  UNIQUE KEY `uq_exam_checkpoints_source_attempt` (`source_exam_attempt_id`),
  KEY `idx_exam_checkpoints_due` (`enrollment_id`,`status`,`next_checkpoint_at`),
  CONSTRAINT `fk_exam_checkpoints_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_exam_checkpoints_source_attempt` FOREIGN KEY (`source_exam_attempt_id`) REFERENCES `exam_attempts` (`exam_attempt_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_exam_checkpoints_completed` CHECK ((((`status` = _utf8mb4'completed') and (`completed_at` is not null)) or (`status` <> _utf8mb4'completed'))),
  CONSTRAINT `chk_exam_checkpoints_interval` CHECK ((`interval_weeks` in (1,2)))
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='กำหนดสอบติดตามแบบปรับตามจำนวนหัวข้ออ่อน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `faculties`
--

DROP TABLE IF EXISTS `faculties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculties` (
  `faculty_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสภายในของคณะ',
  `faculty_code` varchar(20) NOT NULL COMMENT 'รหัสย่อของคณะ',
  `faculty_name` varchar(150) NOT NULL COMMENT 'ชื่อคณะ',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะเปิดใช้งานของคณะ',
  `created_by_admin_id` int NOT NULL COMMENT 'เจ้าหน้าที่ผู้สร้างข้อมูลคณะ',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`faculty_id`),
  UNIQUE KEY `uq_faculties_code` (`faculty_code`),
  KEY `idx_faculties_active` (`is_active`),
  KEY `idx_faculties_created_by` (`created_by_admin_id`),
  CONSTRAINT `fk_faculties_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_faculties_active` CHECK ((`is_active` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ข้อมูลคณะของมหาวิทยาลัย';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `grade_boundaries`
--

DROP TABLE IF EXISTS `grade_boundaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grade_boundaries` (
  `grade_boundary_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสช่วงเกรด',
  `grading_scheme_id` int NOT NULL COMMENT 'ชุดเกณฑ์ที่ช่วงเกรดสังกัด',
  `grade_code` varchar(5) NOT NULL COMMENT 'ตัวอักษรเกรด',
  `minimum_percentage` decimal(5,2) NOT NULL COMMENT 'เปอร์เซ็นต์ขั้นต่ำของเกรด',
  `display_order` tinyint unsigned NOT NULL COMMENT 'ลำดับการแสดงผลของเกรด',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`grade_boundary_id`),
  UNIQUE KEY `uq_grade_boundaries_code` (`grading_scheme_id`,`grade_code`),
  UNIQUE KEY `uq_grade_boundaries_order` (`grading_scheme_id`,`display_order`),
  CONSTRAINT `fk_grade_boundaries_scheme` FOREIGN KEY (`grading_scheme_id`) REFERENCES `grading_schemes` (`grading_scheme_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_grade_boundaries_percentage` CHECK ((`minimum_percentage` between 0 and 100))
) ENGINE=InnoDB AUTO_INCREMENT=392 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='คะแนนขั้นต่ำของแต่ละเกรด';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `grading_schemes`
--

DROP TABLE IF EXISTS `grading_schemes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grading_schemes` (
  `grading_scheme_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสชุดเกณฑ์การตัดเกรด',
  `subject_id` varchar(20) NOT NULL COMMENT 'รายวิชาของชุดเกณฑ์',
  `instructor_id` int DEFAULT NULL COMMENT 'อาจารย์เจ้าของเกณฑ์ เมื่อตั้งขอบเขตเป็นรายอาจารย์และวิชา',
  `source_scheme_id` int DEFAULT NULL COMMENT 'ชุดเกณฑ์ต้นทางที่ใช้คัดลอก',
  `scheme_type` enum('subject_default','instructor_subject') NOT NULL COMMENT 'ชนิดของชุดเกณฑ์',
  `version` int unsigned NOT NULL DEFAULT '1' COMMENT 'ลำดับเวอร์ชันของชุดเกณฑ์',
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'สถานะชุดเกณฑ์',
  `created_by_admin_id` int NOT NULL COMMENT 'ผู้สร้างชุดเกณฑ์',
  `updated_by_admin_id` int DEFAULT NULL COMMENT 'ผู้แก้ไขชุดเกณฑ์ล่าสุด',
  `published_by_admin_id` int DEFAULT NULL COMMENT 'อาจารย์ผู้เผยแพร่เกณฑ์',
  `published_at` datetime DEFAULT NULL COMMENT 'วันและเวลาที่เผยแพร่',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`grading_scheme_id`),
  UNIQUE KEY `uq_grading_instructor_subject_version` (`subject_id`,`instructor_id`,`version`),
  KEY `idx_grading_subject_scope` (`subject_id`,`scheme_type`,`status`,`version`),
  KEY `idx_grading_source` (`source_scheme_id`),
  KEY `idx_grading_created_by` (`created_by_admin_id`),
  KEY `idx_grading_updated_by` (`updated_by_admin_id`),
  KEY `idx_grading_published_by` (`published_by_admin_id`),
  KEY `idx_grading_instructor` (`instructor_id`),
  CONSTRAINT `fk_grading_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_grading_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_grading_published_by` FOREIGN KEY (`published_by_admin_id`) REFERENCES `admin` (`admin_id`),
  CONSTRAINT `fk_grading_source` FOREIGN KEY (`source_scheme_id`) REFERENCES `grading_schemes` (`grading_scheme_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_grading_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_grading_updated_by` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_grading_published` CHECK ((((`status` = _utf8mb4'published') and (`published_by_admin_id` is not null) and (`published_at` is not null)) or (`status` <> _utf8mb4'published'))),
  CONSTRAINT `chk_grading_version` CHECK ((`version` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ชุดเกณฑ์ตัดเกรดแบบค่าเริ่มต้นและแบบรายกลุ่มเรียน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `question`
--

DROP TABLE IF EXISTS `question`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question` (
  `question_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสคำถาม',
  `question_bank_id` int NOT NULL COMMENT 'ชุดข้อสอบที่คำถามสังกัด',
  `question_text` text NOT NULL COMMENT 'ข้อความคำถาม',
  `question_image_path` varchar(255) DEFAULT NULL COMMENT 'พาธสัมพัทธ์ของรูปประกอบคำถาม',
  `question_score` decimal(6,2) NOT NULL DEFAULT '1.00' COMMENT 'คะแนนเต็มของคำถาม',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะเปิดใช้งานของคำถาม',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างคำถาม',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`question_id`),
  KEY `idx_question_bank_active` (`question_bank_id`,`is_active`),
  CONSTRAINT `fk_question_bank` FOREIGN KEY (`question_bank_id`) REFERENCES `question_banks` (`question_bank_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_question_active` CHECK ((`is_active` in (0,1))),
  CONSTRAINT `chk_question_score` CHECK ((`question_score` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=1481 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='คำถามในคลังข้อสอบพร้อมรูปประกอบหนึ่งภาพ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `question_banks`
--

DROP TABLE IF EXISTS `question_banks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_banks` (
  `question_bank_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสชุดข้อสอบ',
  `subject_id` varchar(20) NOT NULL COMMENT 'รายวิชาของชุดข้อสอบ',
  `owner_instructor_id` int NOT NULL COMMENT 'อาจารย์เจ้าของคลังข้อสอบ',
  `bank_name` varchar(200) NOT NULL COMMENT 'ชื่อชุดหรือชื่อหัวข้อข้อสอบ',
  `exam_period` enum('midterm','final') NOT NULL COMMENT 'ช่วงการสอบของชุดข้อสอบ',
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT 'สถานะเผยแพร่ของชุดข้อสอบ',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างชุดข้อสอบ',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`question_bank_id`),
  KEY `idx_question_banks_subject_period_status` (`subject_id`,`exam_period`,`status`),
  KEY `idx_question_banks_owner` (`owner_instructor_id`,`status`),
  CONSTRAINT `fk_question_banks_owner` FOREIGN KEY (`owner_instructor_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_question_banks_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`subject_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='คลังคำถามที่หนึ่งชุดแทนหนึ่งพาร์ทหรือหัวข้อ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recurring_busy`
--

DROP TABLE IF EXISTS `recurring_busy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recurring_busy` (
  `recurring_busy_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสช่วงเวลาไม่ว่าง',
  `constraint_id` int NOT NULL COMMENT 'ชุดข้อจำกัดของนักศึกษา',
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL COMMENT 'วันในสัปดาห์',
  `start_time` time NOT NULL COMMENT 'เวลาเริ่มช่วงไม่ว่าง',
  `end_time` time NOT NULL COMMENT 'เวลาสิ้นสุดช่วงไม่ว่าง',
  `label` varchar(100) DEFAULT NULL COMMENT 'ชื่อกิจกรรมหรือเหตุผลที่ไม่ว่าง',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`recurring_busy_id`),
  KEY `idx_recurring_busy_schedule` (`constraint_id`,`day_of_week`,`start_time`),
  CONSTRAINT `fk_recurring_busy_constraint` FOREIGN KEY (`constraint_id`) REFERENCES `user_constraints` (`constraint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_recurring_busy_time` CHECK ((`start_time` < `end_time`))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ช่วงเวลาที่นักศึกษาไม่ว่างเป็นประจำ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schedule_types`
--

DROP TABLE IF EXISTS `schedule_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_types` (
  `schedule_type_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสประเภทกิจกรรม',
  `type_code` varchar(30) NOT NULL COMMENT 'รหัสประเภทกิจกรรม',
  `type_name` varchar(100) NOT NULL COMMENT 'ชื่อประเภทกิจกรรม',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะเปิดใช้งานของประเภท',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`schedule_type_id`),
  UNIQUE KEY `uq_schedule_types_code` (`type_code`),
  KEY `idx_schedule_types_active` (`is_active`),
  CONSTRAINT `chk_schedule_types_active` CHECK ((`is_active` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ประเภทกิจกรรมในตารางแนะนำ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `score`
--

DROP TABLE IF EXISTS `score`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `score` (
  `score_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสข้อมูลคะแนน',
  `workload_id` int NOT NULL COMMENT 'ภาระงานเจ้าของคะแนน',
  `actual_score` decimal(8,2) NOT NULL COMMENT 'คะแนนที่ได้รับ',
  `max_score` decimal(8,2) NOT NULL COMMENT 'คะแนนเต็ม',
  `recorded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่บันทึกคะแนน',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขคะแนนล่าสุด',
  PRIMARY KEY (`score_id`),
  UNIQUE KEY `uq_score_workload` (`workload_id`),
  CONSTRAINT `fk_score_workload` FOREIGN KEY (`workload_id`) REFERENCES `workloads` (`workload_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_score_values` CHECK (((`actual_score` >= 0) and (`max_score` > 0) and (`actual_score` <= `max_score`)))
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='คะแนนของภาระงาน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `section_curriculum_subjects`
--

DROP TABLE IF EXISTS `section_curriculum_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `section_curriculum_subjects` (
  `section_id` int NOT NULL COMMENT 'กลุ่มเรียนที่เปิดสอน',
  `curriculum_subject_id` int NOT NULL COMMENT 'รายการวิชาในหลักสูตรที่เลือกกลุ่มเรียนนี้ได้',
  `assigned_by_admin_id` int NOT NULL COMMENT 'เจ้าหน้าที่ผู้กำหนดกลุ่มเป้าหมายของกลุ่มเรียน',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่กำหนดให้กลุ่มเรียนรองรับหลักสูตรนี้',
  PRIMARY KEY (`section_id`,`curriculum_subject_id`),
  KEY `idx_section_curriculum_curriculum` (`curriculum_subject_id`,`section_id`),
  KEY `idx_section_curriculum_assigned_by` (`assigned_by_admin_id`),
  CONSTRAINT `fk_section_curriculum_assigned_by` FOREIGN KEY (`assigned_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_section_curriculum_curriculum_subject` FOREIGN KEY (`curriculum_subject_id`) REFERENCES `curriculum_subjects` (`curriculum_subject_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_section_curriculum_section` FOREIGN KEY (`section_id`) REFERENCES `course_sections` (`section_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='หลักสูตร สาขา และชั้นปีที่สามารถเลือกแต่ละกลุ่มเรียนได้';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `section_instructors`
--

DROP TABLE IF EXISTS `section_instructors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `section_instructors` (
  `section_id` int NOT NULL COMMENT 'กลุ่มเรียนที่มอบหมาย',
  `instructor_id` int NOT NULL COMMENT 'บัญชีอาจารย์ผู้สอน',
  `instructor_role` enum('owner','co_instructor') NOT NULL COMMENT 'บทบาทของอาจารย์ในกลุ่มเรียน',
  `assigned_by_admin_id` int NOT NULL COMMENT 'เจ้าหน้าที่ผู้มอบหมายอาจารย์',
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่มอบหมาย',
  PRIMARY KEY (`section_id`,`instructor_id`),
  KEY `idx_section_instructors_instructor` (`instructor_id`,`section_id`),
  KEY `idx_section_instructors_assigned_by` (`assigned_by_admin_id`),
  CONSTRAINT `fk_section_instructors_assigned_by` FOREIGN KEY (`assigned_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_section_instructors_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_section_instructors_section` FOREIGN KEY (`section_id`) REFERENCES `course_sections` (`section_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='อาจารย์เจ้าของวิชาและอาจารย์ผู้สอนร่วมของแต่ละกลุ่มเรียน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `student_class_meeting_overrides`
--

DROP TABLE IF EXISTS `student_class_meeting_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_class_meeting_overrides` (
  `enrollment_id` int NOT NULL COMMENT 'รายการลงทะเบียนของนักศึกษา',
  `class_meeting_id` int NOT NULL COMMENT 'บล็อกเวลาเรียนจากตารางกลาง',
  `override_day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') DEFAULT NULL COMMENT 'วันเรียนส่วนตัว; NULL หมายถึงใช้วันจากตารางกลาง',
  `override_start_time` time DEFAULT NULL COMMENT 'เวลาเริ่มส่วนตัว; NULL หมายถึงใช้เวลาจากตารางกลาง',
  `override_end_time` time DEFAULT NULL COMMENT 'เวลาสิ้นสุดส่วนตัว; NULL หมายถึงใช้เวลาจากตารางกลาง',
  `override_classroom` varchar(100) DEFAULT NULL COMMENT 'ห้องเรียนส่วนตัว; NULL หมายถึงใช้ห้องจากตารางกลาง',
  `note` varchar(500) DEFAULT NULL COMMENT 'โน้ตส่วนตัวของบล็อกเรียน เช่น สิ่งที่ต้องนำมาเรียน',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`enrollment_id`,`class_meeting_id`),
  KEY `idx_student_class_meeting_overrides_meeting` (`class_meeting_id`),
  CONSTRAINT `fk_scmo_class_meeting` FOREIGN KEY (`class_meeting_id`) REFERENCES `class_meetings` (`class_meeting_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_scmo_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='วัน เวลา ห้องเรียน และโน้ตที่นักศึกษาแก้สำหรับบล็อกเรียนของตน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `student_terms`
--

DROP TABLE IF EXISTS `student_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_terms` (
  `student_term_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสภาคการศึกษาของนักศึกษา',
  `user_id` int NOT NULL COMMENT 'นักศึกษาเจ้าของภาคการศึกษา',
  `academic_term_id` int NOT NULL COMMENT 'ภาคการศึกษากลางของมหาวิทยาลัย',
  `department_id` int NOT NULL COMMENT 'สาขาวิชาของนักศึกษา ณ ตอนสร้างภาคเรียน',
  `year_level` tinyint unsigned NOT NULL COMMENT 'ชั้นปีที่นักศึกษาระบุ',
  `status` enum('active','completed','cancelled') NOT NULL DEFAULT 'active' COMMENT 'สถานะภาคเรียนของนักศึกษา',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างภาคเรียน',
  `completed_at` datetime DEFAULT NULL COMMENT 'วันและเวลาที่ปิดภาคเรียน',
  `midterm_followup_notified_at` datetime DEFAULT NULL COMMENT 'เวลาที่แสดงการแจ้งเตือนกรอกคะแนนสอบกลางภาคแล้ว',
  PRIMARY KEY (`student_term_id`),
  UNIQUE KEY `uq_student_terms_user_term` (`user_id`,`academic_term_id`),
  KEY `idx_student_terms_academic_status` (`academic_term_id`,`status`),
  KEY `idx_student_terms_department_year` (`department_id`,`year_level`),
  CONSTRAINT `fk_student_terms_academic_term` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms` (`academic_term_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_student_terms_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_student_terms_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_student_terms_completed` CHECK ((((`status` = _utf8mb4'completed') and (`completed_at` is not null)) or (`status` <> _utf8mb4'completed'))),
  CONSTRAINT `chk_student_terms_year_level` CHECK ((`year_level` between 1 and 8))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ภาคการศึกษาของนักศึกษาแต่ละคน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `study_sessions`
--

DROP TABLE IF EXISTS `study_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `study_sessions` (
  `study_session_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสช่วงเวลาอ่านจริง',
  `enrollment_id` int NOT NULL COMMENT 'รายวิชาที่นักศึกษาอ่าน',
  `weekly_block_id` int DEFAULT NULL COMMENT 'บล็อกแนะนำที่เกี่ยวข้อง',
  `started_at` datetime NOT NULL COMMENT 'วันและเวลาที่เริ่มจับเวลา',
  `ended_at` datetime DEFAULT NULL COMMENT 'วันและเวลาที่สิ้นสุด',
  `status` enum('running','paused','completed','interrupted','cancelled') NOT NULL COMMENT 'สถานะของตัวจับเวลา',
  `running_since` datetime DEFAULT NULL COMMENT 'เวลาที่เริ่มเดินต่อรอบล่าสุด',
  `accumulated_seconds` int unsigned NOT NULL DEFAULT '0' COMMENT 'วินาทีที่สะสมก่อนรอบที่กำลังเดิน',
  `last_seen_at` datetime DEFAULT NULL COMMENT 'เวลาที่อุปกรณ์ส่งสัญญาณล่าสุด',
  `version` int unsigned NOT NULL DEFAULT '1' COMMENT 'เลขเวอร์ชันป้องกันการแก้ไขชนกัน',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`study_session_id`),
  KEY `idx_study_sessions_enrollment_time` (`enrollment_id`,`started_at`,`status`),
  KEY `idx_study_sessions_block` (`weekly_block_id`),
  KEY `idx_study_sessions_heartbeat` (`status`,`last_seen_at`),
  CONSTRAINT `fk_study_sessions_block` FOREIGN KEY (`weekly_block_id`) REFERENCES `weekly_schedule_block` (`weekly_block_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_study_sessions_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_study_sessions_end` CHECK (((`ended_at` is null) or (`ended_at` >= `started_at`))),
  CONSTRAINT `chk_study_sessions_version` CHECK ((`version` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='เวลาอ่านจริงจากตัวจับเวลา';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subject_types`
--

DROP TABLE IF EXISTS `subject_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subject_types` (
  `subject_type_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสประเภทรายวิชา',
  `subject_type_name` varchar(100) NOT NULL COMMENT 'ชื่อประเภทรายวิชา',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะเปิดใช้งานของประเภทวิชา',
  `created_by_admin_id` int NOT NULL COMMENT 'เจ้าหน้าที่ผู้สร้างประเภทวิชา',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`subject_type_id`),
  UNIQUE KEY `uq_subject_types_name` (`subject_type_name`),
  KEY `idx_subject_types_active` (`is_active`),
  KEY `idx_subject_types_created_by` (`created_by_admin_id`),
  CONSTRAINT `fk_subject_types_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_subject_types_active` CHECK ((`is_active` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ประเภทของรายวิชา';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `subjects`
--

DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subjects` (
  `subject_id` varchar(20) NOT NULL COMMENT 'รหัสรายวิชาที่มหาวิทยาลัยกำหนด',
  `subject_name` varchar(200) NOT NULL COMMENT 'ชื่อรายวิชา',
  `credits` tinyint unsigned NOT NULL COMMENT 'จำนวนหน่วยกิต',
  `subject_type_id` int NOT NULL COMMENT 'ประเภทรายวิชา',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะเปิดใช้งานของรายวิชา',
  `created_by_admin_id` int NOT NULL COMMENT 'เจ้าหน้าที่ผู้สร้างรายวิชา',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`subject_id`),
  KEY `idx_subjects_type_active` (`subject_type_id`,`is_active`),
  KEY `idx_subjects_created_by` (`created_by_admin_id`),
  CONSTRAINT `fk_subjects_created_by` FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_subjects_type` FOREIGN KEY (`subject_type_id`) REFERENCES `subject_types` (`subject_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_subjects_active` CHECK ((`is_active` in (0,1))),
  CONSTRAINT `chk_subjects_credits` CHECK ((`credits` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ข้อมูลหลักของรายวิชา';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `user_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสผู้ใช้นักศึกษา',
  `user_name` varchar(50) NOT NULL COMMENT 'ชื่อบัญชีสำหรับเข้าสู่ระบบ',
  `user_password` varchar(255) NOT NULL COMMENT 'รหัสผ่านที่ผ่านการแฮช',
  `first_name` varchar(100) NOT NULL COMMENT 'ชื่อจริงของนักศึกษา',
  `last_name` varchar(100) NOT NULL COMMENT 'นามสกุลของนักศึกษา',
  `email` varchar(255) NOT NULL COMMENT 'อีเมลของนักศึกษา',
  `department_id` int NOT NULL COMMENT 'สาขาวิชาที่นักศึกษาเลือกตอนสมัครบัญชี',
  `user_pic` varchar(255) DEFAULT NULL COMMENT 'พาธสัมพัทธ์ของรูปโปรไฟล์',
  `birthdate` date DEFAULT NULL COMMENT 'วันเดือนปีเกิด',
  `gender` enum('male','female','other','unspecified') NOT NULL DEFAULT 'unspecified' COMMENT 'เพศของผู้ใช้',
  `status` enum('active','suspended','archived') NOT NULL DEFAULT 'active' COMMENT 'สถานะบัญชีนักศึกษา',
  `status_changed_by_admin_id` int DEFAULT NULL COMMENT 'เจ้าหน้าที่ผู้เปลี่ยนสถานะบัญชีล่าสุด',
  `status_changed_at` datetime DEFAULT NULL COMMENT 'วันและเวลาที่เปลี่ยนสถานะบัญชีล่าสุด',
  `status_reason` varchar(255) DEFAULT NULL COMMENT 'เหตุผลในการเปลี่ยนสถานะบัญชี',
  `last_login` datetime DEFAULT NULL COMMENT 'วันและเวลาที่เข้าสู่ระบบล่าสุด',
  `refresh_token` varchar(500) DEFAULT NULL COMMENT 'Refresh token สำหรับแอปมือถือ',
  `refresh_token_expires_at` datetime DEFAULT NULL COMMENT 'วันและเวลาหมดอายุของ Refresh token',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างบัญชี',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขข้อมูลล่าสุด',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_user_name` (`user_name`),
  UNIQUE KEY `uq_user_email` (`email`),
  KEY `idx_user_department_status` (`department_id`,`status`),
  KEY `idx_user_status_changed_by` (`status_changed_by_admin_id`),
  CONSTRAINT `fk_user_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_user_status_changed_by` FOREIGN KEY (`status_changed_by_admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='บัญชีและข้อมูลประจำตัวของนักศึกษา';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_constraints`
--

DROP TABLE IF EXISTS `user_constraints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_constraints` (
  `constraint_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสข้อจำกัดเวลา',
  `user_id` int NOT NULL COMMENT 'นักศึกษาเจ้าของข้อจำกัด',
  `day_off` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') DEFAULT NULL COMMENT 'วันที่ต้องการพักประจำสัปดาห์',
  `continuous_working_minutes` smallint unsigned NOT NULL COMMENT 'จำนวนนาทีสูงสุดที่อ่านต่อเนื่อง',
  `break_minutes` smallint unsigned NOT NULL COMMENT 'จำนวนนาทีพักระหว่างช่วงอ่าน',
  `available_start_time` time NOT NULL COMMENT 'เวลาเริ่มต้นที่สะดวกในแต่ละวัน',
  `available_end_time` time NOT NULL COMMENT 'เวลาสิ้นสุดที่สะดวกในแต่ละวัน',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`constraint_id`),
  UNIQUE KEY `uq_user_constraints_user` (`user_id`),
  CONSTRAINT `fk_user_constraints_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_user_constraints_available_time` CHECK ((`available_start_time` < `available_end_time`)),
  CONSTRAINT `chk_user_constraints_minutes` CHECK (((`continuous_working_minutes` > 0) and (`break_minutes` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ข้อจำกัดเวลาหลักของนักศึกษา';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_recommendation`
--

DROP TABLE IF EXISTS `weekly_recommendation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weekly_recommendation` (
  `recommendation_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสคำแนะนำรายสัปดาห์',
  `student_term_id` int NOT NULL COMMENT 'ภาคเรียนของนักศึกษา',
  `previous_recommendation_id` int DEFAULT NULL COMMENT 'คำแนะนำเวอร์ชันก่อนหน้า',
  `source_exam_attempt_id` int DEFAULT NULL COMMENT 'ครั้งสอบที่กระตุ้นการคำนวณใหม่',
  `source_workload_id` int DEFAULT NULL COMMENT 'ภาระงานที่กระตุ้นการคำนวณใหม่',
  `week_start_date` date NOT NULL COMMENT 'วันเริ่มสัปดาห์ของคำแนะนำ',
  `week_end_date` date NOT NULL COMMENT 'วันสิ้นสุดสัปดาห์ของคำแนะนำ',
  `version` int unsigned NOT NULL DEFAULT '1' COMMENT 'เวอร์ชันคำแนะนำภายในสัปดาห์',
  `trigger_type` enum('weekend','exam_submitted','workload_changed','constraint_changed','manual') NOT NULL COMMENT 'เหตุผลที่สร้างคำแนะนำ',
  `rule_version` varchar(30) NOT NULL COMMENT 'เวอร์ชันกฎที่ใช้คำนวณ',
  `status` enum('pending','accepted','rejected','superseded') NOT NULL DEFAULT 'pending' COMMENT 'สถานะคำแนะนำ',
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'เวลาที่ระบบสร้างคำแนะนำ',
  `accepted_at` datetime DEFAULT NULL COMMENT 'เวลาที่ผู้ใช้ยอมรับ',
  `rejected_at` datetime DEFAULT NULL COMMENT 'เวลาที่ผู้ใช้ปฏิเสธ',
  `superseded_at` datetime DEFAULT NULL COMMENT 'เวลาที่ถูกแทนด้วยเวอร์ชันใหม่',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`recommendation_id`),
  UNIQUE KEY `uq_weekly_recommendation_version` (`student_term_id`,`week_start_date`,`version`),
  KEY `idx_weekly_recommendation_lookup` (`student_term_id`,`week_start_date`,`status`),
  KEY `idx_weekly_recommendation_previous` (`previous_recommendation_id`),
  KEY `idx_weekly_recommendation_exam_source` (`source_exam_attempt_id`),
  KEY `idx_weekly_recommendation_workload_source` (`source_workload_id`),
  CONSTRAINT `fk_weekly_recommendation_exam_source` FOREIGN KEY (`source_exam_attempt_id`) REFERENCES `exam_attempts` (`exam_attempt_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_recommendation_previous` FOREIGN KEY (`previous_recommendation_id`) REFERENCES `weekly_recommendation` (`recommendation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_recommendation_student_term` FOREIGN KEY (`student_term_id`) REFERENCES `student_terms` (`student_term_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_recommendation_workload_source` FOREIGN KEY (`source_workload_id`) REFERENCES `workloads` (`workload_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_weekly_recommendation_dates` CHECK ((`week_end_date` >= `week_start_date`)),
  CONSTRAINT `chk_weekly_recommendation_version` CHECK ((`version` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='หัวรายการคำแนะนำรายสัปดาห์และประวัติเวอร์ชัน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_recommendation_item`
--

DROP TABLE IF EXISTS `weekly_recommendation_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weekly_recommendation_item` (
  `recommendation_item_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายละเอียดคำแนะนำ',
  `recommendation_id` int NOT NULL COMMENT 'หัวรายการคำแนะนำ',
  `enrollment_id` int NOT NULL COMMENT 'รายวิชาที่ลงทะเบียน',
  `schedule_type_id` int NOT NULL COMMENT 'ประเภทกิจกรรมที่แนะนำ',
  `current_minutes` int unsigned NOT NULL DEFAULT '0' COMMENT 'เวลาก่อนปรับคำแนะนำ',
  `base_minutes` int unsigned NOT NULL DEFAULT '0' COMMENT 'เวลาพื้นฐานตามกฎ',
  `score_gap_minutes` int NOT NULL DEFAULT '0' COMMENT 'เวลาที่ปรับจากช่องว่างคะแนน',
  `weak_topic_minutes` int NOT NULL DEFAULT '0' COMMENT 'เวลาที่ปรับจากหัวข้ออ่อน',
  `exam_proximity_minutes` int NOT NULL DEFAULT '0' COMMENT 'เวลาที่ปรับตามความใกล้ช่วงสอบ',
  `quiz_floor_minutes` int unsigned NOT NULL DEFAULT '0' COMMENT 'เวลาขั้นต่ำจากกฎแบบทดสอบ',
  `workload_minutes` int NOT NULL DEFAULT '0' COMMENT 'เวลาที่ปรับจากปริมาณภาระงาน',
  `deadline_minutes` int NOT NULL DEFAULT '0' COMMENT 'เวลาที่ปรับจากความใกล้กำหนดส่ง',
  `behavior_adjustment_minutes` int NOT NULL DEFAULT '0' COMMENT 'เวลาที่ปรับจากพฤติกรรมอ่านจริง',
  `previous_actual_minutes` int unsigned NOT NULL DEFAULT '0' COMMENT 'เวลาอ่านจริงรวมสัปดาห์ก่อน',
  `previous_adherent_minutes` int unsigned NOT NULL DEFAULT '0' COMMENT 'เวลาอ่านจริงที่ทับซ้อนบล็อกแผนที่ยอมรับ',
  `previous_adherence_rate` decimal(5,2) DEFAULT NULL COMMENT 'อัตราการทำตามแผนสัปดาห์ก่อน',
  `raw_minutes` int NOT NULL DEFAULT '0' COMMENT 'ผลรวมเวลาก่อนใช้เพดาน',
  `max_minutes` int unsigned NOT NULL DEFAULT '0' COMMENT 'เวลาสูงสุดตามเพดานกฎ',
  `target_minutes` int unsigned NOT NULL DEFAULT '0' COMMENT 'เวลาเป้าหมายหลังใช้เพดาน',
  `allocated_minutes` int unsigned NOT NULL DEFAULT '0' COMMENT 'เวลาที่จัดลงตารางได้',
  `unallocated_minutes` int unsigned NOT NULL DEFAULT '0' COMMENT 'เวลาที่ยังจัดลงตารางไม่ได้',
  `difference_minutes` int NOT NULL DEFAULT '0' COMMENT 'ผลต่างจากเวลาปัจจุบัน',
  `primary_action` enum('create','increase','decrease','keep','remove','move','mixed') NOT NULL COMMENT 'การเปลี่ยนแปลงหลักที่เสนอ',
  `cap_applied` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'มีการใช้เพดานเวลาหรือไม่',
  `capacity_limited` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'ถูกจำกัดด้วยเวลาว่างหรือไม่',
  `reasons_json` json NOT NULL COMMENT 'เหตุผลและกฎที่ส่งผลต่อคำแนะนำ',
  `changes_json` json DEFAULT NULL COMMENT 'รายละเอียดการเปลี่ยนแปลงจากเวอร์ชันก่อน',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`recommendation_item_id`),
  UNIQUE KEY `uq_weekly_item_enrollment_type` (`recommendation_id`,`enrollment_id`,`schedule_type_id`),
  KEY `idx_weekly_item_enrollment` (`enrollment_id`,`schedule_type_id`),
  KEY `idx_weekly_item_action` (`recommendation_id`,`primary_action`),
  KEY `idx_weekly_item_schedule_type` (`schedule_type_id`),
  CONSTRAINT `fk_weekly_item_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_item_recommendation` FOREIGN KEY (`recommendation_id`) REFERENCES `weekly_recommendation` (`recommendation_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_item_schedule_type` FOREIGN KEY (`schedule_type_id`) REFERENCES `schedule_types` (`schedule_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_weekly_item_adherence_rate` CHECK (((`previous_adherence_rate` is null) or (`previous_adherence_rate` between 0 and 100))),
  CONSTRAINT `chk_weekly_item_allocated` CHECK ((`allocated_minutes` <= `target_minutes`)),
  CONSTRAINT `chk_weekly_item_flags` CHECK (((`cap_applied` in (0,1)) and (`capacity_limited` in (0,1))))
) ENGINE=InnoDB AUTO_INCREMENT=258 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ผลคำนวณคำแนะนำระดับรายวิชาและประเภทกิจกรรม';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_schedule_block`
--

DROP TABLE IF EXISTS `weekly_schedule_block`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weekly_schedule_block` (
  `weekly_block_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสบล็อกเวลา',
  `recommendation_id` int NOT NULL COMMENT 'คำแนะนำเจ้าของบล็อก',
  `recommendation_item_id` int DEFAULT NULL COMMENT 'รายละเอียดคำแนะนำที่สร้างบล็อก',
  `enrollment_id` int NOT NULL COMMENT 'รายวิชาที่จะอ่านหรือทำงาน',
  `schedule_type_id` int NOT NULL COMMENT 'ประเภทกิจกรรมของบล็อก',
  `source_weekly_block_id` int DEFAULT NULL COMMENT 'บล็อกต้นทางเมื่อนำมาคัดลอกหรือปรับ',
  `scheduled_date` date NOT NULL COMMENT 'วันที่ของบล็อกเวลา',
  `start_time` time NOT NULL COMMENT 'เวลาเริ่มบล็อก',
  `end_time` time NOT NULL COMMENT 'เวลาสิ้นสุดบล็อก',
  `source` enum('generated','copied_previous','user_adjusted','user_added') NOT NULL COMMENT 'ที่มาของบล็อก',
  `is_user_modified` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'ผู้ใช้แก้ไขบล็อกหรือไม่',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างบล็อก',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`weekly_block_id`),
  KEY `idx_weekly_block_recommendation` (`recommendation_id`,`scheduled_date`,`start_time`),
  KEY `idx_weekly_block_item` (`recommendation_item_id`),
  KEY `idx_weekly_block_enrollment` (`enrollment_id`,`scheduled_date`,`start_time`),
  KEY `idx_weekly_block_schedule_type` (`schedule_type_id`),
  KEY `idx_weekly_block_source` (`source_weekly_block_id`),
  CONSTRAINT `fk_weekly_block_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_block_item` FOREIGN KEY (`recommendation_item_id`) REFERENCES `weekly_recommendation_item` (`recommendation_item_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_block_recommendation` FOREIGN KEY (`recommendation_id`) REFERENCES `weekly_recommendation` (`recommendation_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_block_schedule_type` FOREIGN KEY (`schedule_type_id`) REFERENCES `schedule_types` (`schedule_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_weekly_block_source` FOREIGN KEY (`source_weekly_block_id`) REFERENCES `weekly_schedule_block` (`weekly_block_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_weekly_block_modified` CHECK ((`is_user_modified` in (0,1))),
  CONSTRAINT `chk_weekly_block_time` CHECK ((`start_time` < `end_time`))
) ENGINE=InnoDB AUTO_INCREMENT=308 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='บล็อกเวลาที่ระบบจัดให้หรือผู้ใช้ปรับ';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workload_types`
--

DROP TABLE IF EXISTS `workload_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workload_types` (
  `workload_type_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสประเภทภาระงาน',
  `type_code` varchar(30) NOT NULL COMMENT 'รหัสประเภทภาระงาน',
  `type_name` varchar(100) NOT NULL COMMENT 'ชื่อประเภทภาระงาน',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'สถานะเปิดใช้งานของประเภท',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างข้อมูล',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`workload_type_id`),
  UNIQUE KEY `uq_workload_types_code` (`type_code`),
  KEY `idx_workload_types_active` (`is_active`),
  CONSTRAINT `chk_workload_types_active` CHECK ((`is_active` in (0,1)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ประเภทภาระงานของนักศึกษา';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `workloads`
--

DROP TABLE IF EXISTS `workloads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workloads` (
  `workload_id` int NOT NULL AUTO_INCREMENT COMMENT 'รหัสภาระงาน',
  `enrollment_id` int NOT NULL COMMENT 'รายวิชาที่ภาระงานสังกัด',
  `workload_type_id` int NOT NULL COMMENT 'ประเภทภาระงาน',
  `workload_name` varchar(200) NOT NULL COMMENT 'ชื่อภาระงาน',
  `deadline_date` date NOT NULL COMMENT 'วันกำหนดส่ง',
  `deadline_time` time DEFAULT NULL COMMENT 'เวลากำหนดส่ง',
  `note` text COMMENT 'รายละเอียดเพิ่มเติม',
  `status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending' COMMENT 'สถานะภาระงาน',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่สร้างภาระงาน',
  `finished_at` datetime DEFAULT NULL COMMENT 'วันและเวลาที่ทำภาระงานเสร็จ',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันและเวลาที่แก้ไขล่าสุด',
  PRIMARY KEY (`workload_id`),
  KEY `idx_workloads_enrollment_deadline` (`enrollment_id`,`deadline_date`,`status`),
  KEY `idx_workloads_type` (`workload_type_id`),
  CONSTRAINT `fk_workloads_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`enrollment_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_workloads_type` FOREIGN KEY (`workload_type_id`) REFERENCES `workload_types` (`workload_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_workloads_finished` CHECK ((((`status` = _utf8mb4'completed') and (`finished_at` is not null)) or (`status` <> _utf8mb4'completed')))
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ภาระงานส่วนตัวของนักศึกษาในรายวิชาที่ลงทะเบียน';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'planentrix'
--

--
-- Dumping routines for database 'planentrix'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-31 17:29:21
