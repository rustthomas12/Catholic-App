-- 106: community extras (spec step 7)
--
--  1. Posting limit: at most 3 community posts per person in any 24 hours,
--     across all parishes. Enforced in the database so every app version and
--     writer obeys it. Not counted: prayer requests (open to all members),
--     announcements, group and org posts, prompt threads, and posts by
--     clergy, the parish's verified staff, or platform admins.
--  2. Community guidelines: profiles.community_guidelines_accepted_at, set
--     once through accept_community_guidelines(). The app asks before a
--     person's first community post. Not enforced in the database, so app
--     builds without the screen keep working.
--  3. Weekly prompt threads, each turned on or off by the parish team
--     (parish_prompts, off until turned on). An hourly job posts them under
--     the pastor's name, in the pastor's timezone:
--       homily     Sunday 2pm    "Discuss Sunday's homily"
--       intention  Monday 8am    "Share your intention this week"
--       rides      Thursday 10am "Need a ride to Mass?"
--     posts.prompt_kind marks them; they don't push on their own.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS prompt_kind text
  CHECK (prompt_kind IS NULL OR prompt_kind IN ('homily', 'intention', 'rides'));

-- Only trusted writers (the prompt job) can mark or change prompt posts
CREATE OR REPLACE FUNCTION public.guard_post_insert_featured()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_trusted_writer() THEN
    NEW.featured_at := NULL;
    NEW.featured_by := NULL;
    NEW.prompt_kind := NULL;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_post_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF is_trusted_writer() THEN RETURN NEW; END IF;
  IF NEW.author_id       IS DISTINCT FROM OLD.author_id
  OR NEW.parish_id       IS DISTINCT FROM OLD.parish_id
  OR NEW.group_id        IS DISTINCT FROM OLD.group_id
  OR NEW.org_id          IS DISTINCT FROM OLD.org_id
  OR NEW.is_announcement IS DISTINCT FROM OLD.is_announcement
  OR NEW.like_count      IS DISTINCT FROM OLD.like_count
  OR NEW.comment_count   IS DISTINCT FROM OLD.comment_count
  OR NEW.featured_at     IS DISTINCT FROM OLD.featured_at
  OR NEW.featured_by     IS DISTINCT FROM OLD.featured_by
  OR NEW.prompt_kind     IS DISTINCT FROM OLD.prompt_kind
  OR (OLD.is_removed AND NOT NEW.is_removed)
  THEN
    RAISE EXCEPTION 'Not allowed to change this field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

-- ── 1. Posting limit ────────────────────────────────────────
-- Trigger name sorts after trg_guard_post_insert_featured, so a client
-- can't dodge the limit by claiming prompt_kind
CREATE OR REPLACE FUNCTION public.enforce_community_post_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  IF is_trusted_writer()
     OR NEW.parish_id IS NULL OR NEW.group_id IS NOT NULL OR NEW.org_id IS NOT NULL
     OR NEW.is_announcement IS TRUE OR NEW.is_prayer_request IS TRUE
     OR NEW.prompt_kind IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = NEW.author_id AND (is_admin OR is_verified_clergy))
     OR EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = NEW.parish_id AND user_id = NEW.author_id AND role <> 'pending') THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count FROM posts
   WHERE author_id = NEW.author_id
     AND created_at > now() - interval '24 hours'
     AND parish_id IS NOT NULL AND group_id IS NULL AND org_id IS NULL
     AND is_announcement IS NOT TRUE AND is_prayer_request IS NOT TRUE
     AND prompt_kind IS NULL;
  IF v_count >= 3 THEN
    RAISE EXCEPTION 'You can share up to 3 community posts a day. Please try again tomorrow. Prayer requests are always open.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_limit_community_posts ON posts;
CREATE TRIGGER trg_limit_community_posts
  BEFORE INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION enforce_community_post_limit();

-- ── 2. Community guidelines ─────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS community_guidelines_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.accept_community_guidelines()
 RETURNS timestamptz
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501'; END IF;
  PERFORM set_config('infold.trusted_write', 'on', true);
  UPDATE profiles SET community_guidelines_accepted_at = coalesce(community_guidelines_accepted_at, now())
   WHERE id = auth.uid()
   RETURNING community_guidelines_accepted_at INTO v_at;
  PERFORM set_config('infold.trusted_write', '', true);
  RETURN v_at;
END $function$;

REVOKE ALL ON FUNCTION accept_community_guidelines() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION accept_community_guidelines() TO authenticated;

-- ── 3. Weekly prompts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS parish_prompts (
  parish_id  uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('homily', 'intention', 'rides')),
  enabled    boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parish_id, kind)
);

ALTER TABLE parish_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parish_prompts_team_select ON parish_prompts;
CREATE POLICY parish_prompts_team_select ON parish_prompts FOR SELECT TO authenticated
  USING (is_platform_admin() OR is_verified_parish_admin(parish_id));
