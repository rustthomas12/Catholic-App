-- 111: faster health check (fixes "The health check could not read the database")
--
-- health_snapshot() (109) filtered cron.job_run_details by start_time. That
-- table keeps 7 days of runs, has no index on start_time, and takes 156 MB
-- on disk, so every check scanned all of it. On a busy moment it passed
-- the 8-second statement timeout and the owner got a "could not read the
-- database" email (about half of all checks on 2026-11-22).
--
-- Now each lookup is bounded by runid, the table's primary key, which rises
-- with time: only the newest 6,000 runs (more than a day's worth) are read.
-- Same checks, same results; the "late" detail says "not recently" when a
-- job has no run in that window.

CREATE OR REPLACE FUNCTION public.health_snapshot()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_problems jsonb := '[]'::jsonb;
  v_min_runid bigint;
  r record;
  v_count int;
BEGIN
  -- Only the newest runs matter (about 4,200 a day). runid rises with time
  -- and is the primary key, so this reads a few pages instead of the whole
  -- 7-day history table, which a time filter scanned end to end.
  SELECT max(runid) - 6000 INTO v_min_runid FROM cron.job_run_details;
  v_min_runid := coalesce(v_min_runid, 0);

  -- Failed jobs
  FOR r IN
    SELECT j.jobname, count(*) AS n, max(left(d.return_message, 200)) AS msg
      FROM cron.job_run_details d JOIN cron.job j USING (jobid)
     WHERE d.runid > v_min_runid AND d.status = 'failed' AND d.start_time > now() - interval '20 minutes'
     GROUP BY j.jobname
  LOOP
    v_problems := v_problems || jsonb_build_object('key', 'cron_failed:' || r.jobname,
      'title', 'Scheduled job "' || r.jobname || '" failed',
      'detail', r.n || ' failed run(s) in the last 20 minutes. Last error: ' || coalesce(r.msg, 'none'));
  END LOOP;

  -- The scheduler itself stopped
  IF NOT EXISTS (SELECT 1 FROM cron.job_run_details WHERE runid > v_min_runid AND start_time > now() - interval '20 minutes') THEN
    v_problems := v_problems || jsonb_build_object('key', 'cron_stalled',
      'title', 'Scheduled jobs have stopped',
      'detail', 'No scheduled job has run in 20 minutes (deliver-scheduled-posts normally runs every minute). Scheduled posts, held notifications and reminders are not going out.');
  END IF;

  -- Frequent jobs running late
  FOR r IN
    SELECT j.jobname, max(d.start_time) AS last_run
      FROM cron.job j LEFT JOIN cron.job_run_details d ON d.jobid = j.jobid AND d.runid > v_min_runid
     WHERE j.active AND j.schedule IN ('*/5 * * * *', '* * * * *')
     GROUP BY j.jobname
    HAVING coalesce(max(d.start_time), '-infinity') < now() - interval '30 minutes'
  LOOP
    v_problems := v_problems || jsonb_build_object('key', 'cron_late:' || r.jobname,
      'title', 'Scheduled job "' || r.jobname || '" is not running',
      'detail', 'Last run: ' || coalesce(to_char(r.last_run AT TIME ZONE 'America/New_York', 'Mon DD HH24:MI') || ' (Eastern)', 'not recently') || '.');
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
