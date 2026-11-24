-- 114: Eucharistic adoration schedules with holy hour sign-ups
--
-- Feedback (Fr. Michael): "Need to have a section where the priest can
-- schedule adoration and people sign up for time slots to do Holy hours."
--
-- A parish admin creates a schedule, either weekly (a weekday, e.g. every
-- Tuesday 9:00-21:00) or one-off (a date, e.g. First Friday or 40 Hours).
-- The window is split into slots (15, 30 or 60 minutes), each taking up to
-- `capacity` adorers. Times are the parish's local wall-clock times, so no
-- time zone maths. end_time may be 24:00 for "until midnight".
--
-- A weekly sign-up is a standing commitment to that hour every week; a
-- one-off sign-up is for that date. Everyone sees how full each slot is
-- (adoration_slot_counts); only the parish team sees who signed up.

CREATE TABLE IF NOT EXISTS adoration_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id     uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  title         text NOT NULL DEFAULT 'Eucharistic Adoration' CHECK (char_length(title) BETWEEN 1 AND 80),
  location      text CHECK (char_length(location) <= 120),
  notes         text CHECK (char_length(notes) <= 500),
  weekday       smallint CHECK (weekday BETWEEN 0 AND 6),   -- 0 = Sunday
  on_date       date,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  slot_minutes  smallint NOT NULL DEFAULT 60 CHECK (slot_minutes IN (15, 30, 60)),
  capacity      smallint NOT NULL DEFAULT 2 CHECK (capacity BETWEEN 1 AND 20),
  created_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((weekday IS NULL) <> (on_date IS NULL)),
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS adoration_schedules_parish ON adoration_schedules (parish_id);
ALTER TABLE adoration_schedules ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS adoration_signups (
  schedule_id  uuid NOT NULL REFERENCES adoration_schedules(id) ON DELETE CASCADE,
  slot_index   smallint NOT NULL CHECK (slot_index >= 0),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (schedule_id, slot_index, user_id)
);
CREATE INDEX IF NOT EXISTS adoration_signups_user ON adoration_signups (user_id);
ALTER TABLE adoration_signups ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.adoration_slot_count(s adoration_schedules)
 RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT ceil(extract(epoch FROM (s.end_time - s.start_time)) / 60.0 / s.slot_minutes)::int
$$;

-- Schedules: everyone signed in reads; the parish team manages
DROP POLICY IF EXISTS adoration_schedules_read ON adoration_schedules;
CREATE POLICY adoration_schedules_read ON adoration_schedules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS adoration_schedules_manage ON adoration_schedules;
CREATE POLICY adoration_schedules_manage ON adoration_schedules FOR ALL TO authenticated
  USING (is_verified_parish_admin(parish_id) OR is_platform_admin())
  WITH CHECK (is_verified_parish_admin(parish_id) OR is_platform_admin());

-- Sign-ups: your own, or all of them for the parish team
DROP POLICY IF EXISTS adoration_signups_read ON adoration_signups;
CREATE POLICY adoration_signups_read ON adoration_signups FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM adoration_schedules s WHERE s.id = schedule_id
         AND (is_verified_parish_admin(s.parish_id) OR is_platform_admin())));
DROP POLICY IF EXISTS adoration_signups_insert ON adoration_signups;
CREATE POLICY adoration_signups_insert ON adoration_signups FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM adoration_schedules s WHERE s.id = schedule_id
              AND NOT is_banned_from_parish(s.parish_id)));
DROP POLICY IF EXISTS adoration_signups_delete ON adoration_signups;
CREATE POLICY adoration_signups_delete ON adoration_signups FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM adoration_schedules s WHERE s.id = schedule_id
         AND (is_verified_parish_admin(s.parish_id) OR is_platform_admin())));

-- A real slot, not full, and not on a past date
CREATE OR REPLACE FUNCTION public.adoration_signup_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s adoration_schedules; v_taken int;
BEGIN
  SELECT * INTO s FROM adoration_schedules WHERE id = NEW.schedule_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'That adoration schedule no longer exists' USING ERRCODE = '23503'; END IF;
  IF NEW.slot_index >= adoration_slot_count(s) THEN
    RAISE EXCEPTION 'That time slot does not exist' USING ERRCODE = '22023';
  END IF;
  IF s.on_date IS NOT NULL AND s.on_date < (now() AT TIME ZONE 'America/New_York')::date THEN
    RAISE EXCEPTION 'That adoration has already taken place' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_taken FROM adoration_signups WHERE schedule_id = NEW.schedule_id AND slot_index = NEW.slot_index;
  IF v_taken >= s.capacity THEN
    RAISE EXCEPTION 'That hour is already full' USING ERRCODE = 'P0001', HINT = 'slot_full';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION adoration_signup_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS adoration_signup_guard ON adoration_signups;
CREATE TRIGGER adoration_signup_guard BEFORE INSERT ON adoration_signups
  FOR EACH ROW EXECUTE FUNCTION adoration_signup_guard();

-- Sign-ups outside the window are dropped when a schedule is shortened
CREATE OR REPLACE FUNCTION public.adoration_trim_signups()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (NEW.start_time, NEW.end_time, NEW.slot_minutes, NEW.weekday, NEW.on_date)
     IS DISTINCT FROM (OLD.start_time, OLD.end_time, OLD.slot_minutes, OLD.weekday, OLD.on_date) THEN
    -- Slots are numbered from the start, so any change of timing resets them
    DELETE FROM adoration_signups WHERE schedule_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION adoration_trim_signups() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS adoration_trim_signups ON adoration_schedules;
CREATE TRIGGER adoration_trim_signups AFTER UPDATE ON adoration_schedules
  FOR EACH ROW EXECUTE FUNCTION adoration_trim_signups();

-- How full each slot is (counts only, no names)
CREATE OR REPLACE FUNCTION public.adoration_slot_counts(p_schedule_ids uuid[])
 RETURNS TABLE (schedule_id uuid, slot_index smallint, taken int)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.schedule_id, a.slot_index, count(*)::int
    FROM adoration_signups a
   WHERE a.schedule_id = ANY (p_schedule_ids[1:50]) AND auth.uid() IS NOT NULL
   GROUP BY a.schedule_id, a.slot_index
$$;
REVOKE ALL ON FUNCTION adoration_slot_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION adoration_slot_counts(uuid[]) TO authenticated;
