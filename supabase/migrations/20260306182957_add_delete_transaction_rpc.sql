-- Creating RPC to delete a transaction and symmetrically adjust the account balance
CREATE OR REPLACE FUNCTION delete_transaction_and_adjust_balance(transaction_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount NUMERIC;
  v_account_id UUID;
  v_type TEXT;
  v_account_owner UUID;
BEGIN
  -- 1. Get transaction details
  SELECT amount, account_id, type INTO v_amount, v_account_id, v_type
  FROM transactions
  WHERE id = transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- 2. Verify ownership (auth.uid() must match account owner)
  SELECT user_id INTO v_account_owner
  FROM accounts
  WHERE id = v_account_id;

  IF auth.uid() IS NULL OR auth.uid() != v_account_owner THEN
    RAISE EXCEPTION 'Unauthorized to delete this transaction';
  END IF;

  -- 3. Adjust the account balance by reversing the transaction's effect
  IF v_type = 'expense' THEN
    UPDATE accounts SET balance = balance + v_amount WHERE id = v_account_id;
  ELSIF v_type = 'income' THEN
    UPDATE accounts SET balance = balance - v_amount WHERE id = v_account_id;
  END IF;

  -- 4. Delete the transaction
  DELETE FROM transactions WHERE id = transaction_id;
END;
$$;
