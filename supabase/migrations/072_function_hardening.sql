-- ============================================================
-- 072: hardening from the Supabase security advisor
-- * Pin search_path on functions that didn't set it, so a caller can't
--   shadow a table/function name with their own schema.
-- * Trigger-only and admin-only functions shouldn't be callable through the
--   public API at all. (They already refused — trigger functions can't run
--   outside a trigger and set_user_suspended checks for an admin — this
--   just removes the endpoints.) None of these appear in RLS policies.
-- ============================================================

ALTER FUNCTION public.is_org_member(uuid)                  SET search_path = public;
ALTER FUNCTION public.is_org_admin(uuid)                   SET search_path = public;
ALTER FUNCTION public.parish_has_active_subscription(uuid) SET search_path = public;
ALTER FUNCTION public.org_has_active_subscription(uuid)    SET search_path = public;
ALTER FUNCTION public.update_rsvp_count()                  SET search_path = public;
ALTER FUNCTION public.increment_member_count(uuid)         SET search_path = public;
ALTER FUNCTION public.trg_group_member_count()             SET search_path = public;
ALTER FUNCTION public.decrement_member_count(uuid)         SET search_path = public;
ALTER FUNCTION public.get_standalone_tier(integer)         SET search_path = public;
ALTER FUNCTION public.get_national_tier(integer)           SET search_path = public;
ALTER FUNCTION public.get_child_org_ids(uuid)              SET search_path = public;
ALTER FUNCTION public.update_updated_at()                  SET search_path = public;
ALTER FUNCTION public.handle_new_user()                    SET search_path = public;

-- Trigger functions: never called through the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_group_member_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_rsvp_count()      FROM PUBLIC, anon, authenticated;

-- Signed-in admins only
REVOKE EXECUTE ON FUNCTION public.set_user_suspended(uuid, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_user_suspended(uuid, boolean) TO authenticated;
