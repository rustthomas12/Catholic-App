-- 094: provisional parish admins
--
-- A pastor who signs up gets a parish_admins row with role 'pending' right
-- away, so the parish page and dashboard work during the free trial. What a
-- pending admin can do is limited in migration 095 (Postgres can't use a new
-- enum value in the same transaction that adds it).

ALTER TYPE parish_admin_role ADD VALUE IF NOT EXISTS 'pending';
