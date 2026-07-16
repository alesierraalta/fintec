-- Manual rollback for 20260706120000_debt_balance_skip.sql
-- This file reverses the debt_balance_skip migration by re-applying the
-- legacy OPEN-debt balance deltas that the original migration removed.
-- Run only AFTER `debt_balance_skip_enabled` has been flipped to false
-- (or you accept that new debts created after this revert will be
-- inconsistent with the flag).
--
-- All money is stored as integer minor units.

DO $$
DECLARE
  v_cutoff timestamptz := clock_timestamp();
  v_skip_enabled boolean;
  v_reapplied_accounts bigint;
BEGIN
  -- Guard: refuse to run while the skip flag is on. Re-applying deltas
  -- while the RPC still ignores them is a recipe for double-reversal.
  SELECT enabled INTO v_skip_enabled
  FROM public.app_flags
  WHERE name = 'debt_balance_skip_enabled';

  IF coalesce(v_skip_enabled, false) THEN
    RAISE EXCEPTION
      'revert_debt_balance_migration: debt_balance_skip_enabled is still true. '
      'Disable the flag first (UPDATE app_flags SET enabled=false WHERE name=''debt_balance_skip_enabled'';).';
  END IF;

  -- Re-apply the legacy delta so OPEN-debt rows once again touch
  -- account balances. Sign convention matches the legacy RPC:
  --   INCOME/TRANSFER_IN -> +amount_minor
  --   else               -> -amount_minor
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
  SET balance = a.balance + d.legacy_delta,
      updated_at = now()
  FROM deltas d
  WHERE a.id = d.account_id;

  GET DIAGNOSTICS v_reapplied_accounts = ROW_COUNT;

  -- Mark the migration as no longer applied so a re-run of the original
  -- forward migration would reverse again.
  UPDATE public.app_flags
  SET enabled = false, updated_at = now()
  WHERE name = 'debt_balance_migrated';

  RAISE NOTICE
    'revert_debt_balance_migration: re-applied deltas across % account(s)',
    v_reapplied_accounts;
END
$$;

NOTIFY pgrst, 'reload schema';
