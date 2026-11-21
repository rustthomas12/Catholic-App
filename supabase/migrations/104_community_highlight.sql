-- 104: evening community highlight push (spec step 6)
--
-- Once a day at 7pm in each user's timezone, at most one notification about
-- the last 24 hours of community posts in their home and followed parishes.
-- Parish posts by priests and staff push on their own; this is for the
-- parishioners' posts, so they reach people without each one buzzing a phone.
--
-- Eligible: community posts (not announcements, groups or orgs) from the last
-- 24 hours that aren't the user's own, aren't hidden, removed or awaiting a
-- report decision, aren't from someone either of them blocked, and that the
-- user hasn't already seen (post_seen, 101).
-- Ranking (the owner's decision, no engagement ranking): pastor-featured
-- first, then newest.
--   1–2 posts: "Maria and John posted in St. Paul's community"
--   3+:        "Maria's post and 4 more in St. Paul's community today"
-- reference_id is the post when there's one, else the parish; the app's
-- /highlight/:id route opens whichever it is.
--
-- Off with the new community_posts preference (default on). The push rules
-- from 102 still apply: it counts toward the daily cap.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS community_posts boolean NOT NULL DEFAULT true;

-- Newest definition (099) plus community_highlight → community_posts
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
    WHEN 'community_highlight'       THEN 'community_posts'
    ELSE NULL
  END;
  IF col IS NULL THEN RETURN NEW; END IF;

  SELECT to_jsonb(np) INTO prefs FROM notification_preferences np WHERE np.user_id = NEW.user_id;
  IF prefs IS NOT NULL AND (prefs ->> col) = 'false' THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $function$;

-- One user's highlight right now: (reference_id, message), or no row
CREATE OR REPLACE FUNCTION public.community_highlight_for(p_user_id uuid)
 RETURNS TABLE (reference_id uuid, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total   int;
  v_parishes int;
  v_first   record;
  v_second  record;
  v_where   text;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _hl (id uuid, parish_id uuid, parish_name text, author text, featured boolean, created_at timestamptz) ON COMMIT DROP;
  TRUNCATE _hl;

  INSERT INTO _hl
  SELECT p.id, p.parish_id, pa.name,
         CASE WHEN p.is_anonymous THEN 'Someone'
              ELSE coalesce(nullif(split_part(trim(pr.full_name), ' ', 1), ''), 'Someone') END,
         p.featured_at IS NOT NULL, p.created_at
    FROM posts p
    JOIN parishes pa ON pa.id = p.parish_id
    LEFT JOIN profiles pr ON pr.id = p.author_id
   WHERE p.created_at > now() - interval '24 hours'
     AND p.group_id IS NULL AND p.org_id IS NULL
     AND p.is_announcement IS NOT TRUE
     AND p.is_removed IS NOT TRUE AND p.deleted_at IS NULL
     AND p.author_id <> p_user_id
     AND p.parish_id IN (
           SELECT f.parish_id FROM parish_follows f WHERE f.user_id = p_user_id
           UNION
           SELECT pp.parish_id FROM profiles pp WHERE pp.id = p_user_id AND pp.parish_id IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM user_blocks b
                      WHERE (b.blocker_id = p_user_id AND b.blocked_id = p.author_id)
                         OR (b.blocker_id = p.author_id AND b.blocked_id = p_user_id))
     AND NOT EXISTS (SELECT 1 FROM post_flags fl WHERE fl.post_id = p.id AND fl.is_resolved IS NOT TRUE)
     AND NOT EXISTS (SELECT 1 FROM post_seen s WHERE s.user_id = p_user_id AND s.post_id = p.id);

  SELECT count(*), count(DISTINCT parish_id) INTO v_total, v_parishes FROM _hl;
  IF v_total = 0 THEN RETURN; END IF;

  SELECT * INTO v_first FROM _hl ORDER BY featured DESC, created_at DESC LIMIT 1;
  v_where := CASE WHEN v_parishes = 1 THEN v_first.parish_name || ' community'
                  ELSE 'your parish communities' END;

  IF v_total = 1 THEN
    RETURN QUERY SELECT v_first.id, v_first.author || ' posted in ' || v_where;
  ELSIF v_total = 2 THEN
    SELECT * INTO v_second FROM _hl WHERE id <> v_first.id LIMIT 1;
    RETURN QUERY SELECT
      CASE WHEN v_parishes = 1 THEN v_first.parish_id ELSE v_first.id END,
      CASE WHEN v_first.author = v_second.author
           THEN v_first.author || ' posted twice in ' || v_where
           ELSE v_first.author || ' and ' || v_second.author || ' posted in ' || v_where END;
  ELSE
    RETURN QUERY SELECT
      CASE WHEN v_parishes = 1 THEN v_first.parish_id ELSE v_first.id END,
      v_first.author || '''s post and ' || (v_total - 1) || ' more in ' || v_where || ' today';
  END IF;
END $function$;

REVOKE ALL ON FUNCTION community_highlight_for(uuid) FROM PUBLIC, anon, authenticated;

-- Runs every 5 minutes; sends to users whose local hour is 19 and who
-- haven't had a highlight today (so a missed run still sends within the hour)
CREATE OR REPLACE FUNCTION public.send_community_highlights()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  u record;
  h record;
  v_n int := 0;
BEGIN
  FOR u IN
    SELECT m.user_id, user_push_timezone(m.user_id) AS tz
      FROM (SELECT user_id FROM parish_follows
            UNION
            SELECT id FROM profiles WHERE parish_id IS NOT NULL) m
      JOIN profiles pr ON pr.id = m.user_id
      LEFT JOIN notification_preferences np ON np.user_id = m.user_id
     WHERE coalesce(np.community_posts, true)
       AND pr.deleted_at IS NULL
  LOOP
    CONTINUE WHEN extract(hour FROM now() AT TIME ZONE u.tz) <> 19;
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM notifications n
       WHERE n.user_id = u.user_id AND n.type = 'community_highlight'
         AND n.created_at >= date_trunc('day', now() AT TIME ZONE u.tz) AT TIME ZONE u.tz);
    SELECT * INTO h FROM community_highlight_for(u.user_id);
    CONTINUE WHEN NOT FOUND;
    INSERT INTO notifications (user_id, type, reference_id, message)
    VALUES (u.user_id, 'community_highlight', h.reference_id, h.message);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $function$;

REVOKE ALL ON FUNCTION send_community_highlights() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('community-highlights')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'community-highlights');
SELECT cron.schedule('community-highlights', '*/5 * * * *', 'SELECT send_community_highlights()');
