-- Harden payment_orders RLS: scope ownership strictly to auth.uid() = user_id
-- (issue #46).
--
-- The previous policies granted cross-tenant SELECT + UPDATE over every
-- payment order to any user whose public.users row had tier = 'premium'
-- (a purchasable paid tier), because the premium EXISTS(...) branch was not
-- constrained to the order's user_id. A paying premium subscriber could read
-- other users' financial order data and mutate their order state.
--
-- This migration removes the premium branch from both policies:
--   * SELECT: authenticated users see only their own orders.
--   * UPDATE: authenticated users may update only their own orders, and only
--     while the order is still 'pending' (the pre-existing status gate the
--     owner path relied on).
--
-- Administrative listing/approval is unchanged: it runs through the
-- server-only service-role client (lib/payment-orders/order-service.ts) after
-- the app-level isAdmin() gate (lib/payment-orders/admin-utils.ts), which
-- bypasses RLS. No DB admin table or tier-based admin check is introduced.

DROP POLICY IF EXISTS "payment_orders_select_policy" ON "public"."payment_orders";

CREATE POLICY "payment_orders_select_policy" ON "public"."payment_orders"
  FOR SELECT TO "authenticated"
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payment_orders_update_policy" ON "public"."payment_orders";

CREATE POLICY "payment_orders_update_policy" ON "public"."payment_orders"
  FOR UPDATE TO "authenticated"
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Refresh PostgREST schema cache so the hardened policies are immediately
-- reflected in the exposed API surface.
NOTIFY pgrst, 'reload schema';