DROP POLICY IF EXISTS parish_prompts_team_insert ON parish_prompts;
CREATE POLICY parish_prompts_team_insert ON parish_prompts FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin() OR is_verified_parish_admin(parish_id));
DROP POLICY IF EXISTS parish_prompts_team_update ON parish_prompts;
CREATE POLICY parish_prompts_team_update ON parish_prompts FOR UPDATE TO authenticated
  USING (is_platform_admin() OR is_verified_parish_admin(parish_id))
  WITH CHECK (is_platform_admin() OR is_verified_parish_admin(parish_id));

CREATE OR REPLACE FUNCTION public.prompt_text(p_kind text)
 RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_kind
    WHEN 'homily'    THEN E'Discuss Sunday\'s homily\n\nWhat stayed with you from today\'s homily? Share a line, a question, or how you\'ll live it this week.'
    WHEN 'intention' THEN E'Share your intention this week\n\nWhat would you like your parish to pray for? Reply below and let\'s pray for one another.'
    WHEN 'rides'     THEN E'Need a ride to Mass?\n\nNeed a ride this weekend, or have a seat to offer? Reply below to find each other.'
  END
$$;

-- Hourly. Posts each enabled prompt in its slot (pastor's local time), once
-- a week; the pastor is the parish's verified admin, else its staff
CREATE OR REPLACE FUNCTION public.post_weekly_prompts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_local timestamp;
  v_n int := 0;
BEGIN
  FOR r IN
    SELECT pp.parish_id, pp.kind, pastor.user_id AS pastor_id, user_push_timezone(pastor.user_id) AS tz
      FROM parish_prompts pp
      JOIN LATERAL (
        SELECT a.user_id
          FROM parish_admins a
          JOIN profiles pr ON pr.id = a.user_id AND pr.deleted_at IS NULL
         WHERE a.parish_id = pp.parish_id AND a.role <> 'pending'
         ORDER BY (a.role = 'admin') DESC, pr.is_verified_clergy DESC
         LIMIT 1
      ) pastor ON true
     WHERE pp.enabled
  LOOP
    v_local := now() AT TIME ZONE r.tz;
    CONTINUE WHEN NOT (
         (r.kind = 'homily'    AND extract(dow FROM v_local) = 0 AND extract(hour FROM v_local) = 14)
      OR (r.kind = 'intention' AND extract(dow FROM v_local) = 1 AND extract(hour FROM v_local) = 8)
      OR (r.kind = 'rides'     AND extract(dow FROM v_local) = 4 AND extract(hour FROM v_local) = 10));
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM posts WHERE parish_id = r.parish_id AND prompt_kind = r.kind
         AND created_at > now() - interval '5 days');

    PERFORM set_config('infold.trusted_write', 'on', true);
    INSERT INTO posts (author_id, parish_id, content, prompt_kind)
    VALUES (r.pastor_id, r.parish_id, prompt_text(r.kind), r.kind);
    PERFORM set_config('infold.trusted_write', '', true);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $function$;

REVOKE ALL ON FUNCTION post_weekly_prompts() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('weekly-prompts')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-prompts');
SELECT cron.schedule('weekly-prompts', '2 * * * *', 'SELECT post_weekly_prompts()');

-- Prompt posts don't push: newest notify_parish_announcement plus a
-- prompt_kind check
CREATE OR REPLACE FUNCTION public.notify_parish_announcement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE parish_name text; headline text; author_name text; by_leader boolean;
BEGIN
  IF NEW.parish_id IS NULL OR NEW.deleted_at IS NOT NULL OR coalesce(NEW.is_removed, false)
     OR NEW.prompt_kind IS NOT NULL THEN
    RETURN NULL;
  END IF;
  IF NOT NEW.is_announcement THEN
    -- Only plain parish posts by the parish's clergy or staff
    IF NEW.group_id IS NOT NULL OR NEW.org_id IS NOT NULL THEN RETURN NULL; END IF;
    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.author_id AND is_verified_clergy)
        OR EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = NEW.parish_id AND user_id = NEW.author_id
                     AND role <> 'pending')
      INTO by_leader;
    IF NOT by_leader THEN RETURN NULL; END IF;
  END IF;
  SELECT name INTO parish_name FROM parishes WHERE id = NEW.parish_id;
  -- Dashboard announcements are "Title\n\nBody"; lead with the first line
  headline := split_part(NEW.content, E'\n', 1);
  IF NEW.is_announcement THEN
    INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
    SELECT f.user_id, 'parish_post', NEW.id,
           left(coalesce(parish_name, 'Your parish') || ': ' || coalesce(nullif(headline, ''), NEW.content), 300),
           NEW.author_id, false
    FROM parish_follows f
    WHERE f.parish_id = NEW.parish_id AND f.user_id IS DISTINCT FROM NEW.author_id;
  ELSE
    SELECT full_name INTO author_name FROM profiles WHERE id = NEW.author_id;
    INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
    SELECT f.user_id, 'parish_post', NEW.id,
           left(coalesce(author_name, 'Your parish') || ' posted in ' || coalesce(parish_name, 'your parish') || ': '
                || coalesce(nullif(btrim(headline), ''), nullif(btrim(NEW.content), ''), 'a photo'), 300),
           NEW.author_id, false
    FROM parish_follows f
    WHERE f.parish_id = NEW.parish_id AND f.user_id IS DISTINCT FROM NEW.author_id;
  END IF;
  RETURN NULL;
END $function$;
