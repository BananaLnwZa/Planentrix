-- เปลี่ยนเกณฑ์ตัดเกรดจากราย Section เป็นรายอาจารย์ + วิชา
-- ย้ายเกณฑ์ปัจจุบันไปยังรายอาจารย์ + วิชา แล้วลบข้อมูลเกณฑ์ราย Section เดิม
-- สำรองฐานข้อมูลก่อนรัน เพราะ migration นี้ลบประวัติเกณฑ์ราย Section
-- ใช้ MySQL 8.0+ (ต้องรองรับ CTE และ ROW_NUMBER)

-- 1) เพิ่มเจ้าของเกณฑ์ และรองรับชนิด instructor_subject
--    Drop chk_grading_scope ก่อน เพราะ CHECK เดิมอ้าง section_id ซึ่งสัมพันธ์กับ FK
ALTER TABLE grading_schemes
  DROP CHECK chk_grading_scope;

ALTER TABLE grading_schemes
  ADD COLUMN instructor_id INT DEFAULT NULL
    COMMENT 'อาจารย์เจ้าของเกณฑ์ เมื่อตั้งขอบเขตเป็นรายอาจารย์และวิชา'
    AFTER subject_id,
  MODIFY COLUMN scheme_type
    ENUM('subject_default','section','instructor_subject') NOT NULL
    COMMENT 'ชนิดของชุดเกณฑ์',
  DROP FOREIGN KEY fk_grading_section,
  DROP INDEX uq_grading_section_version,
  ADD UNIQUE KEY uq_grading_instructor_subject_version
    (subject_id, instructor_id, version),
  ADD KEY idx_grading_instructor (instructor_id),
  ADD CONSTRAINT fk_grading_instructor
    FOREIGN KEY (instructor_id) REFERENCES admin (admin_id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) เตรียมแหล่งเกณฑ์ต่ออาจารย์ + วิชา
--    เลือกเกณฑ์ที่ Publish ล่าสุดของทุก Section ที่อาจารย์เป็น owner ก่อน
--    ถ้ายังไม่มีเกณฑ์ Publish จะคัดลอก draft ล่าสุด; ถ้าไม่มีเลยใช้ subject_default
DROP TEMPORARY TABLE IF EXISTS tmp_instructor_subject_grading_seed;

CREATE TEMPORARY TABLE tmp_instructor_subject_grading_seed AS
WITH candidates AS (
  SELECT si.instructor_id,
         section.subject_id,
         scheme.grading_scheme_id AS source_scheme_id,
         scheme.status AS source_status,
         scheme.created_by_admin_id,
         scheme.updated_by_admin_id,
         scheme.published_by_admin_id,
         scheme.published_at,
         scheme.created_at,
         ROW_NUMBER() OVER (
           PARTITION BY si.instructor_id, section.subject_id
           ORDER BY
             CASE scheme.status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
             COALESCE(scheme.published_at, scheme.updated_at, scheme.created_at) DESC,
             scheme.version DESC,
             scheme.grading_scheme_id DESC
         ) AS candidate_rank
  FROM section_instructors si
  INNER JOIN course_sections section
    ON section.section_id = si.section_id
  INNER JOIN grading_schemes scheme
    ON scheme.section_id = section.section_id
   AND scheme.scheme_type = 'section'
  WHERE si.instructor_role = 'owner'
    AND scheme.status IN ('published','draft')

  UNION ALL

  SELECT instructor_subject.instructor_id,
         instructor_subject.subject_id,
         default_scheme.grading_scheme_id AS source_scheme_id,
         'draft' AS source_status,
         default_scheme.created_by_admin_id,
         default_scheme.updated_by_admin_id,
         NULL AS published_by_admin_id,
         NULL AS published_at,
         default_scheme.created_at,
         ROW_NUMBER() OVER (
           PARTITION BY instructor_subject.instructor_id, instructor_subject.subject_id
           ORDER BY default_scheme.version DESC, default_scheme.grading_scheme_id DESC
         ) + 1000000 AS candidate_rank
  FROM (
    SELECT DISTINCT si.instructor_id, section.subject_id
    FROM section_instructors si
    INNER JOIN course_sections section
      ON section.section_id = si.section_id
    WHERE si.instructor_role = 'owner'
  ) instructor_subject
  INNER JOIN grading_schemes default_scheme
    ON default_scheme.subject_id = instructor_subject.subject_id
   AND default_scheme.scheme_type = 'subject_default'
   AND default_scheme.section_id IS NULL
   AND default_scheme.status = 'published'
), ranked AS (
  SELECT candidates.*,
         ROW_NUMBER() OVER (
           PARTITION BY instructor_id, subject_id
           ORDER BY candidate_rank
         ) AS pair_rank
  FROM candidates
)
SELECT instructor_id, subject_id, source_scheme_id, source_status,
       created_by_admin_id, updated_by_admin_id,
       published_by_admin_id, published_at
