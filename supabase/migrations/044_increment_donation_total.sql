-- ============================================================
-- 044: increment_donation_total
-- The Stripe webhook called this RPC for one-time donations but it never
-- existed, and its .catch() fallback threw (query builders have no
-- .catch), so totals were never recorded. Atomic, server-only.
-- ============================================================
CREATE OR REPLACE FUNCTION increment_donation_total(p_user_id uuid, p_amount integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE profiles
  SET one_time_donation_total_cents = coalesce(one_time_donation_total_cents, 0) + greatest(p_amount, 0)
  WHERE id = p_user_id
$$;
REVOKE EXECUTE ON FUNCTION increment_donation_total(uuid, integer) FROM PUBLIC, anon, authenticated;
