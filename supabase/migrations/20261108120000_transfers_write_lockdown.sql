-- Lock down direct writes on public.transfers (#127).
--
-- delete_transfer refunds transfers.fee_minor, and the table accepted
-- INSERT/UPDATE/DELETE from authenticated through RLS policies. A user could
-- rewrite fee_minor (or delete and reinsert the row) before deleting and
-- receive a commission that was never debited.
--
-- Every legitimate write already goes through a function: create_transfer and
-- convert_expense_to_transfer (SECURITY DEFINER) write the row, and the app
-- only reads it (repositories/supabase/transfers-repository-impl.ts selects).
-- Deleting direct table writes removes the forgery path while keeping reads.
--
-- delete_transfer becomes SECURITY DEFINER so it can still remove the row; it
-- keeps its explicit ownership validation: both recorded legs must belong to
-- the caller, and the commission credit is restricted to a caller-owned account.

CREATE OR REPLACE FUNCTION public.delete_transfer(p_transfer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
  -- The transfer row (not a scan of visible legs) is the source of truth:
  -- deleting only the caller's leg would leave a half transfer behind.
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

DROP POLICY IF EXISTS "Users can insert own transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can update own transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can delete own transfers" ON public.transfers;

REVOKE INSERT, UPDATE, DELETE ON public.transfers FROM authenticated, anon;

NOTIFY pgrst, 'reload schema';
