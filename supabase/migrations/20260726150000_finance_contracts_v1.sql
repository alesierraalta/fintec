-- Finance contracts v1: atomic transaction mutations and goal ledger updates.
-- All amounts are integer minor units and all functions run as the caller.

BEGIN;

-- NOT VALID preserves deployability for legacy rows while enforcing every new
-- transaction and update at the database boundary.
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_amount_minor_positive,
  DROP CONSTRAINT IF EXISTS transactions_amount_base_minor_positive;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_minor_positive
    CHECK (amount_minor > 0) NOT VALID,
  ADD CONSTRAINT transactions_amount_base_minor_positive
    CHECK (amount_base_minor >= 0) NOT VALID;

DROP FUNCTION IF EXISTS public.update_transaction_and_adjust_balance(
  uuid, uuid, uuid, text, text, bigint, bigint, numeric, date, text, text,
  text[], boolean, public.debt_direction, public.debt_status, bigint, bigint,
  text, timestamptz
);

CREATE OR REPLACE FUNCTION public.update_transaction_and_adjust_balance(
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
  p_note text,
  p_tags text[],
  p_is_debt boolean,
  p_debt_direction public.debt_direction,
  p_debt_status public.debt_status,
  p_counterparty_name text,
  p_settled_at timestamptz
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  old_tx public.transactions;
  updated_tx public.transactions;
  old_delta bigint;
  new_delta bigint;
BEGIN
  IF p_amount_minor <= 0 OR p_amount_base_minor < 0 THEN
    RAISE EXCEPTION 'Transaction amounts must be positive source and non-negative base integer minor units';
  END IF;
  IF p_is_debt AND p_debt_direction IS NULL THEN
    RAISE EXCEPTION 'debt_direction is required when is_debt=true';
  END IF;
  IF p_debt_status = 'SETTLED' AND p_settled_at IS NULL THEN
    RAISE EXCEPTION 'settled_at is required when debt_status=SETTLED';
  END IF;
  SELECT * INTO old_tx
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  IF p_is_debt THEN
    IF coalesce(old_tx.debt_paid_amount_minor, 0) < 0
       OR coalesce(old_tx.debt_paid_amount_base_minor, 0) < 0 THEN
      RAISE EXCEPTION 'Debt progress values cannot be negative';
    END IF;
    IF coalesce(old_tx.debt_paid_amount_minor, 0) > p_amount_minor
       OR coalesce(old_tx.debt_paid_amount_base_minor, 0) > p_amount_base_minor THEN
      RAISE EXCEPTION 'Debt progress cannot exceed the original transaction amounts';
    END IF;
    IF p_debt_status = 'SETTLED'
       AND coalesce(old_tx.debt_paid_amount_minor, 0) <> p_amount_minor THEN
      RAISE EXCEPTION 'Settled debt progress must equal the original transaction amount';
    END IF;
    IF p_debt_status = 'OPEN'
       AND coalesce(old_tx.debt_paid_amount_minor, 0) >= p_amount_minor THEN
      RAISE EXCEPTION 'Open debt progress must leave a remaining amount';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = old_tx.account_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized to update this transaction';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_account_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Account not found or unauthorized';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_account_id AND currency_code IS DISTINCT FROM p_currency_code
  ) THEN
    RAISE EXCEPTION 'Account currency must match transaction currency';
  END IF;
  IF p_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = p_category_id AND (is_default = true OR user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Category not found or unauthorized';
  END IF;

  -- Lock both account rows before changing either balance.
  PERFORM 1 FROM public.accounts
  WHERE id IN (old_tx.account_id, p_account_id)
  ORDER BY id
  FOR UPDATE;

  old_delta := CASE
    WHEN old_tx.is_debt THEN 0
    WHEN old_tx.type IN ('INCOME', 'TRANSFER_IN') THEN old_tx.amount_minor
    ELSE -old_tx.amount_minor
  END;
  new_delta := CASE
    WHEN p_is_debt THEN 0
    WHEN p_type IN ('INCOME', 'TRANSFER_IN') THEN p_amount_minor
    ELSE -p_amount_minor
  END;

  UPDATE public.accounts
  SET balance = balance - old_delta, updated_at = now()
  WHERE id = old_tx.account_id;
  UPDATE public.accounts
  SET balance = balance + new_delta, updated_at = now()
  WHERE id = p_account_id;

  UPDATE public.transactions
  SET account_id = p_account_id,
      category_id = p_category_id,
      type = p_type,
      currency_code = p_currency_code,
      amount_minor = p_amount_minor,
      amount_base_minor = p_amount_base_minor,
      exchange_rate = p_exchange_rate,
      date = p_date,
      description = p_description,
      note = p_note,
      tags = p_tags,
      is_debt = p_is_debt,
      debt_direction = CASE WHEN p_is_debt THEN p_debt_direction ELSE NULL END,
      debt_status = CASE WHEN p_is_debt THEN p_debt_status ELSE NULL END,
      debt_paid_amount_minor = CASE WHEN p_is_debt THEN coalesce(old_tx.debt_paid_amount_minor, 0) ELSE 0 END,
      debt_paid_amount_base_minor = CASE WHEN p_is_debt THEN coalesce(old_tx.debt_paid_amount_base_minor, 0) ELSE 0 END,
      counterparty_name = CASE WHEN p_is_debt THEN p_counterparty_name ELSE NULL END,
      settled_at = CASE WHEN p_is_debt THEN p_settled_at ELSE NULL END,
      updated_at = now()
  WHERE id = p_transaction_id
  RETURNING * INTO updated_tx;

  RETURN updated_tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_transaction_and_adjust_balance(transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_tx public.transactions;
  linked_tx public.transactions;
  delta bigint;
BEGIN
  SELECT * INTO target_tx FROM public.transactions WHERE id = transaction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts WHERE id = target_tx.account_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized to delete this transaction';
  END IF;

  delta := CASE
    WHEN target_tx.is_debt THEN 0
    WHEN target_tx.type IN ('INCOME', 'TRANSFER_IN') THEN target_tx.amount_minor
    ELSE -target_tx.amount_minor
  END;
  UPDATE public.accounts SET balance = balance - delta, updated_at = now()
  WHERE id = target_tx.account_id;

  -- A deducted debt owns a tagged expense. Remove it and reverse its balance too.
  FOR linked_tx IN
    SELECT * FROM public.transactions
    WHERE tags @> ARRAY['debt:' || target_tx.id::text]::text[]
    FOR UPDATE
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.accounts
      WHERE id = linked_tx.account_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Unauthorized linked transaction';
    END IF;
    delta := CASE
      WHEN linked_tx.type IN ('INCOME', 'TRANSFER_IN') THEN linked_tx.amount_minor
      ELSE -linked_tx.amount_minor
    END;
    UPDATE public.accounts SET balance = balance - delta, updated_at = now()
    WHERE id = linked_tx.account_id;
    DELETE FROM public.transactions WHERE id = linked_tx.id;
  END LOOP;

  DELETE FROM public.transactions WHERE id = target_tx.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_goal_contribution_atomic(
  p_goal_id uuid,
  p_delta_base_minor bigint,
  p_note text
)
RETURNS public.goals
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  goal_row public.goals;
  updated_goal public.goals;
  new_total bigint;
BEGIN
  IF p_delta_base_minor = 0 THEN
    RAISE EXCEPTION 'Contribution amount must be non-zero';
  END IF;

  SELECT * INTO goal_row FROM public.goals
  WHERE id = p_goal_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Goal not found or unauthorized'; END IF;
  IF NOT goal_row.active THEN RAISE EXCEPTION 'Goal is inactive'; END IF;
  IF goal_row.account_id IS NOT NULL THEN
    RAISE EXCEPTION 'Linked-account goals do not accept manual contributions';
  END IF;

  SELECT coalesce(sum(delta_base_minor), 0) + p_delta_base_minor INTO new_total
  FROM public.goal_contributions
  WHERE goal_id = p_goal_id AND user_id = auth.uid();
  IF new_total < 0 THEN RAISE EXCEPTION 'Goal contributions cannot result in a negative balance'; END IF;

  INSERT INTO public.goal_contributions(goal_id, user_id, delta_base_minor, note, source)
  VALUES (p_goal_id, auth.uid(), p_delta_base_minor, p_note, 'manual');
  UPDATE public.goals SET current_base_minor = new_total, updated_at = now()
  WHERE id = p_goal_id RETURNING * INTO updated_goal;
  RETURN updated_goal;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_linked_goal_progress(p_goal_id uuid)
RETURNS public.goals
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  goal_row public.goals;
  account_row public.accounts;
  base_currency text;
  updated_goal public.goals;
BEGIN
  SELECT * INTO goal_row FROM public.goals
  WHERE id = p_goal_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Goal not found or unauthorized'; END IF;
  IF goal_row.account_id IS NULL THEN RETURN goal_row; END IF;

  SELECT * INTO account_row FROM public.accounts
  WHERE id = goal_row.account_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Linked account not found or unauthorized'; END IF;
  SELECT u.base_currency INTO base_currency FROM public.users u WHERE u.id = auth.uid();
  IF account_row.currency_code IS DISTINCT FROM base_currency THEN
    RAISE EXCEPTION 'Linked account currency must match the user base currency';
  END IF;

  UPDATE public.goals SET current_base_minor = greatest(0, account_row.balance), updated_at = now()
  WHERE id = p_goal_id RETURNING * INTO updated_goal;
  RETURN updated_goal;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_transaction_and_adjust_balance(uuid, uuid, uuid, text, text, bigint, bigint, numeric, date, text, text, text[], boolean, public.debt_direction, public.debt_status, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_transaction_and_adjust_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_goal_contribution_atomic(uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_linked_goal_progress(uuid) TO authenticated;

-- Relational ownership is enforced for direct table writes as well as RPCs.
CREATE OR REPLACE FUNCTION public.validate_goal_account_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id
  ) THEN RAISE EXCEPTION 'Goal account must belong to the goal owner'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS goals_account_owner_guard ON public.goals;
CREATE TRIGGER goals_account_owner_guard
BEFORE INSERT OR UPDATE OF account_id, user_id ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.validate_goal_account_owner();

CREATE OR REPLACE FUNCTION public.validate_goal_contribution_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.goals WHERE id = NEW.goal_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Goal contribution must belong to the goal owner';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS goal_contribution_owner_guard ON public.goal_contributions;
CREATE TRIGGER goal_contribution_owner_guard
BEFORE INSERT OR UPDATE OF goal_id, user_id ON public.goal_contributions
FOR EACH ROW EXECUTE FUNCTION public.validate_goal_contribution_owner();

COMMIT;
NOTIFY pgrst, 'reload schema';
