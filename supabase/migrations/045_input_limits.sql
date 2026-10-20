-- ============================================================
-- 045: server-side input limits
--
-- Only posts/comments/prayer requests/group chat had length limits.
-- Anyone calling the API directly could store multi-megabyte DMs, parish
-- messages, names, bios, group/event/org text, blank posts, duplicate
-- blocks, and usernames the app itself would reject. Limits mirror the
-- app's form maxLengths (with headroom where the app has none).
-- ============================================================

ALTER TABLE direct_messages  ADD CONSTRAINT dm_content_len      CHECK (char_length(content) BETWEEN 1 AND 2000 AND btrim(content) <> '');
ALTER TABLE parish_messages  ADD CONSTRAINT pm_body_len         CHECK (char_length(coalesce(body, '')) <= 5000);
ALTER TABLE parish_messages  ADD CONSTRAINT pm_subject_len      CHECK (char_length(coalesce(subject, '')) <= 200);
ALTER TABLE group_chat_messages ADD CONSTRAINT gcm_nonblank     CHECK (btrim(content) <> '');

ALTER TABLE posts    ADD CONSTRAINT posts_nonblank     CHECK (btrim(content) <> '' OR image_url IS NOT NULL);
ALTER TABLE comments ADD CONSTRAINT comments_nonblank  CHECK (btrim(content) <> '');

ALTER TABLE profiles ADD CONSTRAINT profiles_full_name_len CHECK (char_length(coalesce(full_name, '')) <= 50);
ALTER TABLE profiles ADD CONSTRAINT profiles_bio_len       CHECK (char_length(coalesce(bio, '')) <= 160);
-- Deleted accounts are renamed deleted-<id> by api/delete-account
ALTER TABLE profiles ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR deleted_at IS NOT NULL OR username ~ '^[a-z0-9_]{3,20}$');

ALTER TABLE groups ADD CONSTRAINT groups_name_len CHECK (char_length(name) BETWEEN 1 AND 80 AND btrim(name) <> '');
ALTER TABLE groups ADD CONSTRAINT groups_desc_len CHECK (char_length(coalesce(description, '')) <= 500);

ALTER TABLE events ADD CONSTRAINT events_title_len CHECK (char_length(title) BETWEEN 1 AND 150 AND btrim(title) <> '');
ALTER TABLE events ADD CONSTRAINT events_desc_len  CHECK (char_length(coalesce(description, '')) <= 5000);

ALTER TABLE organizations ADD CONSTRAINT orgs_name_len CHECK (char_length(name) BETWEEN 1 AND 120 AND btrim(name) <> '');
ALTER TABLE organizations ADD CONSTRAINT orgs_desc_len CHECK (char_length(coalesce(description, '')) <= 2000);

ALTER TABLE user_blocks ADD CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id);
ALTER TABLE events ADD CONSTRAINT events_time_order CHECK (end_time IS NULL OR end_time >= start_time);
