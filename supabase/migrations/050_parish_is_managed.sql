-- 050: public "does this parish already have an admin?" check.
-- parish_admins isn't readable by other users, so the parish page kept
-- showing "Is this your parish?" / "Apply to manage" on managed parishes,
-- and pastor setup let a priest pick (and try to pay for) a parish that
-- someone else already manages.
CREATE OR REPLACE FUNCTION parish_is_managed(p_parish_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = p_parish_id)
$$;
GRANT EXECUTE ON FUNCTION parish_is_managed(uuid) TO anon, authenticated;
