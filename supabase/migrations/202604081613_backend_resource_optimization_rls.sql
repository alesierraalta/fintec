-- Phase 3 Task 3.1: Backend Resource Optimization - RLS Policy Rewrites
-- Purpose: rewrite hot auth.uid()-based policies to the initplan-safe
-- (select auth.uid()) pattern without changing existing authorization intent.
--
-- Notes:
-- - Keep the existing exchange_rates policies unchanged because they rely on
--   auth.role(), not auth.uid().
-- - Preserve stricter category soft-delete semantics introduced by the secure
--   category policies instead of reverting to the older permissive policy set.

BEGIN;

-- ========== USERS TABLE ==========
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (id = (select auth.uid()));

-- ========== ACCOUNTS TABLE ==========
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;

CREATE POLICY "Users can view own accounts" ON public.accounts
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own accounts" ON public.accounts
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own accounts" ON public.accounts
  FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own accounts" ON public.accounts
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- ========== TRANSACTIONS TABLE ==========
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT
  USING (
    (select auth.uid()) IN (
      SELECT accounts.user_id
      FROM public.accounts
      WHERE accounts.id = transactions.account_id
    )
  );

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) IN (
      SELECT accounts.user_id
      FROM public.accounts
      WHERE accounts.id = transactions.account_id
    )
  );

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE
  USING (
    (select auth.uid()) IN (
      SELECT accounts.user_id
      FROM public.accounts
      WHERE accounts.id = transactions.account_id
    )
  );

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE
  USING (
    (select auth.uid()) IN (
      SELECT accounts.user_id
      FROM public.accounts
      WHERE accounts.id = transactions.account_id
    )
  );

-- ========== CATEGORIES TABLE ==========
DROP POLICY IF EXISTS "category_select_secure" ON public.categories;
DROP POLICY IF EXISTS "category_insert_secure" ON public.categories;
DROP POLICY IF EXISTS "category_update_secure" ON public.categories;
DROP POLICY IF EXISTS "category_delete_secure" ON public.categories;

CREATE POLICY "category_select_secure" ON public.categories
  FOR SELECT
  USING (
    ((select auth.uid()) IS NOT NULL)
    AND (
      ((user_id = (select auth.uid())) AND (deleted_at IS NULL))
      OR ((is_default = true) AND (deleted_at IS NULL))
    )
  );

CREATE POLICY "category_insert_secure" ON public.categories
  FOR INSERT
  WITH CHECK (((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (is_default = false) AND (deleted_at IS NULL));

CREATE POLICY "category_update_secure" ON public.categories
  FOR UPDATE
  USING (((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (deleted_at IS NULL))
  WITH CHECK (((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (is_default = false) AND (deleted_at IS NULL));

CREATE POLICY "category_delete_secure" ON public.categories
  FOR UPDATE
  USING (((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (deleted_at IS NULL))
  WITH CHECK (((select auth.uid()) IS NOT NULL) AND (user_id = (select auth.uid())) AND (is_default = false) AND (deleted_at IS NOT NULL));

-- ========== TRANSFERS TABLE ==========
DROP POLICY IF EXISTS "Users can view own transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can insert own transfers" ON public.transfers;
DROP POLICY IF EXISTS "Users can delete own transfers" ON public.transfers;

CREATE POLICY "Users can view own transfers" ON public.transfers
  FOR SELECT
  USING (
    (select auth.uid()) IN (
      SELECT a.user_id
      FROM public.accounts a
      JOIN public.transactions t ON t.account_id = a.id
      WHERE t.id = transfers.from_transaction_id OR t.id = transfers.to_transaction_id
    )
  );

CREATE POLICY "Users can insert own transfers" ON public.transfers
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) IN (
      SELECT a.user_id
      FROM public.accounts a
      JOIN public.transactions t ON t.account_id = a.id
      WHERE t.id = transfers.from_transaction_id OR t.id = transfers.to_transaction_id
    )
  );

CREATE POLICY "Users can delete own transfers" ON public.transfers
  FOR DELETE
  USING (
    (select auth.uid()) IN (
      SELECT a.user_id
      FROM public.accounts a
      JOIN public.transactions t ON t.account_id = a.id
      WHERE t.id = transfers.from_transaction_id OR t.id = transfers.to_transaction_id
    )
  );

-- ========== RECURRING_TRANSACTIONS TABLE ==========
DROP POLICY IF EXISTS "Users can view own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can insert own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can update own recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can delete own recurring transactions" ON public.recurring_transactions;

CREATE POLICY "Users can view own recurring transactions" ON public.recurring_transactions
  FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own recurring transactions" ON public.recurring_transactions
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own recurring transactions" ON public.recurring_transactions
  FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own recurring transactions" ON public.recurring_transactions
  FOR DELETE
  USING (user_id = (select auth.uid()));

COMMIT;
