-- 099: parish moderation
--
-- Who can moderate a parish's community posts (can_moderate_parish):
--   * platform admins (global override)
--   * the parish's verified admins and staff (not provisional 'pending')
--   * moderators a verified admin appoints from the parish's members
--     (parish_moderators; they get no other dashboard powers)
-- What they can do, through SECURITY DEFINER functions that set
-- infold.trusted_write (guard_post_update / guard_comment_update block
-- un-removing otherwise):
--   * hide / restore a parish post (posts.is_removed) or comment
--   * dismiss the flags on a post without hiding it
-- Hiding uses is_removed, not deleted_at: rows with deleted_at are no longer
-- readable, so Realtime wouldn't deliver the UPDATE and open feeds would keep
-- showing the post. postLive/usePost already drop is_removed rows live.
-- Appointed moderators can't act on announcements or on posts by the
-- parish's admins; every action is logged (moderation_log).
--
-- Also:
--   * flags on a parish post notify its moderators (parish_post_flagged,
--     migration 098), mapped to the post_flagged preference
--   * admin_hide_flagged_post (079) hides with is_removed too
--   * posting in a parish requires being a member (home parish, follower,
--     admin or moderator); group and org posts never carry a parish_id

-- ── Tables ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parish_moderators (
  parish_id    uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parish_id, user_id)
);
CREATE INDEX IF NOT EXISTS parish_moderators_user_idx ON parish_moderators(user_id);
ALTER TABLE parish_moderators ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS moderation_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parish_id   uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action      text NOT NULL CHECK (action IN ('hide_post', 'restore_post', 'hide_comment',
                'restore_comment', 'dismiss_flags', 'add_moderator', 'remove_moderator')),
  post_id     uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id  uuid REFERENCES comments(id) ON DELETE CASCADE,
  target_user uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_log_parish_idx ON moderation_log(parish_id, created_at DESC);
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

-- ── Helpers ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION can_moderate_parish(p_parish_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_parish_id IS NOT NULL AND (
       is_platform_admin()
    OR is_verified_parish_admin(p_parish_id)
    OR EXISTS (SELECT 1 FROM parish_moderators WHERE parish_id = p_parish_id AND user_id = auth.uid()))
$$;
REVOKE EXECUTE ON FUNCTION can_moderate_parish(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_moderate_parish(uuid) TO authenticated;

-- Home parish, follower, or someone who runs/moderates it
CREATE OR REPLACE FUNCTION is_parish_member(p_parish_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND parish_id = p_parish_id)
      OR EXISTS (SELECT 1 FROM parish_follows WHERE parish_id = p_parish_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = p_parish_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM parish_moderators WHERE parish_id = p_parish_id AND user_id = auth.uid())
      OR is_platform_admin()
$$;
REVOKE EXECUTE ON FUNCTION is_parish_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_parish_member(uuid) TO authenticated;

-- Appointed moderators (not admins) may not act on announcements or on
-- posts written by the parish's admins/staff
CREATE OR REPLACE FUNCTION moderator_may_act_on(p_post posts)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_platform_admin() OR is_verified_parish_admin(p_post.parish_id) OR (
        NOT coalesce(p_post.is_announcement, false)
    AND NOT EXISTS (SELECT 1 FROM parish_admins pa
                     WHERE pa.parish_id = p_post.parish_id AND pa.user_id = p_post.author_id AND pa.role <> 'pending'))
$$;
REVOKE EXECUTE ON FUNCTION moderator_may_act_on(posts) FROM PUBLIC, anon;

-- ── Policies ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Moderators visible to themselves and the parish team" ON parish_moderators;
CREATE POLICY "Moderators visible to themselves and the parish team" ON parish_moderators
  FOR SELECT USING (user_id = auth.uid() OR is_verified_parish_admin(parish_id) OR is_platform_admin());

DROP POLICY IF EXISTS "Parish team reads the moderation log" ON moderation_log;
CREATE POLICY "Parish team reads the moderation log" ON moderation_log
  FOR SELECT USING (is_verified_parish_admin(parish_id) OR is_platform_admin());

-- Members only, for plain parish posts (announcement rule unchanged from 095)
DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.suspended_at IS NOT NULL)
    AND (group_id IS NULL OR is_group_member(group_id))
    AND (org_id IS NULL OR is_org_member(org_id))
    AND (parish_id IS NULL OR is_parish_member(parish_id))
    AND (
      NOT COALESCE(is_announcement, false)
      OR (parish_id IS NOT NULL AND is_verified_parish_admin(parish_id))
      OR (org_id IS NOT NULL AND is_org_admin(org_id))
      OR is_platform_admin()
    )
  );

