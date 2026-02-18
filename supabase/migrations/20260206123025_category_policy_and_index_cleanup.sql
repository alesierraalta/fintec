-- Cleanup overlapping category policies and duplicate index
-- Keeps secure category_* policies as the source of truth.

BEGIN;

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;

DROP INDEX IF EXISTS idx_categories_user_kind;

COMMIT;
