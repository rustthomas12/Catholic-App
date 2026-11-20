-- 091: scaling fixes found by the 2026-11-19 load test
--
-- 1. safe_timezone() checked each name against pg_timezone_names, which reads
--    the whole time zone directory from disk on every call (~92 ms each).
--    It runs per user in the 5-minute daily and confession reminder jobs and
--    per follower when a parish posts an event, so its cost grew linearly
--    with users (1.5 s per run already; minutes per run at a few thousand
--    users). Now it just tries the conversion and falls back on error.
--    AT TIME ZONE accepts the same IANA names, plus abbreviations and POSIX
--    offsets, which are also valid zones to convert with.
--
-- 2. cron.job_run_details was never cleared: 324k rows / 163 MB, two thirds
--    of the database. Keep 7 days, purged daily.

CREATE OR REPLACE FUNCTION safe_timezone(tz text)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $$
BEGIN
  IF tz IS NULL OR tz = '' THEN RETURN 'America/New_York'; END IF;
  PERFORM now() AT TIME ZONE tz;
  RETURN tz;
EXCEPTION WHEN OTHERS THEN
  RETURN 'America/New_York';
END $$;

DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';

SELECT cron.unschedule('purge-cron-history') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-cron-history');
SELECT cron.schedule('purge-cron-history', '45 8 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$);
