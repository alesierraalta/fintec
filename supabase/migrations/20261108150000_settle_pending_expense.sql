CREATE OR REPLACE FUNCTION public.settle_pending_expense(
  p_pending_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_type text,
  p_currency_code text,
  p_amount_minor bigint,
  p_amount_base_minor bigint,
  p_exchange_rate numeric,
  p_date date,
  p_description text,
  p_note text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_pending public.pending_items%ROWTYPE;
  v_transaction public.transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_pending
  FROM public.pending_items
  WHERE id = p_pending_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending item not found or does not belong to user';
  END IF;

  IF v_pending.done OR v_pending.converted_transaction_id IS NOT NULL THEN
    IF v_pending.converted_transaction_id IS NULL THEN
      RAISE EXCEPTION 'Pending item is already completed without a transaction';
    END IF;
    RETURN v_pending.converted_transaction_id;
  END IF;

  IF p_amount_minor <= 0 OR p_amount_minor IS NULL THEN
    RAISE EXCEPTION 'Transaction amount must be positive';
  END IF;
  IF p_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = p_category_id AND (is_default OR user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Category not found or unauthorized';
  END IF;

  SELECT * INTO v_transaction FROM public.create_transaction_and_adjust_balance(
    p_account_id, p_category_id, p_type, p_currency_code,
    p_amount_minor, p_amount_base_minor, p_exchange_rate, p_date,
    p_description, p_note, NULL::text[], false,
    NULL::public.debt_direction, NULL::public.debt_status, NULL::text,
    NULL::timestamptz
  );

  UPDATE public.pending_items
  SET done = true, done_at = now(), converted_transaction_id = v_transaction.id
  WHERE id = p_pending_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update pending item';
  END IF;

  RETURN v_transaction.id;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_pending_expense(uuid, uuid, uuid, text, text, bigint, bigint, numeric, date, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_pending_expense(uuid, uuid, uuid, text, text, bigint, bigint, numeric, date, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.settle_pending_expense(uuid, uuid, uuid, text, text, bigint, bigint, numeric, date, text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
