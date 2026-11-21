-- 097: parish signup funnel
--
-- Records the first time each parish (or, before a parish is chosen, each
-- person) reaches each signup step, so the platform admin can see where
-- parishes stall. Parish-level milestones only: nothing about what
-- parishioners read or do, and the admin view returns counts and parish
-- names, never people.
--
-- Steps, in order:
--   started            opened parish signup              (app)
--   parish_chosen      picked their parish               (app)
--   plan_chosen        picked a size/plan                (app)
--   trial_started      checkout finished, trial running  (trigger: parish_subscriptions)
--   profile_updated    an admin edited the parish page   (trigger: parishes)
--   verified           first verified admin or staff     (trigger: parish_admins)
--   first_announcement first parish announcement         (trigger: posts)
--   members_25         25 followers                      (trigger: parish_follows)
--   paid               subscription became active        (trigger: parish_subscriptions)
--
-- Starts empty: earlier signups aren't backfilled.

CREATE TABLE IF NOT EXISTS signup_funnel_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  step       text NOT NULL CHECK (step IN ('started', 'parish_chosen', 'plan_chosen', 'trial_started',
               'profile_updated', 'verified', 'first_announcement', 'members_25', 'paid')),
  parish_id  uuid REFERENCES parishes(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Once per step per parish (parish steps) or per person (app steps)
CREATE UNIQUE INDEX IF NOT EXISTS signup_funnel_once
  ON signup_funnel_events (step, parish_id, user_id) NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS signup_funnel_parish_idx ON signup_funnel_events (parish_id);

ALTER TABLE signup_funnel_events ENABLE ROW LEVEL SECURITY;
-- No direct access: the app records through record_signup_step(), the admin
-- reads through admin_signup_funnel()

CREATE OR REPLACE FUNCTION funnel_mark(p_step text, p_parish uuid, p_user uuid DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO signup_funnel_events (step, parish_id, user_id)
  VALUES (p_step, p_parish, p_user)
  ON CONFLICT DO NOTHING
$$;
REVOKE EXECUTE ON FUNCTION funnel_mark(text, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- App-side steps (the signup screens). Only the first three steps.
CREATE OR REPLACE FUNCTION record_signup_step(p_step text, p_parish_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_step NOT IN ('started', 'parish_chosen', 'plan_chosen') THEN
    RETURN;
  END IF;
  PERFORM funnel_mark(p_step, CASE WHEN p_step = 'started' THEN NULL ELSE p_parish_id END, auth.uid());
END $$;
REVOKE EXECUTE ON FUNCTION record_signup_step(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_signup_step(text, uuid) TO authenticated;

-- ── Triggers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION funnel_on_subscription() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN PERFORM funnel_mark('trial_started', NEW.parish_id); END IF;
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM funnel_mark('paid', NEW.parish_id);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS funnel_on_subscription ON parish_subscriptions;
CREATE TRIGGER funnel_on_subscription AFTER INSERT OR UPDATE OF status ON parish_subscriptions
  FOR EACH ROW EXECUTE FUNCTION funnel_on_subscription();

CREATE OR REPLACE FUNCTION funnel_on_parish_edit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = NEW.id AND user_id = auth.uid()) THEN
    PERFORM funnel_mark('profile_updated', NEW.id);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS funnel_on_parish_edit ON parishes;
CREATE TRIGGER funnel_on_parish_edit AFTER UPDATE ON parishes
  FOR EACH ROW EXECUTE FUNCTION funnel_on_parish_edit();

CREATE OR REPLACE FUNCTION funnel_on_admin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role <> 'pending' THEN PERFORM funnel_mark('verified', NEW.parish_id); END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS funnel_on_admin ON parish_admins;
CREATE TRIGGER funnel_on_admin AFTER INSERT OR UPDATE OF role ON parish_admins
  FOR EACH ROW EXECUTE FUNCTION funnel_on_admin();

CREATE OR REPLACE FUNCTION funnel_on_announcement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parish_id IS NOT NULL AND coalesce(NEW.is_announcement, false) THEN
    PERFORM funnel_mark('first_announcement', NEW.parish_id);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS funnel_on_announcement ON posts;
CREATE TRIGGER funnel_on_announcement AFTER INSERT ON posts
  FOR EACH ROW WHEN (NEW.is_announcement IS TRUE AND NEW.parish_id IS NOT NULL)
  EXECUTE FUNCTION funnel_on_announcement();

CREATE OR REPLACE FUNCTION funnel_on_follow() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM signup_funnel_events WHERE step = 'members_25' AND parish_id = NEW.parish_id)
     AND (SELECT count(*) FROM parish_follows WHERE parish_id = NEW.parish_id) >= 25 THEN
    PERFORM funnel_mark('members_25', NEW.parish_id);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS funnel_on_follow ON parish_follows;
CREATE TRIGGER funnel_on_follow AFTER INSERT ON parish_follows
  FOR EACH ROW EXECUTE FUNCTION funnel_on_follow();

-- ── Admin view ────────────────────────────────────────────────
-- How many reached each step in the window, plus each parish's furthest step
CREATE OR REPLACE FUNCTION admin_signup_funnel(p_days int DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  steps text[] := ARRAY['started', 'parish_chosen', 'plan_chosen', 'trial_started',
    'profile_updated', 'verified', 'first_announcement', 'members_25', 'paid'];
  since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 90), 1));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND is_admin) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'steps', (
      SELECT jsonb_agg(jsonb_build_object('step', s.step, 'count', coalesce(c.n, 0)) ORDER BY s.ord)
      FROM unnest(steps) WITH ORDINALITY AS s(step, ord)
      LEFT JOIN (SELECT e.step, count(*) n FROM signup_funnel_events e
                  WHERE e.created_at >= since GROUP BY e.step) c ON c.step = s.step
    ),
    'parishes', coalesce((
      SELECT jsonb_agg(row_to_json(x) ORDER BY x.last_at DESC)
      FROM (
        SELECT e.parish_id, p.name, p.city, p.state,
               (array_agg(e.step ORDER BY array_position(steps, e.step) DESC))[1] AS furthest,
               max(e.created_at) AS last_at
          FROM signup_funnel_events e JOIN parishes p ON p.id = e.parish_id
         WHERE e.created_at >= since
         GROUP BY e.parish_id, p.name, p.city, p.state
         ORDER BY max(e.created_at) DESC
         LIMIT 50
      ) x
    ), '[]'::jsonb)
  );
END $$;
REVOKE EXECUTE ON FUNCTION admin_signup_funnel(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_signup_funnel(int) TO authenticated;
