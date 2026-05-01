-- Migration 024: Fix parish admin RLS gaps and missing tables
-- Run this in Supabase SQL editor if any of these are missing.

-- ── 1. parish_messages table (may not have been applied) ─────────
CREATE TABLE IF NOT EXISTS parish_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id   UUID NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject     TEXT,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parish_messages_parish_id_idx ON parish_messages(parish_id, created_at DESC);
CREATE INDEX IF NOT EXISTS parish_messages_sender_id_idx ON parish_messages(sender_id);

ALTER TABLE parish_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='parish_messages' AND policyname='Users can send messages'
  ) THEN
    CREATE POLICY "Users can send messages"
      ON parish_messages FOR INSERT
      WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='parish_messages' AND policyname='Parish admins can read messages'
  ) THEN
    CREATE POLICY "Parish admins can read messages"
      ON parish_messages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM parish_admins
          WHERE parish_admins.parish_id = parish_messages.parish_id
            AND parish_admins.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='parish_messages' AND policyname='Parish admins can update messages'
  ) THEN
    CREATE POLICY "Parish admins can update messages"
      ON parish_messages FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM parish_admins
          WHERE parish_admins.parish_id = parish_messages.parish_id
            AND parish_admins.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='parish_messages' AND policyname='Senders can see their own messages'
  ) THEN
    CREATE POLICY "Senders can see their own messages"
      ON parish_messages FOR SELECT
      USING (auth.uid() = sender_id);
  END IF;
END $$;

-- ── 2. parishes UPDATE policy for parish admins ───────────────────
-- (Only SELECT policy existed; admins need UPDATE to save mass times, etc.)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='parishes' AND policyname='Parish admins can update their parish'
  ) THEN
    CREATE POLICY "Parish admins can update their parish"
      ON parishes FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM parish_admins
          WHERE parish_admins.parish_id = parishes.id
            AND parish_admins.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── 3. scheduled_posts columns and RLS (migration 018 may be missing) ─
ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS parish_id UUID REFERENCES parishes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS group_id  UUID REFERENCES groups(id)  ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS scheduled_posts_delivery_idx
  ON scheduled_posts(scheduled_for, published)
  WHERE published = false;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='scheduled_posts' AND policyname='Authors can manage own scheduled posts'
  ) THEN
    CREATE POLICY "Authors can manage own scheduled posts"
      ON scheduled_posts FOR ALL
      USING (auth.uid() = author_id)
      WITH CHECK (auth.uid() = author_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='scheduled_posts' AND policyname='Authenticated users can read scheduled posts'
  ) THEN
    CREATE POLICY "Authenticated users can read scheduled posts"
      ON scheduled_posts FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ── 4. tier_key on parish_subscriptions (migration 023) ──────────
ALTER TABLE parish_subscriptions
  ADD COLUMN IF NOT EXISTS tier_key TEXT;
