-- Phase 3 Task 3.2: Backend Resource Optimization - Strategic Index Additions
-- Purpose: add only the advisor-backed foreign-key indexes that are still
-- missing in the live schema snapshot.
--
-- IMPORTANT: no explicit BEGIN/COMMIT block here because CREATE INDEX
-- CONCURRENTLY cannot run inside a transaction block.
--
-- Skipped on purpose:
-- - transactions(account_id, date desc, created_at desc): already covered by
--   idx_transactions_account_date in the live schema.
-- - categories/accounts/recurring_transactions composites: already covered.
-- - exchange_rates(base_currency, quote_currency, date desc): not safe because
--   the current exchange_rates schema does not have those columns.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_checkpoints_user_id
  ON public.agent_checkpoints(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversation_messages_session_id
  ON public.ai_conversation_messages(session_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_orders_reviewed_by
  ON public.payment_orders(reviewed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_orders_transaction_id
  ON public.payment_orders(transaction_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_to_transaction_id
  ON public.transfers(to_transaction_id);

ANALYZE public.agent_checkpoints;
ANALYZE public.ai_conversation_messages;
ANALYZE public.payment_orders;
ANALYZE public.transfers;
