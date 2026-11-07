-- Convert a mis-recorded expense into an own-account transfer (#114).
--
-- The AI chat used to record "transfer X from A to B" as an EXPENSE on A,
-- leaving A short and B unchanged. This function repairs that in ONE database
-- transaction: it reverses and deletes the expense through
-- delete_transaction_and_adjust_balance and creates the transfer through
-- create_transfer, so a failure in either step rolls both back.
--
-- SECURITY INVOKER: RLS and the ownership checks inside both delegated
-- functions run as the calling user; anon cannot execute it.

CREATE OR REPLACE FUNCTION public.convert_expense_to_transfer(
  p_transaction_id uuid,
  p_to_account_id uuid,
  p_exchange_rate numeric DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tx public.transactions;
  v_currency text;
  v_to_currency text;
  v_decimals integer;
  v_amount_major numeric;
  v_transfer json;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  SELECT t.* INTO v_tx
  FROM public.transactions t
  JOIN public.accounts a ON a.id = t.account_id
  WHERE t.id = p_transaction_id AND a.user_id = v_user_id
  FOR UPDATE OF t;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or does not belong to user';
  END IF;

  IF v_tx.type <> 'EXPENSE' OR v_tx.transfer_id IS NOT NULL OR COALESCE(v_tx.is_debt, false) THEN
    RAISE EXCEPTION 'Only a plain expense can be converted into a transfer';
  END IF;

  -- Debt deductions carry debt-linked / debt:<id> tags, and
  -- delete_transaction_and_adjust_balance also deletes every row tagged
  -- debt:<this id>. Either case would delete or orphan more than this expense.
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(v_tx.tags, ARRAY[]::text[])) AS tag
    WHERE tag = 'debt-linked' OR tag LIKE 'debt:%'
  ) OR EXISTS (
    SELECT 1 FROM public.transactions
    WHERE tags @> ARRAY['debt:' || v_tx.id::text]::text[]
  ) THEN
    RAISE EXCEPTION 'Expenses linked to a debt cannot be converted into a transfer';
  END IF;

  IF v_tx.account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Source and destination accounts must differ';
  END IF;

  SELECT currency_code INTO v_currency FROM public.accounts WHERE id = v_tx.account_id;
  SELECT currency_code INTO v_to_currency FROM public.accounts
  WHERE id = p_to_account_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination account not found or does not belong to user';
  END IF;
  IF v_currency <> v_to_currency AND (p_exchange_rate IS NULL OR p_exchange_rate <= 0) THEN
    RAISE EXCEPTION 'An exchange rate is required between % and %', v_currency, v_to_currency;
  END IF;
  -- create_transfer scales every currency except JPY/CLP/COP by 2 decimals,
  -- which would misstate 8-decimal crypto amounts (BTC, ETH).
  IF v_currency IN ('BTC', 'ETH') OR v_to_currency IN ('BTC', 'ETH') THEN
    RAISE EXCEPTION 'Conversion is not supported for % accounts yet', CASE WHEN v_currency IN ('BTC', 'ETH') THEN v_currency ELSE v_to_currency END;
  END IF;

  v_decimals := CASE WHEN v_currency IN ('JPY', 'CLP', 'COP') THEN 0 ELSE 2 END;
  v_amount_major := v_tx.amount_minor::numeric / power(10, v_decimals);

  PERFORM public.delete_transaction_and_adjust_balance(v_tx.id);

  v_transfer := public.create_transfer(
    p_user_id => v_user_id,
    p_from_account_id => v_tx.account_id,
    p_to_account_id => p_to_account_id,
    p_amount_major => v_amount_major,
    p_description => COALESCE(NULLIF(v_tx.description, ''), 'Transferencia'),
    p_date => v_tx.date::date,
    p_exchange_rate => COALESCE(p_exchange_rate, 1.0),
    p_rate_source => NULL,
    p_note => 'Convertido desde un gasto registrado por error',
    p_commission_minor => NULL
  );

  RETURN json_build_object(
    'convertedTransactionId', v_tx.id,
    'transfer', v_transfer
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_expense_to_transfer(uuid, uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_expense_to_transfer(uuid, uuid, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.convert_expense_to_transfer(uuid, uuid, numeric) TO authenticated;

NOTIFY pgrst, 'reload schema';
