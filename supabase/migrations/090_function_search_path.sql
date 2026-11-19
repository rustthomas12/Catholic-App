-- ============================================================
-- 090: pin search_path on the last function without one
-- (Supabase security advisor: "function_search_path_mutable").
-- Every other public function already sets it.
-- ============================================================
ALTER FUNCTION public.in_reminder_window(timestamp without time zone, time without time zone)
  SET search_path = public, pg_temp;
