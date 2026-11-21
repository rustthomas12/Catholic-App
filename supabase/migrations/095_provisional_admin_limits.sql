-- 095: limit what a provisional (pending) parish admin can do
--
-- Pending admins (migration 094) can set up the parish: edit the parish page
-- and Mass times (parishes UPDATE policy, unchanged) and see Billing
-- (parish_subscriptions SELECT, unchanged). Until a platform admin verifies
-- them they can NOT:
--   * post announcements, schedule posts, or manage events
--     (posts INSERT policy, can_admin_post_target, can_manage_event_target)
--   * push to followers (notify_parish_announcement ignores them)
--   * read followers or parishioner messages, or get notified of them
--     (parish_follows / parish_messages policies, notify_parish_admins_of_*)
--   * connect integrations (parish_integrations / integration_logs policies)
-- parish_is_managed() still counts them, so nobody else can claim the parish
-- while it is being verified. Bodies start from the live definitions
-- (068/092 for notify_parish_announcement).

CREATE OR REPLACE FUNCTION is_verified_parish_admin(p_parish_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM parish_admins
     WHERE parish_id = p_parish_id AND user_id = auth.uid() AND role <> 'pending')
$$;
REVOKE EXECUTE ON FUNCTION is_verified_parish_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_verified_parish_admin(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_admin_post_target(p_parish_id uuid, p_group_id uuid, p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT is_platform_admin() OR (
        (p_parish_id IS NOT NULL OR p_group_id IS NOT NULL OR p_org_id IS NOT NULL)
    AND (p_parish_id IS NULL OR is_verified_parish_admin(p_parish_id))
    AND (p_group_id  IS NULL OR is_group_admin(p_group_id))
    AND (p_org_id    IS NULL OR is_org_admin(p_org_id))
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_event_target(p_parish_id uuid, p_group_id uuid, p_org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin)
    OR (
      (p_parish_id IS NOT NULL OR p_group_id IS NOT NULL OR p_org_id IS NOT NULL)
      AND (p_parish_id IS NULL OR is_verified_parish_admin(p_parish_id))
      AND (p_group_id IS NULL OR EXISTS (
            SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = auth.uid() AND role = 'admin'))
      AND (p_org_id IS NULL OR EXISTS (
            SELECT 1 FROM organization_members WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'admin'))
    );
$function$;

CREATE OR REPLACE FUNCTION public.notify_parish_announcement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

DECLARE parish_name text; headline text; author_name text; by_leader boolean;

BEGIN

  IF NEW.parish_id IS NULL OR NEW.deleted_at IS NOT NULL OR coalesce(NEW.is_removed, false) THEN

    RETURN NULL;

  END IF;



  IF NOT NEW.is_announcement THEN

    -- Only plain parish posts by the parish's clergy or staff

    IF NEW.group_id IS NOT NULL OR NEW.org_id IS NOT NULL THEN RETURN NULL; END IF;

    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.author_id AND is_verified_clergy)

        OR EXISTS (SELECT 1 FROM parish_admins WHERE parish_id = NEW.parish_id AND user_id = NEW.author_id
                     AND role <> 'pending')

      INTO by_leader;

    IF NOT by_leader THEN RETURN NULL; END IF;

  END IF;



  SELECT name INTO parish_name FROM parishes WHERE id = NEW.parish_id;

  -- Dashboard announcements are "Title\n\nBody"; lead with the first line

  headline := split_part(NEW.content, E'\n', 1);



  IF NEW.is_announcement THEN

    INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)

    SELECT f.user_id, 'parish_post', NEW.id,

           left(coalesce(parish_name, 'Your parish') || ': ' || coalesce(nullif(headline, ''), NEW.content), 300),

           NEW.author_id, false

    FROM parish_follows f

    WHERE f.parish_id = NEW.parish_id AND f.user_id IS DISTINCT FROM NEW.author_id;

  ELSE

    SELECT full_name INTO author_name FROM profiles WHERE id = NEW.author_id;

    INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)

    SELECT f.user_id, 'parish_post', NEW.id,

           left(coalesce(author_name, 'Your parish') || ' posted in ' || coalesce(parish_name, 'your parish') || ': '

                || coalesce(nullif(btrim(headline), ''), nullif(btrim(NEW.content), ''), 'a photo'), 300),

           NEW.author_id, false

    FROM parish_follows f

    WHERE f.parish_id = NEW.parish_id AND f.user_id IS DISTINCT FROM NEW.author_id;

  END IF;

  RETURN NULL;

