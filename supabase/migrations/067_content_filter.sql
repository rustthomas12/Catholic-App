-- ============================================================
-- 067: filter objectionable words before they're posted
-- App Store guideline 1.2 asks for "a method for filtering objectionable
-- material from being posted". Report + block + moderation (066) handle
-- the rest; this stops slurs and explicit terms at the database, for every
-- place members write. Terms live in a table so moderators can add to the
-- list without an app update. Matching is whole-word and case-insensitive
-- so ordinary words that happen to contain a term are not caught.
-- ============================================================

CREATE TABLE IF NOT EXISTS blocked_terms (
  term       text PRIMARY KEY CHECK (term = lower(btrim(term)) AND term <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE blocked_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage blocked terms" ON blocked_terms FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- Starter list: explicit sexual terms and common slurs. Extend from SQL or
-- the Supabase table editor.
INSERT INTO blocked_terms (term) VALUES
  ('fuck'), ('fucking'), ('fucker'), ('motherfucker'), ('shit'), ('bullshit'),
  ('cunt'), ('slut'), ('bitch'),
  ('asshole'), ('porn'), ('porno'), ('pornhub'), ('xxx'),
  ('blowjob'), ('handjob'), ('cumshot'), ('nude pics'), ('nudes'), ('onlyfans'),
  ('nigger'), ('nigga'), ('faggot'), ('retard'), ('retarded'),
  ('kike'), ('spic'), ('chink'), ('wetback'), ('tranny'), ('dyke'),
  ('kill yourself'), ('kys')
ON CONFLICT DO NOTHING;

-- true when the text contains a blocked term as a whole word / phrase
CREATE OR REPLACE FUNCTION contains_blocked_term(p_text text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_text IS NOT NULL AND EXISTS (
    SELECT 1 FROM blocked_terms b
    WHERE lower(p_text) ~ ('\m' || regexp_replace(b.term, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '\M')
  )
$$;
REVOKE EXECUTE ON FUNCTION contains_blocked_term(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION contains_blocked_term(text) TO authenticated;

-- One trigger function; TG_ARGV lists the columns to check
CREATE OR REPLACE FUNCTION reject_blocked_terms()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE col text; val text;
BEGIN
  -- Server-side jobs and moderators aren't filtered
  IF auth.uid() IS NULL OR is_platform_admin() THEN RETURN NEW; END IF;
  FOREACH col IN ARRAY TG_ARGV LOOP
    EXECUTE format('SELECT ($1).%I::text', col) INTO val USING NEW;
    IF contains_blocked_term(val) THEN
      RAISE EXCEPTION 'This contains language that isn''t allowed on inFold. Please edit it and try again.'
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION reject_blocked_terms() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_filter_posts ON posts;
CREATE TRIGGER trg_filter_posts BEFORE INSERT OR UPDATE OF content ON posts
  FOR EACH ROW EXECUTE FUNCTION reject_blocked_terms('content');
DROP TRIGGER IF EXISTS trg_filter_comments ON comments;
CREATE TRIGGER trg_filter_comments BEFORE INSERT OR UPDATE OF content ON comments
  FOR EACH ROW EXECUTE FUNCTION reject_blocked_terms('content');
DROP TRIGGER IF EXISTS trg_filter_dms ON direct_messages;
CREATE TRIGGER trg_filter_dms BEFORE INSERT ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION reject_blocked_terms('content');
DROP TRIGGER IF EXISTS trg_filter_group_chat ON group_chat_messages;
CREATE TRIGGER trg_filter_group_chat BEFORE INSERT ON group_chat_messages
  FOR EACH ROW EXECUTE FUNCTION reject_blocked_terms('content');
DROP TRIGGER IF EXISTS trg_filter_prayer_requests ON prayer_requests;
CREATE TRIGGER trg_filter_prayer_requests BEFORE INSERT OR UPDATE OF content ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION reject_blocked_terms('content');
DROP TRIGGER IF EXISTS trg_filter_groups ON groups;
CREATE TRIGGER trg_filter_groups BEFORE INSERT OR UPDATE OF name, description ON groups
  FOR EACH ROW EXECUTE FUNCTION reject_blocked_terms('name', 'description');
DROP TRIGGER IF EXISTS trg_filter_profiles ON profiles;
CREATE TRIGGER trg_filter_profiles BEFORE INSERT OR UPDATE OF full_name, username, bio ON profiles
  FOR EACH ROW EXECUTE FUNCTION reject_blocked_terms('full_name', 'username', 'bio');
