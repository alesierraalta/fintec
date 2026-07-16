-- Drop the duplicate transfers(to_transaction_id) index accidentally created
-- by the earlier revision of 20260528120003_hot_idx_transfers_to.sql. The
-- pre-existing idx_transfers_to_transaction_id (202604081614) remains and
-- keeps serving reads. Single-statement file: DROP INDEX CONCURRENTLY cannot
-- share the Supabase CLI statement pipeline with other statements.
drop index concurrently if exists public.idx_transfers_to_transaction;
