-- Pending items: ultra-simple checklists for "things I still have to buy"
-- and "payments I know are coming". No dates, no recurrence — just a name
-- and an optional approximate amount in the user's base currency.
BEGIN;

CREATE TABLE IF NOT EXISTS pending_items (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind                     text NOT NULL CHECK (kind IN ('purchase', 'payment')),
  name                     text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  amount_base_minor        bigint CHECK (amount_base_minor IS NULL OR amount_base_minor > 0),
  done                     boolean NOT NULL DEFAULT false,
  done_at                  timestamptz,
  converted_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_items_user_done_created
  ON pending_items (user_id, done, created_at DESC);

-- FK index: keeps deletes/updates on transactions from scanning pending_items.
CREATE INDEX IF NOT EXISTS idx_pending_items_converted_transaction
  ON pending_items (converted_transaction_id);

ALTER TABLE pending_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pending items" ON pending_items;
DROP POLICY IF EXISTS "Users can insert own pending items" ON pending_items;
DROP POLICY IF EXISTS "Users can update own pending items" ON pending_items;
DROP POLICY IF EXISTS "Users can delete own pending items" ON pending_items;

CREATE POLICY "Users can view own pending items"
  ON pending_items FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own pending items"
  ON pending_items FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own pending items"
  ON pending_items FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own pending items"
  ON pending_items FOR DELETE
  USING ((select auth.uid()) = user_id);

COMMIT;
