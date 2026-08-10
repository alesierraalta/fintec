-- Harden SECURITY DEFINER financial RPCs against direct anon/authenticated abuse (issue #45).
--
-- The four RPCs below are SECURITY DEFINER (owner = postgres, bypass RLS) and were granted
-- EXECUTE to `anon`, so the public anonymous key alone could mint transactions, adjust any
-- account balance, forge transfers, execute any recurring transaction, and approve any
-- payment order. This migration:
--
--   1. Revokes EXECUTE from `anon` on all four RPCs.
--   2. Revokes EXECUTE from `authenticated` on approve_payment_order (admin-only; the app
--      layer approves via the service-role client after its isAdmin() gate).
--   3. Adds auth.uid() ownership guards to the user-invoked RPCs so a caller-supplied
--      account/user id is never trusted alone. auth.uid() IS NULL for service_role calls
--      (cron, admin flows), so those legitimate paths keep working unchanged.
--
-- Grant signatures use the full argument lists as resolved by PostgREST/psql.

-- ---------------------------------------------------------------------------
-- 1) approve_payment_order — service_role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payment_order(
    p_order_id uuid,
    p_admin_id uuid,
    p_account_id uuid DEFAULT NULL::uuid
) RETURNS public.payment_orders
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
  v_order payment_orders;
  v_user_id UUID;
  v_amount_minor BIGINT;
  v_currency_code TEXT;
  v_description TEXT;
  v_category_id UUID;
  v_account_id_to_use UUID;
  v_transaction_id UUID;
BEGIN
  -- Only the service role may approve payment orders. auth.uid() is NULL when the
  -- RPC runs under the service_role key; the grants below already block direct
  -- authenticated/anon calls, this guard is defense in depth against re-granting.
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Unauthorized: only the service role can approve payment orders';
  END IF;

  -- Get order details
  SELECT * INTO v_order
  FROM payment_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate order is in pending_review status
  IF v_order.status != 'pending_review' THEN
    RAISE EXCEPTION 'Order must be in pending_review status to be approved';
  END IF;

  -- Validate receipt exists
  IF v_order.receipt_url IS NULL OR v_order.receipt_url = '' THEN
    RAISE EXCEPTION 'Order must have a receipt before approval';
  END IF;

  -- Extract order details
  v_user_id := v_order.user_id;
  v_amount_minor := v_order.amount_minor;
  v_currency_code := v_order.currency_code;
  v_description := v_order.description;

  -- Get or create default category "Pago Móvil Mercantil"
  SELECT id INTO v_category_id
  FROM categories
  WHERE name = 'Pago Móvil Mercantil' AND kind = 'INCOME' AND (user_id = v_user_id OR is_default = true)
  LIMIT 1;

  IF v_category_id IS NULL THEN
    -- Create default category if it doesn't exist
    INSERT INTO categories (name, kind, color, icon, user_id, is_default)
    VALUES ('Pago Móvil Mercantil', 'INCOME', '#10b981', 'Smartphone', v_user_id, false)
    RETURNING id INTO v_category_id;
  END IF;

  -- Get account to use (provided or first active account of user)
  IF p_account_id IS NOT NULL THEN
    -- Validate account belongs to user
    SELECT id INTO v_account_id_to_use
    FROM accounts
    WHERE id = p_account_id AND user_id = v_user_id AND active = true;

    IF v_account_id_to_use IS NULL THEN
      RAISE EXCEPTION 'Account not found or does not belong to user';
    END IF;
  ELSE
    -- Get first active account of user
    SELECT id INTO v_account_id_to_use
    FROM accounts
    WHERE user_id = v_user_id AND active = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_account_id_to_use IS NULL THEN
      RAISE EXCEPTION 'User has no active accounts';
    END IF;
  END IF;

  -- Create transaction using existing RPC function
  -- Note: amount_minor is INTEGER in the function signature, so we cast BIGINT to INTEGER
  SELECT id INTO v_transaction_id
  FROM create_transaction_and_adjust_balance(
    p_account_id := v_account_id_to_use,
    p_category_id := v_category_id,
    p_type := 'INCOME',
    p_currency_code := v_currency_code,
    p_amount_minor := v_amount_minor::INTEGER,
    p_amount_base_minor := v_amount_minor::INTEGER, -- TODO: Apply exchange rate if needed
    p_exchange_rate := 1.0,
    p_date := CURRENT_DATE,
    p_description := COALESCE(v_description, 'Pago Móvil Mercantil'),
    p_note := NULL,
    p_tags := NULL
  );

  -- Update order status
  UPDATE payment_orders
  SET
    status = 'approved',
    reviewed_by = p_admin_id,
    reviewed_at = NOW(),
    transaction_id = v_transaction_id,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2a) create_transaction_and_adjust_balance (integer overload)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_transaction_and_adjust_balance(
    p_account_id uuid,
    p_category_id uuid,
    p_type text,
    p_currency_code text,
    p_amount_minor integer,
    p_amount_base_minor integer,
    p_exchange_rate numeric,
    p_date date,
    p_description text,
    p_note text,
    p_tags text[]
) RETURNS public.transactions
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''
AS $$
declare
  v_tx public.transactions;
  v_adjustment integer := 0;
  v_caller uuid := auth.uid();
