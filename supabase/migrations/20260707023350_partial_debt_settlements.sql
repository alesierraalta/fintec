-- Phase 1: Foundation / Schema for Partial Debt Settlements

-- Add progress columns to transactions
ALTER TABLE transactions 
  ADD COLUMN debt_paid_amount_minor BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN debt_paid_amount_base_minor BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN debt_remaining_amount_minor BIGINT GENERATED ALWAYS AS (
    CASE WHEN is_debt THEN amount_minor - debt_paid_amount_minor ELSE 0 END
  ) STORED,
  ADD COLUMN debt_remaining_amount_base_minor BIGINT GENERATED ALWAYS AS (
    CASE WHEN is_debt THEN amount_base_minor - debt_paid_amount_base_minor ELSE 0 END
  ) STORED;

-- Constraints
ALTER TABLE transactions
  ADD CONSTRAINT check_debt_paid_positive CHECK (debt_paid_amount_minor >= 0 AND debt_paid_amount_base_minor >= 0),
  ADD CONSTRAINT check_debt_paid_max CHECK (
    NOT is_debt OR (debt_paid_amount_minor <= amount_minor AND debt_paid_amount_base_minor <= amount_base_minor)
  ),
  ADD CONSTRAINT check_non_debt_paid_zero CHECK (
    is_debt OR (debt_paid_amount_minor = 0 AND debt_paid_amount_base_minor = 0)
  );

-- Backfill existing debts
UPDATE transactions
SET 
  debt_paid_amount_minor = CASE WHEN debt_status = 'SETTLED' THEN amount_minor ELSE 0 END,
  debt_paid_amount_base_minor = CASE WHEN debt_status = 'SETTLED' THEN amount_base_minor ELSE 0 END
WHERE is_debt = true;

-- Add debt_settlements table
CREATE TABLE debt_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  settlement_transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  amount_base_minor BIGINT NOT NULL CHECK (amount_base_minor > 0),
  currency_code TEXT NOT NULL,
  debt_direction debt_direction NOT NULL,
  settled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for ledger
CREATE INDEX idx_debt_settlements_debt_id ON debt_settlements(debt_transaction_id, settled_at DESC);
CREATE INDEX idx_debt_settlements_user_id ON debt_settlements(user_id, settled_at DESC);

-- RLS
ALTER TABLE debt_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debt settlements" 
  ON debt_settlements FOR SELECT 
  USING (auth.uid() = user_id);

-- Remove permissive INSERT policy and only allow SELECT
-- CREATE POLICY "Users can insert own debt settlements" 
--   ON debt_settlements FOR INSERT 
--   WITH CHECK (auth.uid() = user_id);

