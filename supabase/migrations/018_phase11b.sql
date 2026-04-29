-- Phase 11B: Scheduled post delivery columns + RSVP count trigger

-- ── scheduled_posts: add missing columns ──────────────────────
ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS group_id     UUID REFERENCES groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Index for efficient cron query (due, unpublished posts)
CREATE INDEX IF NOT EXISTS scheduled_posts_delivery_idx
  ON scheduled_posts(scheduled_for, published)
  WHERE published = false;

-- ── RSVP count trigger ─────────────────────────────────────────
-- Keeps events.rsvp_count in sync with 'yes' RSVPs only

CREATE OR REPLACE FUNCTION update_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.response = 'yes' THEN
    UPDATE events SET rsvp_count = rsvp_count + 1 WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' AND OLD.response = 'yes' THEN
    UPDATE events SET rsvp_count = GREATEST(0, rsvp_count - 1) WHERE id = OLD.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.response != 'yes' AND NEW.response = 'yes' THEN
      UPDATE events SET rsvp_count = rsvp_count + 1 WHERE id = NEW.event_id;
    ELSIF OLD.response = 'yes' AND NEW.response != 'yes' THEN
      UPDATE events SET rsvp_count = GREATEST(0, rsvp_count - 1) WHERE id = OLD.event_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_event_rsvp_change'
  ) THEN
    CREATE TRIGGER on_event_rsvp_change
      AFTER INSERT OR UPDATE OR DELETE ON event_rsvps
      FOR EACH ROW EXECUTE FUNCTION update_rsvp_count();
  END IF;
END $$;

-- ── scheduled_posts RLS ───────────────────────────────────────
-- Allow parish/group admins to manage scheduled posts
-- (existing RLS may be minimal — ensure service role can always access)
CREATE POLICY IF NOT EXISTS "Authors can manage own scheduled posts"
  ON scheduled_posts FOR ALL
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY IF NOT EXISTS "Authenticated users can read scheduled posts"
  ON scheduled_posts FOR SELECT
  USING (auth.role() = 'authenticated');
