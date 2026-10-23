-- 064: the parish dashboard's Messages tab never showed any message.
-- It loads sender:profiles!sender_id(...), but parish_messages.sender_id
-- only referenced auth.users, so PostgREST found no relationship and the
-- whole query failed ("No messages yet"). Add the profiles FK.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'parish_messages_sender_profile_fkey') THEN
    ALTER TABLE parish_messages
      ADD CONSTRAINT parish_messages_sender_profile_fkey
      FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
