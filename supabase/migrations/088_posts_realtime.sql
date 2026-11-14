-- 088: live feed — publish `posts` changes over Realtime
--
-- The client (src/lib/postLive.js) listens on one shared channel for:
--   UPDATE  like_count / comment_count (kept by the 038/047 triggers), edits,
--           soft deletes and moderation removals
--   INSERT  new posts, shown as a "new posts" pill
--   DELETE  hard deletes by the author
--
-- Realtime applies the posts SELECT policies to INSERT/UPDATE events per
-- subscriber, so nobody receives a post they couldn't already read. DELETE
-- events carry only the primary key (default replica identity).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
END $$;
