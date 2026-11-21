-- 108: diocese plan (spec step 9, Business section C)
--
-- Owner's decisions (2026-11-21): flat $49 per parish per month; the diocese
-- picks which parishes to cover; a covered parish's own subscription is set
-- to cancel at the end of its paid period (no double charge); diocese-wide
-- announcements come later.
--
--  - dioceses: one account per diocese, matched to parishes.diocese by name.
--    Platform admins create them and appoint diocese admins.
--  - diocese_parishes: the parishes the diocese covers (a parish belongs to
--    at most one diocese plan). Written by the API (service role), which
--    keeps the Stripe quantity in step.
--  - diocese_subscriptions: the diocese's one Stripe subscription
--    (quantity = covered parishes), kept by the webhook.
--  - parish_plan_status(): whether a parish has a plan, through its own
--    subscription or an active diocese plan. The parish dashboard uses it.
--  - diocese_reach(): step 8's reach counts per covered parish, plus totals.
--    Aggregate counts only.

CREATE TABLE IF NOT EXISTS dioceses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diocese_admins (
  diocese_id uuid NOT NULL REFERENCES dioceses(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (diocese_id, user_id)
);

CREATE TABLE IF NOT EXISTS diocese_parishes (
  parish_id  uuid PRIMARY KEY REFERENCES parishes(id) ON DELETE CASCADE,
  diocese_id uuid NOT NULL REFERENCES dioceses(id) ON DELETE CASCADE,
  added_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  added_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diocese_parishes_diocese_idx ON diocese_parishes (diocese_id);

CREATE TABLE IF NOT EXISTS diocese_subscriptions (
  diocese_id             uuid PRIMARY KEY REFERENCES dioceses(id) ON DELETE CASCADE,
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text,
  current_period_end     timestamptz,
  quantity               int,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ── Access ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_diocese_admin(p_diocese_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM diocese_admins WHERE diocese_id = p_diocese_id AND user_id = auth.uid())
$$;

ALTER TABLE dioceses ENABLE ROW LEVEL SECURITY;
ALTER TABLE diocese_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE diocese_parishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE diocese_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dioceses_read ON dioceses;
CREATE POLICY dioceses_read ON dioceses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS dioceses_platform_write ON dioceses;
CREATE POLICY dioceses_platform_write ON dioceses FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS diocese_admins_read ON diocese_admins;
CREATE POLICY diocese_admins_read ON diocese_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_platform_admin() OR is_diocese_admin(diocese_id));
DROP POLICY IF EXISTS diocese_admins_platform_write ON diocese_admins;
CREATE POLICY diocese_admins_platform_write ON diocese_admins FOR ALL TO authenticated
  USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- The diocese team, platform admins, and the covered parish's own team
DROP POLICY IF EXISTS diocese_parishes_read ON diocese_parishes;
CREATE POLICY diocese_parishes_read ON diocese_parishes FOR SELECT TO authenticated
  USING (is_platform_admin() OR is_diocese_admin(diocese_id)
         OR EXISTS (SELECT 1 FROM parish_admins a WHERE a.parish_id = diocese_parishes.parish_id AND a.user_id = auth.uid()));

DROP POLICY IF EXISTS diocese_subscriptions_read ON diocese_subscriptions;
CREATE POLICY diocese_subscriptions_read ON diocese_subscriptions FOR SELECT TO authenticated
  USING (is_platform_admin() OR is_diocese_admin(diocese_id));
-- diocese_parishes and diocese_subscriptions are written by the API and the
-- Stripe webhook (service role) only

-- ── Plan status for a parish ────────────────────────────────
CREATE OR REPLACE FUNCTION public.parish_plan_status(p_parish_id uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'own_status', (SELECT status FROM parish_subscriptions WHERE parish_id = p_parish_id),
    'diocese_id', d.id,
    'diocese_name', d.name,
    'diocese_status', ds.status,
    'covered', coalesce(ds.status IN ('active', 'trialing', 'past_due'), false)
  )
  FROM (SELECT 1) one
  LEFT JOIN diocese_parishes dp ON dp.parish_id = p_parish_id
  LEFT JOIN dioceses d ON d.id = dp.diocese_id
  LEFT JOIN diocese_subscriptions ds ON ds.diocese_id = dp.diocese_id
  WHERE auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION parish_plan_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION parish_plan_status(uuid) TO authenticated;

-- ── Diocese roll-up ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.diocese_reach(p_diocese_id uuid, p_since timestamptz DEFAULT now() - interval '30 days')
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_since timestamptz := greatest(p_since, now() - interval '400 days');
  v_rows jsonb;
BEGIN
  IF NOT (is_platform_admin() OR is_diocese_admin(p_diocese_id)) THEN
    RAISE EXCEPTION 'Only the diocese team can see this' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'parish_id', p.id, 'name', p.name, 'city', p.city, 'added_at', dp.added_at,
           'has_admin', EXISTS (SELECT 1 FROM parish_admins a WHERE a.parish_id = p.id AND a.role <> 'pending'),
           'reach', parish_reach_counts(p.id, v_since) - 'announcements'
         ) ORDER BY p.name), '[]'::jsonb)
    INTO v_rows
    FROM diocese_parishes dp JOIN parishes p ON p.id = dp.parish_id
   WHERE dp.diocese_id = p_diocese_id;

  RETURN jsonb_build_object(
    'since', v_since,
    'parishes', v_rows,
    'totals', jsonb_build_object(
      'parishes', jsonb_array_length(v_rows),
      'followers',          (SELECT coalesce(sum((r->'reach'->>'followers')::int), 0) FROM jsonb_array_elements(v_rows) r),
      'new_followers',      (SELECT coalesce(sum((r->'reach'->>'new_followers')::int), 0) FROM jsonb_array_elements(v_rows) r),
      'weekly_active',      (SELECT coalesce(sum((r->'reach'->>'weekly_active')::int), 0) FROM jsonb_array_elements(v_rows) r),
      'announcement_count', (SELECT coalesce(sum((r->'reach'->>'announcement_count')::int), 0) FROM jsonb_array_elements(v_rows) r),
      'people_reached',     (SELECT coalesce(sum((r->'reach'->>'people_reached')::int), 0) FROM jsonb_array_elements(v_rows) r),
      'community_posts',    (SELECT coalesce(sum((r->'reach'->>'community_posts')::int), 0) FROM jsonb_array_elements(v_rows) r)
    )
  );
END $$;

REVOKE ALL ON FUNCTION diocese_reach(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION diocese_reach(uuid, timestamptz) TO authenticated;
