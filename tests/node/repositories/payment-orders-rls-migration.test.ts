import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Issue #46 regression tests for the payment_orders RLS hardening.
 *
 * The vulnerable policies granted any user with `users.tier = 'premium'` (a
 * purchasable paid tier) cross-tenant SELECT + UPDATE over every payment
 * order, because the premium `EXISTS(...)` branch was not constrained to the
 * order's `user_id`. The forward migration scopes both policies strictly to
 * `auth.uid() = user_id` (keeping the pre-existing `status = 'pending'`
 * gate on the owner UPDATE), while the admin listing/approval path keeps
 * flowing through the server-only service-role client.
 *
 * Each assertion names the real regression it catches: reintroducing the
 * premium branch, dropping the hardening, or letting the baseline and the
 * migration drift apart.
 */
describe('payment_orders RLS hardening (issue #46)', () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20260810150000_harden_payment_orders_rls.sql'
    ),
    'utf8'
  );
  const baseline = readFileSync(
    join(process.cwd(), 'supabase/schemas/baseline.sql'),
    'utf8'
  );

  const premiumBranch = (file: string) =>
    file.includes(`"users"."tier" = 'premium'::"text"`);

  describe('migration drops both vulnerable policies before recreating them', () => {
    it('drops the SELECT and UPDATE policies', () => {
      expect(
        migration.includes(
          'DROP POLICY IF EXISTS "payment_orders_select_policy" ON "public"."payment_orders";'
        )
      ).toBe(true);
      expect(
        migration.includes(
          'DROP POLICY IF EXISTS "payment_orders_update_policy" ON "public"."payment_orders";'
        )
      ).toBe(true);
    });
  });

  describe('migration scopes SELECT strictly to auth.uid() = user_id', () => {
    it('recreates the SELECT policy with owner-only access', () => {
      expect(migration).toContain(
        'FOR SELECT TO "authenticated"\n  USING (auth.uid() = user_id);'
      );
    });
  });

  describe('migration scopes UPDATE to the owner, keeping the pending-status gate', () => {
    it('recreates the UPDATE policy with owner-only USING and WITH CHECK', () => {
      expect(migration).toContain(
        "USING (auth.uid() = user_id AND status = 'pending')"
      );
      expect(migration).toContain('WITH CHECK (auth.uid() = user_id)');
    });

    it('does not grant a blanket owner-less UPDATE (no EXISTS premium branch)', () => {
      expect(migration.includes('OR (EXISTS ( SELECT 1')).toBe(false);
    });
  });

  describe('the premium privilege escalation is gone everywhere', () => {
    it('migration has no tier = premium branch', () => {
      expect(premiumBranch(migration)).toBe(false);
    });

    it('baseline has no tier = premium branch', () => {
      expect(premiumBranch(baseline)).toBe(false);
    });
  });

  describe('baseline stays synchronized with the migration', () => {
    it('baseline SELECT policy is owner-only', () => {
      expect(
        baseline.includes(
          'CREATE POLICY "payment_orders_select_policy" ON "public"."payment_orders" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));'
        )
      ).toBe(true);
    });

    it('baseline UPDATE policy keeps owner-only USING + WITH CHECK', () => {
      expect(
        baseline.includes(
          'CREATE POLICY "payment_orders_update_policy" ON "public"."payment_orders" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = \'pending\'::"text"))) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));'
        )
      ).toBe(true);
    });
  });

  it('notifies PostgREST to reload the schema cache', () => {
    expect(migration).toContain("NOTIFY pgrst, 'reload schema'");
  });
});
