


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


-- Extensions required by the dumped objects below.
--
-- `supabase db dump --schema public` deliberately omits extension DDL because
-- the hosted platform provisions extensions outside the dumped schema. A local
-- stack has no such provisioning, so the baseline must install them itself:
-- the dump references `public.vector` (transactions.embedding) and the search
-- objects rely on trigram and unaccent support. Later migrations declare the
-- same extensions with IF NOT EXISTS, so these statements are idempotent and do
-- not change the applied order of anything that follows.
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."debt_direction" AS ENUM (
    'OWE',
    'OWED_TO_ME'
);


ALTER TYPE "public"."debt_direction" OWNER TO "postgres";


CREATE TYPE "public"."debt_status" AS ENUM (
    'OPEN',
    'SETTLED'
);


ALTER TYPE "public"."debt_status" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "target_base_minor" bigint NOT NULL,
    "current_base_minor" bigint DEFAULT 0 NOT NULL,
    "target_date" "date",
    "account_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_goal_contribution_atomic"("p_goal_id" "uuid", "p_delta_base_minor" bigint, "p_note" "text") RETURNS "public"."goals"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."add_goal_contribution_atomic"("p_goal_id" "uuid", "p_delta_base_minor" bigint, "p_note" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount_minor" bigint NOT NULL,
    "currency_code" "text" DEFAULT 'VES'::"text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "receipt_url" "text",
    "receipt_filename" "text",
    "admin_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "transaction_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "payment_method" "text",
    CONSTRAINT "payment_orders_payment_method_check" CHECK ((("payment_method" IS NULL) OR ("payment_method" = ANY (ARRAY['ubii'::"text", 'pagoflash'::"text", 'binance_pay'::"text"])))),
    CONSTRAINT "payment_orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'pending_review'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."payment_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payment_orders"."payment_method" IS 'Provider used for payment: ubii, pagoflash, or binance_pay. NULL indicates legacy manual transfer.';



CREATE OR REPLACE FUNCTION "public"."approve_payment_order"("p_order_id" "uuid", "p_admin_id" "uuid", "p_account_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."payment_orders"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."approve_payment_order"("p_order_id" "uuid", "p_admin_id" "uuid", "p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_execution_date"("p_current_date" "date", "p_frequency" "text", "p_interval_count" integer) RETURNS "date"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      RETURN p_current_date + (p_interval_count || ' days')::INTERVAL;
    WHEN 'weekly' THEN
      RETURN p_current_date + (p_interval_count || ' weeks')::INTERVAL;
    WHEN 'monthly' THEN
      RETURN p_current_date + (p_interval_count || ' months')::INTERVAL;
    WHEN 'yearly' THEN
      RETURN p_current_date + (p_interval_count || ' years')::INTERVAL;
    ELSE
      RAISE EXCEPTION 'Invalid frequency: %', p_frequency;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."calculate_next_execution_date"("p_current_date" "date", "p_frequency" "text", "p_interval_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_checkpoints"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM agent_checkpoints
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY thread_id, user_id 
                ORDER BY created_at DESC
            ) as rn
            FROM agent_checkpoints
        ) sub
        WHERE rn > 10
    );
END;
$$;


ALTER FUNCTION "public"."cleanup_old_checkpoints"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_logs"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM agent_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_verification_results"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM verification_results
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_verification_results"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_debt_with_deduction"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[], "p_debt_direction" "public"."debt_direction" DEFAULT NULL::"public"."debt_direction", "p_debt_status" "public"."debt_status" DEFAULT NULL::"public"."debt_status", "p_counterparty_name" "text" DEFAULT NULL::"text", "p_settled_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_deduct" boolean DEFAULT false, "p_source_account_id" "uuid" DEFAULT NULL::"uuid", "p_source_category_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_debt_with_deduction"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone, "p_deduct" boolean, "p_source_account_id" "uuid", "p_source_category_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "uuid", "p_frequency" "text", "p_interval_count" integer DEFAULT 1, "p_end_date" "date" DEFAULT NULL::"date", "p_recurring_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  t RECORD;
  recurring_id UUID;
  next_date DATE;
BEGIN
  SELECT 
    trx.*,
    a.user_id
  INTO t
  FROM public.transactions trx
  JOIN public.accounts a ON trx.account_id = a.id
  WHERE trx.id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  next_date := public.calculate_next_execution_date(t.date, p_frequency, p_interval_count);

  INSERT INTO public.recurring_transactions (
    user_id, name, type, account_id, category_id, currency_code,
    amount_minor, description, note, tags, frequency, interval_count,
    start_date, end_date, next_execution_date
  ) VALUES (
    t.user_id, COALESCE(p_recurring_name, t.description || ' - Recurrente'),
    t.type, t.account_id, t.category_id, t.currency_code,
    t.amount_minor, t.description, t.note, t.tags,
    p_frequency, p_interval_count, t.date, p_end_date, next_date
  ) RETURNING id INTO recurring_id;

  RETURN recurring_id;
END;
$$;


