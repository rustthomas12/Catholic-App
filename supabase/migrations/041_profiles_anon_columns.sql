-- ============================================================
-- 041: signed-out visitors could read private profile columns
--
-- "Profiles are publicly readable" (USING true) plus the default table
-- grant let the anon key read every column — stripe_customer_id,
-- donation totals, subscription status, sponsorship, suspension, etc.
-- Signed-out pages only need public identity fields (author names and
-- badges, the sign-up username check), so anon gets just those columns.
--
-- Still open (see TEST_PLAN issue 67): signed-in users can read these
-- columns on OTHER users' profiles too; fixing that needs the client's
-- own-profile select('*') moved to a security-definer RPC or a view.
-- ============================================================

REVOKE SELECT ON profiles FROM anon;
GRANT SELECT (
  id, full_name, username, avatar_url, bio, parish_id, vocation_state,
  is_verified_clergy, is_premium, is_patron, created_at, profile_visibility, deleted_at
) ON profiles TO anon;