-- ── Actions ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION moderate_post(p_post_id uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p posts%ROWTYPE;
BEGIN
  IF p_action NOT IN ('hide', 'restore') THEN RAISE EXCEPTION 'Unknown action' USING ERRCODE = '22023'; END IF;
  SELECT * INTO p FROM posts WHERE id = p_post_id AND deleted_at IS NULL;
  IF NOT FOUND OR p.parish_id IS NULL OR p.group_id IS NOT NULL OR p.org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT can_moderate_parish(p.parish_id) OR NOT moderator_may_act_on(p) THEN
    RAISE EXCEPTION 'Not allowed to moderate this post' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('infold.trusted_write', 'on', true);
  UPDATE posts SET is_removed = (p_action = 'hide') WHERE id = p_post_id;
  PERFORM set_config('infold.trusted_write', 'off', true);

  IF p_action = 'hide' THEN
    UPDATE post_flags SET is_resolved = true, resolved_by = auth.uid(), resolved_at = now()
     WHERE post_id = p_post_id AND is_resolved IS NOT TRUE;
  END IF;
  INSERT INTO moderation_log (parish_id, actor_id, action, post_id, target_user)
  VALUES (p.parish_id, auth.uid(), p_action || '_post', p_post_id, p.author_id);
END $$;
REVOKE EXECUTE ON FUNCTION moderate_post(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION moderate_post(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION moderate_comment(p_comment_id uuid, p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c comments%ROWTYPE; p posts%ROWTYPE;
BEGIN
  IF p_action NOT IN ('hide', 'restore') THEN RAISE EXCEPTION 'Unknown action' USING ERRCODE = '22023'; END IF;
  SELECT * INTO c FROM comments WHERE id = p_comment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO p FROM posts WHERE id = c.post_id;
  IF p.parish_id IS NULL OR p.group_id IS NOT NULL OR p.org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Comment not found' USING ERRCODE = 'P0002';
  END IF;
  -- Moderators can't remove comments by the parish's admins
  IF NOT can_moderate_parish(p.parish_id)
     OR (NOT is_platform_admin() AND NOT is_verified_parish_admin(p.parish_id)
         AND EXISTS (SELECT 1 FROM parish_admins pa WHERE pa.parish_id = p.parish_id
                      AND pa.user_id = c.author_id AND pa.role <> 'pending')) THEN
    RAISE EXCEPTION 'Not allowed to moderate this comment' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('infold.trusted_write', 'on', true);
  UPDATE comments SET is_removed = (p_action = 'hide') WHERE id = p_comment_id;
  PERFORM set_config('infold.trusted_write', 'off', true);

  INSERT INTO moderation_log (parish_id, actor_id, action, post_id, comment_id, target_user)
  VALUES (p.parish_id, auth.uid(), p_action || '_comment', p.id, p_comment_id, c.author_id);
END $$;
REVOKE EXECUTE ON FUNCTION moderate_comment(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION moderate_comment(uuid, text) TO authenticated;

-- Keep the post up and close its reports
CREATE OR REPLACE FUNCTION dismiss_post_flags(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p posts%ROWTYPE;
BEGIN
  SELECT * INTO p FROM posts WHERE id = p_post_id;
  IF NOT FOUND OR NOT can_moderate_parish(p.parish_id) OR p.group_id IS NOT NULL OR p.org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  UPDATE post_flags SET is_resolved = true, resolved_by = auth.uid(), resolved_at = now()
   WHERE post_id = p_post_id AND is_resolved IS NOT TRUE;
  INSERT INTO moderation_log (parish_id, actor_id, action, post_id, target_user)
  VALUES (p.parish_id, auth.uid(), 'dismiss_flags', p_post_id, p.author_id);
END $$;
REVOKE EXECUTE ON FUNCTION dismiss_post_flags(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION dismiss_post_flags(uuid) TO authenticated;

-- Open reports on the parish's posts. Reasons and counts only: who reported
-- stays private to the platform admin.
CREATE OR REPLACE FUNCTION parish_flag_queue(p_parish_id uuid)
RETURNS TABLE (post_id uuid, content text, image_url text, is_removed boolean, post_created_at timestamptz,
               author_id uuid, author_name text, flag_count bigint, reasons text[], last_flagged_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_moderate_parish(p_parish_id) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.content, p.image_url, p.is_removed, p.created_at, p.author_id, pr.full_name,
           count(f.id), array_agg(DISTINCT f.reason), max(f.created_at)
      FROM post_flags f
      JOIN posts p ON p.id = f.post_id
      LEFT JOIN profiles pr ON pr.id = p.author_id
     WHERE p.parish_id = p_parish_id AND p.group_id IS NULL AND p.org_id IS NULL
       AND p.deleted_at IS NULL AND f.is_resolved IS NOT TRUE
     GROUP BY p.id, pr.full_name
     ORDER BY max(f.created_at) DESC
     LIMIT 100;
END $$;
REVOKE EXECUTE ON FUNCTION parish_flag_queue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION parish_flag_queue(uuid) TO authenticated;

-- A verified admin (not staff) appoints or removes a moderator from the
-- parish's members
CREATE OR REPLACE FUNCTION set_parish_moderator(p_parish_id uuid, p_user_id uuid, p_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (is_platform_admin() OR EXISTS (SELECT 1 FROM parish_admins
            WHERE parish_id = p_parish_id AND user_id = auth.uid() AND role = 'admin')) THEN
    RAISE EXCEPTION 'Only the parish admin can appoint moderators' USING ERRCODE = '42501';
  END IF;
  IF p_on THEN
    IF NOT (EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND parish_id = p_parish_id AND deleted_at IS NULL)
         OR EXISTS (SELECT 1 FROM parish_follows WHERE parish_id = p_parish_id AND user_id = p_user_id)) THEN
      RAISE EXCEPTION 'Moderators must be members of the parish' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO parish_moderators (parish_id, user_id, appointed_by)
    VALUES (p_parish_id, p_user_id, auth.uid()) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM parish_moderators WHERE parish_id = p_parish_id AND user_id = p_user_id;
  END IF;
  INSERT INTO moderation_log (parish_id, actor_id, action, target_user)
  VALUES (p_parish_id, auth.uid(), CASE WHEN p_on THEN 'add_moderator' ELSE 'remove_moderator' END, p_user_id);
END $$;
REVOKE EXECUTE ON FUNCTION set_parish_moderator(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_parish_moderator(uuid, uuid, boolean) TO authenticated;

-- ── Flag notifications ────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_parish_moderators_of_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p posts%ROWTYPE; parish_name text;
BEGIN
  SELECT * INTO p FROM posts WHERE id = NEW.post_id;
  IF p.parish_id IS NULL OR p.group_id IS NOT NULL OR p.org_id IS NOT NULL THEN RETURN NULL; END IF;
  SELECT name INTO parish_name FROM parishes WHERE id = p.parish_id;
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT m.user_id, 'parish_post_flagged', p.parish_id,
         left('A post in ' || coalesce(parish_name, 'your parish') || ' was reported: ' || coalesce(NEW.reason, 'no reason given'), 300),
         NULL, false
    FROM (
      SELECT user_id FROM parish_admins WHERE parish_id = p.parish_id AND role <> 'pending'
      UNION
      SELECT user_id FROM parish_moderators WHERE parish_id = p.parish_id
    ) m
   WHERE m.user_id <> NEW.user_id AND m.user_id <> p.author_id;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_notify_parish_moderators_of_flag ON post_flags;
CREATE TRIGGER trg_notify_parish_moderators_of_flag AFTER INSERT ON post_flags
  FOR EACH ROW EXECUTE FUNCTION notify_parish_moderators_of_flag();

-- ── Platform admin hide (079): hide live too ──────────────────
CREATE OR REPLACE FUNCTION public.admin_hide_flagged_post(p_flag_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post uuid;
BEGIN
  IF NOT is_platform_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;

  SELECT post_id INTO v_post FROM post_flags WHERE id = p_flag_id;
  IF v_post IS NULL THEN RAISE EXCEPTION 'Flag not found'; END IF;

  -- is_removed (not deleted_at) so open feeds drop it through Realtime
  UPDATE posts SET is_removed = true WHERE id = v_post AND is_removed IS NOT TRUE;

  UPDATE post_flags
  SET is_resolved = true, resolved_by = auth.uid(), resolved_at = now()
  WHERE post_id = v_post AND is_resolved IS NOT TRUE;
END $$;

-- ── Preferences: parish_post_flagged follows the post_flagged toggle ──
-- (from the live definition, last rewritten in 084)
CREATE OR REPLACE FUNCTION public.apply_notification_preferences()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  col text;
  prefs jsonb;
BEGIN
  col := CASE NEW.type::text
    WHEN 'like'                      THEN 'likes'
    WHEN 'comment'                   THEN 'comments'
    WHEN 'group_invite'              THEN 'group_invites'
    WHEN 'group_request'             THEN 'group_requests'
    WHEN 'group_request_response'    THEN 'group_requests'
    WHEN 'parish_post'               THEN 'parish_posts'
    WHEN 'org_announcement'          THEN 'parish_posts'
    WHEN 'prayer_response'           THEN 'prayer_responses'
    WHEN 'confession_reminder'       THEN 'confession_reminder'
    WHEN 'direct_message'            THEN 'direct_messages'
    WHEN 'event_reminder'            THEN 'event_reminders'
    WHEN 'new_event'                 THEN 'event_reminders'
    WHEN 'post_flagged'              THEN 'post_flagged'
    WHEN 'parish_post_flagged'       THEN 'post_flagged'
    WHEN 'new_parish_member'         THEN 'new_parish_member'
    WHEN 'parish_message'            THEN 'parish_message'
    WHEN 'group_post'                THEN 'group_posts'
    WHEN 'new_group_member'          THEN 'new_group_member'
    WHEN 'chapter_request'           THEN 'chapter_requests'
    WHEN 'chapter_request_resolved'  THEN 'chapter_requests'
    WHEN 'new_org_member'            THEN 'new_org_member'
    WHEN 'morning_offering_reminder' THEN 'morning_offering_reminder'
    WHEN 'daily_readings_reminder'   THEN 'daily_readings_reminder'
    ELSE NULL
  END;
  IF col IS NULL THEN RETURN NEW; END IF;

  SELECT to_jsonb(np) INTO prefs FROM notification_preferences np WHERE np.user_id = NEW.user_id;
  IF prefs IS NOT NULL AND (prefs ->> col) = 'false' THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $function$;
