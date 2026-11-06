-- ============================================================
-- 080: messages — who you can write to, and your conversation list
--
-- 1. my_message_contacts(): people you can start a conversation with
-- The New Message picker found fellow parishioners by filtering
-- profiles.parish_id, which signed-in users can no longer read (054), and
-- other people's parish_follows rows are private. The parish lookup failed
-- silently, so only group and organization co-members were listed.
-- This returns the same people shares_community() (053) recognizes:
-- a shared home or followed parish, group or organization. Blocked users
-- (either direction), deleted and suspended accounts are left out.
-- ============================================================

CREATE OR REPLACE FUNCTION public.my_message_contacts()
RETURNS TABLE (id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  my_parishes AS (
    SELECT parish_id FROM profiles, me WHERE profiles.id = me.uid AND parish_id IS NOT NULL
    UNION SELECT parish_id FROM parish_follows, me WHERE user_id = me.uid
  ),
  contacts AS (
    SELECT p.id FROM profiles p WHERE p.parish_id IN (SELECT parish_id FROM my_parishes)
    UNION SELECT f.user_id FROM parish_follows f WHERE f.parish_id IN (SELECT parish_id FROM my_parishes)
    UNION SELECT y.user_id FROM group_members x JOIN group_members y USING (group_id), me WHERE x.user_id = me.uid
    UNION SELECT y.user_id FROM organization_members x JOIN organization_members y USING (org_id), me WHERE x.user_id = me.uid
  )
  SELECT p.id, p.full_name, p.avatar_url
  FROM profiles p, me
  WHERE p.id IN (SELECT id FROM contacts)
    AND p.id <> me.uid
    AND p.deleted_at IS NULL
    AND p.suspended_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM user_blocks b
                    WHERE (b.blocker_id = me.uid AND b.blocked_id = p.id)
                       OR (b.blocker_id = p.id AND b.blocked_id = me.uid))
  ORDER BY p.full_name
  LIMIT 500
$$;

REVOKE EXECUTE ON FUNCTION public.my_message_contacts() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.my_message_contacts() TO authenticated;

-- ── The conversation list: newest message with each person ──
-- The list read your newest 200 messages and grouped them by person, so a
-- long back-and-forth with one person pushed other conversations off it.
-- SECURITY INVOKER: the direct_messages policies still apply.
CREATE OR REPLACE FUNCTION public.my_conversations()
RETURNS TABLE (partner_id uuid, id uuid, sender_id uuid, recipient_id uuid,
               content text, is_read boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (partner)
      CASE WHEN m.sender_id = auth.uid() THEN m.recipient_id ELSE m.sender_id END AS partner,
      m.id, m.sender_id, m.recipient_id, m.content, m.is_read, m.created_at
    FROM direct_messages m
    WHERE m.sender_id = auth.uid() OR m.recipient_id = auth.uid()
    ORDER BY partner, m.created_at DESC
  ) latest
  ORDER BY latest.created_at DESC
  LIMIT 200
$$;

REVOKE EXECUTE ON FUNCTION public.my_conversations() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.my_conversations() TO authenticated;
