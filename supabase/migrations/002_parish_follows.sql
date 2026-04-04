-- Migration 002: parish_follows
-- NOTE: Table already created in migration 001.
-- This file documents the schema separately for clarity.

-- CREATE TABLE parish_follows (
--   id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
--   parish_id  uuid NOT NULL REFERENCES parishes(id) ON DELETE CASCADE,
--   created_at timestamptz DEFAULT now(),
--   UNIQUE(user_id, parish_id)
-- );
--
-- Table, RLS, and indexes already applied in 001_initial_schema.sql.
-- No additional SQL needed.
SELECT 1; -- no-op to make this a valid migration file