begin
  -- Ownership guard: an authenticated caller may only touch their own accounts.
  -- auth.uid() IS NULL for service_role (admin/cron) calls, which bypasses this.
  if v_caller is not null and not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = v_caller
  ) then
    raise exception 'Account not found or does not belong to user';
  end if;

  if p_type in ('INCOME', 'TRANSFER_IN') then
    v_adjustment := p_amount_minor;
  elsif p_type in ('EXPENSE', 'TRANSFER_OUT') then
    v_adjustment := -p_amount_minor;
  else
    v_adjustment := 0;
  end if;

  insert into public.transactions (
    account_id, category_id, type, currency_code, amount_minor,
    amount_base_minor, exchange_rate, date, description, note, tags
  ) values (
    p_account_id, p_category_id, p_type, p_currency_code,
    p_amount_minor, p_amount_base_minor, p_exchange_rate,
    p_date, p_description, p_note, p_tags
  ) returning * into v_tx;

  update public.accounts
  set balance = coalesce(balance, 0) + v_adjustment,
      updated_at = now()
  where id = p_account_id;

  return v_tx;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2b) create_transaction_and_adjust_balance (bigint overload)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_transaction_and_adjust_balance(
    p_account_id uuid,
    p_category_id uuid,
    p_type text,
    p_currency_code text,
    p_amount_minor bigint,
    p_amount_base_minor bigint,
    p_exchange_rate numeric,
    p_date date,
    p_description text,
    p_note text DEFAULT NULL::text,
    p_tags text[] DEFAULT NULL::text[],
    p_is_debt boolean DEFAULT false,
    p_debt_direction public.debt_direction DEFAULT NULL::public.debt_direction,
    p_debt_status public.debt_status DEFAULT NULL::public.debt_status,
    p_counterparty_name text DEFAULT NULL::text,
    p_settled_at timestamp with time zone DEFAULT NULL::timestamp with time zone
) RETURNS public.transactions
    LANGUAGE plpgsql
    SECURITY DEFINER
AS $$
DECLARE
  created_transaction public.transactions;
  balance_delta bigint;
  v_skip_enabled boolean;
BEGIN
  -- Ownership guard: an authenticated caller may only touch their own accounts.
  -- auth.uid() IS NULL for service_role (admin/cron) calls, which bypasses this.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_account_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Account not found or does not belong to user';
  END IF;

  IF p_is_debt = true AND p_debt_direction IS NULL THEN
    RAISE EXCEPTION 'debt_direction is required when is_debt=true';
  END IF;

  IF p_debt_status = 'SETTLED' AND p_settled_at IS NULL THEN
    RAISE EXCEPTION 'settled_at is required when debt_status=SETTLED';
  END IF;

  INSERT INTO public.transactions (
    account_id,
    category_id,
    type,
    currency_code,
    amount_minor,
    amount_base_minor,
    exchange_rate,
    date,
    description,
    note,
    tags,
    is_debt,
    debt_direction,
    debt_status,
    counterparty_name,
    settled_at
  )
  VALUES (
    p_account_id,
    p_category_id,
    p_type,
    p_currency_code,
    p_amount_minor,
    p_amount_base_minor,
    p_exchange_rate,
    p_date,
    p_description,
    p_note,
    p_tags,
    coalesce(p_is_debt, false),
    p_debt_direction,
    coalesce(p_debt_status, 'OPEN'),
    p_counterparty_name,
    p_settled_at
  )
  RETURNING * INTO created_transaction;

  -- Read the flag inside the same transaction; default to false so a
  -- missing/legacy row preserves the old behavior.
  SELECT enabled INTO v_skip_enabled
  FROM public.app_flags
  WHERE name = 'debt_balance_skip_enabled';

  v_skip_enabled := coalesce(v_skip_enabled, false);

  IF coalesce(p_is_debt, false) AND v_skip_enabled THEN
    balance_delta := 0; -- debt is metadata, never touches balance
  ELSE
    balance_delta := CASE
      WHEN p_type IN ('INCOME', 'TRANSFER_IN') THEN p_amount_minor
      ELSE -p_amount_minor
    END;
  END IF;

  UPDATE public.accounts
  SET balance = balance + balance_delta,
      updated_at = now()
  WHERE id = p_account_id;

  RETURN created_transaction;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) create_transfer
-- ---------------------------------------------------------------------------
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
  -- Ownership guard: an authenticated caller may only transfer as themselves.
  -- auth.uid() IS NULL for service_role (admin/cron) calls, which bypasses this.
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

