-- 107: parish reach dashboard, trial summary and trial reminder emails
-- (spec step 8, Business section B)
--
-- Privacy: everything here is an aggregate count. Nothing returns who read,
-- opened or did what, and nothing reads confession tracker, prayer journal
-- or private intention data.
--
--  - notifications.opened_at: set when someone opens the app from a push
--    (send-push adds ?pn=<notification id> to the link; the app calls
--    mark_notification_opened). Only the recipient can mark their own.
--  - parish_reach(parish, since): counts for the parish team's Reach tab and
--    the day-75 trial summary. parish_reach_counts() is the unchecked core,
--    for the trial-reminders function (service role only).
--  - Trial reminders: trials_due_for_reminder() lists no-card trials with
--    15 days left (the "day 75" email) or 5 days left (the "day 85" email)
--    that haven't had that email; trial_reminders_sent records each one, so
--    a repeated run never sends twice. A daily cron job calls the
--    trial-reminders edge function.

-- ── Push opens ──────────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS opened_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_notification_opened(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE notifications
     SET opened_at = coalesce(opened_at, now()), is_read = true
   WHERE id = p_id AND user_id = auth.uid();
$function$;

REVOKE ALL ON FUNCTION mark_notification_opened(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_notification_opened(uuid) TO authenticated;

-- ── Reach counts ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.parish_reach_counts(p_parish_id uuid, p_since timestamptz)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH parish_posts AS (
    SELECT id, author_id, created_at, is_announcement, group_id, org_id, content
      FROM posts
     WHERE parish_id = p_parish_id AND deleted_at IS NULL
  ),
  anns AS (
    SELECT p.id, split_part(p.content, E'\n', 1) AS headline, p.created_at,
           (SELECT count(*) FROM post_seen s WHERE s.post_id = p.id) AS seen,
           (SELECT count(*) FROM notifications n WHERE n.reference_id = p.id AND n.type = 'parish_post' AND n.pushed_at IS NOT NULL) AS pushed,
           (SELECT count(*) FROM notifications n WHERE n.reference_id = p.id AND n.type = 'parish_post' AND n.opened_at IS NOT NULL) AS opened
      FROM parish_posts p
     WHERE p.is_announcement AND p.group_id IS NULL AND p.org_id IS NULL AND p.created_at >= p_since
  ),
  active AS (
    SELECT author_id AS uid FROM parish_posts WHERE created_at > now() - interval '7 days'
    UNION SELECT c.author_id FROM comments c JOIN parish_posts p ON p.id = c.post_id
           WHERE c.created_at > now() - interval '7 days'
    UNION SELECT l.user_id FROM likes l JOIN parish_posts p ON p.id = l.post_id
           WHERE l.created_at > now() - interval '7 days'
    UNION SELECT s.user_id FROM post_seen s JOIN parish_posts p ON p.id = s.post_id
           WHERE s.seen_at > now() - interval '7 days'
  )
  SELECT jsonb_build_object(
    'since', p_since,
    'followers', (SELECT count(*) FROM parish_follows f JOIN profiles pr ON pr.id = f.user_id AND pr.deleted_at IS NULL
                   WHERE f.parish_id = p_parish_id),
    'new_followers', (SELECT count(*) FROM parish_follows f JOIN profiles pr ON pr.id = f.user_id AND pr.deleted_at IS NULL
                       WHERE f.parish_id = p_parish_id AND f.created_at >= p_since),
    'weekly_active', (SELECT count(*) FROM active),
    'community_posts', (SELECT count(*) FROM parish_posts WHERE group_id IS NULL AND org_id IS NULL
                         AND NOT coalesce(is_announcement, false) AND created_at >= p_since),
    'comments', (SELECT count(*) FROM comments c JOIN parish_posts p ON p.id = c.post_id
                  WHERE c.created_at >= p_since AND c.is_removed IS NOT TRUE),
    'group_posts', (SELECT count(*) FROM posts gp JOIN groups g ON g.id = gp.group_id
                     WHERE g.parish_id = p_parish_id AND gp.deleted_at IS NULL AND gp.created_at >= p_since),
    'announcement_count', (SELECT count(*) FROM anns),
    'people_reached', (SELECT count(DISTINCT s.user_id) FROM post_seen s JOIN anns a ON a.id = s.post_id),
    'pushes_sent', (SELECT coalesce(sum(pushed), 0) FROM anns),
    'pushes_opened', (SELECT coalesce(sum(opened), 0) FROM anns),
    'announcements', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'headline', left(headline, 120), 'created_at', created_at,
        'seen', seen, 'pushed', pushed, 'opened', opened) ORDER BY created_at DESC)
      FROM (SELECT * FROM anns ORDER BY created_at DESC LIMIT 20) x), '[]'::jsonb)
  );
