-- 100: fix 099's flag handling (post_flags.reason is the flag_reason enum)
--
-- notify_parish_moderators_of_flag() did coalesce(NEW.reason, 'no reason
-- given'), which casts the text to flag_reason and fails, so every report on
-- a parish post errored and wasn't saved. parish_flag_queue() returned
-- flag_reason[] where text[] is declared. Both cast to text now.

CREATE OR REPLACE FUNCTION notify_parish_moderators_of_flag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p posts%ROWTYPE; parish_name text;
BEGIN
  SELECT * INTO p FROM posts WHERE id = NEW.post_id;
  IF p.parish_id IS NULL OR p.group_id IS NOT NULL OR p.org_id IS NOT NULL THEN RETURN NULL; END IF;
  SELECT name INTO parish_name FROM parishes WHERE id = p.parish_id;
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT m.user_id, 'parish_post_flagged', p.parish_id,
         left('A post in ' || coalesce(parish_name, 'your parish') || ' was reported: ' || coalesce(NEW.reason::text, 'no reason given'), 300),
         NULL, false
    FROM (
      SELECT user_id FROM parish_admins WHERE parish_id = p.parish_id AND role <> 'pending'
      UNION
      SELECT user_id FROM parish_moderators WHERE parish_id = p.parish_id
    ) m
   WHERE m.user_id <> NEW.user_id AND m.user_id <> p.author_id;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION parish_flag_queue(p_parish_id uuid)
RETURNS TABLE (post_id uuid, content text, image_url text, is_removed boolean, post_created_at timestamptz,
               author_id uuid, author_name text, flag_count bigint, reasons text[], last_flagged_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT can_moderate_parish(p_parish_id) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.content, p.image_url, p.is_removed, p.created_at, p.author_id, pr.full_name,
           count(f.id), array_agg(DISTINCT f.reason::text), max(f.created_at)
      FROM post_flags f
      JOIN posts p ON p.id = f.post_id
      LEFT JOIN profiles pr ON pr.id = p.author_id
     WHERE p.parish_id = p_parish_id AND p.group_id IS NULL AND p.org_id IS NULL
       AND p.deleted_at IS NULL AND f.is_resolved IS NOT TRUE
     GROUP BY p.id, pr.full_name
     ORDER BY max(f.created_at) DESC
     LIMIT 100;
END $$;
