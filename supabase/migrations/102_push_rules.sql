-- 102: push rules (spec step 5: notification cleanup)
--
-- Every notification is still created in-app. Only the PUSH changes:
--
--  1. In-app only (never pushed): like, new_parish_member, new_group_member,
--     new_org_member, group_post. Enforced here, on the server, so app builds
--     already on phones (which insert the group_post admin ping themselves)
--     follow the rule too.
--  2. Quiet hours, 9pm–8am in the user's timezone: the push is held and goes
--     out at 8am (deliver_after). Self-set reminders (confession, morning
--     offering, daily readings) are exempt: they come at the time the user
--     chose. Parish posts and announcements respect quiet hours too.
--  3. Daily cap: at most 5 pushes a day (user's local day) across the
--     non-personal types (parish posts and announcements, org announcements,
--     group posts, and the community highlight from step 6). Over the cap the
--     notification stays in-app only. Personal types (messages, comments on
--     your post, prayer responses, requests, reminders) are never capped.
--
-- Delivery keeps 048's anti-replay rule: send-push sends only what
-- claim_notification_push() atomically claims. A push is claimable within
-- 10 minutes of creation, or within 2 hours of its deliver_after time; the
-- deliver-held-pushes cron job (every 5 minutes) wakes send-push for held
-- notifications that have come due.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS deliver_after timestamptz,
  ADD COLUMN IF NOT EXISTS push_skip text
    CHECK (push_skip IS NULL OR push_skip IN ('in_app_only', 'daily_cap', 'stale'));

CREATE INDEX IF NOT EXISTS notifications_held_idx
  ON notifications (deliver_after)
  WHERE deliver_after IS NOT NULL AND pushed_at IS NULL AND push_skip IS NULL;
CREATE INDEX IF NOT EXISTS notifications_user_pushed_idx
  ON notifications (user_id, pushed_at)
  WHERE pushed_at IS NOT NULL;

-- ── Rules ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.push_is_in_app_only(p_type text)
 RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_type IN ('like', 'new_parish_member', 'new_group_member', 'new_org_member', 'group_post')
$$;

CREATE OR REPLACE FUNCTION public.push_ignores_quiet_hours(p_type text)
 RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_type IN ('confession_reminder', 'morning_offering_reminder', 'daily_readings_reminder')
$$;

CREATE OR REPLACE FUNCTION public.push_counts_toward_cap(p_type text)
 RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_type IN ('parish_post', 'org_announcement', 'group_post', 'community_highlight')
$$;

CREATE OR REPLACE FUNCTION public.user_push_timezone(p_user_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(
    (SELECT timezone FROM notification_preferences
      WHERE user_id = p_user_id AND timezone IS NOT NULL
        AND timezone IN (SELECT name FROM pg_timezone_names)),
    'America/New_York')
$$;

-- When a push for this user may go out: now, or 8am local if it's quiet hours
CREATE OR REPLACE FUNCTION public.push_deliver_after(p_user_id uuid, p_at timestamptz DEFAULT now())
 RETURNS timestamptz LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_tz    text := user_push_timezone(p_user_id);
  v_local timestamp := p_at AT TIME ZONE v_tz;
  v_hour  int := extract(hour FROM v_local);
BEGIN
  IF v_hour >= 21 THEN
    RETURN ((v_local::date + 1) + time '08:00') AT TIME ZONE v_tz;
  ELSIF v_hour < 8 THEN
    RETURN (v_local::date + time '08:00') AT TIME ZONE v_tz;
  END IF;
  RETURN NULL;
END $$;

-- ── Plan each new notification's push ───────────────────────
-- Named to run after the other BEFORE INSERT triggers (alphabetical), so
-- dropped or preference-disabled rows never get here.
CREATE OR REPLACE FUNCTION public.plan_notification_push()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.pushed_at IS NOT NULL OR NEW.push_skip IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF push_is_in_app_only(NEW.type::text) THEN
    NEW.push_skip := 'in_app_only';
  ELSIF NOT push_ignores_quiet_hours(NEW.type::text) THEN
    NEW.deliver_after := coalesce(NEW.deliver_after, push_deliver_after(NEW.user_id, coalesce(NEW.created_at, now())));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_zz_plan_notification_push ON notifications;
CREATE TRIGGER trg_zz_plan_notification_push
  BEFORE INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION plan_notification_push();

-- ── Claim (send-push calls this with the service role) ──────
-- Returns the row to push, or nothing: not due yet, already sent, skipped,
-- stale, or over the daily cap (then marked so it's never retried).
CREATE OR REPLACE FUNCTION public.claim_notification_push(p_id uuid)
 RETURNS TABLE (user_id uuid, type text, message text, actor_id uuid, reference_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  n notifications%ROWTYPE;
  v_tz text;
  v_day_start timestamptz;
  v_count int;
BEGIN
  SELECT * INTO n FROM notifications
   WHERE id = p_id AND pushed_at IS NULL AND push_skip IS NULL
   FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN; END IF;

  IF n.deliver_after IS NOT NULL THEN
    IF n.deliver_after > now() THEN RETURN; END IF;           -- held: not yet
    IF n.deliver_after < now() - interval '2 hours' THEN
      UPDATE notifications SET push_skip = 'stale' WHERE id = n.id;
      RETURN;
    END IF;
  ELSIF n.created_at < now() - interval '10 minutes' THEN
    RETURN;                                                   -- 048 anti-replay
  END IF;

  IF push_counts_toward_cap(n.type::text) THEN
    v_tz := user_push_timezone(n.user_id);
    v_day_start := date_trunc('day', now() AT TIME ZONE v_tz) AT TIME ZONE v_tz;
    SELECT count(*) INTO v_count FROM notifications x
     WHERE x.user_id = n.user_id
       AND x.pushed_at >= v_day_start
       AND push_counts_toward_cap(x.type::text);
    IF v_count >= 5 THEN
      UPDATE notifications SET push_skip = 'daily_cap' WHERE id = n.id;
      RETURN;
    END IF;
  END IF;

  UPDATE notifications SET pushed_at = now() WHERE id = n.id;
  RETURN QUERY SELECT n.user_id, n.type::text, n.message, n.actor_id, n.reference_id;
END $$;

REVOKE ALL ON FUNCTION claim_notification_push(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_notification_push(uuid) TO service_role;

-- ── Held pushes: wake send-push when they come due ──────────
CREATE OR REPLACE FUNCTION public.deliver_held_pushes()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r record;
  v_n int := 0;
BEGIN
  FOR r IN
    SELECT id FROM notifications
     WHERE deliver_after IS NOT NULL
       AND deliver_after <= now()
       AND deliver_after > now() - interval '2 hours'
       AND pushed_at IS NULL AND push_skip IS NULL
     ORDER BY deliver_after
     LIMIT 500
  LOOP
    PERFORM net.http_post(
      url := 'https://pamggwafyfqxogvqfsox.supabase.co/functions/v1/send-push',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('type', 'HELD', 'record', jsonb_build_object('id', r.id))
    );
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;

REVOKE ALL ON FUNCTION deliver_held_pushes() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('deliver-held-pushes')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'deliver-held-pushes');
SELECT cron.schedule('deliver-held-pushes', '*/5 * * * *', 'SELECT deliver_held_pushes()');
