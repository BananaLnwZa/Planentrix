ALTER TABLE study_sessions
  ADD COLUMN IF NOT EXISTS study_method ENUM('reading', 'practice', 'video', 'review')
    NOT NULL DEFAULT 'reading'
    AFTER weekly_block_id;
