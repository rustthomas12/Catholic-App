-- ============================================================
-- 074: drop database functions nothing uses
-- Checked before writing: not called from the app, API, edge functions or
-- tests; not used by any RLS policy, view, column default, constraint,
-- trigger, cron job or other function. Member counts are kept by the
-- trg_group_member_count trigger; subscription checks happen in the API.
--
-- Original definitions, to restore if ever needed:
--   decrement_member_count(group_id_param uuid) RETURNS void, SQL, SECURITY DEFINER:
--     UPDATE groups SET member_count = GREATEST(0, member_count - 1) WHERE id = group_id_param;
--   increment_member_count(group_id_param uuid) RETURNS void, SQL, SECURITY DEFINER:
--     UPDATE groups SET member_count = GREATEST(0, member_count + 1) WHERE id = group_id_param;
--   get_child_org_ids(p_parent_id uuid) RETURNS uuid[], SQL STABLE SECURITY DEFINER:
--     SELECT ARRAY(SELECT id FROM organizations WHERE parent_org_id = p_parent_id);
--   get_national_tier(p_chapter_count integer) RETURNS text, SQL IMMUTABLE:
--     <=5 national_starter, <=20 national_growth, <=50 national_established, else national_network
--   get_standalone_tier(p_member_count integer) RETURNS text, SQL IMMUTABLE:
--     <50 starter, <100 growth, <300 established, else large
--   org_has_active_subscription(p_org_id uuid) RETURNS boolean, SQL SECURITY DEFINER:
--     EXISTS (SELECT 1 FROM org_subscriptions WHERE org_id = p_org_id AND status IN ('trialing','active'))
--   parish_has_active_subscription(p_parish_id uuid) RETURNS boolean, SQL SECURITY DEFINER:
--     EXISTS (SELECT 1 FROM parish_subscriptions WHERE parish_id = p_parish_id AND status IN ('trialing','active'))
-- ============================================================

DROP FUNCTION IF EXISTS public.increment_member_count(uuid);
DROP FUNCTION IF EXISTS public.decrement_member_count(uuid);
DROP FUNCTION IF EXISTS public.get_standalone_tier(integer);
DROP FUNCTION IF EXISTS public.get_national_tier(integer);
DROP FUNCTION IF EXISTS public.get_child_org_ids(uuid);
DROP FUNCTION IF EXISTS public.org_has_active_subscription(uuid);
DROP FUNCTION IF EXISTS public.parish_has_active_subscription(uuid);
