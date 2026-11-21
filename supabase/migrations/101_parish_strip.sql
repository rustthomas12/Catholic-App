-- 101: "From the parish" strip (spec step 4)
--
-- The top of a parish feed pins the parish's official posts (announcements
-- and member posts the pastor features) until each person has seen them.
-- Seen state is per user and private: post_seen rows are readable only by
-- their owner. Aggregate reach numbers (step 8) go through SECURITY DEFINER
-- functions that return counts, never who read what.

-- ── Featured posts ──────────────────────────────────────────
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS featured_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_parish_official_idx
  ON posts (parish_id, created_at DESC)
  WHERE (is_announcement OR featured_at IS NOT NULL) AND group_id IS NULL AND org_id IS NULL;

-- Authors can't feature their own posts: featured_* only change through
-- feature_post() (trusted write)
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
  OR (OLD.is_removed AND NOT NEW.is_removed)
  THEN
    RAISE EXCEPTION 'Not allowed to change this field' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_post_insert_featured()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_trusted_writer() THEN
    NEW.featured_at := NULL;
    NEW.featured_by := NULL;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_guard_post_insert_featured ON posts;
CREATE TRIGGER trg_guard_post_insert_featured
  BEFORE INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION guard_post_insert_featured();

-- Verified parish admins/staff (not provisional, not appointed moderators)
-- and platform admins feature a member's community post. No push.
CREATE OR REPLACE FUNCTION public.feature_post(p_post_id uuid, p_on boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_post posts%ROWTYPE;
BEGIN
  SELECT * INTO v_post FROM posts WHERE id = p_post_id;
  IF NOT FOUND OR v_post.deleted_at IS NOT NULL OR v_post.is_removed IS TRUE THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0001';
  END IF;
  IF v_post.parish_id IS NULL OR v_post.group_id IS NOT NULL OR v_post.org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only parish community posts can be featured' USING ERRCODE = 'P0001';
  END IF;
  IF v_post.is_announcement IS TRUE THEN
    RAISE EXCEPTION 'Announcements are already shown to the parish' USING ERRCODE = 'P0001';
  END IF;
  IF NOT (is_platform_admin() OR is_verified_parish_admin(v_post.parish_id)) THEN
    RAISE EXCEPTION 'Only the parish team can feature posts' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('infold.trusted_write', 'on', true);
  UPDATE posts
     SET featured_at = CASE WHEN p_on THEN now() ELSE NULL END,
         featured_by = CASE WHEN p_on THEN auth.uid() ELSE NULL END
   WHERE id = p_post_id;
  PERFORM set_config('infold.trusted_write', '', true);
END $function$;

REVOKE ALL ON FUNCTION feature_post(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION feature_post(uuid, boolean) TO authenticated;

-- ── Seen state ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_seen (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS post_seen_post_idx ON post_seen (post_id);

ALTER TABLE post_seen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS post_seen_own_select ON post_seen;
CREATE POLICY post_seen_own_select ON post_seen
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Writes go through mark_posts_seen()

CREATE OR REPLACE FUNCTION public.mark_posts_seen(p_post_ids uuid[])
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO post_seen (user_id, post_id)
  SELECT auth.uid(), p.id
    FROM posts p
   WHERE p.id = ANY (p_post_ids[1:50])
     AND auth.uid() IS NOT NULL
     AND (p.is_announcement OR p.featured_at IS NOT NULL)
  ON CONFLICT DO NOTHING;
$function$;

REVOKE ALL ON FUNCTION mark_posts_seen(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_posts_seen(uuid[]) TO authenticated;

-- ── The strip ───────────────────────────────────────────────
-- Unseen announcements and featured posts from the last 14 days, from one
-- parish (parish page) or from the viewer's home and followed parishes
-- (Home feed). Newest first; at most 5.
CREATE OR REPLACE FUNCTION public.parish_strip_post_ids(p_parish_id uuid DEFAULT NULL)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(array_agg(id ORDER BY sort_at DESC), '{}')
    FROM (
      SELECT p.id, greatest(p.created_at, coalesce(p.featured_at, p.created_at)) AS sort_at
        FROM posts p
       WHERE auth.uid() IS NOT NULL
         AND p.group_id IS NULL AND p.org_id IS NULL
         AND p.deleted_at IS NULL AND p.is_removed IS NOT TRUE
         AND (p.is_announcement OR p.featured_at IS NOT NULL)
         AND greatest(p.created_at, coalesce(p.featured_at, p.created_at)) > now() - interval '14 days'
         AND (
           (p_parish_id IS NOT NULL AND p.parish_id = p_parish_id)
           OR (p_parish_id IS NULL AND p.parish_id IN (
                 SELECT parish_id FROM parish_follows WHERE user_id = auth.uid()
                 UNION
                 SELECT parish_id FROM profiles WHERE id = auth.uid() AND parish_id IS NOT NULL))
         )
         AND NOT EXISTS (SELECT 1 FROM post_seen s WHERE s.user_id = auth.uid() AND s.post_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.author_id)
       ORDER BY sort_at DESC
       LIMIT 5
    ) s;
$function$;

REVOKE ALL ON FUNCTION parish_strip_post_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION parish_strip_post_ids(uuid) TO authenticated;
