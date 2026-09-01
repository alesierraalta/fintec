-- Fix users upsert overwriting created_at
-- The application upsert previously included created_at on every login,
-- causing existing users (including admin) to appear as newly created each day.
-- This migration restores the original created_at from auth.users for rows
-- that were incorrectly overwritten to today, and documents the intended
-- behavior: created_at should only be set on insert, not on update.

-- Restore created_at from auth.users where public.users was incorrectly
-- overwritten to today (heuristic: where public.users.created_at::date = CURRENT_DATE
-- and differs from auth.users.created_at). This is safe to run even if no rows match.
UPDATE public.users AS u
SET created_at = a.created_at
FROM auth.users AS a
WHERE u.id = a.id
  AND u.created_at::date = CURRENT_DATE
  AND u.created_at IS DISTINCT FROM a.created_at;

-- Ensure future upserts in application code do not include created_at;
-- no DB trigger change needed, but keep this migration as documentation.