ALTER FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "uuid", "p_frequency" "text", "p_interval_count" integer, "p_end_date" "date", "p_recurring_name" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "account_id" "uuid",
    "category_id" "uuid",
    "currency_code" "text" NOT NULL,
    "amount_minor" bigint NOT NULL,
    "amount_base_minor" bigint NOT NULL,
    "exchange_rate" numeric(10,6) DEFAULT 1 NOT NULL,
    "date" "date" NOT NULL,
    "description" "text",
    "note" "text",
    "tags" "text"[],
    "transfer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_debt" boolean DEFAULT false NOT NULL,
    "debt_direction" "public"."debt_direction",
    "debt_status" "public"."debt_status",
    "counterparty_name" "text",
    "settled_at" timestamp with time zone,
    "debt_paid_amount_minor" bigint DEFAULT 0 NOT NULL,
    "debt_paid_amount_base_minor" bigint DEFAULT 0 NOT NULL,
    "debt_remaining_amount_minor" bigint GENERATED ALWAYS AS (
CASE
    WHEN "is_debt" THEN ("amount_minor" - "debt_paid_amount_minor")
    ELSE (0)::bigint
END) STORED,
    "debt_remaining_amount_base_minor" bigint GENERATED ALWAYS AS (
CASE
    WHEN "is_debt" THEN ("amount_base_minor" - "debt_paid_amount_base_minor")
    ELSE (0)::bigint
END) STORED,
    "embedding" "public"."vector"(768),
    CONSTRAINT "check_debt_paid_max" CHECK (((NOT "is_debt") OR (("debt_paid_amount_minor" <= "amount_minor") AND ("debt_paid_amount_base_minor" <= "amount_base_minor")))),
    CONSTRAINT "check_debt_paid_positive" CHECK ((("debt_paid_amount_minor" >= 0) AND ("debt_paid_amount_base_minor" >= 0))),
    CONSTRAINT "check_non_debt_paid_zero" CHECK (("is_debt" OR (("debt_paid_amount_minor" = 0) AND ("debt_paid_amount_base_minor" = 0)))),
    CONSTRAINT "transactions_debt_direction_required" CHECK (((("is_debt" = false) AND ("debt_direction" IS NULL)) OR (("is_debt" = true) AND ("debt_direction" IS NOT NULL)))),
    CONSTRAINT "transactions_settled_requires_settled_at" CHECK ((("debt_status" IS DISTINCT FROM 'SETTLED'::"public"."debt_status") OR ("settled_at" IS NOT NULL))),
    CONSTRAINT "transactions_type_check" CHECK (("type" = ANY (ARRAY['INCOME'::"text", 'EXPENSE'::"text", 'TRANSFER_OUT'::"text", 'TRANSFER_IN'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" integer, "p_amount_base_minor" integer, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[]) RETURNS "public"."transactions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" integer, "p_amount_base_minor" integer, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[], "p_is_debt" boolean DEFAULT false, "p_debt_direction" "public"."debt_direction" DEFAULT NULL::"public"."debt_direction", "p_debt_status" "public"."debt_status" DEFAULT NULL::"public"."debt_status", "p_counterparty_name" "text" DEFAULT NULL::"text", "p_settled_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS "public"."transactions"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_transaction_v2"("p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text" DEFAULT NULL::"text", "p_tags" "text"[] DEFAULT NULL::"text"[], "p_is_debt" boolean DEFAULT false, "p_debt_direction" "public"."debt_direction" DEFAULT NULL::"public"."debt_direction", "p_debt_status" "public"."debt_status" DEFAULT NULL::"public"."debt_status", "p_counterparty_name" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_txn_id UUID;
  v_result JSON;
BEGIN
  -- Insert transaction
  INSERT INTO public.transactions (
    type, account_id, category_id, currency_code, amount_minor, amount_base_minor,
    exchange_rate, date, description, note, tags, is_debt, debt_direction, debt_status, counterparty_name
  ) VALUES (
    p_type, p_account_id, p_category_id, p_currency_code, p_amount_minor, p_amount_base_minor,
    p_exchange_rate, p_date, p_description, p_note, p_tags, p_is_debt, p_debt_direction, p_debt_status, p_counterparty_name
  ) RETURNING id INTO v_txn_id;

  -- Adjust account balance
  -- amount_minor is expected to be negative for expenses and positive for income/transfer_in
  UPDATE public.accounts
  SET balance = balance + p_amount_minor,
      updated_at = NOW()
  WHERE id = p_account_id;

  SELECT row_to_json(t) INTO v_result FROM public.transactions t WHERE id = v_txn_id;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."create_transaction_v2"("p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_transfer"("p_user_id" "uuid", "p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_major" numeric, "p_description" "text" DEFAULT 'Transferencia'::"text", "p_date" "date" DEFAULT CURRENT_DATE, "p_exchange_rate" numeric DEFAULT 1.0, "p_rate_source" "text" DEFAULT NULL::"text", "p_note" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_transfer"("p_user_id" "uuid", "p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_major" numeric, "p_description" "text", "p_date" "date", "p_exchange_rate" numeric, "p_rate_source" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_transaction_and_adjust_balance"("transaction_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."delete_transaction_and_adjust_balance"("transaction_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_transaction_v2"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_amount_minor BIGINT;
  v_account_id UUID;
BEGIN
  -- Get values to adjust balance
  SELECT amount_minor, account_id INTO v_amount_minor, v_account_id
  FROM public.transactions WHERE id = p_id;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Revert balance
  UPDATE public.accounts SET balance = balance - v_amount_minor WHERE id = v_account_id;

  -- Delete transaction
  DELETE FROM public.transactions WHERE id = p_id;
END;
$$;


ALTER FUNCTION "public"."delete_transaction_v2"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_transactions_v2"("p_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Revert balances for each transaction before deletion
  -- amount_minor is expected to be positive for income and negative for expense
  UPDATE public.accounts a
  SET balance = a.balance - sub.total_adjustment,
      updated_at = NOW()
  FROM (
    SELECT account_id, SUM(amount_minor) as total_adjustment
    FROM public.transactions
    WHERE id = ANY(p_ids)
    GROUP BY account_id
  ) sub
  WHERE a.id = sub.account_id;

  -- Delete all transactions
  DELETE FROM public.transactions WHERE id = ANY(p_ids);
END;
$$;


ALTER FUNCTION "public"."delete_transactions_v2"("p_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_due_recurring_transaction"("p_recurring_transaction_id" "uuid", "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_execution_date" "date", "p_next_execution_date" "date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."execute_due_recurring_transaction"("p_recurring_transaction_id" "uuid", "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_execution_date" "date", "p_next_execution_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_transfer"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_minor" bigint, "p_converted_amount_minor" bigint, "p_date" "date", "p_description" "text", "p_category_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_from_txn_id UUID;
  v_to_txn_id UUID;
  v_transfer_id UUID := uuid_generate_v4();
  v_from_account_currency TEXT;
  v_to_account_currency TEXT;
  v_from_account_user_id UUID;
  v_to_account_user_id UUID;
  v_amount_base_minor_out BIGINT;
  v_amount_base_minor_in BIGINT;
  v_exchange_rate_out DECIMAL(10, 6);
  v_exchange_rate_in DECIMAL(10, 6);
BEGIN
  -- Basic validation
  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;

  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Source and destination accounts must be different';
  END IF;

  -- Get account info and verify ownership (Implicitly handled by RLS, but we check to be safe)
  SELECT currency_code, user_id INTO v_from_account_currency, v_from_account_user_id
  FROM public.accounts WHERE id = p_from_account_id;
  
  SELECT currency_code, user_id INTO v_to_account_currency, v_to_account_user_id
  FROM public.accounts WHERE id = p_to_account_id;

  IF v_from_account_user_id IS NULL OR v_to_account_user_id IS NULL THEN
    RAISE EXCEPTION 'One or both accounts not found or unauthorized';
  END IF;

  IF v_from_account_user_id <> v_to_account_user_id THEN
    RAISE EXCEPTION 'Cannot transfer between different users';
  END IF;

  -- For now, we assume simple conversion or same currency if p_converted_amount_minor is NULL
  -- In a more advanced version, we'd fetch exchange rates here if not provided.
  -- amount_base_minor should be calculated based on user's base currency, but for simplicity
  -- in this slice, we'll use the provided amounts.
  
  -- Insert TRANSFER_OUT
  INSERT INTO public.transactions (
    type, account_id, currency_code, amount_minor, amount_base_minor, 
    date, description, category_id, transfer_id
  ) VALUES (
    'TRANSFER_OUT', p_from_account_id, v_from_account_currency, -p_amount_minor, -p_amount_minor, 
    p_date, p_description, p_category_id, v_transfer_id
  ) RETURNING id INTO v_from_txn_id;

  -- Insert TRANSFER_IN
  INSERT INTO public.transactions (
    type, account_id, currency_code, amount_minor, amount_base_minor, 
    date, description, category_id, transfer_id
  ) VALUES (
    'TRANSFER_IN', p_to_account_id, v_to_account_currency, COALESCE(p_converted_amount_minor, p_amount_minor), COALESCE(p_converted_amount_minor, p_amount_minor), 
    p_date, p_description, p_category_id, v_transfer_id
  ) RETURNING id INTO v_to_txn_id;

  -- Update balances
  UPDATE public.accounts SET balance = balance - p_amount_minor WHERE id = p_from_account_id;
  UPDATE public.accounts SET balance = balance + COALESCE(p_converted_amount_minor, p_amount_minor) WHERE id = p_to_account_id;

  RETURN json_build_object(
    'transfer_id', v_transfer_id,
    'from_transaction_id', v_from_txn_id,
    'to_transaction_id', v_to_txn_id
  );
END;
$$;


ALTER FUNCTION "public"."execute_transfer"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_minor" bigint, "p_converted_amount_minor" bigint, "p_date" "date", "p_description" "text", "p_category_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_account_performance"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("account_id" "uuid", "account_name" "text", "account_type" "text", "currency_code" "text", "starting_balance" numeric, "ending_balance" numeric, "total_income" numeric, "total_expense" numeric, "net_change" numeric, "transaction_count" integer)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  WITH account_transactions AS (
    SELECT 
      a.id as account_id, a.name as account_name, a.type as account_type,
      a.currency_code, a.balance as current_balance,
      t.amount_base_minor, t.type as transaction_type, t.date
    FROM public.accounts a
    LEFT JOIN public.transactions t ON a.id = t.account_id 
      AND t.date BETWEEN p_start_date AND p_end_date
    WHERE a.user_id = p_user_id AND a.active = true
  ),
  account_summaries AS (
    SELECT 
      account_id, account_name, account_type, currency_code, current_balance,
      SUM(CASE WHEN transaction_type IN ('INCOME', 'TRANSFER_IN') THEN amount_base_minor ELSE 0 END) as total_income,
      SUM(CASE WHEN transaction_type IN ('EXPENSE', 'TRANSFER_OUT') THEN amount_base_minor ELSE 0 END) as total_expense,
      COUNT(amount_base_minor) as transaction_count
    FROM account_transactions
    GROUP BY account_id, account_name, account_type, currency_code, current_balance
  )
  SELECT 
    account_id, account_name, account_type, currency_code,
    (current_balance - total_income + total_expense) as starting_balance,
    current_balance as ending_balance, total_income, total_expense,
    (total_income - total_expense) as net_change, transaction_count
  FROM account_summaries
  ORDER BY net_change DESC;
END;
$$;


ALTER FUNCTION "public"."get_account_performance"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_account_performance"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") IS 'Optimized account performance summary';



CREATE OR REPLACE FUNCTION "public"."get_cash_flow_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_group_by" "text" DEFAULT 'day'::"text") RETURNS TABLE("period_start" "date", "period_end" "date", "total_income" numeric, "total_expense" numeric, "net_flow" numeric, "running_balance" numeric)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
DECLARE
  group_format TEXT;
BEGIN
  CASE p_group_by
    WHEN 'day' THEN group_format := 'YYYY-MM-DD';
    WHEN 'week' THEN group_format := 'IYYY-"W"IW';
    WHEN 'month' THEN group_format := 'YYYY-MM';
    ELSE group_format := 'YYYY-MM-DD';
  END CASE;

  RETURN QUERY
  WITH user_accounts AS (
    SELECT id FROM public.accounts WHERE user_id = p_user_id AND active = true
  ),
  daily_totals AS (
    SELECT 
      t.date,
      SUM(CASE WHEN t.type IN ('INCOME', 'TRANSFER_IN') THEN t.amount_base_minor ELSE 0 END) as income,
      SUM(CASE WHEN t.type IN ('EXPENSE', 'TRANSFER_OUT') THEN t.amount_base_minor ELSE 0 END) as expense
    FROM public.transactions t
    JOIN user_accounts ua ON t.account_id = ua.id
    WHERE t.date BETWEEN p_start_date AND p_end_date
    GROUP BY t.date
    ORDER BY t.date
  ),
  grouped_totals AS (
    SELECT 
      CASE p_group_by
        WHEN 'day' THEN date
        WHEN 'week' THEN DATE_TRUNC('week', date)::DATE
        WHEN 'month' THEN DATE_TRUNC('month', date)::DATE
        ELSE date
      END as period_start,
      CASE p_group_by
        WHEN 'day' THEN date
        WHEN 'week' THEN (DATE_TRUNC('week', date) + INTERVAL '6 days')::DATE
        WHEN 'month' THEN (DATE_TRUNC('month', date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE
        ELSE date
      END as period_end,
      SUM(income) as total_income,
      SUM(expense) as total_expense
    FROM daily_totals
    GROUP BY 
      CASE p_group_by
        WHEN 'day' THEN date
        WHEN 'week' THEN DATE_TRUNC('week', date)::DATE
        WHEN 'month' THEN DATE_TRUNC('month', date)::DATE
        ELSE date
      END
    ORDER BY period_start
  )
  SELECT 
    period_start, period_end, total_income, total_expense,
    (total_income - total_expense) as net_flow,
    SUM(total_income - total_expense) OVER (ORDER BY period_start) as running_balance
  FROM grouped_totals;
END;
$$;


ALTER FUNCTION "public"."get_cash_flow_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_group_by" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cash_flow_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_group_by" "text") IS 'Optimized cash flow data with flexible date grouping';



CREATE OR REPLACE FUNCTION "public"."get_category_breakdown"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text" DEFAULT NULL::"text") RETURNS TABLE("category_id" "uuid", "category_name" "text", "category_kind" "text", "total_amount" numeric, "transaction_count" integer, "percentage" numeric)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  WITH user_accounts AS (
    SELECT id FROM public.accounts WHERE user_id = p_user_id AND active = true
  ),
  category_totals AS (
    SELECT 
      t.category_id, c.name as category_name, c.kind as category_kind,
      SUM(t.amount_base_minor) as total_amount, COUNT(*) as transaction_count
    FROM public.transactions t
    JOIN user_accounts ua ON t.account_id = ua.id
    LEFT JOIN public.categories c ON t.category_id = c.id
    WHERE t.date BETWEEN p_start_date AND p_end_date
      AND (p_type IS NULL OR t.type = p_type)
    GROUP BY t.category_id, c.name, c.kind
  ),
  total_sum AS (
    SELECT SUM(total_amount) as grand_total FROM category_totals
  )
  SELECT 
    ct.category_id, ct.category_name, ct.category_kind,
    ct.total_amount, ct.transaction_count,
    CASE 
      WHEN ts.grand_total > 0 THEN (ct.total_amount / ts.grand_total * 100)
      ELSE 0
    END as percentage
  FROM category_totals ct
  CROSS JOIN total_sum ts
  ORDER BY ct.total_amount DESC;
END;
$$;


ALTER FUNCTION "public"."get_category_breakdown"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_category_breakdown"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text") IS 'Optimized category breakdown with percentages';



CREATE OR REPLACE FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "p_year" integer, "p_month" integer) RETURNS TABLE("total_income" numeric, "total_expense" numeric, "transaction_count" integer, "top_categories" "jsonb", "account_breakdown" "jsonb")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  WITH user_accounts AS (
    SELECT id FROM public.accounts WHERE user_id = p_user_id AND active = true
  ),
  monthly_transactions AS (
    SELECT 
      t.type, t.amount_base_minor, t.category_id, t.account_id, c.name as category_name
    FROM public.transactions t
    JOIN user_accounts ua ON t.account_id = ua.id
    LEFT JOIN public.categories c ON t.category_id = c.id
    WHERE EXTRACT(YEAR FROM t.date) = p_year AND EXTRACT(MONTH FROM t.date) = p_month
  ),
  category_totals AS (
    SELECT category_id, category_name, SUM(amount_base_minor) as total
    FROM monthly_transactions
    WHERE type = 'EXPENSE'
    GROUP BY category_id, category_name
    ORDER BY total DESC
    LIMIT 5
  ),
  account_totals AS (
    SELECT account_id,
      SUM(CASE WHEN type IN ('INCOME', 'TRANSFER_IN') THEN amount_base_minor ELSE 0 END) as income,
      SUM(CASE WHEN type IN ('EXPENSE', 'TRANSFER_OUT') THEN amount_base_minor ELSE 0 END) as expense
    FROM monthly_transactions
    GROUP BY account_id
  )
  SELECT 
    COALESCE(SUM(CASE WHEN type IN ('INCOME', 'TRANSFER_IN') THEN amount_base_minor ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN type IN ('EXPENSE', 'TRANSFER_OUT') THEN amount_base_minor ELSE 0 END), 0) as total_expense,
    COUNT(*)::INT as transaction_count,
    COALESCE(jsonb_agg(jsonb_build_object('category_id', category_id, 'category_name', category_name, 'total', total)) FILTER (WHERE category_id IS NOT NULL), '[]'::jsonb) as top_categories,
    COALESCE(jsonb_agg(jsonb_build_object('account_id', account_id, 'income', income, 'expense', expense)), '[]'::jsonb) as account_breakdown
  FROM monthly_transactions
  LEFT JOIN category_totals ON monthly_transactions.category_id = category_totals.category_id
  LEFT JOIN account_totals ON monthly_transactions.account_id = account_totals.account_id;
END;
$$;


ALTER FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "p_year" integer, "p_month" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "p_year" integer, "p_month" integer) IS 'Optimized monthly summary with server-side aggregation';



CREATE OR REPLACE FUNCTION "public"."get_user_categories_with_count"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "kind" "text", "color" "text", "icon" "text", "parent_id" "uuid", "active" boolean, "is_default" boolean, "transaction_count" bigint, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify caller matches requested user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized access to user categories';
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.kind,
    c.color,
    c.icon,
    c.parent_id,
    c.active,
    c.is_default,
    COUNT(t.id) as transaction_count,
    c.created_at,
    c.updated_at
  FROM categories c
  LEFT JOIN transactions t ON t.category_id = c.id AND t.deleted_at IS NULL
  WHERE (c.user_id = p_user_id OR c.is_default = true) 
    AND c.deleted_at IS NULL
    AND c.active = true
  GROUP BY c.id, c.name, c.kind, c.color, c.icon, c.parent_id, c.active, c.is_default, c.created_at, c.updated_at
  ORDER BY c.is_default DESC, c.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_categories_with_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    new.id, 
    new.email, 
    split_part(new.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_order_paid"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Solo ejecutar si el status cambió a 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Actualizar el tier del usuario basado en la orden
    UPDATE public.users 
    SET tier = NEW.service_name,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_order_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hybrid_search_transactions"("p_query_embedding" "public"."vector", "p_query_text" "text", "p_match_count" integer DEFAULT 20, "p_rrf_k" integer DEFAULT 50, "p_w_vec" double precision DEFAULT 1.0, "p_w_fts" double precision DEFAULT 1.0, "p_w_trgm" double precision DEFAULT 0.5) RETURNS TABLE("id" "uuid", "description" "text", "amount_base_minor" bigint, "date" "date", "score" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  return query
  with vector_matches as (
    select t.id, row_number() over (order by t.embedding <=> p_query_embedding, t.id) as rnk
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where a.user_id = auth.uid()
      and t.embedding is not null
    order by t.embedding <=> p_query_embedding, t.id
    limit 50
  ),
  fts_matches as (
    select
      t.id,
      row_number() over (
        order by ts_rank(
          to_tsvector('es_unaccent', coalesce(t.description, '') || ' ' || coalesce(t.note, '')),
          websearch_to_tsquery('es_unaccent', p_query_text)
        ) desc, t.id
      ) as rnk
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where a.user_id = auth.uid()
      and to_tsvector('es_unaccent', coalesce(t.description, '') || ' ' || coalesce(t.note, ''))
        @@ websearch_to_tsquery('es_unaccent', p_query_text)
    order by ts_rank(
      to_tsvector('es_unaccent', coalesce(t.description, '') || ' ' || coalesce(t.note, '')),
      websearch_to_tsquery('es_unaccent', p_query_text)
    ) desc, t.id
    limit 50
  ),
  trgm_matches as (
    -- Filter and rank both use word_similarity (via the <% threshold
    -- operator) instead of the default trigram % operator (which is
    -- backed by similarity(), a different metric), so the recall set and
    -- its ranking agree on the same similarity function.
    select t.id, row_number() over (order by word_similarity(p_query_text, t.description) desc, t.id) as rnk
    from public.transactions t
    join public.accounts a on a.id = t.account_id
    where a.user_id = auth.uid()
      and p_query_text <% t.description
    order by word_similarity(p_query_text, t.description) desc, t.id
    limit 50
  ),
  fused as (
    select legs.txn_id, sum(legs.leg_score) as rrf_score
    from (
      select vm.id as txn_id, p_w_vec / (p_rrf_k + vm.rnk) as leg_score from vector_matches vm
      union all
      select fm.id as txn_id, p_w_fts / (p_rrf_k + fm.rnk) as leg_score from fts_matches fm
      union all
      select tm.id as txn_id, p_w_trgm / (p_rrf_k + tm.rnk) as leg_score from trgm_matches tm
    ) legs
    group by legs.txn_id
  )
  select t.id, t.description, t.amount_base_minor, t.date, f.rrf_score as score
  from fused f
  join public.transactions t on t.id = f.txn_id
  order by f.rrf_score desc, f.txn_id
  limit p_match_count;
end;
$$;


ALTER FUNCTION "public"."hybrid_search_transactions"("p_query_embedding" "public"."vector", "p_query_text" "text", "p_match_count" integer, "p_rrf_k" integer, "p_w_vec" double precision, "p_w_fts" double precision, "p_w_trgm" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_recurring_transactions"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  rec RECORD;
  transaction_id UUID;
  processed_count INTEGER := 0;
BEGIN
  FOR rec IN 
    SELECT rt.*, a.user_id as account_user_id
    FROM public.recurring_transactions rt
    JOIN public.accounts a ON rt.account_id = a.id
    WHERE rt.is_active = true
      AND rt.next_execution_date <= CURRENT_DATE
      AND (rt.end_date IS NULL OR rt.end_date >= CURRENT_DATE)
  LOOP
    INSERT INTO public.transactions (
      type, account_id, category_id, currency_code, amount_minor,
      amount_base_minor, exchange_rate, date, description, note, tags
    ) VALUES (
      rec.type, rec.account_id, rec.category_id, rec.currency_code,
      rec.amount_minor, rec.amount_minor, 1.0, rec.next_execution_date,
      rec.description || ' (Recurrente)', rec.note, rec.tags
    ) RETURNING id INTO transaction_id;

    UPDATE public.recurring_transactions
    SET 
      next_execution_date = public.calculate_next_execution_date(
        next_execution_date, frequency, interval_count
      ),
      last_executed_at = NOW(),
      updated_at = NOW()
    WHERE id = rec.id;

    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$$;


ALTER FUNCTION "public"."process_recurring_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."query_transactions"("p_date_from" "date" DEFAULT NULL::"date", "p_date_to" "date" DEFAULT NULL::"date", "p_amount_min" bigint DEFAULT NULL::bigint, "p_amount_max" bigint DEFAULT NULL::bigint, "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_account_id" "uuid" DEFAULT NULL::"uuid", "p_aggregate" "text" DEFAULT 'sum'::"text", "p_group_by_field" "text" DEFAULT NULL::"text") RETURNS TABLE("group_key" "text", "result_value" numeric, "row_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  -- NULL is NOT IN (...) evaluates to NULL (falsy), so a NULL/omitted
  -- p_aggregate must be rejected explicitly or it would silently fall
  -- through to the sum branch below instead of raising.
  if p_aggregate is null or p_aggregate not in ('sum', 'count', 'avg', 'groupBy') then
    raise exception 'p_aggregate must be one of sum, count, avg, groupBy';
  end if;

  if p_aggregate = 'groupBy' then
    -- Same NULL-swallowing hazard as above: a NULL p_group_by_field must
    -- raise here, not silently reach the account-groupBy branch.
    if p_group_by_field is null or p_group_by_field not in ('category', 'account') then
      raise exception 'p_group_by_field must be one of category, account when p_aggregate = groupBy';
    end if;

    if p_group_by_field = 'category' then
      return query
      select
        c.name::text as group_key,
        sum(t.amount_base_minor)::numeric as result_value,
        count(*)::bigint as row_count
      from public.transactions t
      join public.accounts a on a.id = t.account_id
      left join public.categories c on c.id = t.category_id
      where a.user_id = auth.uid()
        and (p_date_from is null or t.date >= p_date_from)
        and (p_date_to is null or t.date <= p_date_to)
        and (p_amount_min is null or t.amount_base_minor >= p_amount_min)
        and (p_amount_max is null or t.amount_base_minor <= p_amount_max)
        and (p_category_id is null or t.category_id = p_category_id)
        and (p_account_id is null or t.account_id = p_account_id)
      group by c.name
      having count(*) > 0;
      return;
    else
      return query
      select
        a.name::text as group_key,
        sum(t.amount_base_minor)::numeric as result_value,
        count(*)::bigint as row_count
      from public.transactions t
      join public.accounts a on a.id = t.account_id
      where a.user_id = auth.uid()
        and (p_date_from is null or t.date >= p_date_from)
        and (p_date_to is null or t.date <= p_date_to)
        and (p_amount_min is null or t.amount_base_minor >= p_amount_min)
        and (p_amount_max is null or t.amount_base_minor <= p_amount_max)
        and (p_category_id is null or t.category_id = p_category_id)
        and (p_account_id is null or t.account_id = p_account_id)
      group by a.name
      having count(*) > 0;
      return;
    end if;
  end if;

  -- Non-groupBy aggregates: single row, no dynamic SQL — CASE branches over
  -- the closed set of supported modes.
  return query
  select
    null::text as group_key,
    case p_aggregate
      when 'sum' then coalesce(sum(t.amount_base_minor), 0)::numeric
      when 'avg' then coalesce(avg(t.amount_base_minor), 0)::numeric
      when 'count' then count(*)::numeric
      else coalesce(sum(t.amount_base_minor), 0)::numeric
    end as result_value,
    count(*)::bigint as row_count
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  where a.user_id = auth.uid()
    and (p_date_from is null or t.date >= p_date_from)
    and (p_date_to is null or t.date <= p_date_to)
    and (p_amount_min is null or t.amount_base_minor >= p_amount_min)
    and (p_amount_max is null or t.amount_base_minor <= p_amount_max)
    and (p_category_id is null or t.category_id = p_category_id)
    and (p_account_id is null or t.account_id = p_account_id);
end;
$$;


ALTER FUNCTION "public"."query_transactions"("p_date_from" "date", "p_date_to" "date", "p_amount_min" bigint, "p_amount_max" bigint, "p_category_id" "uuid", "p_account_id" "uuid", "p_aggregate" "text", "p_group_by_field" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_linked_goal_progress"("p_goal_id" "uuid") RETURNS "public"."goals"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."refresh_linked_goal_progress"("p_goal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_transaction_count"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.users
  SET transaction_count_current_month = 0,
      last_transaction_reset = NOW()
  WHERE DATE_TRUNC('month', last_transaction_reset) < DATE_TRUNC('month', NOW());
END;
$$;


ALTER FUNCTION "public"."reset_transaction_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[] DEFAULT NULL::"text"[], "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10) RETURNS TABLE("document_type" "text", "document_id" "uuid", "content" "text", "similarity" double precision, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    rd.document_type,
    rd.document_id,
    rd.content,
    1 - (rd.embedding <=> query_embedding) as similarity,
    rd.metadata
  FROM rag_documents rd
  WHERE rd.user_id = user_id_param
    AND rd.embedding IS NOT NULL
    AND (document_types IS NULL OR rd.document_type = ANY(document_types))
    AND (1 - (rd.embedding <=> query_embedding)) >= match_threshold
  ORDER BY rd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[], "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[] DEFAULT NULL::"text"[], "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10, "ef_search" integer DEFAULT 100) RETURNS TABLE("document_type" "text", "document_id" "uuid", "content" "text", "similarity" double precision, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Set ef_search for HNSW index (only applies to HNSW, ignored for IVFFlat)
  -- This must be set before the query executes
  SET LOCAL hnsw.ef_search = ef_search;
  
  RETURN QUERY
  SELECT
    rd.document_type,
    rd.document_id,
    rd.content,
    1 - (rd.embedding <=> query_embedding) as similarity,
    rd.metadata
  FROM rag_documents rd
  WHERE rd.user_id = user_id_param
    AND rd.embedding IS NOT NULL
    AND (document_types IS NULL OR rd.document_type = ANY(document_types))
    AND (1 - (rd.embedding <=> query_embedding)) >= match_threshold
  ORDER BY rd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[], "match_threshold" double precision, "match_count" integer, "ef_search" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_semantic_memories"("query_embedding" "public"."vector", "user_id_param" "uuid", "memory_types" "text"[] DEFAULT NULL::"text"[], "match_threshold" numeric DEFAULT 0.7, "match_count" integer DEFAULT 5, "ef_search" integer DEFAULT 100) RETURNS TABLE("id" "uuid", "memory_type" "text", "content" "text", "similarity" numeric, "importance_score" numeric, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.memory_type,
    sm.content,
    1 - (sm.embedding <=> query_embedding) AS similarity,
    sm.importance_score,
    sm.metadata
  FROM ai_semantic_memories sm
  WHERE sm.user_id = user_id_param
    AND (memory_types IS NULL OR sm.memory_type = ANY(memory_types))
    AND sm.embedding IS NOT NULL
    AND (1 - (sm.embedding <=> query_embedding)) >= match_threshold
  ORDER BY sm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_semantic_memories"("query_embedding" "public"."vector", "user_id_param" "uuid", "memory_types" "text"[], "match_threshold" numeric, "match_count" integer, "ef_search" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."settle_debt_partial"("p_debt_id" "uuid", "p_account_id" "uuid", "p_amount_minor" bigint, "p_date" "date", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_note" "text" DEFAULT NULL::"text", "p_settled_at" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_debt_row RECORD;
  v_account_row RECORD;
  v_amount_base_minor BIGINT;
  v_new_paid_minor BIGINT;
  v_new_paid_base BIGINT;
  v_new_status debt_status;
  v_settled_at TIMESTAMP WITH TIME ZONE;
  v_settlement_tx_id UUID;
  v_tx_type VARCHAR(20);
  v_result JSON;
BEGIN
  -- 1. Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 2. Lock debt row
  SELECT * INTO v_debt_row
  FROM transactions
  WHERE id = p_debt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debt transaction not found';
  END IF;

  IF NOT v_debt_row.is_debt THEN
    RAISE EXCEPTION 'Transaction is not a debt';
  END IF;

  IF v_debt_row.debt_status = 'SETTLED' THEN
    RAISE EXCEPTION 'Debt is already settled';
  END IF;

  -- Verify ownership of debt via its account
  IF NOT EXISTS (
    SELECT 1 FROM accounts a WHERE a.id = v_debt_row.account_id AND a.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized to settle this debt';
  END IF;

  -- 3. Verify settlement account
  SELECT * INTO v_account_row
  FROM accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND OR v_account_row.user_id != v_user_id THEN
    RAISE EXCEPTION 'Settlement account not found or unauthorized';
  END IF;

  IF NOT v_account_row.active THEN
    RAISE EXCEPTION 'Settlement account is not active';
  END IF;

  IF v_account_row.currency_code != v_debt_row.currency_code THEN
    RAISE EXCEPTION 'Settlement account currency must match debt currency';
  END IF;

  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be positive';
  END IF;

  IF p_amount_minor > v_debt_row.debt_remaining_amount_minor THEN
    RAISE EXCEPTION 'Settlement amount exceeds remaining debt';
  END IF;

  -- Validate category ownership if provided
  IF p_category_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p_category_id AND (c.user_id = v_user_id OR c.is_default = true)) THEN
      RAISE EXCEPTION 'Category not found or unauthorized';
    END IF;
  END IF;

  -- 4. Compute base minor amount for THIS payment using the original exchange rate
  v_amount_base_minor := ROUND(p_amount_minor / v_debt_row.exchange_rate);

  -- Determine transaction type for cash movement
  IF v_debt_row.debt_direction = 'OWED_TO_ME' THEN
    v_tx_type := 'INCOME';
  ELSE
    v_tx_type := 'EXPENSE';
  END IF;

  -- 5. Insert settlement transaction (non-debt cash movement)
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
    is_debt
  ) VALUES (
    v_tx_type,
    p_account_id,
    p_category_id,
    v_debt_row.currency_code,
    p_amount_minor,
    v_amount_base_minor,
    v_debt_row.exchange_rate,
    COALESCE(p_date, CURRENT_DATE),
    'Debt Settlement',
    p_note,
    false
  ) RETURNING id INTO v_settlement_tx_id;

  -- 6. Update account balance
  IF v_tx_type = 'INCOME' THEN
    UPDATE accounts SET balance = balance + p_amount_minor WHERE id = p_account_id;
  ELSE
    UPDATE accounts SET balance = balance - p_amount_minor WHERE id = p_account_id;
  END IF;

  -- 7. Insert ledger row
  INSERT INTO debt_settlements (
    debt_transaction_id,
    settlement_transaction_id,
    user_id,
    account_id,
    amount_minor,
    amount_base_minor,
    currency_code,
    debt_direction,
    settled_at
  ) VALUES (
    p_debt_id,
    v_settlement_tx_id,
    v_user_id,
    p_account_id,
    p_amount_minor,
    v_amount_base_minor,
    v_debt_row.currency_code,
    v_debt_row.debt_direction,
    COALESCE(p_settled_at, NOW())
  );

  -- 8. Update debt paid amounts and status.
  --    Derive the cumulative paid base from the remaining minor amount (rather
  --    than accumulating per-payment ROUND()s) so remaining base is exactly 0
  --    when the debt is fully paid and paid base never exceeds amount_base_minor.
  v_new_paid_minor := v_debt_row.debt_paid_amount_minor + p_amount_minor;
  v_new_paid_base :=
    v_debt_row.amount_base_minor
    - ROUND((v_debt_row.amount_minor - v_new_paid_minor) / v_debt_row.exchange_rate);

  IF v_new_paid_minor >= v_debt_row.amount_minor THEN
    v_new_status := 'SETTLED';
    v_settled_at := COALESCE(p_settled_at, NOW());
  ELSE
    v_new_status := 'OPEN';
    v_settled_at := NULL;
  END IF;

  UPDATE transactions
  SET
    debt_paid_amount_minor = v_new_paid_minor,
    debt_paid_amount_base_minor = v_new_paid_base,
    debt_status = v_new_status,
    settled_at = v_settled_at,
    updated_at = NOW()
  WHERE id = p_debt_id;

  -- 9. Return updated debt row as JSON directly (not via RECORD to avoid
  --    implicit cast that wraps the result in parentheses).
  SELECT row_to_json(t) INTO v_result
  FROM (SELECT * FROM transactions WHERE id = p_debt_id) t;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."settle_debt_partial"("p_debt_id" "uuid", "p_account_id" "uuid", "p_amount_minor" bigint, "p_date" "date", "p_category_id" "uuid", "p_note" "text", "p_settled_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_category"("p_category_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  category_owner UUID;
BEGIN
  -- Get category owner
  SELECT user_id INTO category_owner
  FROM categories 
  WHERE id = p_category_id AND deleted_at IS NULL;
  
  -- Verify ownership
  IF category_owner IS NULL THEN
    RAISE EXCEPTION 'Category not found or already deleted';
  END IF;
  
  IF category_owner != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Can only delete own categories';
  END IF;
  
  -- Check if category has transactions
  IF EXISTS (
    SELECT 1 FROM transactions 
    WHERE category_id = p_category_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot delete category with existing transactions';
  END IF;
  
  -- Perform soft delete
  UPDATE categories 
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = p_category_id;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."soft_delete_category"("p_category_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_session_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.users
  SET last_activity_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_session_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_memory_access"("memory_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE ai_semantic_memories
  SET 
    access_count = access_count + 1,
    last_accessed_at = NOW()
  WHERE id = memory_id;
END;
$$;


ALTER FUNCTION "public"."update_memory_access"("memory_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_message_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE ai_conversation_sessions
  SET 
    message_count = (
      SELECT COUNT(*) 
      FROM ai_conversation_messages 
      WHERE session_id = NEW.session_id
    ),
    last_message_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_session_message_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_transaction_and_adjust_balance"("p_transaction_id" "uuid", "p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) RETURNS "public"."transactions"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_transaction_and_adjust_balance"("p_transaction_id" "uuid", "p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_transaction_v2"("p_id" "uuid", "p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_old_amount_minor BIGINT;
  v_old_account_id UUID;
  v_result JSON;
BEGIN
  -- Get old values to adjust balance
  SELECT amount_minor, account_id INTO v_old_amount_minor, v_old_account_id
  FROM public.transactions WHERE id = p_id;

  IF v_old_account_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  -- Revert old balance
  UPDATE public.accounts SET balance = balance - v_old_amount_minor WHERE id = v_old_account_id;

  -- Update transaction
  UPDATE public.transactions SET
    type = p_type,
    account_id = p_account_id,
    category_id = p_category_id,
    currency_code = p_currency_code,
    amount_minor = p_amount_minor,
    amount_base_minor = p_amount_base_minor,
    exchange_rate = p_exchange_rate,
    date = p_date,
    description = p_description,
    note = p_note,
    tags = p_tags,
    is_debt = p_is_debt,
    debt_direction = p_debt_direction,
    debt_status = p_debt_status,
    counterparty_name = p_counterparty_name,
    updated_at = NOW()
  WHERE id = p_id;

  -- Apply new balance
  UPDATE public.accounts SET balance = balance + p_amount_minor WHERE id = p_account_id;

  SELECT row_to_json(t) INTO v_result FROM public.transactions t WHERE id = p_id;
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_transaction_v2"("p_id" "uuid", "p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_goal_account_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id
  ) THEN RAISE EXCEPTION 'Goal account must belong to the goal owner'; END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_goal_account_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_goal_contribution_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.goals WHERE id = NEW.goal_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Goal contribution must belong to the goal owner';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_goal_contribution_owner"() OWNER TO "postgres";


CREATE TEXT SEARCH CONFIGURATION "public"."es_unaccent" (
    PARSER = "pg_catalog"."default" );

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "asciiword" WITH "spanish_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "word" WITH "public"."unaccent", "spanish_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "numword" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "email" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "url" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "host" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "sfloat" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "version" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "hword_numpart" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "hword_part" WITH "public"."unaccent", "spanish_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "hword_asciipart" WITH "spanish_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "numhword" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "asciihword" WITH "spanish_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "hword" WITH "public"."unaccent", "spanish_stem";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "url_path" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "file" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "float" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "int" WITH "simple";

ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent"
    ADD MAPPING FOR "uint" WITH "simple";


ALTER TEXT SEARCH CONFIGURATION "public"."es_unaccent" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "currency_code" "text" NOT NULL,
    "balance" bigint DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "minimum_balance" bigint DEFAULT 0 NOT NULL,
    "alert_enabled" boolean DEFAULT false NOT NULL,
    CONSTRAINT "accounts_type_check" CHECK (("type" = ANY (ARRAY['CASH'::"text", 'BANK'::"text", 'CARD'::"text", 'INVESTMENT'::"text", 'SAVINGS'::"text", 'CRYPTO'::"text"])))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_checkpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "checkpoint_data" "jsonb" NOT NULL,
    "step_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agent_checkpoints" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_checkpoints" IS 'Stores conversation state checkpoints for durable execution';



CREATE TABLE IF NOT EXISTS "public"."agent_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "thread_id" "text",
    "level" "text" NOT NULL,
    "step" "text" NOT NULL,
    "data" "jsonb",
    "trace_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agent_logs_level_check" CHECK (("level" = ANY (ARRAY['INFO'::"text", 'WARN'::"text", 'ERROR'::"text"])))
);


ALTER TABLE "public"."agent_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."agent_logs" IS 'Structured logs for AI agent operations and debugging';



CREATE TABLE IF NOT EXISTS "public"."ai_conversation_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "text" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "importance_score" numeric(3,2) DEFAULT 0.5,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_conversation_messages_importance_score_check" CHECK ((("importance_score" >= (0)::numeric) AND ("importance_score" <= (1)::numeric))),
    CONSTRAINT "ai_conversation_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."ai_conversation_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_conversation_sessions" (
    "id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "summary" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "message_count" integer DEFAULT 0
);


ALTER TABLE "public"."ai_conversation_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_semantic_memories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "memory_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "importance_score" numeric(3,2) DEFAULT 0.5,
    "access_count" integer DEFAULT 0,
    "last_accessed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_semantic_memories_importance_score_check" CHECK ((("importance_score" >= (0)::numeric) AND ("importance_score" <= (1)::numeric))),
    CONSTRAINT "ai_semantic_memories_memory_type_check" CHECK (("memory_type" = ANY (ARRAY['preference'::"text", 'fact'::"text", 'pattern'::"text", 'rule'::"text"])))
);


ALTER TABLE "public"."ai_semantic_memories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_user_profile" (
    "user_id" "uuid" NOT NULL,
    "communication_style" "jsonb" DEFAULT '{}'::"jsonb",
    "financial_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "interaction_patterns" "jsonb" DEFAULT '{}'::"jsonb",
    "learned_rules" "jsonb" DEFAULT '[]'::"jsonb",
    "last_updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_user_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_flags" (
    "name" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "thread_id" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "action_data" "jsonb" NOT NULL,
    "risk_level" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "response_data" "jsonb",
    CONSTRAINT "approval_requests_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['LOW'::"text", 'MEDIUM'::"text", 'HIGH'::"text"]))),
    CONSTRAINT "approval_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'timeout'::"text"])))
);


ALTER TABLE "public"."approval_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."approval_requests" IS 'Human-in-the-loop approval requests for critical operations';



CREATE TABLE IF NOT EXISTS "public"."bcv_rate_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "usd" numeric(12,8) NOT NULL,
    "eur" numeric(12,8) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" character varying(50) DEFAULT 'BCV'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."bcv_rate_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."binance_rate_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "usd" numeric(10,4) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" character varying(50) DEFAULT 'Binance'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."binance_rate_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "category_id" "uuid",
    "month_year" "text" NOT NULL,
    "amount_base_minor" bigint NOT NULL,
    "spent_base_minor" bigint DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "color" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "parent_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "is_default" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "categories_kind_check" CHECK (("kind" = ANY (ARRAY['INCOME'::"text", 'EXPENSE'::"text"]))),
    CONSTRAINT "categories_user_id_not_null_when_not_default" CHECK (((("is_default" = true) AND ("user_id" IS NULL)) OR (("is_default" = false) AND ("user_id" IS NOT NULL)))),
    CONSTRAINT "check_default_no_user" CHECK (((("is_default" = true) AND ("user_id" IS NULL)) OR ("is_default" = false)))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."circuit_breaker_state" (
    "id" "text" NOT NULL,
    "state" "text" NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "last_failure_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "circuit_breaker_state_state_check" CHECK (("state" = ANY (ARRAY['CLOSED'::"text", 'OPEN'::"text", 'HALF_OPEN'::"text"])))
);


ALTER TABLE "public"."circuit_breaker_state" OWNER TO "postgres";


COMMENT ON TABLE "public"."circuit_breaker_state" IS 'Tracks circuit breaker state for error recovery';



CREATE TABLE IF NOT EXISTS "public"."debt_settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "debt_transaction_id" "uuid" NOT NULL,
    "settlement_transaction_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "amount_minor" bigint NOT NULL,
    "amount_base_minor" bigint NOT NULL,
    "currency_code" "text" NOT NULL,
    "debt_direction" "public"."debt_direction" NOT NULL,
    "settled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "debt_settlements_amount_base_minor_check" CHECK (("amount_base_minor" > 0)),
    CONSTRAINT "debt_settlements_amount_minor_check" CHECK (("amount_minor" > 0))
);


ALTER TABLE "public"."debt_settlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "id" integer NOT NULL,
    "usd_ves" numeric(12,8) NOT NULL,
    "usdt_ves" numeric(12,8) NOT NULL,
    "sell_rate" numeric(12,8) NOT NULL,
    "buy_rate" numeric(12,8) NOT NULL,
    "last_updated" timestamp with time zone NOT NULL,
    "source" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."exchange_rates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."exchange_rates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."exchange_rates_id_seq" OWNED BY "public"."exchange_rates"."id";



CREATE TABLE IF NOT EXISTS "public"."goal_contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "delta_base_minor" bigint NOT NULL,
    "note" "text",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "related_transaction_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "goal_contributions_delta_base_minor_check" CHECK (("delta_base_minor" <> 0)),
    CONSTRAINT "goal_contributions_source_check" CHECK (("char_length"(TRIM(BOTH FROM "source")) > 0))
);


ALTER TABLE "public"."goal_contributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" character varying(20) NOT NULL,
    "is_read" boolean DEFAULT false,
    "action_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['success'::character varying, 'info'::character varying, 'warning'::character varying, 'error'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "service_name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "sender_reference" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rag_documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rag_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['transaction'::"text", 'account'::"text", 'budget'::"text", 'goal'::"text"])))
);


ALTER TABLE "public"."rag_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recurring_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "currency_code" "text" NOT NULL,
    "amount_minor" bigint NOT NULL,
    "description" "text",
    "note" "text",
    "tags" "text"[],
    "frequency" "text" NOT NULL,
    "interval_count" integer DEFAULT 1 NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "next_execution_date" "date" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_executed_at" timestamp with time zone,
    CONSTRAINT "recurring_transactions_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "recurring_transactions_type_check" CHECK (("type" = ANY (ARRAY['INCOME'::"text", 'EXPENSE'::"text", 'TRANSFER_OUT'::"text"])))
);


