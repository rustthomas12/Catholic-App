-- ============================================================
-- 054: restrict profile columns (see 053)
-- APPLY ONLY AFTER the app version using get_my_profile()/get_profile()
-- is live — older clients load profiles with select('*'), which this blocks.
-- Signed-in users: public columns only (issue 67 — other users' Stripe ids,
-- donation totals, subscription/sponsorship fields were readable).
-- Signed-out: also drop bio/parish_id (members-only fields).
-- ============================================================
-- Column-level read access for signed-in users (RLS still applies)
REVOKE SELECT ON profiles FROM authenticated;
GRANT SELECT (
  id, full_name, username, avatar_url, vocation_state,
  is_verified_clergy, is_premium, is_patron, is_admin, suspended_at,
  created_at, profile_visibility, deleted_at
) ON profiles TO authenticated;

REVOKE SELECT ON profiles FROM anon;
GRANT SELECT (
  id, full_name, username, avatar_url, vocation_state,
  is_verified_clergy, is_premium, is_patron, created_at, profile_visibility, deleted_at
) ON profiles TO anon;
