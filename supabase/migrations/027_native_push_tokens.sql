-- ============================================================
-- 027: native_push_tokens
-- Firebase Cloud Messaging registration tokens for the iOS and
-- Android apps. Web push subscriptions stay in push_subscriptions;
-- the senders (send-push edge function, reminder crons) deliver to
-- both tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS native_push_tokens (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      text NOT NULL UNIQUE,
  platform   text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS native_push_tokens_user_id_idx
  ON native_push_tokens (user_id);

ALTER TABLE native_push_tokens ENABLE ROW LEVEL SECURITY;

-- Same access model as push_subscriptions: users manage only their own rows.
CREATE POLICY "Users manage own native push tokens"
  ON native_push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- A device token can move between accounts (sign out → sign in as someone
-- else on the same phone). RLS would block taking over the other account's
-- row, so registration goes through this function, which always assigns the
-- token to the caller.
CREATE OR REPLACE FUNCTION claim_native_push_token(p_token text, p_platform text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO native_push_tokens (user_id, token, platform)
  VALUES (auth.uid(), p_token, p_platform)
  ON CONFLICT (token) DO UPDATE
    SET user_id = auth.uid(), platform = EXCLUDED.platform, updated_at = now()
  WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION claim_native_push_token(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION claim_native_push_token(text, text) TO authenticated;
