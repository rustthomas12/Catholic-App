-- ============================================================
-- 049: storage bucket limits
-- avatars and posts had no size limit and accepted any MIME type, so
-- anyone signed in could upload huge files or HTML/SVG with script and
-- use the public buckets as file hosting. Match the app's client limits
-- (src/utils/storage.js): avatars 2 MB, post images 5 MB, raster images.
-- ============================================================
UPDATE storage.buckets SET file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'avatars';
UPDATE storage.buckets SET file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'posts';
