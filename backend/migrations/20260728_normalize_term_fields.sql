-- Normalize the terms table so each column matches the form meaning:
-- year_level = ชั้นปี, term = เทอม, academic_year = ปีการศึกษา.
-- Existing rows were written as term = year level and semester = term,
-- so move both values before removing the misleading semester column.

ALTER TABLE terms
  ADD COLUMN year_level INT NULL AFTER user_id;

UPDATE terms
SET year_level = term,
    term = semester;

ALTER TABLE terms
  MODIFY COLUMN year_level INT NOT NULL,
  DROP COLUMN semester;
