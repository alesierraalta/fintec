-- supabase/migrations/20260608143000_add_execute_due_recurring_transaction.sql

-- Create index to optimize the query for due recurring transactions
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_due
  ON public.recurring_transactions (next_execution_date, is_active)
  WHERE is_active = true;

-- PL/pgSQL function to atomically execute a due recurring transaction
CREATE OR REPLACE FUNCTION public.execute_due_recurring_transaction(
  p_recurring_transaction_id uuid,
  p_amount_base_minor bigint,
  p_exchange_rate numeric,
  p_execution_date date,
  p_next_execution_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec recurring_transactions%ROWTYPE;
  v_transaction_id uuid;
  v_balance_delta bigint;
BEGIN
  -- 1. Lock and read schedule
  SELECT * INTO v_rec
  FROM recurring_transactions
  WHERE id = p_recurring_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring transaction % not found', p_recurring_transaction_id;
  END IF;

  IF NOT v_rec.is_active THEN
    RAISE EXCEPTION 'Recurring transaction % is not active', p_recurring_transaction_id;
  END IF;

  -- 2. Insert standard transaction
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
    tags,
    is_debt
  ) VALUES (
    v_rec.type,
    v_rec.account_id,
    v_rec.category_id,
    v_rec.currency_code,
    v_rec.amount_minor,
    p_amount_base_minor,
    coalesce(p_exchange_rate, 1.0),
    p_execution_date,
    coalesce(v_rec.description, v_rec.name),
    v_rec.note,
    v_rec.tags,
    false
  ) RETURNING id INTO v_transaction_id;

  -- 3. Update account balance
  v_balance_delta := CASE
    WHEN v_rec.type IN ('INCOME', 'TRANSFER_IN') THEN v_rec.amount_minor
    ELSE -v_rec.amount_minor
  END;

  UPDATE accounts
  SET balance = balance + v_balance_delta,
      updated_at = now()
  WHERE id = v_rec.account_id;

  -- 4. Update the recurring transaction next execution date
  UPDATE recurring_transactions
  SET next_execution_date = p_next_execution_date,
      last_executed_at = now(),
      updated_at = now()
  WHERE id = p_recurring_transaction_id;

  RETURN v_transaction_id;
END;
$$;
