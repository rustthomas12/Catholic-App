# Storage Bucket Setup

Run these steps in Supabase Dashboard → Storage before testing image uploads.
See also: src/utils/storage.js for the upload functions.

## Create Buckets

1. Create bucket: `avatars`
   - Public: YES
   - File size limit: 2 MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

2. Create bucket: `posts`
   - Public: YES
   - File size limit: 5 MB
   - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

## Storage RLS Policies

Run in SQL Editor (Supabase Dashboard → SQL Editor):

```sql
-- Avatars: users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Posts: authenticated users can upload
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');
```

## CORS (for Vercel)

In Supabase Dashboard → Storage → Policies, ensure your live Vercel URL
(e.g. https://catholic-app-eta.vercel.app) is allowed to access storage.
This is typically handled automatically for public buckets.
