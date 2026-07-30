-- Migration: update_debt_with_deduction RPC
CREATE OR REPLACE FUNCTION public.update_debt_with_deduction(
  p_transaction_id uuid,
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
  p_debt_direction public.debt_direction DEFAULT NULL,
  p_debt_status public.debt_status DEFAULT NULL,
  p_counterparty_name text DEFAULT NULL,
  p_settled_at timestamptz DEFAULT NULL,
  p_deduct boolean DEFAULT NULL,
  p_source_account_id uuid DEFAULT NULL,
  p_source_category_id uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_debt public.transactions;
  v_expense_id uuid;
  v_debt_tags text[];
  v_debt_note text;
  v_owner uuid;
  v_existing_expense_id uuid;
  v_existing_source_acc uuid;
  v_existing_source_cat uuid;
BEGIN
  IF p_type NOT IN ('INCOME', 'EXPENSE') THEN
    RAISE EXCEPTION 'debt transactions must be INCOME or EXPENSE';
  END IF;

  -- 1) Update the debt itself via the existing RPC
  -- Build a debt-only tags list and note
  v_debt_tags := CASE
    WHEN p_tags IS NULL THEN ARRAY['debt']
    ELSE array_append(array_remove(p_tags, 'debt'), 'debt')
  END;

  v_debt_note := CASE
    WHEN p_note IS NULL OR length(p_note) = 0 THEN 'Debt: ' || p_description
    ELSE p_note
  END;

  v_debt := public.update_transaction_and_adjust_balance(
    p_transaction_id := p_transaction_id,
    p_account_id := p_account_id,
    p_category_id := p_category_id,
    p_type := p_type,
    p_currency_code := p_currency_code,
    p_amount_minor := p_amount_minor,
    p_amount_base_minor := p_amount_base_minor,
    p_exchange_rate := p_exchange_rate,
    p_date := p_date,
    p_description := p_description,
    p_note := v_debt_note,
    p_tags := v_debt_tags,
    p_is_debt := true,
    p_debt_direction := p_debt_direction,
    p_debt_status := coalesce(p_debt_status, 'OPEN'),
    p_counterparty_name := p_counterparty_name,
    p_settled_at := p_settled_at
  );

  -- 2) Locate the existing linked expense (deduction)
  SELECT id, account_id, category_id
    INTO v_existing_expense_id, v_existing_source_acc, v_existing_source_cat
  FROM public.transactions
  WHERE 'debt-linked' = ANY(tags) 
    AND ('debt:' || p_transaction_id::text) = ANY(tags)
  LIMIT 1;

  v_expense_id := v_existing_expense_id;

  -- 3) Handle Deduction State
  IF p_deduct IS TRUE AND v_existing_expense_id IS NULL THEN
    -- Create linked expense if it doesn't exist
    IF p_source_account_id IS NULL OR p_source_category_id IS NULL THEN
      RAISE EXCEPTION 'source_account_id and source_category_id are required when creating a deduction';
    END IF;

    WITH inserted AS (
      SELECT * FROM public.create_transaction_and_adjust_balance(
        p_account_id := p_source_account_id,
        p_category_id := p_source_category_id,
        p_type := p_type,
        p_currency_code := p_currency_code,
        p_amount_minor := p_amount_minor,
        p_amount_base_minor := p_amount_base_minor,
        p_exchange_rate := p_exchange_rate,
        p_date := p_date,
        p_description := p_description,
        p_note := 'Debt: ' || p_description,
        p_tags := ARRAY['debt-linked', 'debt:' || p_transaction_id::text],
        p_is_debt := false,
        p_debt_direction := NULL,
        p_debt_status := NULL,
        p_counterparty_name := NULL,
        p_settled_at := NULL
      )
    )
    SELECT id INTO v_expense_id FROM inserted;

  ELSIF p_deduct IS FALSE AND v_existing_expense_id IS NOT NULL THEN
    -- Delete the linked expense if it exists
    PERFORM public.delete_transaction_and_adjust_balance(v_existing_expense_id);
    v_expense_id := NULL;

  ELSIF (p_deduct IS TRUE OR p_deduct IS NULL) AND v_existing_expense_id IS NOT NULL THEN
    -- Update the linked expense's properties
    WITH updated AS (
      SELECT * FROM public.update_transaction_and_adjust_balance(
        p_transaction_id := v_existing_expense_id,
        p_account_id := COALESCE(p_source_account_id, v_existing_source_acc),
        p_category_id := COALESCE(p_source_category_id, v_existing_source_cat),
        p_type := p_type,
        p_currency_code := p_currency_code,
        p_amount_minor := p_amount_minor,
        p_amount_base_minor := p_amount_base_minor,
        p_exchange_rate := p_exchange_rate,
        p_date := p_date,
        p_description := p_description,
        p_note := 'Debt: ' || p_description,
        p_tags := ARRAY['debt-linked', 'debt:' || p_transaction_id::text],
        p_is_debt := false,
        p_debt_direction := NULL,
        p_debt_status := NULL,
        p_counterparty_name := NULL,
        p_settled_at := NULL
      )
    )
    SELECT id INTO v_expense_id FROM updated;
  END IF;

  RETURN json_build_object(
    'debt_id', v_debt.id,
    'expense_id', v_expense_id,
    'debt_deducted', p_deduct
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_debt_with_deduction(
  uuid, uuid, uuid, text, text, bigint, bigint, numeric, date,
  text, text, text[], public.debt_direction, public.debt_status,
  text, timestamptz, boolean, uuid, uuid
) TO authenticated;

NOTIFY pgrst, 'reload schema';
