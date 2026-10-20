-- 046: btrim() only strips spaces, so newline/tab-only text passed the
-- "non-blank" checks in 045. Require at least one non-whitespace char.
ALTER TABLE direct_messages     DROP CONSTRAINT dm_content_len;
ALTER TABLE direct_messages     ADD  CONSTRAINT dm_content_len CHECK (char_length(content) <= 2000 AND content ~ '\S');
ALTER TABLE group_chat_messages DROP CONSTRAINT gcm_nonblank;
ALTER TABLE group_chat_messages ADD  CONSTRAINT gcm_nonblank   CHECK (content ~ '\S');
ALTER TABLE posts               DROP CONSTRAINT posts_nonblank;
ALTER TABLE posts               ADD  CONSTRAINT posts_nonblank CHECK (content ~ '\S' OR image_url IS NOT NULL);
ALTER TABLE comments            DROP CONSTRAINT comments_nonblank;
ALTER TABLE comments            ADD  CONSTRAINT comments_nonblank CHECK (content ~ '\S');
ALTER TABLE groups              DROP CONSTRAINT groups_name_len;
ALTER TABLE groups              ADD  CONSTRAINT groups_name_len CHECK (char_length(name) <= 80 AND name ~ '\S');
ALTER TABLE events              DROP CONSTRAINT events_title_len;
ALTER TABLE events              ADD  CONSTRAINT events_title_len CHECK (char_length(title) <= 150 AND title ~ '\S');
ALTER TABLE organizations       DROP CONSTRAINT orgs_name_len;
ALTER TABLE organizations       ADD  CONSTRAINT orgs_name_len CHECK (char_length(name) <= 120 AND name ~ '\S');
