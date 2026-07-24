ALTER TABLE terms
  ADD COLUMN user_id INT NULL AFTER term_id,
  ADD INDEX idx_terms_user_status (user_id, term_status, term_id),
  ADD CONSTRAINT fk_terms_user
    FOREIGN KEY (user_id) REFERENCES user(user_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

-- Existing terms stay unassigned because there is no reliable ownership data.
-- New terms receive user_id from the authenticated user's JWT.
