-- ============================================================
-- 037: users could grant themselves privileges
--
-- "Users can update own profile" covers every column, so any signed-in
-- user could set is_admin (full platform admin), is_verified_clergy,
-- is_premium, clear their own suspension, etc. on their own row.
--
-- A trigger now rejects changes to privileged columns unless the caller
-- is a platform admin or the server (service role / no JWT: Stripe
-- webhook, delete-account, cron). Platform admins may also update other
-- users' profiles (needed by Admin → "Assign Parish Pastor", which grants
-- the clergy badge and previously failed silently).
-- ============================================================

CREATE OR REPLACE FUNCTION guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
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
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION guard_profile_privileged_columns();

REVOKE EXECUTE ON FUNCTION guard_profile_privileged_columns() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Platform admins can update profiles" ON profiles;
CREATE POLICY "Platform admins can update profiles" ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));