ALTER TABLE "public"."recurring_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scrape_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "trigger" "text" NOT NULL,
    "stage" "text" NOT NULL,
    "status" "text" NOT NULL,
    "failure_reason" "text",
    "started_at" timestamp with time zone NOT NULL,
    "finished_at" timestamp with time zone,
    "extracted_currencies" "text"[],
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scrape_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tier" character varying(20) NOT NULL,
    "status" character varying(20) NOT NULL,
    "stripe_subscription_id" character varying(255),
    "stripe_customer_id" character varying(255),
    "current_period_start" timestamp without time zone,
    "current_period_end" timestamp without time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "cancelled_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "paddle_subscription_id" character varying(255),
    "paddle_customer_id" character varying(255),
    "paddle_transaction_id" character varying(255),
    CONSTRAINT "subscriptions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'cancelled'::character varying, 'past_due'::character varying, 'paused'::character varying, 'trialing'::character varying])::"text"[]))),
    CONSTRAINT "subscriptions_tier_check" CHECK ((("tier")::"text" = ANY ((ARRAY['free'::character varying, 'base'::character varying, 'premium'::character varying])::"text"[])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transfers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "from_transaction_id" "uuid",
    "to_transaction_id" "uuid",
    "fee_minor" bigint,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_tracking" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "month_year" character varying(7) NOT NULL,
    "transaction_count" integer DEFAULT 0,
    "backup_count" integer DEFAULT 0,
    "api_calls" integer DEFAULT 0,
    "export_count" integer DEFAULT 0,
    "ai_requests" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."usage_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "base_currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "subscription_tier" character varying(20) DEFAULT 'free'::character varying,
    "subscription_status" character varying(20) DEFAULT 'active'::character varying,
    "stripe_customer_id" character varying(255),
    "stripe_subscription_id" character varying(255),
    "subscription_started_at" timestamp without time zone,
    "subscription_expires_at" timestamp without time zone,
    "transaction_count_current_month" integer DEFAULT 0,
    "last_transaction_reset" timestamp without time zone DEFAULT "now"(),
    "tier" "text" DEFAULT 'free'::"text" NOT NULL,
    "subscription_id" "text",
    "last_activity_at" timestamp with time zone,
    CONSTRAINT "users_tier_check" CHECK (("tier" = ANY (ARRAY['free'::"text", 'base'::"text", 'premium'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."last_activity_at" IS 'Updated automatically by trigger on auth.sessions.refreshed_at. Reflects real user activity.';



CREATE TABLE IF NOT EXISTS "public"."verification_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "layer" "text" NOT NULL,
    "passed" boolean NOT NULL,
    "confidence_score" numeric(3,2),
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "verification_results_layer_check" CHECK (("layer" = ANY (ARRAY['self_check'::"text", 'llm_eval'::"text", 'cross_agent'::"text", 'human'::"text"])))
);


ALTER TABLE "public"."verification_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."verification_results" IS 'Stores results from multi-layer verification system';



CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "source" "text" DEFAULT 'landing'::"text",
    "referrer" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


ALTER TABLE ONLY "public"."exchange_rates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."exchange_rates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_checkpoints"
    ADD CONSTRAINT "agent_checkpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_logs"
    ADD CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_conversation_messages"
    ADD CONSTRAINT "ai_conversation_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_conversation_sessions"
    ADD CONSTRAINT "ai_conversation_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_semantic_memories"
    ADD CONSTRAINT "ai_semantic_memories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_user_profile"
    ADD CONSTRAINT "ai_user_profile_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."app_flags"
    ADD CONSTRAINT "app_flags_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bcv_rate_history"
    ADD CONSTRAINT "bcv_rate_history_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."bcv_rate_history"
    ADD CONSTRAINT "bcv_rate_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."binance_rate_history"
    ADD CONSTRAINT "binance_rate_history_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."binance_rate_history"
    ADD CONSTRAINT "binance_rate_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_user_category_month_key" UNIQUE ("user_id", "category_id", "month_year");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."circuit_breaker_state"
    ADD CONSTRAINT "circuit_breaker_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."debt_settlements"
    ADD CONSTRAINT "debt_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_documents"
    ADD CONSTRAINT "rag_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rag_documents"
    ADD CONSTRAINT "rag_documents_user_id_document_type_document_id_key" UNIQUE ("user_id", "document_type", "document_id");



ALTER TABLE ONLY "public"."recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scrape_attempts"
    ADD CONSTRAINT "scrape_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_paddle_subscription_id_key" UNIQUE ("paddle_subscription_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE "public"."transactions"
    ADD CONSTRAINT "transactions_amount_base_minor_positive" CHECK (("amount_base_minor" >= 0)) NOT VALID;



ALTER TABLE "public"."transactions"
    ADD CONSTRAINT "transactions_amount_minor_positive" CHECK (("amount_minor" > 0)) NOT VALID;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_user_id_month_year_key" UNIQUE ("user_id", "month_year");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verification_results"
    ADD CONSTRAINT "verification_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_accounts_user_created" ON "public"."accounts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_accounts_user_id" ON "public"."accounts" USING "btree" ("user_id");



CREATE INDEX "idx_agent_checkpoints_created" ON "public"."agent_checkpoints" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_agent_checkpoints_thread_user" ON "public"."agent_checkpoints" USING "btree" ("thread_id", "user_id");



CREATE INDEX "idx_agent_logs_level" ON "public"."agent_logs" USING "btree" ("level", "created_at" DESC);



CREATE INDEX "idx_agent_logs_trace" ON "public"."agent_logs" USING "btree" ("trace_id");



CREATE INDEX "idx_agent_logs_user_created" ON "public"."agent_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_ai_conversation_messages_session_id" ON "public"."ai_conversation_messages" USING "btree" ("session_id");



CREATE INDEX "idx_approval_thread" ON "public"."approval_requests" USING "btree" ("thread_id");



CREATE INDEX "idx_approval_user_status" ON "public"."approval_requests" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "idx_bcv_rate_history_date" ON "public"."bcv_rate_history" USING "btree" ("date" DESC);



CREATE INDEX "idx_binance_rate_history_date" ON "public"."binance_rate_history" USING "btree" ("date" DESC);



CREATE INDEX "idx_budgets_category_id" ON "public"."budgets" USING "btree" ("category_id");



CREATE INDEX "idx_budgets_month_active" ON "public"."budgets" USING "btree" ("month_year" DESC, "active") WHERE ("active" = true);



CREATE INDEX "idx_budgets_month_year" ON "public"."budgets" USING "btree" ("month_year");



CREATE INDEX "idx_budgets_user_created" ON "public"."budgets" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_budgets_user_id" ON "public"."budgets" USING "btree" ("user_id");



CREATE INDEX "idx_categories_name_trgm" ON "public"."categories" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_categories_user_active_default" ON "public"."categories" USING "btree" ("user_id", "active", "is_default") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_categories_user_name_unique" ON "public"."categories" USING "btree" ("user_id", "lower"("name")) WHERE (("active" = true) AND ("is_default" = false));



CREATE INDEX "idx_conversation_messages_importance" ON "public"."ai_conversation_messages" USING "btree" ("user_id", "importance_score" DESC);



CREATE INDEX "idx_conversation_messages_user_session" ON "public"."ai_conversation_messages" USING "btree" ("user_id", "session_id");



CREATE INDEX "idx_conversation_sessions_last_message" ON "public"."ai_conversation_sessions" USING "btree" ("user_id", "last_message_at" DESC);



CREATE INDEX "idx_debt_settlements_debt_id" ON "public"."debt_settlements" USING "btree" ("debt_transaction_id", "settled_at" DESC);



CREATE INDEX "idx_debt_settlements_user_id" ON "public"."debt_settlements" USING "btree" ("user_id", "settled_at" DESC);



CREATE INDEX "idx_exchange_rates_source" ON "public"."exchange_rates" USING "btree" ("source");



CREATE INDEX "idx_fkey_agent_checkpoints_user_id" ON "public"."agent_checkpoints" USING "btree" ("user_id");



CREATE INDEX "idx_fkey_ai_conversation_messages_session_id" ON "public"."ai_conversation_messages" USING "btree" ("session_id");



CREATE INDEX "idx_fkey_categories_parent_id" ON "public"."categories" USING "btree" ("parent_id");



CREATE INDEX "idx_fkey_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_fkey_payment_orders_reviewed_by" ON "public"."payment_orders" USING "btree" ("reviewed_by");



CREATE INDEX "idx_fkey_payment_orders_transaction_id" ON "public"."payment_orders" USING "btree" ("transaction_id");



CREATE INDEX "idx_fkey_recurring_transactions_account_id" ON "public"."recurring_transactions" USING "btree" ("account_id");



CREATE INDEX "idx_fkey_transfers_from_transaction_id" ON "public"."transfers" USING "btree" ("from_transaction_id");



CREATE INDEX "idx_fkey_transfers_to_transaction_id" ON "public"."transfers" USING "btree" ("to_transaction_id");



CREATE INDEX "idx_goal_contributions_goal_created_at" ON "public"."goal_contributions" USING "btree" ("goal_id", "created_at" DESC);



CREATE INDEX "idx_goal_contributions_user_created_at" ON "public"."goal_contributions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_goals_account_id" ON "public"."goals" USING "btree" ("account_id");



CREATE INDEX "idx_goals_target_date" ON "public"."goals" USING "btree" ("target_date");



CREATE INDEX "idx_goals_target_date_active" ON "public"."goals" USING "btree" ("target_date", "active") WHERE ("active" = true);



CREATE INDEX "idx_goals_user_created" ON "public"."goals" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_goals_user_id" ON "public"."goals" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_notifications_user_read" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



COMMENT ON INDEX "public"."idx_notifications_user_read" IS 'Optimizes notification queries by user and read status';



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_orders_user_id_created_at" ON "public"."orders" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_orders_user_id_status" ON "public"."orders" USING "btree" ("user_id", "status");



CREATE INDEX "idx_payment_orders_reviewed_by" ON "public"."payment_orders" USING "btree" ("reviewed_by");



CREATE INDEX "idx_payment_orders_transaction_id" ON "public"."payment_orders" USING "btree" ("transaction_id");



CREATE INDEX "idx_payment_orders_user_id" ON "public"."payment_orders" USING "btree" ("user_id");



CREATE INDEX "idx_recurring_transactions_category_id" ON "public"."recurring_transactions" USING "btree" ("category_id");



CREATE INDEX "idx_recurring_transactions_due" ON "public"."recurring_transactions" USING "btree" ("next_execution_date", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_recurring_transactions_user_id" ON "public"."recurring_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_scrape_attempts_created_at" ON "public"."scrape_attempts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_semantic_memories_last_accessed" ON "public"."ai_semantic_memories" USING "btree" ("user_id", "last_accessed_at" DESC NULLS LAST);



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_account_date" ON "public"."transactions" USING "btree" ("account_id", "date" DESC, "created_at" DESC);



COMMENT ON INDEX "public"."idx_transactions_account_date" IS 'Optimizes queries filtering transactions by account and date';



CREATE INDEX "idx_transactions_account_date_created" ON "public"."transactions" USING "btree" ("account_id", "date" DESC, "created_at" DESC);



CREATE INDEX "idx_transactions_account_id" ON "public"."transactions" USING "btree" ("account_id");



CREATE INDEX "idx_transactions_category_id" ON "public"."transactions" USING "btree" ("category_id");



CREATE INDEX "idx_transactions_date" ON "public"."transactions" USING "btree" ("date");



CREATE INDEX "idx_transactions_date_range" ON "public"."transactions" USING "btree" ("date", "account_id", "type");



COMMENT ON INDEX "public"."idx_transactions_date_range" IS 'Optimizes date range queries with account and type filters';



CREATE INDEX "idx_transactions_debt_open" ON "public"."transactions" USING "btree" ("account_id", "debt_direction", "date" DESC) WHERE (("is_debt" = true) AND (COALESCE("debt_status", 'OPEN'::"public"."debt_status") = 'OPEN'::"public"."debt_status"));



CREATE INDEX "idx_transactions_description_fts" ON "public"."transactions" USING "gin" ("to_tsvector"('"public"."es_unaccent"'::"regconfig", ((COALESCE("description", ''::"text") || ' '::"text") || COALESCE("note", ''::"text"))));



CREATE INDEX "idx_transactions_description_trgm" ON "public"."transactions" USING "gin" ("description" "public"."gin_trgm_ops");



CREATE INDEX "idx_transactions_embedding_hnsw" ON "public"."transactions" USING "hnsw" ("embedding" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_transactions_note_trgm" ON "public"."transactions" USING "gin" ("note" "public"."gin_trgm_ops");



CREATE INDEX "idx_transactions_transfer_id" ON "public"."transactions" USING "btree" ("transfer_id");



CREATE INDEX "idx_transactions_type" ON "public"."transactions" USING "btree" ("type");



CREATE INDEX "idx_transactions_user_via_accounts" ON "public"."transactions" USING "btree" ("account_id") INCLUDE ("type", "amount_base_minor", "date", "category_id");



CREATE INDEX "idx_transfers_from_transaction" ON "public"."transfers" USING "btree" ("from_transaction_id");



CREATE INDEX "idx_transfers_to_transaction_id" ON "public"."transfers" USING "btree" ("to_transaction_id");



CREATE INDEX "idx_usage_tracking_user_month" ON "public"."usage_tracking" USING "btree" ("user_id", "month_year");



CREATE INDEX "idx_users_tier" ON "public"."users" USING "btree" ("tier");



CREATE INDEX "idx_verification_message" ON "public"."verification_results" USING "btree" ("message_id");



CREATE INDEX "idx_verification_passed" ON "public"."verification_results" USING "btree" ("passed", "created_at" DESC);



CREATE INDEX "idx_verification_user_created" ON "public"."verification_results" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "rag_documents_user_type_idx" ON "public"."rag_documents" USING "btree" ("user_id", "document_type");



CREATE OR REPLACE TRIGGER "goal_contribution_owner_guard" BEFORE INSERT OR UPDATE OF "goal_id", "user_id" ON "public"."goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_goal_contribution_owner"();



CREATE OR REPLACE TRIGGER "goals_account_owner_guard" BEFORE INSERT OR UPDATE OF "account_id", "user_id" ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."validate_goal_account_owner"();



CREATE OR REPLACE TRIGGER "trg_order_paid_upgrade" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_order_paid"();



CREATE OR REPLACE TRIGGER "update_accounts_updated_at" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_budgets_updated_at" BEFORE UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_goals_updated_at" BEFORE UPDATE ON "public"."goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_orders_updated_at" BEFORE UPDATE ON "public"."payment_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_recurring_transactions_updated_at" BEFORE UPDATE ON "public"."recurring_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_semantic_memories_updated_at" BEFORE UPDATE ON "public"."ai_semantic_memories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_session_on_message_insert" AFTER INSERT ON "public"."ai_conversation_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_session_message_count"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_usage_tracking_updated_at" BEFORE UPDATE ON "public"."usage_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profile_updated_at" BEFORE UPDATE ON "public"."ai_user_profile" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_checkpoints"
    ADD CONSTRAINT "agent_checkpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_logs"
    ADD CONSTRAINT "agent_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_conversation_messages"
    ADD CONSTRAINT "ai_conversation_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ai_conversation_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_conversation_messages"
    ADD CONSTRAINT "ai_conversation_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_conversation_sessions"
    ADD CONSTRAINT "ai_conversation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_semantic_memories"
    ADD CONSTRAINT "ai_semantic_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_user_profile"
    ADD CONSTRAINT "ai_user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debt_settlements"
    ADD CONSTRAINT "debt_settlements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debt_settlements"
    ADD CONSTRAINT "debt_settlements_debt_transaction_id_fkey" FOREIGN KEY ("debt_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debt_settlements"
    ADD CONSTRAINT "debt_settlements_settlement_transaction_id_fkey" FOREIGN KEY ("settlement_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."debt_settlements"
    ADD CONSTRAINT "debt_settlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_related_transaction_id_fkey" FOREIGN KEY ("related_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rag_documents"
    ADD CONSTRAINT "rag_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_from_transaction_id_fkey" FOREIGN KEY ("from_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transfers"
    ADD CONSTRAINT "transfers_to_transaction_id_fkey" FOREIGN KEY ("to_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usage_tracking"
    ADD CONSTRAINT "usage_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."verification_results"
    ADD CONSTRAINT "verification_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow anonymous insert" ON "public"."waitlist" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow anonymous select on bcv_rate_history" ON "public"."bcv_rate_history" FOR SELECT USING (true);



CREATE POLICY "Allow anonymous select on binance_rate_history" ON "public"."binance_rate_history" FOR SELECT USING (true);



CREATE POLICY "Allow public read access for exchange_rates" ON "public"."exchange_rates" FOR SELECT USING (true);



CREATE POLICY "Allow service role to insert exchange rates" ON "public"."exchange_rates" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Authenticated select on scrape_attempts" ON "public"."scrape_attempts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "POLICY Users can insert own orders" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Public read access for bcv_rate_history" ON "public"."bcv_rate_history" FOR SELECT USING (true);



CREATE POLICY "Public read access for binance_rate_history" ON "public"."binance_rate_history" FOR SELECT USING (true);



CREATE POLICY "Service role full access" ON "public"."waitlist" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role insert for bcv_rate_history" ON "public"."bcv_rate_history" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role insert for binance_rate_history" ON "public"."binance_rate_history" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role insert for scrape_attempts" ON "public"."scrape_attempts" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Users can delete own RAG documents" ON "public"."rag_documents" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own accounts" ON "public"."accounts" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own budgets" ON "public"."budgets" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own conversation messages" ON "public"."ai_conversation_messages" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own conversation sessions" ON "public"."ai_conversation_sessions" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own goal contributions" ON "public"."goal_contributions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own goals" ON "public"."goals" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own profile" ON "public"."ai_user_profile" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own recurring transactions" ON "public"."recurring_transactions" FOR DELETE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can delete own semantic memories" ON "public"."ai_semantic_memories" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own subscriptions" ON "public"."subscriptions" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete own transactions" ON "public"."transactions" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "accounts"."user_id"
   FROM "public"."accounts"
  WHERE ("accounts"."id" = "transactions"."account_id"))));



CREATE POLICY "Users can delete own transfers" ON "public"."transfers" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "a"."user_id"
   FROM ("public"."accounts" "a"
     JOIN "public"."transactions" "t" ON (("t"."account_id" = "a"."id")))
  WHERE (("t"."id" = "transfers"."from_transaction_id") OR ("t"."id" = "transfers"."to_transaction_id")))));



CREATE POLICY "Users can delete own usage" ON "public"."usage_tracking" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own RAG documents" ON "public"."rag_documents" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own accounts" ON "public"."accounts" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own budgets" ON "public"."budgets" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own conversation messages" ON "public"."ai_conversation_messages" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own conversation sessions" ON "public"."ai_conversation_sessions" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own goal contributions" ON "public"."goal_contributions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own goals" ON "public"."goals" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own orders" ON "public"."orders" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own orders" ON "public"."payment_orders" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."ai_user_profile" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."users" FOR INSERT WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own recurring transactions" ON "public"."recurring_transactions" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can insert own semantic memories" ON "public"."ai_semantic_memories" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own subscriptions" ON "public"."subscriptions" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own transactions" ON "public"."transactions" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "accounts"."user_id"
   FROM "public"."accounts"
  WHERE ("accounts"."id" = "transactions"."account_id"))));



CREATE POLICY "Users can insert own transfers" ON "public"."transfers" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "a"."user_id"
   FROM ("public"."accounts" "a"
     JOIN "public"."transactions" "t" ON (("t"."account_id" = "a"."id")))
  WHERE (("t"."id" = "transfers"."from_transaction_id") OR ("t"."id" = "transfers"."to_transaction_id")))));



CREATE POLICY "Users can insert own usage" ON "public"."usage_tracking" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own RAG documents" ON "public"."rag_documents" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own accounts" ON "public"."accounts" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own budgets" ON "public"."budgets" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own conversation messages" ON "public"."ai_conversation_messages" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own conversation sessions" ON "public"."ai_conversation_sessions" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own goal contributions" ON "public"."goal_contributions" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own goals" ON "public"."goals" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."ai_user_profile" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own recurring transactions" ON "public"."recurring_transactions" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own semantic memories" ON "public"."ai_semantic_memories" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own subscriptions" ON "public"."subscriptions" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own transactions" ON "public"."transactions" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "accounts"."user_id"
   FROM "public"."accounts"
  WHERE ("accounts"."id" = "transactions"."account_id"))));



