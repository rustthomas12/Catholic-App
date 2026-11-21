-- 093: parish trials start without a card
--
-- Parish checkout now uses payment_method_collection = 'if_required', so a
-- 90-day trial can start with no card. If the trial ends with no card, Stripe
-- pauses the subscription (status 'paused'); adding a card resumes autopay.
--
-- * parish_subscriptions.has_payment_method: kept in sync by the Stripe
--   webhook, used for the "add a card" nudges and the admin follow-up list.
-- * admin_trials_ending(): platform admins only. Every trialing or paused
--   parish with days left, card status, and who to contact.

ALTER TABLE parish_subscriptions
  ADD COLUMN IF NOT EXISTS has_payment_method boolean NOT NULL DEFAULT false;

-- Every subscription before this migration went through a card-required
-- checkout, so it has a card on file
UPDATE parish_subscriptions
   SET has_payment_method = true
 WHERE stripe_subscription_id IS NOT NULL;

CREATE OR REPLACE FUNCTION admin_trials_ending()
RETURNS TABLE (
  parish_id uuid, parish_name text, city text, state text,
  status text, trial_ends_at timestamptz, has_payment_method boolean,
  contacts jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND is_admin) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT s.parish_id, p.name, p.city, p.state, s.status, s.trial_ends_at, s.has_payment_method,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object('name', pr.full_name, 'email', u.email, 'role', c.role))
        FROM (
          SELECT pa.user_id, pa.role::text AS role FROM parish_admins pa WHERE pa.parish_id = s.parish_id
          UNION
          SELECT pr2.id, 'applicant' FROM profiles pr2
           WHERE pr2.pending_pastor_parish_id = s.parish_id AND pr2.deleted_at IS NULL
        ) c
        JOIN profiles pr ON pr.id = c.user_id
        JOIN auth.users u ON u.id = c.user_id
      ), '[]'::jsonb)
    FROM parish_subscriptions s
    JOIN parishes p ON p.id = s.parish_id
    WHERE s.status IN ('trialing', 'paused')
    ORDER BY (s.status = 'paused') DESC, s.has_payment_method, s.trial_ends_at NULLS LAST;
END $$;
REVOKE EXECUTE ON FUNCTION admin_trials_ending() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_trials_ending() TO authenticated;
