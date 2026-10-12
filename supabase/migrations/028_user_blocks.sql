-- ============================================================
-- 028: user_blocks
-- Lets a user block another user (required by App Store guideline
-- 1.2 and Google Play's UGC policy for apps with user content).
--
-- Enforcement is done in the database with RESTRICTIVE policies, which
-- are AND-ed with the existing (permissive) policies — none of the
-- existing policies are modified. Effects for the blocker:
--   • posts, comments, prayer requests, group chat messages, direct
--     messages and notifications from the blocked user are hidden
-- Effects for the blocked user:
--   • can no longer send direct messages to the blocker
-- Edge functions using the service role bypass RLS and are unaffected.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_id_idx ON user_blocks (blocked_id);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own blocks"
  ON user_blocks FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users create own blocks"
  ON user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users remove own blocks"
  ON user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- ── Helpers ────────────────────────────────────────────────
-- SECURITY DEFINER so they can be used inside other tables' policies
-- without granting broader access to user_blocks.

CREATE OR REPLACE FUNCTION is_blocked_by_me(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = auth.uid() AND blocked_id = target
  );
$$;

CREATE OR REPLACE FUNCTION has_blocked_me(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = target AND blocked_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION is_blocked_by_me(uuid) FROM public;
REVOKE ALL ON FUNCTION has_blocked_me(uuid) FROM public;
GRANT EXECUTE ON FUNCTION is_blocked_by_me(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION has_blocked_me(uuid) TO anon, authenticated;

-- ── Hide blocked users' content from the blocker ───────────

CREATE POLICY "Hide posts from blocked users"
  ON posts AS RESTRICTIVE FOR SELECT
  USING (NOT is_blocked_by_me(author_id));

CREATE POLICY "Hide comments from blocked users"
  ON comments AS RESTRICTIVE FOR SELECT
  USING (NOT is_blocked_by_me(author_id));

CREATE POLICY "Hide prayer requests from blocked users"
  ON prayer_requests AS RESTRICTIVE FOR SELECT
  USING (NOT is_blocked_by_me(author_id));

CREATE POLICY "Hide group chat from blocked users"
  ON group_chat_messages AS RESTRICTIVE FOR SELECT
  USING (NOT is_blocked_by_me(user_id));

CREATE POLICY "Hide direct messages from blocked users"
  ON direct_messages AS RESTRICTIVE FOR SELECT
  USING (NOT is_blocked_by_me(sender_id));

CREATE POLICY "Hide notifications from blocked users"
  ON notifications AS RESTRICTIVE FOR SELECT
  USING (NOT is_blocked_by_me(actor_id));

-- ── Stop blocked users from contacting the blocker ─────────

CREATE POLICY "Blocked users cannot send direct messages"
  ON direct_messages AS RESTRICTIVE FOR INSERT
  WITH CHECK (NOT has_blocked_me(recipient_id));