CREATE POLICY "Users can update own usage" ON "public"."usage_tracking" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own RAG documents" ON "public"."rag_documents" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own accounts" ON "public"."accounts" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own budgets" ON "public"."budgets" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own conversation messages" ON "public"."ai_conversation_messages" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own conversation sessions" ON "public"."ai_conversation_sessions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own debt settlements" ON "public"."debt_settlements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own goal contributions" ON "public"."goal_contributions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own goals" ON "public"."goals" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."ai_user_profile" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own recurring transactions" ON "public"."recurring_transactions" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own semantic memories" ON "public"."ai_semantic_memories" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own subscriptions" ON "public"."subscriptions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own transactions" ON "public"."transactions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "accounts"."user_id"
   FROM "public"."accounts"
  WHERE ("accounts"."id" = "transactions"."account_id"))));



CREATE POLICY "Users can view own transfers" ON "public"."transfers" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IN ( SELECT "a"."user_id"
   FROM ("public"."accounts" "a"
     JOIN "public"."transactions" "t" ON (("t"."account_id" = "a"."id")))
  WHERE (("t"."id" = "transfers"."from_transaction_id") OR ("t"."id" = "transfers"."to_transaction_id")))));



CREATE POLICY "Users can view own usage" ON "public"."usage_tracking" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_checkpoints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_checkpoints_user_policy" ON "public"."agent_checkpoints" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."agent_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_logs_user_policy" ON "public"."agent_logs" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ai_conversation_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_conversation_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_semantic_memories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_user_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "approval_requests_user_policy" ON "public"."approval_requests" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."bcv_rate_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."binance_rate_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "category_delete_secure" ON "public"."categories" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_default" = false) AND ("deleted_at" IS NOT NULL)));