$function$;

REVOKE ALL ON FUNCTION parish_reach_counts(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION parish_reach_counts(uuid, timestamptz) TO service_role;

-- The parish team's view (verified admins/staff, platform admins)
CREATE OR REPLACE FUNCTION public.parish_reach(p_parish_id uuid, p_since timestamptz DEFAULT now() - interval '30 days')
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (is_platform_admin() OR is_verified_parish_admin(p_parish_id)) THEN
    RAISE EXCEPTION 'Only the parish team can see reach' USING ERRCODE = '42501';
  END IF;
  RETURN parish_reach_counts(p_parish_id, greatest(p_since, now() - interval '400 days'));
END $function$;

REVOKE ALL ON FUNCTION parish_reach(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION parish_reach(uuid, timestamptz) TO authenticated;

-- ── Trial reminders ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trial_reminders_sent (
  parish_id uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  kind      text NOT NULL CHECK (kind IN ('day75', 'day85')),
  trial_ends_at timestamptz NOT NULL,
  recipients int NOT NULL DEFAULT 0,
  sent_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parish_id, kind, trial_ends_at)
);
ALTER TABLE trial_reminders_sent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trial_reminders_admin_select ON trial_reminders_sent;
CREATE POLICY trial_reminders_admin_select ON trial_reminders_sent FOR SELECT TO authenticated
  USING (is_platform_admin());

-- No-card trials due an email today. Verified admins/staff get it.
CREATE OR REPLACE FUNCTION public.trials_due_for_reminder()
 RETURNS TABLE (parish_id uuid, parish_name text, trial_ends_at timestamptz, kind text, days_left int, admin_ids uuid[])
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.parish_id, p.name, s.trial_ends_at, k.kind,
         greatest(0, ceil(extract(epoch FROM (s.trial_ends_at - now())) / 86400))::int,
         (SELECT array_agg(a.user_id) FROM parish_admins a
           JOIN profiles pr ON pr.id = a.user_id AND pr.deleted_at IS NULL
          WHERE a.parish_id = s.parish_id AND a.role <> 'pending')
    FROM parish_subscriptions s
    JOIN parishes p ON p.id = s.parish_id
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN s.trial_ends_at - now() <= interval '5 days'  THEN 'day85'
        WHEN s.trial_ends_at - now() <= interval '15 days' THEN 'day75'
      END AS kind
    ) k
   WHERE s.status = 'trialing'
     AND NOT coalesce(s.has_payment_method, false)
     AND s.trial_ends_at > now()
     AND k.kind IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM trial_reminders_sent t
                      WHERE t.parish_id = s.parish_id AND t.kind = k.kind AND t.trial_ends_at = s.trial_ends_at);
$function$;

REVOKE ALL ON FUNCTION trials_due_for_reminder() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION trials_due_for_reminder() TO service_role;

-- Daily at 15:00 UTC (10–11am Eastern)
SELECT cron.unschedule('trial-reminders')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trial-reminders');
SELECT cron.schedule('trial-reminders', '0 15 * * *', $cron$
  SELECT net.http_post(
    url := 'https://pamggwafyfqxogvqfsox.supabase.co/functions/v1/trial-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb)
$cron$);