-- ---------------------------------------------------------------------------
-- 4) execute_due_recurring_transaction
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_due_recurring_transaction(
    p_recurring_transaction_id uuid,
    p_amount_base_minor bigint,
    p_exchange_rate numeric,
    p_execution_date date,
    p_next_execution_date date
) RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  v_rec recurring_transactions%ROWTYPE;
  v_transaction_id uuid;
  v_balance_delta bigint;
BEGIN
  -- 1. Lock and read schedule
  SELECT * INTO v_rec
  FROM recurring_transactions
  WHERE id = p_recurring_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring transaction % not found', p_recurring_transaction_id;
  END IF;

  IF NOT v_rec.is_active THEN
    RAISE EXCEPTION 'Recurring transaction % is not active', p_recurring_transaction_id;
  END IF;

  -- Ownership guard: an authenticated caller may only execute their own
  -- recurring transactions. auth.uid() IS NULL for service_role (cron) calls,
  -- which bypasses this.
  IF auth.uid() IS NOT NULL AND v_rec.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot execute another user''s recurring transaction';
  END IF;

  -- 2. Insert standard transaction
  INSERT INTO transactions (
    type,
    account_id,
    category_id,
    currency_code,
    amount_minor,
    amount_base_minor,
    exchange_rate,
    date,
    description,
    note,
    tags,
    is_debt
  ) VALUES (
    v_rec.type,
    v_rec.account_id,
    v_rec.category_id,
    v_rec.currency_code,
    v_rec.amount_minor,
    p_amount_base_minor,
    coalesce(p_exchange_rate, 1.0),
    p_execution_date,
    coalesce(v_rec.description, v_rec.name),
    v_rec.note,
    v_rec.tags,
    false
  ) RETURNING id INTO v_transaction_id;

  -- 3. Update account balance
  v_balance_delta := CASE
    WHEN v_rec.type IN ('INCOME', 'TRANSFER_IN') THEN v_rec.amount_minor
    ELSE -v_rec.amount_minor
  END;

  UPDATE accounts
  SET balance = balance + v_balance_delta,
      updated_at = now()
  WHERE id = v_rec.account_id;

  -- 4. Update the recurring transaction next execution date
  UPDATE recurring_transactions
  SET next_execution_date = p_next_execution_date,
      last_executed_at = now(),
      updated_at = now()
  WHERE id = p_recurring_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants. Functions default to PUBLIC EXECUTE, so `anon` can still call them
-- through PUBLIC even without an explicit anon grant. To actually deny direct
-- anonymous access, EXECUTE must be revoked from PUBLIC, then re-granted only
-- to the intended roles:
--   * approve_payment_order                     -> service_role only
--   * the three user-invoked RPCs               -> authenticated + service_role
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.approve_payment_order(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment_order(uuid, uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.approve_payment_order(uuid, uuid, uuid) FROM authenticated;
GRANT ALL ON FUNCTION public.approve_payment_order(uuid, uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.create_transaction_and_adjust_balance(uuid, uuid, text, text, integer, integer, numeric, date, text, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_transaction_and_adjust_balance(uuid, uuid, text, text, integer, integer, numeric, date, text, text, text[]) FROM anon;
GRANT ALL ON FUNCTION public.create_transaction_and_adjust_balance(uuid, uuid, text, text, integer, integer, numeric, date, text, text, text[]) TO authenticated;
GRANT ALL ON FUNCTION public.create_transaction_and_adjust_balance(uuid, uuid, text, text, integer, integer, numeric, date, text, text, text[]) TO service_role;

REVOKE ALL ON FUNCTION public.create_transaction_and_adjust_balance(uuid, uuid, text, text, bigint, bigint, numeric, date, text, text, text[], boolean, public.debt_direction, public.debt_status, text, timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_transaction_and_adjust_balance(uuid, uuid, text, text, bigint, bigint, numeric, date, text, text, text[], boolean, public.debt_direction, public.debt_status, text, timestamp with time zone) FROM anon;
GRANT ALL ON FUNCTION public.create_transaction_and_adjust_balance(uuid, uuid, text, text, bigint, bigint, numeric, date, text, text, text[], boolean, public.debt_direction, public.debt_status, text, timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.create_transaction_and_adjust_balance(uuid, uuid, text, text, bigint, bigint, numeric, date, text, text, text[], boolean, public.debt_direction, public.debt_status, text, timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text) FROM anon;
GRANT ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text) TO authenticated;
GRANT ALL ON FUNCTION public.create_transfer(uuid, uuid, uuid, numeric, text, date, numeric, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.execute_due_recurring_transaction(uuid, bigint, numeric, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_due_recurring_transaction(uuid, bigint, numeric, date, date) FROM anon;
GRANT ALL ON FUNCTION public.execute_due_recurring_transaction(uuid, bigint, numeric, date, date) TO authenticated;
GRANT ALL ON FUNCTION public.execute_due_recurring_transaction(uuid, bigint, numeric, date, date) TO service_role;

-- Refresh PostgREST schema cache so the hardened RPCs are immediately exposed
-- with the updated grants.
NOTIFY pgrst, 'reload schema';