CREATE POLICY "category_insert_secure" ON "public"."categories" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_default" = false) AND ("deleted_at" IS NULL)));



CREATE POLICY "category_select_secure" ON "public"."categories" FOR SELECT USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL)) OR (("is_default" = true) AND ("deleted_at" IS NULL)))));



CREATE POLICY "category_update_and_delete_secure" ON "public"."categories" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_default" = false)));



CREATE POLICY "category_update_secure" ON "public"."categories" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_default" = false) AND ("deleted_at" IS NULL)));



CREATE POLICY "circuit_breaker_all_policy" ON "public"."circuit_breaker_state" TO "authenticated" USING (true);



CREATE POLICY "circuit_breaker_read_policy" ON "public"."circuit_breaker_state" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."circuit_breaker_state" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "circuit_breaker_write_policy" ON "public"."circuit_breaker_state" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."debt_settlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "flags_read" ON "public"."app_flags" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."goal_contributions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_orders_select_policy" ON "public"."payment_orders" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "payment_orders_update_policy" ON "public"."payment_orders" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = 'pending'::"text"))) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."rag_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scrape_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transfers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usage_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."verification_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "verification_results_user_policy" ON "public"."verification_results" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."goals" TO "anon";
GRANT ALL ON TABLE "public"."goals" TO "authenticated";
GRANT ALL ON TABLE "public"."goals" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_goal_contribution_atomic"("p_goal_id" "uuid", "p_delta_base_minor" bigint, "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_goal_contribution_atomic"("p_goal_id" "uuid", "p_delta_base_minor" bigint, "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_goal_contribution_atomic"("p_goal_id" "uuid", "p_delta_base_minor" bigint, "p_note" "text") TO "service_role";



