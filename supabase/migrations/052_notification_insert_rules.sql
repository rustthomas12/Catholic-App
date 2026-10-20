-- ============================================================
-- 052: who may create which notification
--
-- "Authenticated users can notify others" only required actor_id = me, so
-- anyone could send anyone a notification of ANY type with ANY text —
-- e.g. a fake "🚩 Post reported" / "✅ You're verified" with a phishing
-- link — and it was pushed to their devices. Each client-created type now
-- needs the real relationship behind it; other types (reminders, parish
-- messages, follows, chapter requests) only come from server triggers.
-- Platform admins may send any type.
-- ============================================================

CREATE OR REPLACE FUNCTION can_send_notification(p_recipient uuid, p_type text, p_ref uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = me AND is_admin) THEN RETURN true; END IF;
  IF p_recipient = me THEN RETURN false; END IF;

  RETURN CASE p_type
    WHEN 'like' THEN EXISTS (
      SELECT 1 FROM posts p JOIN likes l ON l.post_id = p.id AND l.user_id = me
      WHERE p.id = p_ref AND p.author_id = p_recipient)
    WHEN 'comment' THEN EXISTS (
      SELECT 1 FROM posts p WHERE p.id = p_ref AND p.author_id = p_recipient
        AND EXISTS (SELECT 1 FROM comments c WHERE c.post_id = p.id AND c.author_id = me))
    WHEN 'direct_message' THEN EXISTS (
      SELECT 1 FROM direct_messages d WHERE d.sender_id = me AND d.recipient_id = p_recipient
        AND d.created_at > now() - interval '10 minutes')
    WHEN 'prayer_response' THEN EXISTS (
      SELECT 1 FROM prayer_requests r WHERE r.id = p_ref AND r.author_id = p_recipient
        AND EXISTS (SELECT 1 FROM prayer_responses x WHERE x.prayer_request_id = r.id AND x.user_id = me))
    WHEN 'group_post' THEN EXISTS (
      SELECT 1 FROM posts p JOIN group_members gm ON gm.group_id = p.group_id
      WHERE p.id = p_ref AND p.author_id = me AND gm.user_id = p_recipient AND gm.role = 'admin')
    WHEN 'new_group_member' THEN
      EXISTS (SELECT 1 FROM group_members WHERE group_id = p_ref AND user_id = me)
      AND EXISTS (SELECT 1 FROM group_members WHERE group_id = p_ref AND user_id = p_recipient AND role = 'admin')
    WHEN 'group_request' THEN
      EXISTS (SELECT 1 FROM group_join_requests WHERE group_id = p_ref AND user_id = me AND status = 'pending')
      AND EXISTS (SELECT 1 FROM group_members WHERE group_id = p_ref AND user_id = p_recipient AND role = 'admin')
    WHEN 'group_request_response' THEN
      EXISTS (SELECT 1 FROM group_members WHERE group_id = p_ref AND user_id = me AND role = 'admin')
      AND EXISTS (SELECT 1 FROM group_join_requests WHERE group_id = p_ref AND user_id = p_recipient)
    WHEN 'new_org_member' THEN
      EXISTS (SELECT 1 FROM organization_members WHERE org_id = p_ref AND user_id = me)
      AND EXISTS (SELECT 1 FROM organization_members WHERE org_id = p_ref AND user_id = p_recipient AND role = 'admin')
    WHEN 'parish_post' THEN EXISTS (
      SELECT 1 FROM posts p WHERE p.id = p_ref AND p.author_id = me AND p.is_announcement)
    WHEN 'post_flagged' THEN
      EXISTS (SELECT 1 FROM profiles WHERE id = p_recipient AND is_admin)
      AND EXISTS (SELECT 1 FROM post_flags WHERE post_id = p_ref AND user_id = me)
    WHEN 'chapter_request_resolved' THEN EXISTS (
      SELECT 1 FROM chapter_requests cr
      JOIN organization_members m ON m.org_id = cr.target_national_org_id AND m.user_id = me AND m.role = 'admin'
      WHERE cr.requesting_org_id = p_ref AND cr.requested_by = p_recipient)
    ELSE false
  END;
END $$;
REVOKE EXECUTE ON FUNCTION can_send_notification(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION can_send_notification(uuid, text, uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can notify others" ON notifications;
CREATE POLICY "Authenticated users can notify others" ON notifications FOR INSERT WITH CHECK (
  auth.uid() = actor_id
  AND char_length(coalesce(message, '')) <= 300
  AND can_send_notification(user_id, type::text, reference_id)
);
