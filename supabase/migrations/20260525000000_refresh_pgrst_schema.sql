-- Refresh PostgREST schema cache so create_transfer RPC is discoverable.
-- Run after any migration that creates or modifies a PostgREST RPC function.
-- Idempotent: safe to run multiple times.
NOTIFY pgrst, 'reload schema';
