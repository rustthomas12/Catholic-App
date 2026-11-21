-- 105: names in the community highlight (fix for 104)
--
-- 104 used the first word of the author's name, so "Fr. Michael" became
-- "Fr.". Keep a leading title with the name after it ("Fr. Michael",
-- "Deacon John", "Sister Mary"); otherwise the first name.

CREATE OR REPLACE FUNCTION public.highlight_display_name(p_full_name text)
 RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN n IS NULL OR n = '' THEN NULL
    WHEN lower(regexp_replace(split_part(n, ' ', 1), '\.$', '')) IN
         ('fr', 'father', 'deacon', 'dcn', 'sr', 'sister', 'br', 'brother', 'msgr', 'monsignor',
          'rev', 'reverend', 'bishop', 'bp', 'mother', 'dr', 'mr', 'mrs', 'ms', 'miss')
         AND split_part(n, ' ', 2) <> ''
      THEN split_part(n, ' ', 1) || ' ' || split_part(n, ' ', 2)
    ELSE split_part(n, ' ', 1)
  END
  FROM (SELECT regexp_replace(trim(p_full_name), '\s+', ' ', 'g') AS n) x
$$;

CREATE OR REPLACE FUNCTION public.community_highlight_for(p_user_id uuid)
 RETURNS TABLE (reference_id uuid, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total   int;
  v_parishes int;
  v_first   record;
  v_second  record;
  v_where   text;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _hl (id uuid, parish_id uuid, parish_name text, author text, featured boolean, created_at timestamptz) ON COMMIT DROP;
  TRUNCATE _hl;

  INSERT INTO _hl
  SELECT p.id, p.parish_id, pa.name,
         CASE WHEN p.is_anonymous THEN 'Someone'
              ELSE coalesce(highlight_display_name(pr.full_name), 'Someone') END,
         p.featured_at IS NOT NULL, p.created_at
    FROM posts p
    JOIN parishes pa ON pa.id = p.parish_id
    LEFT JOIN profiles pr ON pr.id = p.author_id
   WHERE p.created_at > now() - interval '24 hours'
     AND p.group_id IS NULL AND p.org_id IS NULL
     AND p.is_announcement IS NOT TRUE
     AND p.is_removed IS NOT TRUE AND p.deleted_at IS NULL
     AND p.author_id <> p_user_id
     AND p.parish_id IN (
           SELECT f.parish_id FROM parish_follows f WHERE f.user_id = p_user_id
           UNION
           SELECT pp.parish_id FROM profiles pp WHERE pp.id = p_user_id AND pp.parish_id IS NOT NULL)
     AND NOT EXISTS (SELECT 1 FROM user_blocks b
                      WHERE (b.blocker_id = p_user_id AND b.blocked_id = p.author_id)
                         OR (b.blocker_id = p.author_id AND b.blocked_id = p_user_id))
     AND NOT EXISTS (SELECT 1 FROM post_flags fl WHERE fl.post_id = p.id AND fl.is_resolved IS NOT TRUE)
     AND NOT EXISTS (SELECT 1 FROM post_seen s WHERE s.user_id = p_user_id AND s.post_id = p.id);

  SELECT count(*), count(DISTINCT parish_id) INTO v_total, v_parishes FROM _hl;
  IF v_total = 0 THEN RETURN; END IF;

  SELECT * INTO v_first FROM _hl ORDER BY featured DESC, created_at DESC LIMIT 1;
  v_where := CASE WHEN v_parishes = 1 THEN v_first.parish_name || ' community'
                  ELSE 'your parish communities' END;

  IF v_total = 1 THEN
    RETURN QUERY SELECT v_first.id, v_first.author || ' posted in ' || v_where;
  ELSIF v_total = 2 THEN
    SELECT * INTO v_second FROM _hl WHERE id <> v_first.id LIMIT 1;
    RETURN QUERY SELECT
      CASE WHEN v_parishes = 1 THEN v_first.parish_id ELSE v_first.id END,
      CASE WHEN v_first.author = v_second.author
           THEN v_first.author || ' posted twice in ' || v_where
           ELSE v_first.author || ' and ' || v_second.author || ' posted in ' || v_where END;
  ELSE
    RETURN QUERY SELECT
      CASE WHEN v_parishes = 1 THEN v_first.parish_id ELSE v_first.id END,
      v_first.author || '''s post and ' || (v_total - 1) || ' more in ' || v_where || ' today';
  END IF;
END $function$;

REVOKE ALL ON FUNCTION community_highlight_for(uuid) FROM PUBLIC, anon, authenticated;
