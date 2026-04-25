-- Migration 012: Group chat messages
-- Real-time chat within groups (distinct from the structured post feed).
-- Messages are ephemeral — no edit/delete history, soft-delete only via is_deleted flag.

CREATE TABLE IF NOT EXISTS group_chat_messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) <= 2000),
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for pagination queries (newest first per group)
CREATE INDEX ON group_chat_messages (group_id, created_at DESC);
CREATE INDEX ON group_chat_messages (user_id);

ALTER TABLE group_chat_messages ENABLE ROW LEVEL SECURITY;

-- Group members can read chat
CREATE POLICY "Group members can read chat"
  ON group_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_chat_messages.group_id
        AND user_id = auth.uid()
    )
  );

-- Group members can send messages
CREATE POLICY "Group members can send messages"
  ON group_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_chat_messages.group_id
        AND user_id = auth.uid()
    )
  );

-- Users can soft-delete their own messages (admins via app logic)
CREATE POLICY "Users can delete their own messages"
  ON group_chat_messages FOR UPDATE
  USING (auth.uid() = user_id);
