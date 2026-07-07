-- Migration: debt_balance_skip
-- 1. Adds app_flags (lightweight, read-only toggle table).
-- 2. Flips debt_balance_skip_enabled on AND replaces
--    create_transaction_and_adjust_balance with a version that honors it
--    inside a single transaction so the flag cannot be true while the RPC is
--    still legacy.
-- 3. Idempotently reverses legacy OPEN-debt balance deltas (guarded by
--    debt_balance_migrated) using a clock_timestamp cutoff so it never
--    re-touches a row created after the migration started.
--
-- All money is stored as integer minor units.

-- ===========================================================================
-- 1. app_flags table + RLS (read-only for authenticated, no write policy)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.app_flags (
  name text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flags_read ON public.app_flags;
CREATE POLICY flags_read
  ON public.app_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies on purpose: writes happen only via
-- service_role SQL (migrations or kill-switch scripts). Clients read the
-- flag name but cannot toggle it.

-- ===========================================================================
-- 2. Atomic flag-on + RPC skip guard
-- ===========================================================================
BEGIN;

-- Capture the legacy-window cutoff BEFORE the skip guard becomes visible.
-- `updated_at` stores the transaction timestamp of this pre-commit write,
-- which the reversal block reuses exactly after COMMIT.
INSERT INTO public.app_flags (name, enabled, updated_at)
VALUES ('debt_balance_cutoff', true, transaction_timestamp())
ON CONFLICT (name) DO UPDATE
SET enabled = EXCLUDED.enabled,
    updated_at = LEAST(public.app_flags.updated_at, EXCLUDED.updated_at);

-- Seed the skip flag in the same transaction so the new RPC can read it from
-- the start of its first invocation once the commit becomes visible.
INSERT INTO public.app_flags (name, enabled)
VALUES ('debt_balance_skip_enabled', true)
ON CONFLICT (name) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();

-- Replace the existing RPC (defined in
-- 20260304120000_add_debt_metadata_to_transactions.sql) with a version
-- whose balance adjustment respects the flag.
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
  p_note text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_is_debt boolean DEFAULT false,
  p_debt_direction public.debt_direction DEFAULT NULL,
  p_debt_status public.debt_status DEFAULT NULL,
  p_counterparty_name text DEFAULT NULL,
  p_settled_at timestamptz DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  created_transaction public.transactions;
  balance_delta bigint;
  v_skip_enabled boolean;
BEGIN
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

-- p2p_estimator_v2 default ON (design decision W5: default ON, kill via
-- UPDATE app_flags). Storing the flag here keeps the rollout in a single
-- transaction with the rest of the foundation.
INSERT INTO public.app_flags (name, enabled)
VALUES ('p2p_estimator_v2', true)
ON CONFLICT (name) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();

COMMIT;

-- ===========================================================================
-- 3. Idempotent OPEN-debt balance reversal
-- ===========================================================================
DO $$
DECLARE
  v_cutoff timestamptz;
  v_reversed_accounts bigint;
BEGIN
  -- Re-running this DO block after a successful first pass is a no-op
  -- because debt_balance_migrated is set to true and acts as the guard.
  IF EXISTS (
    SELECT 1 FROM public.app_flags
    WHERE name = 'debt_balance_migrated' AND enabled = true
  ) THEN
    RAISE NOTICE 'debt_balance_skip: reversal already applied, skipping';
    RETURN;
  END IF;

  SELECT updated_at
  INTO v_cutoff
  FROM public.app_flags
  WHERE name = 'debt_balance_cutoff';

  IF v_cutoff IS NULL THEN
    RAISE EXCEPTION
      'debt_balance_skip: missing debt_balance_cutoff flag; refusing reversal to avoid racing post-cutoff debts';
  END IF;

  -- Aggregate per-account deltas BEFORE applying them, so we update each
  -- account exactly once with a net reversal. Sign convention:
  --   legacy INCOME/TRANSFER_IN incremented balance by +amount_minor
  --   legacy EXPENSE/TRANSFER_OUT decremented balance by -amount_minor
  -- Reversal: balance -= legacy_delta  (so OPEN-debt deltas are removed)
  WITH deltas AS (
    SELECT
      account_id,
      SUM(
        CASE
          WHEN type IN ('INCOME', 'TRANSFER_IN') THEN amount_minor
          ELSE -amount_minor
        END
      ) AS legacy_delta
    FROM public.transactions
    WHERE is_debt = true
      AND coalesce(debt_status, 'OPEN') = 'OPEN'
      AND created_at < v_cutoff
    GROUP BY account_id
  )
  UPDATE public.accounts a
  SET balance = a.balance - d.legacy_delta,
      updated_at = now()
  FROM deltas d
  WHERE a.id = d.account_id;

  GET DIAGNOSTICS v_reversed_accounts = ROW_COUNT;

  INSERT INTO public.app_flags (name, enabled)
  VALUES
    ('debt_balance_migrated', true),
    ('debt_balance_migrated_at', true)
  ON CONFLICT (name) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();

  RAISE NOTICE 'debt_balance_skip: reversed deltas across % account(s)', v_reversed_accounts;
END
$$;

-- Reload PostgREST schema cache so the new RPC and policy are visible.
NOTIFY pgrst, 'reload schema';
