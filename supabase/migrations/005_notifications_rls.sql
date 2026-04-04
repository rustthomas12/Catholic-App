-- Migration 005: Allow authenticated users to INSERT notifications
-- Required for cross-user notifications (likes, comments) created client-side.
-- Without this policy, createNotification() fails silently due to RLS.

CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