FROM ranked
WHERE pair_rank = 1;

-- 3) สร้าง Version 1 ของขอบเขตใหม่
--    ถ้าคัดลอกจาก published เดิม จะยังเป็น published; ถ้าเป็น draft/default จะเป็น draft
INSERT INTO grading_schemes
  (subject_id, instructor_id, section_id, source_scheme_id, scheme_type,
   version, status, created_by_admin_id, updated_by_admin_id,
   published_by_admin_id, published_at)
SELECT seed.subject_id,
       seed.instructor_id,
       NULL,
       seed.source_scheme_id,
       'instructor_subject',
       1,
       CASE WHEN seed.source_status = 'published' THEN 'published' ELSE 'draft' END,
       seed.created_by_admin_id,
       seed.updated_by_admin_id,
       CASE WHEN seed.source_status = 'published' THEN seed.published_by_admin_id ELSE NULL END,
       CASE WHEN seed.source_status = 'published' THEN seed.published_at ELSE NULL END
FROM tmp_instructor_subject_grading_seed seed
WHERE NOT EXISTS (
  SELECT 1
  FROM grading_schemes existing
  WHERE existing.subject_id = seed.subject_id
    AND existing.instructor_id = seed.instructor_id
    AND existing.scheme_type = 'instructor_subject'
);

-- คัดลอกช่วงคะแนนจากแหล่งเดิมไปยัง Version 1 ใหม่
INSERT INTO grade_boundaries
  (grading_scheme_id, grade_code, minimum_percentage, display_order)
SELECT target.grading_scheme_id,
       source_boundary.grade_code,
       source_boundary.minimum_percentage,
       source_boundary.display_order
FROM tmp_instructor_subject_grading_seed seed
INNER JOIN grading_schemes target
  ON target.subject_id = seed.subject_id
 AND target.instructor_id = seed.instructor_id
 AND target.scheme_type = 'instructor_subject'
 AND target.version = 1
INNER JOIN grade_boundaries source_boundary
  ON source_boundary.grading_scheme_id = seed.source_scheme_id
WHERE NOT EXISTS (
  SELECT 1
  FROM grade_boundaries existing_boundary
  WHERE existing_boundary.grading_scheme_id = target.grading_scheme_id
);

DROP TEMPORARY TABLE IF EXISTS tmp_instructor_subject_grading_seed;

-- 4) ลบชุดเกณฑ์ราย Section เดิมหลังคัดลอกเกณฑ์ที่เลือกและช่วงคะแนนแล้ว
--    grade_boundaries จะถูกลบตาม FK ON DELETE CASCADE;
--    source_scheme_id ในชุดใหม่จะเป็น NULL ตาม FK ON DELETE SET NULL เมื่อชี้มายังชุดเก่าที่ลบ
DELETE FROM grading_schemes
WHERE grading_scheme_id > 0
  AND scheme_type = 'section';

-- 5) เอา section_id ออกจาก schema เพื่อไม่ให้เกณฑ์กลับไปผูกกับกลุ่มเรียน
ALTER TABLE grading_schemes
  DROP COLUMN section_id,
  MODIFY COLUMN scheme_type
    ENUM('subject_default','instructor_subject') NOT NULL
    COMMENT 'ชนิดของชุดเกณฑ์';

-- หลัง migrate แล้ว:
-- * เกณฑ์ใหม่อยู่ใน grading_schemes ที่ scheme_type='instructor_subject',
--   instructor_id + subject_id ระบุเจ้าของ และไม่มี section_id แล้ว
-- * ข้อมูลเกณฑ์แบบ section และช่วงคะแนนเดิมถูกลบแล้ว
-- * subject_default ยังคงอยู่เป็นค่าเริ่มต้นของรายวิชา
