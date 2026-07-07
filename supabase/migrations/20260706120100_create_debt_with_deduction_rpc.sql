-- Migration: create_debt_with_deduction RPC
-- Atomic create of a debt transaction plus, when the user opts in, a linked
-- EXPENSE that debits a chosen source account. All in one transaction so a
-- debt can never exist without its linked EXPENSE (or vice versa) on
-- partial failure.
--
-- The debt row goes through the existing create_transaction_and_adjust_balance
-- RPC so the skip-guard from 20260706120000_debt_balance_skip.sql is reused
-- (debt is metadata, never touches balance).
--
-- The linked EXPENSE is a regular expense that:
--   * debits the chosen source account (p_source_account_id)
--   * carries the source's default expense category (p_source_category_id)
--   * is tagged with `debt-linked` AND `debt:<debt_id>` so the dashboard can
--     join debt + expense deterministically and exclude it from P2P totals.
--   * has `note = 'Debt: ' || debt.description` for human-readable audit.
--
-- All money is stored as integer minor units.
--
-- SECURITY: INVOKER so RLS still applies to every underlying write
-- (no service_role escalation). Authenticated user must own all referenced
-- accounts; the RPC raises otherwise.

CREATE OR REPLACE FUNCTION public.create_debt_with_deduction(
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
  p_deduct boolean DEFAULT false,
  p_source_account_id uuid DEFAULT NULL,
  p_source_category_id uuid DEFAULT NULL
)
RETURNS json
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
  v_source_currency_code text;
  v_category_owner uuid;
  v_category_is_default boolean;
BEGIN
  IF p_deduct THEN
    IF p_source_account_id IS NULL THEN
      RAISE EXCEPTION 'source_account_id is required when deduct=true';
    END IF;
    IF p_source_category_id IS NULL THEN
      RAISE EXCEPTION 'source_category_id is required when deduct=true';
    END IF;
  END IF;

  IF p_type NOT IN ('INCOME', 'EXPENSE') THEN
    RAISE EXCEPTION 'debt transactions must be INCOME or EXPENSE';
  END IF;

  -- Ownership check on the debt account (RLS will also enforce on inserts).
  SELECT user_id INTO v_owner FROM public.accounts WHERE id = p_account_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Account not found or unauthorized';
  END IF;

  IF p_category_id IS NOT NULL THEN
    SELECT user_id, is_default
      INTO v_category_owner, v_category_is_default
    FROM public.categories
    WHERE id = p_category_id;

    IF v_category_owner IS NULL AND coalesce(v_category_is_default, false) = false THEN
      RAISE EXCEPTION 'Category not found or unauthorized';
    END IF;

    IF coalesce(v_category_is_default, false) = false AND v_category_owner <> auth.uid() THEN
      RAISE EXCEPTION 'Category not found or unauthorized';
    END IF;
  END IF;

  -- Build a debt-only tags list and a debt-only note so the debt row stays
  -- a clean "debt is metadata" record. The linked expense will pick up
  -- the user-provided description via its own note.
  v_debt_tags := CASE
    WHEN p_tags IS NULL THEN ARRAY['debt']
    ELSE array_append(p_tags, 'debt')
  END;

  v_debt_note := CASE
    WHEN p_note IS NULL OR length(p_note) = 0 THEN 'Debt: ' || p_description
    ELSE p_note
  END;

  -- 1) Insert the debt via the existing RPC so the skip-guard runs.
  v_debt := public.create_transaction_and_adjust_balance(
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

  v_expense_id := NULL;

  IF p_deduct THEN
    -- Ownership + same-currency check on the source account.
    SELECT user_id, currency_code
      INTO v_owner, v_source_currency_code
    FROM public.accounts
    WHERE id = p_source_account_id;
    IF v_owner IS NULL OR v_owner <> auth.uid() THEN
      RAISE EXCEPTION 'Source account not found or unauthorized';
    END IF;

    IF v_source_currency_code IS DISTINCT FROM p_currency_code THEN
      RAISE EXCEPTION 'Source account currency must match debt currency';
    END IF;

    SELECT user_id, is_default
      INTO v_category_owner, v_category_is_default
    FROM public.categories
    WHERE id = p_source_category_id;

    IF v_category_owner IS NULL AND coalesce(v_category_is_default, false) = false THEN
      RAISE EXCEPTION 'Source category not found or unauthorized';
    END IF;

    IF coalesce(v_category_is_default, false) = false AND v_category_owner <> auth.uid() THEN
      RAISE EXCEPTION 'Source category not found or unauthorized';
    END IF;

    -- 2) Linked EXPENSE: same amount, source account/category, debt-linked
    -- tags and a human-readable note. Reuse the same RPC so the source
    -- account's balance is debited via the standard non-debt path.
    -- NOTE: a nested call would create a savepoint inside the outer
    -- transaction; on failure the outer transaction still rolls back.
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
        p_tags := ARRAY['debt-linked', 'debt:' || v_debt.id::text],
        p_is_debt := false,
        p_debt_direction := NULL,
        p_debt_status := NULL,
        p_counterparty_name := NULL,
        p_settled_at := NULL
      )
    )
    SELECT id INTO v_expense_id FROM inserted;
  END IF;

  RETURN json_build_object(
    'debt_id', v_debt.id,
    'expense_id', v_expense_id,
    'debt_deducted', p_deduct
  );
END;
$$;

-- RLS: RPC runs with caller's privileges, so all underlying writes are
-- governed by the existing RLS policies on transactions and accounts.
GRANT EXECUTE ON FUNCTION public.create_debt_with_deduction(
  uuid, uuid, text, text, bigint, bigint, numeric, date,
  text, text, text[], public.debt_direction, public.debt_status,
  text, timestamptz, boolean, uuid, uuid
) TO authenticated;

NOTIFY pgrst, 'reload schema';
