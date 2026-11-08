-- Delete an own-account transfer atomically (#119).
--
-- The app deleted each leg with a separate RPC call that passed
-- transaction_id_input, an argument delete_transaction_and_adjust_balance
-- does not have, so deleting a transfer failed; and a failure between the two
-- calls would have left a half-deleted transfer. create_transfer also debits
-- the source by amount + commission while the TRANSFER_OUT leg stores only the
-- amount (commission lives in transfers.fee_minor), so reversing the legs alone
-- never returned the commission.
--
-- This function reverses both legs through delete_transaction_and_adjust_balance,
-- returns the commission to the source account and removes the transfer row,
-- all in one database transaction. SECURITY INVOKER: ownership and RLS apply
-- to the calling user.

CREATE OR REPLACE FUNCTION public.delete_transfer(p_transfer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_leg public.transactions;
  v_from_account_id uuid;
  v_fee bigint;
  v_legs integer := 0;
  v_from_leg uuid;
  v_to_leg uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  SELECT COALESCE(fee_minor, 0) INTO v_fee FROM public.transfers WHERE id = p_transfer_id;
  v_fee := COALESCE(v_fee, 0);

  -- Both legs recorded on the transfer row must belong to the caller.
  -- Under RLS the caller cannot see another user's leg, so the transfer row
  -- (not a scan of visible legs) is the source of truth: deleting only the
  -- caller's leg would leave a half transfer behind.
  SELECT from_transaction_id, to_transaction_id INTO v_from_leg, v_to_leg
  FROM public.transfers WHERE id = p_transfer_id;
  IF FOUND AND EXISTS (
    SELECT 1 FROM unnest(ARRAY[v_from_leg, v_to_leg]) AS leg(id)
    WHERE leg.id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.accounts a ON a.id = t.account_id
      WHERE t.id = leg.id AND a.user_id = v_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  FOR v_leg IN
    SELECT t.* FROM public.transactions t
    JOIN public.accounts a ON a.id = t.account_id
    WHERE t.transfer_id = p_transfer_id AND a.user_id = v_user_id
    ORDER BY t.type DESC
    FOR UPDATE OF t
  LOOP
    v_legs := v_legs + 1;
    IF v_leg.type = 'TRANSFER_OUT' THEN
      v_from_account_id := v_leg.account_id;
    END IF;
    PERFORM public.delete_transaction_and_adjust_balance(v_leg.id);
  END LOOP;

  IF v_legs = 0 THEN
    RAISE EXCEPTION 'Transfer not found';
  END IF;

  IF v_fee > 0 AND v_from_account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET balance = balance + v_fee, updated_at = now()
    WHERE id = v_from_account_id AND user_id = v_user_id;
  END IF;

  DELETE FROM public.transfers WHERE id = p_transfer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_transfer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_transfer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_transfer(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
