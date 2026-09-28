-- Create the missing subject-level grading templates and copy them to existing
-- course sections. New subjects and sections are handled by the application.

START TRANSACTION;

INSERT INTO grading_schemes
  (subject_id, section_id, source_scheme_id, scheme_type, version, status,
   created_by_admin_id, updated_by_admin_id, published_by_admin_id,
   published_at)
SELECT subject.subject_id, NULL, NULL, 'subject_default', 1, 'published',
       subject.created_by_admin_id, subject.created_by_admin_id,
       subject.created_by_admin_id, NOW()
FROM subjects subject
WHERE subject.is_active = 1
  AND NOT EXISTS (
    SELECT 1
    FROM grading_schemes scheme
    WHERE scheme.subject_id = subject.subject_id
      AND scheme.scheme_type = 'subject_default'
      AND scheme.section_id IS NULL
      AND scheme.status <> 'archived'
  );

INSERT INTO grade_boundaries
  (grading_scheme_id, grade_code, minimum_percentage, display_order)
SELECT scheme.grading_scheme_id, defaults.grade_code,
       defaults.minimum_percentage, defaults.display_order
FROM grading_schemes scheme
CROSS JOIN (
  SELECT 'A' AS grade_code, 80.00 AS minimum_percentage, 1 AS display_order
  UNION ALL SELECT 'B+', 75.00, 2
  UNION ALL SELECT 'B', 70.00, 3
  UNION ALL SELECT 'C+', 65.00, 4
  UNION ALL SELECT 'C', 60.00, 5
  UNION ALL SELECT 'D+', 55.00, 6
  UNION ALL SELECT 'D', 50.00, 7
  UNION ALL SELECT 'F', 0.00, 8
) defaults
WHERE scheme.scheme_type = 'subject_default'
  AND scheme.section_id IS NULL
  AND scheme.status <> 'archived'
  AND NOT EXISTS (
    SELECT 1
    FROM grade_boundaries boundary
    WHERE boundary.grading_scheme_id = scheme.grading_scheme_id
  );

INSERT INTO grading_schemes
  (subject_id, section_id, source_scheme_id, scheme_type, version, status,
   created_by_admin_id, updated_by_admin_id)
SELECT section.subject_id, section.section_id,
       subject_default.grading_scheme_id, 'section', 1, 'draft',
       section.created_by_admin_id, section.created_by_admin_id
FROM course_sections section
INNER JOIN (
  SELECT ranked.subject_id, ranked.grading_scheme_id
  FROM (
    SELECT scheme.subject_id, scheme.grading_scheme_id,
           ROW_NUMBER() OVER (
             PARTITION BY scheme.subject_id
             ORDER BY (scheme.status = 'published') DESC,
                      scheme.version DESC, scheme.grading_scheme_id DESC
           ) AS rank_position
    FROM grading_schemes scheme
    WHERE scheme.scheme_type = 'subject_default'
      AND scheme.section_id IS NULL
      AND scheme.status <> 'archived'
  ) ranked
  WHERE ranked.rank_position = 1
) subject_default ON subject_default.subject_id = section.subject_id
WHERE section.status <> 'cancelled'
  AND NOT EXISTS (
    SELECT 1
    FROM grading_schemes scheme
    WHERE scheme.section_id = section.section_id
      AND scheme.scheme_type = 'section'
  );

INSERT INTO grade_boundaries
  (grading_scheme_id, grade_code, minimum_percentage, display_order)
SELECT section_scheme.grading_scheme_id, source_boundary.grade_code,
       source_boundary.minimum_percentage, source_boundary.display_order
FROM grading_schemes section_scheme
INNER JOIN grade_boundaries source_boundary
  ON source_boundary.grading_scheme_id = section_scheme.source_scheme_id
WHERE section_scheme.scheme_type = 'section'
  AND section_scheme.source_scheme_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM grade_boundaries boundary
    WHERE boundary.grading_scheme_id = section_scheme.grading_scheme_id
  );

COMMIT;
