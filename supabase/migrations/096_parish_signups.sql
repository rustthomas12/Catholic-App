-- 096: who applied to run a parish, in what role, and the pastor invite
--
-- (Named parish_signups: parish_applications is the marketing contact form.)
--
-- Parish signup now asks "What's your role?" (pastor, parish staff, other
-- clergy). Staff can do the whole setup and name their pastor, who gets an
-- email invite. Accepting it gives the pastor provisional access (role
-- 'pending', migration 094) and puts them in the platform admin's review
-- list; nobody becomes a full admin without that review.
--
-- Rows are written by the Stripe webhook (service role) at checkout.

CREATE TABLE IF NOT EXISTS parish_signups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parish_id           uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  applicant_role      text NOT NULL CHECK (applicant_role IN ('pastor', 'staff', 'clergy')),
  staff_title         text CHECK (char_length(staff_title) <= 80),
  pastor_name         text CHECK (char_length(pastor_name) <= 120),
  pastor_email        text CHECK (char_length(pastor_email) <= 254),
  invite_token        uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invite_sent_at      timestamptz,
  invite_accepted_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  invite_accepted_at  timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parish_id, user_id)
);
CREATE INDEX IF NOT EXISTS parish_signups_accepted_by_idx ON parish_signups(invite_accepted_by);

ALTER TABLE parish_signups ENABLE ROW LEVEL SECURITY;

-- The applicant sees their own; platform admins see all (review list).
-- No client writes: the webhook and the RPCs below do them.
DROP POLICY IF EXISTS "Applicants and platform admins read applications" ON parish_signups;
CREATE POLICY "Applicants and platform admins read applications" ON parish_signups
  FOR SELECT USING (user_id = auth.uid() OR is_platform_admin());

-- The profile guard (037) let only platform admins set
-- pending_pastor_parish_id; trusted server functions may now too
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- infold.trusted_write: set (transaction-local) by SECURITY DEFINER
  -- functions such as accept_pastor_invite (migration 096)
  IF auth.uid() IS NULL
     OR coalesce(current_setting('infold.trusted_write', true), '') = 'on'
     OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin) THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin                       IS DISTINCT FROM OLD.is_admin
  OR NEW.is_verified_clergy             IS DISTINCT FROM OLD.is_verified_clergy
  OR NEW.is_premium                     IS DISTINCT FROM OLD.is_premium
  OR NEW.is_patron                      IS DISTINCT FROM OLD.is_patron
  OR NEW.premium_expires_at             IS DISTINCT FROM OLD.premium_expires_at
  OR NEW.premium_source                 IS DISTINCT FROM OLD.premium_source
  OR NEW.stripe_customer_id             IS DISTINCT FROM OLD.stripe_customer_id
  OR NEW.subscription_status            IS DISTINCT FROM OLD.subscription_status
  OR NEW.subscription_interval          IS DISTINCT FROM OLD.subscription_interval
  OR NEW.sponsored_by_parish_id         IS DISTINCT FROM OLD.sponsored_by_parish_id
  OR NEW.sponsorship_activated_at       IS DISTINCT FROM OLD.sponsorship_activated_at
  OR NEW.donation_tier                  IS DISTINCT FROM OLD.donation_tier
  OR NEW.donation_tier_since            IS DISTINCT FROM OLD.donation_tier_since
  OR NEW.one_time_donation_total_cents  IS DISTINCT FROM OLD.one_time_donation_total_cents
  OR NEW.suspended_at                   IS DISTINCT FROM OLD.suspended_at
  OR NEW.deleted_at                     IS DISTINCT FROM OLD.deleted_at
  OR NEW.pending_pastor_parish_id       IS DISTINCT FROM OLD.pending_pastor_parish_id
  THEN
    RAISE EXCEPTION 'Not allowed to change account privileges' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

-- What the invite page shows before the pastor accepts
CREATE OR REPLACE FUNCTION pastor_invite_info(p_token uuid)
RETURNS TABLE (parish_id uuid, parish_name text, city text, state text,
               invited_by text, pastor_name text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.parish_id, p.name, p.city, p.state, pr.full_name, a.pastor_name,
         CASE
           WHEN a.invite_accepted_at IS NOT NULL THEN 'accepted'
           WHEN a.created_at < now() - interval '30 days' THEN 'expired'
           WHEN NOT EXISTS (SELECT 1 FROM parish_admins pa
                             WHERE pa.parish_id = a.parish_id AND pa.user_id = a.user_id) THEN 'withdrawn'
           ELSE 'open'
         END
    FROM parish_signups a
    JOIN parishes p ON p.id = a.parish_id
    JOIN profiles pr ON pr.id = a.user_id
   WHERE a.invite_token = p_token AND a.applicant_role = 'staff'
$$;
REVOKE EXECUTE ON FUNCTION pastor_invite_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pastor_invite_info(uuid) TO authenticated;

-- The pastor accepts: provisional access + review queue. Returns the parish id.
CREATE OR REPLACE FUNCTION accept_pastor_invite(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a parish_signups%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO a FROM parish_signups
   WHERE invite_token = p_token AND applicant_role = 'staff' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This invite link is not valid' USING ERRCODE = 'P0001';
  END IF;
  IF a.invite_accepted_at IS NOT NULL THEN
    IF a.invite_accepted_by = auth.uid() THEN RETURN a.parish_id; END IF;
    RAISE EXCEPTION 'This invite has already been accepted' USING ERRCODE = 'P0001';
  END IF;
  IF a.created_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'This invite has expired' USING ERRCODE = 'P0001';
  END IF;
  IF a.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Send this link to your pastor; it can''t be accepted by the person who sent it' USING ERRCODE = 'P0001';
  END IF;
  -- Declined or withdrawn applications can't be revived through the invite
  IF NOT EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = a.parish_id AND user_id = a.user_id) THEN
    RAISE EXCEPTION 'This invite is no longer active' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO parish_admins (parish_id, user_id, role)
  VALUES (a.parish_id, auth.uid(), 'pending')
  ON CONFLICT (parish_id, user_id) DO NOTHING;

  PERFORM set_config('infold.trusted_write', 'on', true);
  UPDATE profiles SET pending_pastor_parish_id = a.parish_id
   WHERE id = auth.uid() AND pending_pastor_parish_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM parish_admins
                      WHERE parish_id = a.parish_id AND user_id = auth.uid() AND role <> 'pending');
  PERFORM set_config('infold.trusted_write', 'off', true);

  UPDATE parish_signups
     SET invite_accepted_by = auth.uid(), invite_accepted_at = now()
   WHERE id = a.id;
  RETURN a.parish_id;
END $$;
REVOKE EXECUTE ON FUNCTION accept_pastor_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION accept_pastor_invite(uuid) TO authenticated;