GRANT ALL ON TABLE "public"."payment_orders" TO "anon";
GRANT ALL ON TABLE "public"."payment_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_orders" TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_payment_order"("p_order_id" "uuid", "p_admin_id" "uuid", "p_account_id" "uuid") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."approve_payment_order"("p_order_id" "uuid", "p_admin_id" "uuid", "p_account_id" "uuid") FROM "anon";
REVOKE ALL ON FUNCTION "public"."approve_payment_order"("p_order_id" "uuid", "p_admin_id" "uuid", "p_account_id" "uuid") FROM "authenticated";
GRANT ALL ON FUNCTION "public"."approve_payment_order"("p_order_id" "uuid", "p_admin_id" "uuid", "p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_execution_date"("p_current_date" "date", "p_frequency" "text", "p_interval_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_execution_date"("p_current_date" "date", "p_frequency" "text", "p_interval_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_execution_date"("p_current_date" "date", "p_frequency" "text", "p_interval_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_checkpoints"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_checkpoints"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_checkpoints"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_verification_results"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_verification_results"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_verification_results"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_debt_with_deduction"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone, "p_deduct" boolean, "p_source_account_id" "uuid", "p_source_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_debt_with_deduction"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone, "p_deduct" boolean, "p_source_account_id" "uuid", "p_source_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_debt_with_deduction"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone, "p_deduct" boolean, "p_source_account_id" "uuid", "p_source_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "uuid", "p_frequency" "text", "p_interval_count" integer, "p_end_date" "date", "p_recurring_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "uuid", "p_frequency" "text", "p_interval_count" integer, "p_end_date" "date", "p_recurring_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "uuid", "p_frequency" "text", "p_interval_count" integer, "p_end_date" "date", "p_recurring_name" "text") TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" integer, "p_amount_base_minor" integer, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" integer, "p_amount_base_minor" integer, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[]) FROM "anon";
GRANT ALL ON FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" integer, "p_amount_base_minor" integer, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" integer, "p_amount_base_minor" integer, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) FROM "anon";
GRANT ALL ON FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_transaction_and_adjust_balance"("p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_transaction_v2"("p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_transaction_v2"("p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_transaction_v2"("p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_transfer"("p_user_id" "uuid", "p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_major" numeric, "p_description" "text", "p_date" "date", "p_exchange_rate" numeric, "p_rate_source" "text", "p_note" "text") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."create_transfer"("p_user_id" "uuid", "p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_major" numeric, "p_description" "text", "p_date" "date", "p_exchange_rate" numeric, "p_rate_source" "text", "p_note" "text") FROM "anon";
GRANT ALL ON FUNCTION "public"."create_transfer"("p_user_id" "uuid", "p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_major" numeric, "p_description" "text", "p_date" "date", "p_exchange_rate" numeric, "p_rate_source" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_transfer"("p_user_id" "uuid", "p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_major" numeric, "p_description" "text", "p_date" "date", "p_exchange_rate" numeric, "p_rate_source" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_transaction_and_adjust_balance"("transaction_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_transaction_and_adjust_balance"("transaction_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_transaction_and_adjust_balance"("transaction_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_transaction_v2"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_transaction_v2"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_transaction_v2"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_transactions_v2"("p_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_transactions_v2"("p_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_transactions_v2"("p_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."execute_due_recurring_transaction"("p_recurring_transaction_id" "uuid", "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_execution_date" "date", "p_next_execution_date" "date") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."execute_due_recurring_transaction"("p_recurring_transaction_id" "uuid", "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_execution_date" "date", "p_next_execution_date" "date") FROM "anon";
GRANT ALL ON FUNCTION "public"."execute_due_recurring_transaction"("p_recurring_transaction_id" "uuid", "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_execution_date" "date", "p_next_execution_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_due_recurring_transaction"("p_recurring_transaction_id" "uuid", "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_execution_date" "date", "p_next_execution_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_transfer"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_minor" bigint, "p_converted_amount_minor" bigint, "p_date" "date", "p_description" "text", "p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_transfer"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_minor" bigint, "p_converted_amount_minor" bigint, "p_date" "date", "p_description" "text", "p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_transfer"("p_from_account_id" "uuid", "p_to_account_id" "uuid", "p_amount_minor" bigint, "p_converted_amount_minor" bigint, "p_date" "date", "p_description" "text", "p_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_account_performance"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_account_performance"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_performance"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cash_flow_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_group_by" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cash_flow_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_group_by" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cash_flow_data"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_group_by" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_breakdown"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_breakdown"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_breakdown"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "p_year" integer, "p_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "p_year" integer, "p_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_categories_with_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_categories_with_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_categories_with_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_order_paid"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_order_paid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_order_paid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hybrid_search_transactions"("p_query_embedding" "public"."vector", "p_query_text" "text", "p_match_count" integer, "p_rrf_k" integer, "p_w_vec" double precision, "p_w_fts" double precision, "p_w_trgm" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."hybrid_search_transactions"("p_query_embedding" "public"."vector", "p_query_text" "text", "p_match_count" integer, "p_rrf_k" integer, "p_w_vec" double precision, "p_w_fts" double precision, "p_w_trgm" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hybrid_search_transactions"("p_query_embedding" "public"."vector", "p_query_text" "text", "p_match_count" integer, "p_rrf_k" integer, "p_w_vec" double precision, "p_w_fts" double precision, "p_w_trgm" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."process_recurring_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_recurring_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_recurring_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."query_transactions"("p_date_from" "date", "p_date_to" "date", "p_amount_min" bigint, "p_amount_max" bigint, "p_category_id" "uuid", "p_account_id" "uuid", "p_aggregate" "text", "p_group_by_field" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."query_transactions"("p_date_from" "date", "p_date_to" "date", "p_amount_min" bigint, "p_amount_max" bigint, "p_category_id" "uuid", "p_account_id" "uuid", "p_aggregate" "text", "p_group_by_field" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."query_transactions"("p_date_from" "date", "p_date_to" "date", "p_amount_min" bigint, "p_amount_max" bigint, "p_category_id" "uuid", "p_account_id" "uuid", "p_aggregate" "text", "p_group_by_field" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_linked_goal_progress"("p_goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_linked_goal_progress"("p_goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_linked_goal_progress"("p_goal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_transaction_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_transaction_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_transaction_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[], "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[], "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[], "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[], "match_threshold" double precision, "match_count" integer, "ef_search" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[], "match_threshold" double precision, "match_count" integer, "ef_search" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_rag_documents"("query_embedding" "public"."vector", "user_id_param" "uuid", "document_types" "text"[], "match_threshold" double precision, "match_count" integer, "ef_search" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_semantic_memories"("query_embedding" "public"."vector", "user_id_param" "uuid", "memory_types" "text"[], "match_threshold" numeric, "match_count" integer, "ef_search" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_semantic_memories"("query_embedding" "public"."vector", "user_id_param" "uuid", "memory_types" "text"[], "match_threshold" numeric, "match_count" integer, "ef_search" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_semantic_memories"("query_embedding" "public"."vector", "user_id_param" "uuid", "memory_types" "text"[], "match_threshold" numeric, "match_count" integer, "ef_search" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."settle_debt_partial"("p_debt_id" "uuid", "p_account_id" "uuid", "p_amount_minor" bigint, "p_date" "date", "p_category_id" "uuid", "p_note" "text", "p_settled_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."settle_debt_partial"("p_debt_id" "uuid", "p_account_id" "uuid", "p_amount_minor" bigint, "p_date" "date", "p_category_id" "uuid", "p_note" "text", "p_settled_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."settle_debt_partial"("p_debt_id" "uuid", "p_account_id" "uuid", "p_amount_minor" bigint, "p_date" "date", "p_category_id" "uuid", "p_note" "text", "p_settled_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_category"("p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_category"("p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_category"("p_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_session_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_session_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_session_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_memory_access"("memory_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_memory_access"("memory_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_memory_access"("memory_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_message_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_message_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_message_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_transaction_and_adjust_balance"("p_transaction_id" "uuid", "p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."update_transaction_and_adjust_balance"("p_transaction_id" "uuid", "p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_transaction_and_adjust_balance"("p_transaction_id" "uuid", "p_account_id" "uuid", "p_category_id" "uuid", "p_type" "text", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text", "p_settled_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_transaction_v2"("p_id" "uuid", "p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_transaction_v2"("p_id" "uuid", "p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_transaction_v2"("p_id" "uuid", "p_type" "text", "p_account_id" "uuid", "p_category_id" "uuid", "p_currency_code" "text", "p_amount_minor" bigint, "p_amount_base_minor" bigint, "p_exchange_rate" numeric, "p_date" "date", "p_description" "text", "p_note" "text", "p_tags" "text"[], "p_is_debt" boolean, "p_debt_direction" "public"."debt_direction", "p_debt_status" "public"."debt_status", "p_counterparty_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_goal_account_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_goal_account_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_goal_account_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_goal_contribution_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_goal_contribution_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_goal_contribution_owner"() TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."agent_checkpoints" TO "anon";
GRANT ALL ON TABLE "public"."agent_checkpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_checkpoints" TO "service_role";



GRANT ALL ON TABLE "public"."agent_logs" TO "anon";
GRANT ALL ON TABLE "public"."agent_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_conversation_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_conversation_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_conversation_messages" TO "service_role";



GRANT ALL ON TABLE "public"."ai_conversation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."ai_conversation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_conversation_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."ai_semantic_memories" TO "anon";
GRANT ALL ON TABLE "public"."ai_semantic_memories" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_semantic_memories" TO "service_role";



GRANT ALL ON TABLE "public"."ai_user_profile" TO "anon";
GRANT ALL ON TABLE "public"."ai_user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_user_profile" TO "service_role";



GRANT ALL ON TABLE "public"."app_flags" TO "anon";
GRANT ALL ON TABLE "public"."app_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."app_flags" TO "service_role";



GRANT ALL ON TABLE "public"."approval_requests" TO "anon";
GRANT ALL ON TABLE "public"."approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_requests" TO "service_role";



GRANT SELECT ON TABLE "public"."bcv_rate_history" TO "anon";
GRANT SELECT ON TABLE "public"."bcv_rate_history" TO "authenticated";
GRANT ALL ON TABLE "public"."bcv_rate_history" TO "service_role";



GRANT SELECT ON TABLE "public"."binance_rate_history" TO "anon";
GRANT SELECT ON TABLE "public"."binance_rate_history" TO "authenticated";
GRANT ALL ON TABLE "public"."binance_rate_history" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."circuit_breaker_state" TO "anon";
GRANT ALL ON TABLE "public"."circuit_breaker_state" TO "authenticated";
GRANT ALL ON TABLE "public"."circuit_breaker_state" TO "service_role";



GRANT ALL ON TABLE "public"."debt_settlements" TO "anon";
GRANT ALL ON TABLE "public"."debt_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."debt_settlements" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."exchange_rates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."exchange_rates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."exchange_rates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."goal_contributions" TO "anon";
GRANT ALL ON TABLE "public"."goal_contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_contributions" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."rag_documents" TO "anon";
GRANT ALL ON TABLE "public"."rag_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."rag_documents" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_transactions" TO "anon";
GRANT ALL ON TABLE "public"."recurring_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_transactions" TO "service_role";



GRANT SELECT ON TABLE "public"."scrape_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."scrape_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."transfers" TO "anon";
GRANT ALL ON TABLE "public"."transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."transfers" TO "service_role";



GRANT ALL ON TABLE "public"."usage_tracking" TO "anon";
GRANT ALL ON TABLE "public"."usage_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."usage_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."verification_results" TO "anon";
GRANT ALL ON TABLE "public"."verification_results" TO "authenticated";
GRANT ALL ON TABLE "public"."verification_results" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist" TO "anon";
GRANT ALL ON TABLE "public"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







