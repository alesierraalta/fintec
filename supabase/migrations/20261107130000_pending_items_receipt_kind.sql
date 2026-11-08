-- Pending items gain the 'receipt' kind (#117): an expense the user already
-- made but has not priced yet ("hice 3 gastos, te paso los tickets"). It
-- stays pending until a receipt photo is matched to it. Additive: existing
-- 'purchase' and 'payment' rows are untouched.
BEGIN;

ALTER TABLE pending_items DROP CONSTRAINT IF EXISTS pending_items_kind_check;
ALTER TABLE pending_items
  ADD CONSTRAINT pending_items_kind_check
  CHECK (kind IN ('purchase', 'payment', 'receipt'));

COMMIT;
