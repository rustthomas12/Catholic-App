-- ============================================================
-- 031: group photo storage + correct group member counts
--
-- 1. The `groups` storage bucket was never created (only its policies
--    were), so photos chosen when creating a group silently failed to
--    upload. Create it, and tighten write access: previously any signed-in
--    user could overwrite or delete any group's image. Uploads now go to
--    group-avatars/<uploader id>/... and only the uploader can change them.
-- 2. Two triggers on group_members each incremented groups.member_count
--    and the column defaulted to 1, so a new group showed 3 members.
--    Keep one trigger, default to 0, and recount every group.
-- ============================================================

-- ── 1. Storage ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('groups', 'groups', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "groups: authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "groups: authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "groups: authenticated delete" ON storage.objects;

CREATE POLICY "groups: owner insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'groups'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'group-avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "groups: owner update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'groups'
    AND (storage.foldername(name))[1] = 'group-avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "groups: owner delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'groups'
    AND (storage.foldername(name))[1] = 'group-avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ── 2. Member counts ───────────────────────────────────────
DROP TRIGGER IF EXISTS trg_group_member_count ON group_members;   -- duplicate (sync_group_member_count)
DROP FUNCTION IF EXISTS sync_group_member_count();

ALTER TABLE groups ALTER COLUMN member_count SET DEFAULT 0;

UPDATE groups g
SET member_count = (SELECT count(*) FROM group_members m WHERE m.group_id = g.id);

-- ── 3. Lock down unused count helpers ──────────────────────
-- SECURITY DEFINER and executable by anyone (even signed out) via
-- /rest/v1/rpc, letting any caller inflate or zero any group's count.
-- The app never calls them; the trigger above maintains the count.
REVOKE EXECUTE ON FUNCTION increment_member_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION decrement_member_count(uuid) FROM PUBLIC, anon, authenticated;
