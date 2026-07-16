-- Fix JSON return type serialization in settle_debt_partial.
--
-- The original RPC stored the result of row_to_json() into a RECORD variable
-- (v_debt_row), then returned that RECORD as JSON. PostgreSQL's implicit cast
-- from RECORD to JSON wraps the value in parentheses: "(json_value)" which is
-- not valid JSON syntax, causing error 22P02 (Token "(" is invalid).
--
-- Fix: declare a dedicated JSON variable for the result and return it directly.
--
-- This also fixes the VES base-minor rounding drift (see 20260714010000).

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
  v_tx_type VARCHAR(20);
  v_result JSON;
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

  -- 4. Compute base minor amount for THIS payment using the original exchange rate
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

  -- 8. Update debt paid amounts and status.
  --    Derive the cumulative paid base from the remaining minor amount (rather
  --    than accumulating per-payment ROUND()s) so remaining base is exactly 0
  --    when the debt is fully paid and paid base never exceeds amount_base_minor.
  v_new_paid_minor := v_debt_row.debt_paid_amount_minor + p_amount_minor;
  v_new_paid_base :=
    v_debt_row.amount_base_minor
    - ROUND((v_debt_row.amount_minor - v_new_paid_minor) / v_debt_row.exchange_rate);

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

  -- 9. Return updated debt row as JSON directly (not via RECORD to avoid
  --    implicit cast that wraps the result in parentheses).
  SELECT row_to_json(t) INTO v_result
  FROM (SELECT * FROM transactions WHERE id = p_debt_id) t;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
