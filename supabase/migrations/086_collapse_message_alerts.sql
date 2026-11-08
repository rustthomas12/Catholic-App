-- ============================================================
-- 086: one "sent you a message" alert per conversation until it's read;
--      blocked people leave your conversation list
-- Every direct message created its own notification, so a burst of five
-- quick messages meant five alerts and five pushes. While an unread
-- message alert from the same person is still waiting, further ones are
-- dropped; opening the conversation marks it read (client), so the next
-- message alerts again.
-- ============================================================

CREATE OR REPLACE FUNCTION drop_repeat_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type::text IN ('like', 'prayer_response', 'new_parish_member', 'new_group_member',
                        'new_org_member', 'group_request')
     AND NEW.actor_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM notifications n
       WHERE n.user_id = NEW.user_id
         AND n.actor_id = NEW.actor_id
         AND n.type = NEW.type
         AND n.reference_id IS NOT DISTINCT FROM NEW.reference_id
         AND n.created_at > now() - interval '24 hours')
  THEN
    RETURN NULL;
  END IF;

  IF NEW.type::text = 'direct_message'
     AND NEW.actor_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM notifications n
       WHERE n.user_id = NEW.user_id
         AND n.actor_id = NEW.actor_id
         AND n.type = 'direct_message'
         AND NOT n.is_read)
  THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION drop_repeat_notifications() FROM PUBLIC, anon, authenticated;

-- Conversations with someone you've blocked leave your list (their messages
-- were already hidden, leaving a thread of only your own). Unblocking
-- brings it back.
CREATE OR REPLACE FUNCTION my_conversations()
RETURNS TABLE(partner_id uuid, id uuid, sender_id uuid, recipient_id uuid,
              content text, is_read boolean, created_at timestamptz)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM (
    SELECT DISTINCT ON (partner)
      CASE WHEN m.sender_id = auth.uid() THEN m.recipient_id ELSE m.sender_id END AS partner,
      m.id, m.sender_id, m.recipient_id, m.content, m.is_read, m.created_at
    FROM direct_messages m
    WHERE m.sender_id = auth.uid() OR m.recipient_id = auth.uid()
    ORDER BY partner, m.created_at DESC
  ) latest
  WHERE NOT EXISTS (SELECT 1 FROM user_blocks b
                    WHERE b.blocker_id = auth.uid() AND b.blocked_id = latest.partner)
  ORDER BY latest.created_at DESC
  LIMIT 200
$$;