-- Create the settlement RPC
CREATE OR REPLACE FUNCTION settle_debt_partial(
  p_debt_id UUID,
  p_account_id UUID,
  p_amount_minor BIGINT,
  p_date DATE,
  p_category_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_settled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_debt_row RECORD;
  v_account_row RECORD;
  v_amount_base_minor BIGINT;
  v_new_paid_minor BIGINT;
  v_new_paid_base BIGINT;
  v_new_status debt_status;
  v_settled_at TIMESTAMP WITH TIME ZONE;
  v_settlement_tx_id UUID;
  v_tx_type transaction_type;
BEGIN
  -- 1. Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Lock debt row
  SELECT * INTO v_debt_row
  FROM transactions
  WHERE id = p_debt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debt transaction not found';
  END IF;

  IF NOT v_debt_row.is_debt THEN
    RAISE EXCEPTION 'Transaction is not a debt';
  END IF;

  IF v_debt_row.debt_status = 'SETTLED' THEN
    RAISE EXCEPTION 'Debt is already settled';
  END IF;

  -- Verify ownership of debt via its account
  IF NOT EXISTS (
    SELECT 1 FROM accounts a WHERE a.id = v_debt_row.account_id AND a.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized to settle this debt';
  END IF;

  -- 3. Verify settlement account
  SELECT * INTO v_account_row
  FROM accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND OR v_account_row.user_id != v_user_id THEN
    RAISE EXCEPTION 'Settlement account not found or unauthorized';
  END IF;

  IF NOT v_account_row.active THEN
    RAISE EXCEPTION 'Settlement account is not active';
  END IF;

  IF v_account_row.currency_code != v_debt_row.currency_code THEN
    RAISE EXCEPTION 'Settlement account currency must match debt currency';
  END IF;

  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be positive';
  END IF;

  IF p_amount_minor > v_debt_row.debt_remaining_amount_minor THEN
    RAISE EXCEPTION 'Settlement amount exceeds remaining debt';
  END IF;

  -- Validate category ownership if provided
  IF p_category_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p_category_id AND (c.user_id = v_user_id OR c.is_default = true)) THEN
      RAISE EXCEPTION 'Category not found or unauthorized';
    END IF;
  END IF;

  -- 4. Compute base minor amount using original exchange rate
  v_amount_base_minor := ROUND(p_amount_minor / v_debt_row.exchange_rate);

  -- Determine transaction type for cash movement
  IF v_debt_row.debt_direction = 'OWED_TO_ME' THEN
    v_tx_type := 'INCOME';
  ELSE
    v_tx_type := 'EXPENSE';
  END IF;

  -- 5. Insert settlement transaction (non-debt cash movement)
  INSERT INTO transactions (
    type,
    account_id,
    category_id,
    currency_code,
    amount_minor,
    amount_base_minor,
    exchange_rate,
    date,
    description,
    note,
    is_debt
  ) VALUES (
    v_tx_type,
    p_account_id,
    p_category_id,
    v_debt_row.currency_code,
    p_amount_minor,
    v_amount_base_minor,
    v_debt_row.exchange_rate,
    COALESCE(p_date, CURRENT_DATE),
    'Debt Settlement',
    p_note,
    false
  ) RETURNING id INTO v_settlement_tx_id;

  -- 6. Update account balance
  IF v_tx_type = 'INCOME' THEN
    UPDATE accounts SET balance = balance + p_amount_minor WHERE id = p_account_id;
  ELSE
    UPDATE accounts SET balance = balance - p_amount_minor WHERE id = p_account_id;
  END IF;

  -- 7. Insert ledger row
  INSERT INTO debt_settlements (
    debt_transaction_id,
    settlement_transaction_id,
    user_id,
    account_id,
    amount_minor,
    amount_base_minor,
    currency_code,
    debt_direction,
    settled_at
  ) VALUES (
    p_debt_id,
    v_settlement_tx_id,
    v_user_id,
    p_account_id,
    p_amount_minor,
    v_amount_base_minor,
    v_debt_row.currency_code,
    v_debt_row.debt_direction,
    COALESCE(p_settled_at, NOW())
  );

  -- 8. Update debt paid amounts and status
  v_new_paid_minor := v_debt_row.debt_paid_amount_minor + p_amount_minor;
  v_new_paid_base := v_debt_row.debt_paid_amount_base_minor + v_amount_base_minor;

  IF v_new_paid_minor >= v_debt_row.amount_minor THEN
    v_new_status := 'SETTLED';
    v_settled_at := COALESCE(p_settled_at, NOW());
  ELSE
    v_new_status := 'OPEN';
    v_settled_at := NULL;
  END IF;

  UPDATE transactions
  SET
    debt_paid_amount_minor = v_new_paid_minor,
    debt_paid_amount_base_minor = v_new_paid_base,
    debt_status = v_new_status,
    settled_at = v_settled_at,
    updated_at = NOW()
  WHERE id = p_debt_id;

  -- Return the updated debt row
  SELECT row_to_json(t) INTO v_debt_row
  FROM (
    SELECT * FROM transactions WHERE id = p_debt_id
  ) t;

  RETURN v_debt_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
