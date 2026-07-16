-- Hot query indexes (3/7): transfers.from_transaction_id
-- Transfers have no user_id/account_id; ownership and lookups resolve through
-- the linked transactions, so index the FK columns.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transfers_from_transaction
  ON public.transfers(from_transaction_id);
