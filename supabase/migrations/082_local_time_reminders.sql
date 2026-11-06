-- ============================================================
-- 082: reminders at the right local time, in every time zone
--
-- Morning Offering and Daily Readings reminders were Vercel cron jobs firing
-- once a day at a fixed UTC moment (11:00 and 17:00): 6 AM and noon only in
-- US Eastern winter time, an hour later in summer, and the middle of the
-- night elsewhere. They also only reached the few people who had a
-- notification_preferences row, though both reminders are on by default.
-- Confession reminders went out at 14:00 UTC for everyone.
--
-- Now each person's time zone (sent by the app from the device) and chosen
-- times are stored, and one job every 5 minutes sends each reminder within
-- the hour after the person's local time. Reminders become ordinary
-- notifications, so preferences (apply_notification_preferences, which
-- already knows these types) and push delivery (send-push) work as for
-- everything else. The Vercel jobs are removed in the same release.
-- ============================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'morning_offering_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'daily_readings_reminder';

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS morning_offering_time time NOT NULL DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS daily_readings_time time NOT NULL DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS confession_reminder_time time NOT NULL DEFAULT '10:00';

ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_timezone_len;
ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_timezone_len CHECK (char_length(timezone) BETWEEN 1 AND 64);

-- An unknown zone name would make AT TIME ZONE fail for the whole batch
CREATE OR REPLACE FUNCTION safe_timezone(tz text)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = tz)
              THEN tz ELSE 'America/New_York' END
$$;

-- True during the hour after `target` local time (wraps past midnight)
CREATE OR REPLACE FUNCTION in_reminder_window(local_ts timestamp, target time)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT mod((extract(epoch FROM local_ts::time) - extract(epoch FROM target))::int + 86400, 86400) < 3600
$$;

-- Morning Offering + Daily Readings, for people who can receive a push
CREATE OR REPLACE FUNCTION send_daily_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer := 0; m integer;
BEGIN
  CREATE TEMP TABLE _reminder_people ON COMMIT DROP AS
  SELECT pr.id AS user_id,
         now() AT TIME ZONE safe_timezone(coalesce(np.timezone, 'America/New_York')) AS local_ts,
         coalesce(np.morning_offering_reminder, true) AS want_offering,
         coalesce(np.morning_offering_time, '06:00') AS offering_time,
         coalesce(np.daily_readings_reminder, true) AS want_readings,
         coalesce(np.daily_readings_time, '12:00') AS readings_time
  FROM profiles pr
  LEFT JOIN notification_preferences np ON np.user_id = pr.id
  WHERE pr.deleted_at IS NULL AND pr.suspended_at IS NULL
    AND (EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = pr.id)
         OR EXISTS (SELECT 1 FROM native_push_tokens t WHERE t.user_id = pr.id));

  -- Inserted as read: they're a nudge, not something to clear from the inbox
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT p.user_id, 'morning_offering_reminder', NULL,
         'Offer your day to God before it begins.', NULL, true
  FROM _reminder_people p
  WHERE p.want_offering AND in_reminder_window(p.local_ts, p.offering_time)
    AND NOT EXISTS (SELECT 1 FROM notifications x WHERE x.user_id = p.user_id
                    AND x.type = 'morning_offering_reminder' AND x.created_at > now() - interval '20 hours');
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;

  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT p.user_id, 'daily_readings_reminder', NULL,
         'Today''s Mass readings are ready. Take a moment with God''s Word.', NULL, true
  FROM _reminder_people p
  WHERE p.want_readings AND in_reminder_window(p.local_ts, p.readings_time)
    AND NOT EXISTS (SELECT 1 FROM notifications x WHERE x.user_id = p.user_id
                    AND x.type = 'daily_readings_reminder' AND x.created_at > now() - interval '20 hours');
  GET DIAGNOSTICS m = ROW_COUNT; n := n + m;

  -- Keep only the latest of each in the notification list
  DELETE FROM notifications
  WHERE type IN ('morning_offering_reminder', 'daily_readings_reminder')
    AND created_at < now() - interval '2 days';

  RETURN n;
END $$;

-- Confession reminders (065), now at the person's local time
CREATE OR REPLACE FUNCTION send_confession_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT t.user_id, 'confession_reminder', NULL,
         'It has been ' || (current_date - t.last_date) || ' days since your last confession.',
         NULL, false
  FROM (SELECT user_id, max(confessed_at) AS last_date FROM confession_tracker GROUP BY user_id) t
  LEFT JOIN notification_preferences p ON p.user_id = t.user_id
  JOIN profiles pr ON pr.id = t.user_id AND pr.deleted_at IS NULL
  WHERE coalesce(p.confession_reminder, true)
    AND in_reminder_window(now() AT TIME ZONE safe_timezone(coalesce(p.timezone, 'America/New_York')),
                           coalesce(p.confession_reminder_time, '10:00'))
    AND current_date - t.last_date >= coalesce(p.reminder_interval_days, 30)
    AND NOT EXISTS (SELECT 1 FROM notifications n
                    WHERE n.user_id = t.user_id AND n.type = 'confession_reminder'
                      AND n.created_at > now() - make_interval(days => coalesce(p.reminder_interval_days, 30)));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

REVOKE EXECUTE ON FUNCTION send_daily_reminders(), send_confession_reminders() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('daily-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-reminders');
SELECT cron.schedule('daily-reminders', '*/5 * * * *', 'SELECT send_daily_reminders()');

SELECT cron.unschedule('confession-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'confession-reminders');
SELECT cron.schedule('confession-reminders', '*/5 * * * *', 'SELECT send_confession_reminders()');
