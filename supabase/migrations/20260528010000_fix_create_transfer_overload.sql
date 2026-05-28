-- Prevent create_transfer function overload
-- Two versions existed (8-param and 9-param), causing PostgREST PGRST203 error.
-- Drop all versions and recreate the canonical 9-param version.

DROP FUNCTION IF EXISTS public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text);
DROP FUNCTION IF EXISTS public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text);

-- Recreate the canonical version (from 20260306183500 migration)
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
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  v_transfer_id UUID;
  v_from_account RECORD;
  v_to_account RECORD;
  v_from_amount_minor BIGINT;
  v_to_amount_minor BIGINT;
  v_from_txn_id UUID;
  v_to_txn_id UUID;
  v_from_decimals INTEGER;
  v_to_decimals INTEGER;
  v_combined_note TEXT;
BEGIN
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
  
  IF v_from_account.balance < v_from_amount_minor THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', 
      v_from_account.balance, v_from_amount_minor;
  END IF;
  
  v_transfer_id := gen_random_uuid();
  
  v_to_amount_minor := (p_amount_major * p_exchange_rate * POWER(10, v_to_decimals))::BIGINT;

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
    p_exchange_rate,
    COALESCE(p_description, 'Transferencia'), p_date,
    v_combined_note
  ) RETURNING id INTO v_from_txn_id;
  
  UPDATE public.accounts 
  SET balance = balance - v_from_amount_minor, updated_at = NOW()
  WHERE id = p_from_account_id;
  
  INSERT INTO public.transactions (
    transfer_id, account_id, type, amount_minor, amount_base_minor,
    currency_code, exchange_rate, description, date, note
  ) VALUES (
    v_transfer_id, p_to_account_id, 'TRANSFER_IN', v_to_amount_minor, v_to_amount_minor,
    v_to_account.currency_code,
    p_exchange_rate,
    COALESCE(p_description, 'Transferencia'), p_date,
    v_combined_note
  ) RETURNING id INTO v_to_txn_id;
  
  UPDATE public.accounts 
  SET balance = balance + v_to_amount_minor, updated_at = NOW()
  WHERE id = p_to_account_id;
  
  RETURN json_build_object(
    'success', true, 'transferId', v_transfer_id,
    'fromTransactionId', v_from_txn_id, 'toTransactionId', v_to_txn_id,
    'fromAmount', v_from_amount_minor, 'toAmount', v_to_amount_minor,
    'fromCurrency', v_from_account.currency_code,
    'toCurrency', v_to_account.currency_code,
    'exchangeRate', p_exchange_rate
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Transfer failed: %', SQLERRM;
END;
$$;

-- Ensure only one version exists (drop any extra overloads)
-- This is a safety net: if someone adds a new overload, this migration's
-- DROP + CREATE ensures exactly one version exists.

NOTIFY pgrst, 'reload schema';
