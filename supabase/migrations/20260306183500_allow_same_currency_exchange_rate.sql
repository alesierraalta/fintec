-- Update create_transfer to support exchange rates for same-currency transfers

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
  -- 1. Validate source account
  SELECT * INTO v_from_account FROM public.accounts 
  WHERE id = p_from_account_id AND user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source account not found or does not belong to user';
  END IF;
  
  -- 2. Validate destination account
  SELECT * INTO v_to_account FROM public.accounts 
  WHERE id = p_to_account_id AND user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination account not found or does not belong to user';
  END IF;
  
  -- 3. Prevent self-transfer
  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Cannot transfer to the same account';
  END IF;
  
  -- 4. Get decimals
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
  
  -- 5. Calculate amounts
  v_from_amount_minor := (p_amount_major * POWER(10, v_from_decimals))::BIGINT;
  
  IF v_from_account.balance < v_from_amount_minor THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', 
      v_from_account.balance, v_from_amount_minor;
  END IF;
  
  v_transfer_id := gen_random_uuid();
  
  -- Calculate target amount using the provided exchange rate, even for same currency
  v_to_amount_minor := (p_amount_major * p_exchange_rate * POWER(10, v_to_decimals))::BIGINT;

  v_combined_note := CASE
    WHEN p_note IS NOT NULL AND p_rate_source IS NOT NULL THEN p_note || ' | Tasa: ' || p_rate_source
    WHEN p_note IS NOT NULL THEN p_note
    WHEN p_rate_source IS NOT NULL THEN 'Tasa: ' || p_rate_source
    ELSE NULL
  END;
  
  -- 6. Create TRANSFER_OUT using the provided exchange rate
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
  
  -- Update FROM account balance
  UPDATE public.accounts 
  SET balance = balance - v_from_amount_minor, updated_at = NOW()
  WHERE id = p_from_account_id;
  
  -- 7. Create TRANSFER_IN using the provided exchange rate
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
  
  -- Update TO account balance
  UPDATE public.accounts 
  SET balance = balance + v_to_amount_minor, updated_at = NOW()
  WHERE id = p_to_account_id;
  
  -- 8. Return result
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
