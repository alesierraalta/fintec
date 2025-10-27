-- Migration: Create optimized transfer RPC function
-- This function handles transfer creation atomically in a single database transaction
-- Reduces network calls from 6+ to 1, ensuring ACID compliance

CREATE OR REPLACE FUNCTION create_transfer(
  p_user_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount_major DECIMAL(18, 6), -- Amount in major units (e.g., 100.50)
  p_description TEXT,
  p_date DATE DEFAULT CURRENT_DATE,
  p_exchange_rate DECIMAL(10, 6) DEFAULT 1.0,
  p_rate_source TEXT DEFAULT NULL
) RETURNS JSON AS $$
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
BEGIN
  -- Step 1: Validate and lock accounts (FOR UPDATE prevents race conditions)
  SELECT * INTO v_from_account FROM accounts 
  WHERE id = p_from_account_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source account not found or does not belong to user';
  END IF;
  
  SELECT * INTO v_to_account FROM accounts 
  WHERE id = p_to_account_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination account not found or does not belong to user';
  END IF;
  
  -- Prevent transferring to same account
  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Cannot transfer to the same account';
  END IF;
  
  -- Step 2: Get currency decimals for proper conversion
  -- Default to 2 decimals if currency not found
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
  
  -- Step 3: Convert amount to minor units for source account
  v_from_amount_minor := (p_amount_major * POWER(10, v_from_decimals))::BIGINT;
  
  -- Step 4: Validate balance
  IF v_from_account.balance < v_from_amount_minor THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', 
      v_from_account.balance, v_from_amount_minor;
  END IF;
  
  -- Step 5: Generate transfer ID
  v_transfer_id := gen_random_uuid();
  
  -- Step 6: Calculate destination amount (handle currency conversion)
  IF v_from_account.currency_code <> v_to_account.currency_code THEN
    -- Different currencies: convert using exchange rate
    -- Convert: major_amount * exchange_rate, then to minor units for destination currency
    v_to_amount_minor := (p_amount_major * p_exchange_rate * POWER(10, v_to_decimals))::BIGINT;
  ELSE
    -- Same currency: convert using destination currency decimals
    v_to_amount_minor := (p_amount_major * POWER(10, v_to_decimals))::BIGINT;
  END IF;
  
  -- Step 7: Create TRANSFER_OUT transaction
  INSERT INTO transactions (
    transfer_id, account_id, type, amount_minor, amount_base_minor,
    currency_code, exchange_rate, description, date, note
  ) VALUES (
    v_transfer_id, p_from_account_id, 'TRANSFER_OUT', v_from_amount_minor, v_from_amount_minor,
    v_from_account.currency_code, 
    CASE WHEN v_from_account.currency_code <> v_to_account.currency_code THEN p_exchange_rate ELSE NULL END,
    COALESCE(p_description, 'Transferencia'),
    p_date,
    CASE WHEN p_rate_source IS NOT NULL THEN 'Tasa: ' || p_rate_source ELSE NULL END
  ) RETURNING id INTO v_from_txn_id;
  
  -- Step 8: Update source account balance (atomic within transaction)
  UPDATE accounts 
  SET balance = balance - v_from_amount_minor,
      updated_at = NOW()
  WHERE id = p_from_account_id;
  
  -- Step 9: Create TRANSFER_IN transaction
  INSERT INTO transactions (
    transfer_id, account_id, type, amount_minor, amount_base_minor,
    currency_code, exchange_rate, description, date, note
  ) VALUES (
    v_transfer_id, p_to_account_id, 'TRANSFER_IN', v_to_amount_minor, v_to_amount_minor,
    v_to_account.currency_code,
    CASE WHEN v_from_account.currency_code <> v_to_account.currency_code THEN p_exchange_rate ELSE NULL END,
    COALESCE(p_description, 'Transferencia'),
    p_date,
    CASE WHEN p_rate_source IS NOT NULL THEN 'Tasa: ' || p_rate_source ELSE NULL END
  ) RETURNING id INTO v_to_txn_id;
  
  -- Step 10: Update destination account balance (atomic within transaction)
  UPDATE accounts 
  SET balance = balance + v_to_amount_minor,
      updated_at = NOW()
  WHERE id = p_to_account_id;
  
  -- Step 11: Return transfer details as JSON
  RETURN json_build_object(
    'success', true,
    'transferId', v_transfer_id,
    'fromTransactionId', v_from_txn_id,
    'toTransactionId', v_to_txn_id,
    'fromAmount', v_from_amount_minor,
    'toAmount', v_to_amount_minor,
    'fromCurrency', v_from_account.currency_code,
    'toCurrency', v_to_account.currency_code,
    'exchangeRate', CASE WHEN v_from_account.currency_code <> v_to_account.currency_code THEN p_exchange_rate ELSE NULL END
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise the exception with context
    RAISE EXCEPTION 'Transfer failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_transfer(UUID, UUID, UUID, DECIMAL, TEXT, DATE, DECIMAL, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION create_transfer IS 'Creates a transfer atomically: validates accounts, checks balance, creates TRANSFER_OUT and TRANSFER_IN transactions, and updates account balances in a single database transaction. Reduces network calls from 6+ to 1.';

