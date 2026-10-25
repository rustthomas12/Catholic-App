-- ============================================================
-- 075: chapters created from the org dashboard were saved with category
-- 'other' (lowercase), which no category filter or settings menu offers
-- ('Other'), so they never appeared under a filter. Chapters now take their
-- parent's category; this fixes the ones already created.
-- ============================================================

UPDATE organizations c
SET category = p.category
FROM organizations p
WHERE c.parent_org_id = p.id
  AND c.category = 'other'
  AND p.category IS NOT NULL;

UPDATE organizations SET category = 'Other' WHERE category = 'other';
