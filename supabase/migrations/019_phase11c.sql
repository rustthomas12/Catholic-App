-- Phase 11C: Prayer Journal, Rosary Tracker, Formation Progress

-- ============================================================
-- Prayer Journal
-- ============================================================
CREATE TABLE IF NOT EXISTS prayer_journal (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) <= 5000),
  title      TEXT CHECK (char_length(title) <= 200),
  mood       TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prayer_journal_user_idx
  ON prayer_journal(user_id, created_at DESC);

ALTER TABLE prayer_journal ENABLE ROW LEVEL SECURITY;

-- ONLY the user can access their own entries. No admin access by design.
CREATE POLICY "Users own their journal"
  ON prayer_journal FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_prayer_journal_updated_at
  BEFORE UPDATE ON prayer_journal
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Rosary Tracker
-- ============================================================
CREATE TABLE IF NOT EXISTS rosary_tracker (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prayed_on  DATE NOT NULL DEFAULT CURRENT_DATE,
  mysteries  TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, prayed_on)
);

CREATE INDEX IF NOT EXISTS rosary_tracker_user_idx
  ON rosary_tracker(user_id, prayed_on DESC);

ALTER TABLE rosary_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their rosary tracker"
  ON rosary_tracker FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Formation Progress
-- ============================================================
CREATE TABLE IF NOT EXISTS formation_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program      TEXT NOT NULL,
  day_number   INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, program, day_number)
);

CREATE INDEX IF NOT EXISTS formation_progress_user_program_idx
  ON formation_progress(user_id, program);

ALTER TABLE formation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their formation progress"
  ON formation_progress FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
