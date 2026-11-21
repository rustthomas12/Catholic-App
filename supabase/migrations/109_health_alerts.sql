-- 109: health alerts
--
-- Supabase Free and Vercel Hobby send no alert when something breaks, so the
-- health-check edge function (every 15 minutes, cron below) asks
-- health_snapshot() for problems, checks the website and API over HTTP, and
-- emails the owner. health_claim_alert() limits each kind of problem to one
-- email every 6 hours.
--
-- Problems detected here:
--  - cron_failed:<job>   a scheduled job failed in the last 20 minutes
--  - cron_stalled        no scheduled job has run for 20 minutes
--                        (deliver-scheduled-posts runs every minute)
--  - cron_late:<job>     an every-5-minutes job hasn't run for 30 minutes
--  - net_failures        5+ failed or timed-out calls from the database to
--                        the edge functions in 20 minutes
--  - push_stuck          3+ notifications for people with a device that
--                        should have been pushed 30+ minutes ago
--  - crash:<message>     a new crash reported by the app (production only;
--                        dev builds don't report since PR #65)

CREATE TABLE IF NOT EXISTS health_alerts (
  key          text PRIMARY KEY,
  last_sent_at timestamptz NOT NULL,
  last_detail  text
);
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (edge function) and platform SQL use it

CREATE OR REPLACE FUNCTION public.health_snapshot()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_problems jsonb := '[]'::jsonb;
  r record;
  v_count int;
BEGIN
  -- Failed jobs
  FOR r IN
    SELECT j.jobname, count(*) AS n, max(left(d.return_message, 200)) AS msg
      FROM cron.job_run_details d JOIN cron.job j USING (jobid)
     WHERE d.status = 'failed' AND d.start_time > now() - interval '20 minutes'
     GROUP BY j.jobname
  LOOP
    v_problems := v_problems || jsonb_build_object('key', 'cron_failed:' || r.jobname,
      'title', 'Scheduled job "' || r.jobname || '" failed',
      'detail', r.n || ' failed run(s) in the last 20 minutes. Last error: ' || coalesce(r.msg, 'none'));
  END LOOP;

  -- The scheduler itself stopped
  IF NOT EXISTS (SELECT 1 FROM cron.job_run_details WHERE start_time > now() - interval '20 minutes') THEN
    v_problems := v_problems || jsonb_build_object('key', 'cron_stalled',
      'title', 'Scheduled jobs have stopped',
      'detail', 'No scheduled job has run in 20 minutes (deliver-scheduled-posts normally runs every minute). Scheduled posts, held notifications and reminders are not going out.');
  END IF;

  -- Frequent jobs running late
  FOR r IN
    SELECT j.jobname, max(d.start_time) AS last_run
      FROM cron.job j LEFT JOIN cron.job_run_details d ON d.jobid = j.jobid AND d.start_time > now() - interval '1 day'
     WHERE j.active AND j.schedule IN ('*/5 * * * *', '* * * * *')
     GROUP BY j.jobname
    HAVING coalesce(max(d.start_time), '-infinity') < now() - interval '30 minutes'
  LOOP
    v_problems := v_problems || jsonb_build_object('key', 'cron_late:' || r.jobname,
      'title', 'Scheduled job "' || r.jobname || '" is not running',
      'detail', 'Last run: ' || coalesce(to_char(r.last_run AT TIME ZONE 'America/New_York', 'Mon DD HH24:MI') || ' (Eastern)', 'not in the last day') || '.');
  END LOOP;

  -- Calls from the database to edge functions (push, distribution, reminders)
  SELECT count(*) INTO v_count FROM net._http_response
   WHERE created > now() - interval '20 minutes' AND (status_code >= 500 OR error_msg IS NOT NULL OR timed_out);
  IF v_count >= 5 THEN
    v_problems := v_problems || jsonb_build_object('key', 'net_failures',
      'title', 'Edge function calls are failing',
      'detail', v_count || ' calls from the database to edge functions (push notifications, post distribution, reminders) failed or timed out in 20 minutes. Example: '
        || coalesce((SELECT left(coalesce(error_msg, status_code::text || ' ' || content), 200) FROM net._http_response
                      WHERE created > now() - interval '20 minutes' AND (status_code >= 500 OR error_msg IS NOT NULL OR timed_out)
                      ORDER BY created DESC LIMIT 1), 'none'));
  END IF;

  -- Pushes that should have gone out
  SELECT count(*) INTO v_count FROM notifications n
   WHERE n.pushed_at IS NULL AND n.push_skip IS NULL
     AND n.created_at > now() - interval '1 day'
     AND coalesce(n.deliver_after, n.created_at) < now() - interval '30 minutes'
     AND (EXISTS (SELECT 1 FROM native_push_tokens t WHERE t.user_id = n.user_id)
          OR EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = n.user_id));
  IF v_count >= 3 THEN
    v_problems := v_problems || jsonb_build_object('key', 'push_stuck',
      'title', 'Push notifications are not being delivered',
      'detail', v_count || ' notifications for people with a phone or browser set up for push should have been sent at least 30 minutes ago and were not. Check the send-push edge function logs.');
  END IF;

  -- New crashes in the app
  FOR r IN
    SELECT left(message, 120) AS msg, count(*) AS n, count(DISTINCT user_id) AS people, max(path) AS path
      FROM client_errors WHERE created_at > now() - interval '20 minutes'
     GROUP BY left(message, 120)
  LOOP
    v_problems := v_problems || jsonb_build_object('key', 'crash:' || md5(r.msg),
      'title', 'The app crashed: ' || r.msg,
      'detail', r.n || ' report(s) from ' || r.people || ' person(s) in the last 20 minutes, e.g. on ' || coalesce(r.path, '?') || '. Details: Platform Admin → App errors.');
  END LOOP;

  RETURN v_problems;
END $$;

-- One email per problem every 6 hours. Returns true when this call should send.
CREATE OR REPLACE FUNCTION public.health_claim_alert(p_key text, p_detail text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_claimed boolean;
BEGIN
  INSERT INTO health_alerts (key, last_sent_at, last_detail) VALUES (p_key, now(), left(p_detail, 1000))
  ON CONFLICT (key) DO UPDATE SET last_sent_at = now(), last_detail = EXCLUDED.last_detail
   WHERE health_alerts.last_sent_at < now() - interval '6 hours'
  RETURNING true INTO v_claimed;
  RETURN coalesce(v_claimed, false);
END $$;

-- Lets the function try again soon if the email itself failed
CREATE OR REPLACE FUNCTION public.health_release_alert(p_key text)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  DELETE FROM health_alerts WHERE key = p_key
$$;

REVOKE ALL ON FUNCTION health_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION health_claim_alert(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION health_release_alert(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION health_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION health_claim_alert(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION health_release_alert(text) TO service_role;

-- Every 15 minutes (minute 7, 22, 37, 52: away from the top-of-hour jobs)
SELECT cron.unschedule('health-check') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'health-check');
SELECT cron.schedule('health-check', '7,22,37,52 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://pamggwafyfqxogvqfsox.supabase.co/functions/v1/health-check',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
$cron$);
