CREATE TABLE IF NOT EXISTS system_evaluations (
  system_evaluation_id INT NOT NULL AUTO_INCREMENT,
  student_term_id INT NOT NULL,
  responses_json JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (system_evaluation_id),
  UNIQUE KEY uq_system_evaluations_student_term (student_term_id),
  CONSTRAINT fk_system_evaluations_student_term
    FOREIGN KEY (student_term_id)
    REFERENCES student_terms (student_term_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);
