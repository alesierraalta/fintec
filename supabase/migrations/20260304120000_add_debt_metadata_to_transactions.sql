-- Phase 1.1: debt metadata schema baseline
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'debt_direction'
  ) THEN
    CREATE TYPE public.debt_direction AS ENUM ('OWE', 'OWED_TO_ME');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'debt_status'
  ) THEN
    CREATE TYPE public.debt_status AS ENUM ('OPEN', 'SETTLED');
  END IF;
END
$$;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_debt boolean,
  ADD COLUMN IF NOT EXISTS debt_direction public.debt_direction,
  ADD COLUMN IF NOT EXISTS debt_status public.debt_status,
  ADD COLUMN IF NOT EXISTS counterparty_name text,
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

ALTER TABLE public.transactions
  ALTER COLUMN is_debt SET DEFAULT false;

UPDATE public.transactions
SET is_debt = false
WHERE is_debt IS NULL;

ALTER TABLE public.transactions
  ALTER COLUMN is_debt SET NOT NULL;

UPDATE public.transactions
SET debt_status = 'OPEN'
WHERE is_debt = true
  AND debt_status IS NULL;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_debt_direction_required,
  ADD CONSTRAINT transactions_debt_direction_required CHECK (
    (is_debt = false AND debt_direction IS NULL)
    OR (is_debt = true AND debt_direction IS NOT NULL)
  );

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_settled_requires_settled_at,
  ADD CONSTRAINT transactions_settled_requires_settled_at CHECK (
    debt_status IS DISTINCT FROM 'SETTLED'
    OR settled_at IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_transactions_debt_open
  ON public.transactions (account_id, debt_direction, date DESC)
  WHERE is_debt = true AND coalesce(debt_status, 'OPEN') = 'OPEN';

-- Phase 1.2: backward-compatible RPC signature update
-- Related RPCs were not found in repository migration history for debt metadata,
-- so only create_transaction_and_adjust_balance is updated here.
CREATE OR REPLACE FUNCTION public.create_transaction_and_adjust_balance(
  p_account_id uuid,
  p_category_id uuid,
  p_type text,
  p_currency_code text,
  p_amount_minor bigint,
  p_amount_base_minor bigint,
  p_exchange_rate numeric,
  p_date date,
  p_description text,
  p_note text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_is_debt boolean DEFAULT false,
  p_debt_direction public.debt_direction DEFAULT NULL,
  p_debt_status public.debt_status DEFAULT NULL,
  p_counterparty_name text DEFAULT NULL,
  p_settled_at timestamptz DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  created_transaction public.transactions;
  balance_delta bigint;
BEGIN
  IF p_is_debt = true AND p_debt_direction IS NULL THEN
    RAISE EXCEPTION 'debt_direction is required when is_debt=true';
  END IF;

  IF p_debt_status = 'SETTLED' AND p_settled_at IS NULL THEN
    RAISE EXCEPTION 'settled_at is required when debt_status=SETTLED';
  END IF;

  INSERT INTO public.transactions (
    account_id,
    category_id,
    type,
    currency_code,
    amount_minor,
    amount_base_minor,
    exchange_rate,
    date,
    description,
    note,
    tags,
    is_debt,
    debt_direction,
    debt_status,
    counterparty_name,
    settled_at
  )
  VALUES (
    p_account_id,
    p_category_id,
    p_type,
    p_currency_code,
    p_amount_minor,
    p_amount_base_minor,
    p_exchange_rate,
    p_date,
    p_description,
    p_note,
    p_tags,
    coalesce(p_is_debt, false),
    p_debt_direction,
    coalesce(p_debt_status, 'OPEN'),
    p_counterparty_name,
    p_settled_at
  )
  RETURNING * INTO created_transaction;

  balance_delta := CASE
    WHEN p_type IN ('INCOME', 'TRANSFER_IN') THEN p_amount_minor
    ELSE -p_amount_minor
  END;

  UPDATE public.accounts
  SET balance = balance + balance_delta,
      updated_at = now()
  WHERE id = p_account_id;

  RETURN created_transaction;
END;
$$;

-- Phase 1.3: smoke checks for legacy/non-debt compatibility
-- Smoke query A: existing rows remain non-debt by default
-- SELECT count(*) AS null_is_debt_rows
-- FROM public.transactions
-- WHERE is_debt IS NULL;
--
-- Smoke query B: debt rows always provide direction
-- SELECT count(*) AS invalid_debt_rows
-- FROM public.transactions
-- WHERE is_debt = true AND debt_direction IS NULL;
--
-- Smoke query C: open debt totals can be computed deterministically
-- SELECT debt_direction, coalesce(sum(amount_base_minor), 0) AS total_base_minor
-- FROM public.transactions
-- WHERE is_debt = true AND coalesce(debt_status, 'OPEN') = 'OPEN'
-- GROUP BY debt_direction;
