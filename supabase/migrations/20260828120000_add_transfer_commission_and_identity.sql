-- Add commission support to transfers and ensure same-currency identity behavior
-- fee_minor stores commission in source-currency minor units (nullable, 0 allowed, null = no commission)

-- Ensure fee_minor exists and is nullable with non-negative check (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='transfers' AND column_name='fee_minor'
  ) THEN
    ALTER TABLE public.transfers ADD COLUMN fee_minor BIGINT;
  END IF;
END $$;

-- Add check constraint for non-negative fee if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='transfers_fee_minor_non_negative'
  ) THEN
    ALTER TABLE public.transfers ADD CONSTRAINT transfers_fee_minor_non_negative CHECK (fee_minor IS NULL OR fee_minor >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.transfers.fee_minor IS 'Commission in source-currency minor units. NULL means no commission, 0 is valid explicit zero.';

-- Drop known conflicting signatures to avoid overload ambiguity
DROP FUNCTION IF EXISTS public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text);
DROP FUNCTION IF EXISTS public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text);
DROP FUNCTION IF EXISTS public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text, bigint);

CREATE OR REPLACE FUNCTION public.create_transfer(
  p_user_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount_major numeric,
  p_description text DEFAULT 'Transferencia'::text,
  p_date date DEFAULT CURRENT_DATE,
  p_exchange_rate numeric DEFAULT 1.0,
  p_rate_source text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text,
  p_commission_minor bigint DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transfer_id UUID;
  v_from_account RECORD;
  v_to_account RECORD;
  v_from_amount_minor BIGINT;
  v_to_amount_minor BIGINT;
  v_commission_minor BIGINT;
  v_total_debit_minor BIGINT;
  v_from_txn_id UUID;
  v_to_txn_id UUID;
  v_from_decimals INTEGER;
  v_to_decimals INTEGER;
  v_effective_rate NUMERIC;
  v_combined_note TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot transfer funds for another user';
  END IF;

  SELECT * INTO v_from_account FROM public.accounts 
  WHERE id = p_from_account_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source account not found or does not belong to user';
  END IF;

  SELECT * INTO v_to_account FROM public.accounts 
  WHERE id = p_to_account_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination account not found or does not belong to user';
  END IF;

  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Cannot transfer to the same account';
  END IF;

  -- Validate commission (NULL = no commission, 0 allowed)
  IF p_commission_minor IS NOT NULL THEN
    IF p_commission_minor < 0 THEN
      RAISE EXCEPTION 'commission must be non-negative';
    END IF;
    IF p_commission_minor > 9007199254740991 THEN
      RAISE EXCEPTION 'commission overflows safe integer';
    END IF;
  END IF;
  v_commission_minor := COALESCE(p_commission_minor, 0);

  v_from_decimals := CASE 
    WHEN v_from_account.currency_code = 'JPY' THEN 0
    WHEN v_from_account.currency_code IN ('CLP', 'COP') THEN 0
    ELSE 2
  END;

  v_to_decimals := CASE 
    WHEN v_to_account.currency_code = 'JPY' THEN 0
    WHEN v_to_account.currency_code IN ('CLP', 'COP') THEN 0
    ELSE 2
  END;

  v_from_amount_minor := (p_amount_major * POWER(10, v_from_decimals))::BIGINT;
  IF v_from_amount_minor <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Effective rate: force 1 for same-currency identity transfers
  IF v_from_account.currency_code = v_to_account.currency_code THEN
    v_effective_rate := 1.0;
  ELSE
    v_effective_rate := COALESCE(p_exchange_rate, 1.0);
    IF v_effective_rate <= 0 THEN
      RAISE EXCEPTION 'exchangeRate must be positive';
    END IF;
  END IF;

  -- Destination amount: identity for same currency, otherwise rate conversion
  IF v_from_account.currency_code = v_to_account.currency_code THEN
    v_to_amount_minor := v_from_amount_minor;
  ELSE
    v_to_amount_minor := (p_amount_major * v_effective_rate * POWER(10, v_to_decimals))::BIGINT;
  END IF;

  IF v_to_amount_minor <= 0 THEN
    RAISE EXCEPTION 'calculated destination amount must be positive';
  END IF;

  v_total_debit_minor := v_from_amount_minor + v_commission_minor;
  IF v_total_debit_minor > 9007199254740991 THEN
    RAISE EXCEPTION 'total debit overflows';
  END IF;

  IF v_from_account.balance < v_total_debit_minor THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Requested (amount + commission): %', 
      v_from_account.balance, v_total_debit_minor;
  END IF;

  v_transfer_id := gen_random_uuid();

  v_combined_note := CASE
    WHEN p_note IS NOT NULL AND p_rate_source IS NOT NULL THEN p_note || ' | Tasa: ' || p_rate_source
    WHEN p_note IS NOT NULL THEN p_note
    WHEN p_rate_source IS NOT NULL THEN 'Tasa: ' || p_rate_source
    ELSE NULL
  END;

  INSERT INTO public.transactions (
    transfer_id, account_id, type, amount_minor, amount_base_minor,
    currency_code, exchange_rate, description, date, note
  ) VALUES (
    v_transfer_id, p_from_account_id, 'TRANSFER_OUT', v_from_amount_minor, v_from_amount_minor,
    v_from_account.currency_code, 
    v_effective_rate,
    COALESCE(p_description, 'Transferencia'), p_date,
    v_combined_note
  ) RETURNING id INTO v_from_txn_id;

  UPDATE public.accounts 
  SET balance = balance - v_total_debit_minor, updated_at = NOW()
  WHERE id = p_from_account_id;

  INSERT INTO public.transactions (
    transfer_id, account_id, type, amount_minor, amount_base_minor,
    currency_code, exchange_rate, description, date, note
  ) VALUES (
    v_transfer_id, p_to_account_id, 'TRANSFER_IN', v_to_amount_minor, v_to_amount_minor,
    v_to_account.currency_code,
    v_effective_rate,
    COALESCE(p_description, 'Transferencia'), p_date,
    v_combined_note
  ) RETURNING id INTO v_to_txn_id;

  UPDATE public.accounts 
  SET balance = balance + v_to_amount_minor, updated_at = NOW()
  WHERE id = p_to_account_id;

  INSERT INTO public.transfers (id, from_transaction_id, to_transaction_id, fee_minor, created_at)
  VALUES (v_transfer_id, v_from_txn_id, v_to_txn_id, p_commission_minor, NOW());

  RETURN json_build_object(
    'success', true, 'transferId', v_transfer_id,
    'fromTransactionId', v_from_txn_id, 'toTransactionId', v_to_txn_id,
    'fromAmount', v_from_amount_minor, 'toAmount', v_to_amount_minor,
    'fromCurrency', v_from_account.currency_code,
    'toCurrency', v_to_account.currency_code,
    'exchangeRate', v_effective_rate,
    'commissionMinor', p_commission_minor,
    'totalDebitMinor', v_total_debit_minor
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Transfer failed: %', SQLERRM;
END;
$$;

ALTER FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text, bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text, bigint) FROM anon;
GRANT ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text, bigint) TO authenticated;
GRANT ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text, bigint) TO service_role;

-- Keep legacy signature without commission for backward compat (wraps new)
DROP FUNCTION IF EXISTS public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text);
CREATE OR REPLACE FUNCTION public.create_transfer(
  p_user_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount_major numeric,
  p_description text DEFAULT 'Transferencia'::text,
  p_date date DEFAULT CURRENT_DATE,
  p_exchange_rate numeric DEFAULT 1.0,
  p_rate_source text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text
) RETURNS json
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.create_transfer(p_user_id, p_from_account_id, p_to_account_id, p_amount_major, p_description, p_date, p_exchange_rate, p_rate_source, p_note, NULL::bigint);
$$;
ALTER FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text) FROM anon;
GRANT ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text) TO service_role;

SELECT pg_notify('pgrst', 'reload schema');