END $function$;

CREATE OR REPLACE FUNCTION public.notify_parish_admins_of_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  follower_name text;
BEGIN
  SELECT full_name INTO follower_name FROM profiles WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT pa.user_id, 'new_parish_member', NEW.parish_id,
         coalesce(follower_name, 'Someone') || ' is now following your parish',
         NEW.user_id, false
  FROM parish_admins pa
  WHERE pa.parish_id = NEW.parish_id AND pa.user_id <> NEW.user_id AND pa.role <> 'pending';
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_parish_admins_of_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sender_name text;
BEGIN
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  INSERT INTO notifications (user_id, type, reference_id, message, actor_id, is_read)
  SELECT pa.user_id, 'parish_message', NEW.parish_id,
         coalesce(sender_name, 'Someone') || ' sent your parish a message'
           || coalesce(': ' || nullif(left(NEW.subject, 60), ''), ''),
         NEW.sender_id, false
  FROM parish_admins pa
  WHERE pa.parish_id = NEW.parish_id AND pa.user_id <> NEW.sender_id AND pa.role <> 'pending';
  RETURN NULL;
END;
$function$;

-- ── Policies ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Parish admins can read messages" ON parish_messages;
CREATE POLICY "Parish admins can read messages" ON parish_messages
  FOR SELECT USING (is_verified_parish_admin(parish_id));

DROP POLICY IF EXISTS "Parish admins can update messages" ON parish_messages;
CREATE POLICY "Parish admins can update messages" ON parish_messages
  FOR UPDATE USING (is_verified_parish_admin(parish_id));

DROP POLICY IF EXISTS "Parish admins can read their parish followers" ON parish_follows;
CREATE POLICY "Parish admins can read their parish followers" ON parish_follows
  FOR SELECT USING (is_verified_parish_admin(parish_id));

DROP POLICY IF EXISTS "Parish admins manage integrations" ON parish_integrations;
CREATE POLICY "Parish admins manage integrations" ON parish_integrations
  FOR ALL USING (is_verified_parish_admin(parish_id))
  WITH CHECK (is_verified_parish_admin(parish_id));

DROP POLICY IF EXISTS "Parish admins read own integration logs" ON integration_logs;
CREATE POLICY "Parish admins read own integration logs" ON integration_logs
  FOR SELECT USING (is_verified_parish_admin(parish_id));

-- Same as before except the announcement check (was any parish_admins row)
DROP POLICY IF EXISTS "Users can create posts" ON posts;
CREATE POLICY "Users can create posts" ON posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.suspended_at IS NOT NULL)
    AND (group_id IS NULL OR is_group_member(group_id))
    AND (org_id IS NULL OR is_org_member(org_id))
    AND (
      NOT COALESCE(is_announcement, false)
      OR (parish_id IS NOT NULL AND is_verified_parish_admin(parish_id))
      OR (org_id IS NOT NULL AND is_org_admin(org_id))
      OR is_platform_admin()
    )
  );

-- ── Backfill ──────────────────────────────────────────────────
-- Applicants already waiting get the provisional dashboard too, when nobody
-- manages their parish yet
INSERT INTO parish_admins (parish_id, user_id, role)
SELECT p.pending_pastor_parish_id, p.id, 'pending'
  FROM profiles p
 WHERE p.pending_pastor_parish_id IS NOT NULL
   AND p.deleted_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM parish_admins pa WHERE pa.parish_id = p.pending_pastor_parish_id)
ON CONFLICT (parish_id, user_id) DO NOTHING;
