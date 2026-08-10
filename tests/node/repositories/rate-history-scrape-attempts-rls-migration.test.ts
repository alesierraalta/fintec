import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Issues #47/#48 regression tests for the exchange-rate-history and
 * scrape-attempts RLS hardening.
 *
 * The vulnerable schema granted anonymous INSERT + UPDATE on
 * `bcv_rate_history` / `binance_rate_history` (public financial reference
 * data feeding VES<->USD conversion history) and anonymous INSERT + SELECT
 * on `scrape_attempts` (the scraper monitoring ledger). The forward migration
 * restricts rate-history writes to `service_role`, keeps public SELECT on
 * published rate history, and scopes scrape-attempt reads to authenticated.
 *
 * Each assertion names the real regression it catches: reintroducing an
 * anonymous write policy, dropping the hardening, or letting the baseline and
 * the migration drift apart.
 */
describe('rate-history and scrape-attempts RLS hardening (issues #47/#48)', () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20260810160000_harden_rate_history_scrape_attempts_rls.sql'
    ),
    'utf8'
  );
  const baseline = readFileSync(
    join(process.cwd(), 'supabase/schemas/baseline.sql'),
    'utf8'
  );

  describe('migration removes anonymous writes on rate history', () => {
    it('drops the anonymous upsert and update policies on both rate-history tables', () => {
      expect(
        migration.includes(
          'DROP POLICY IF EXISTS "Allow anonymous upsert on bcv_rate_history" ON "public"."bcv_rate_history";'
        )
      ).toBe(true);
      expect(
        migration.includes(
          'DROP POLICY IF EXISTS "Allow anonymous update on bcv_rate_history" ON "public"."bcv_rate_history";'
        )
      ).toBe(true);
      expect(
        migration.includes(
          'DROP POLICY IF EXISTS "Allow anonymous upsert on binance_rate_history" ON "public"."binance_rate_history";'
        )
      ).toBe(true);
      expect(
        migration.includes(
          'DROP POLICY IF EXISTS "Allow anonymous update on binance_rate_history" ON "public"."binance_rate_history";'
        )
      ).toBe(true);
    });
  });

  describe('migration scopes rate-history INSERT to service_role', () => {
    it('recreates the bcv insert policy with the service_role role restriction', () => {
      expect(migration).toContain(
        'CREATE POLICY "Service role insert for bcv_rate_history" ON "public"."bcv_rate_history"\n  FOR INSERT TO "service_role" WITH CHECK (true);'
      );
      expect(
        migration.includes(
          'CREATE POLICY "Service role insert for bcv_rate_history" ON "public"."bcv_rate_history" FOR INSERT WITH CHECK (true);'
        )
      ).toBe(false);
    });

    it('recreates the binance insert policy with the service_role role restriction', () => {
      expect(migration).toContain(
        'CREATE POLICY "Service role insert for binance_rate_history" ON "public"."binance_rate_history"\n  FOR INSERT TO "service_role" WITH CHECK (true);'
      );
      expect(
        migration.includes(
          'CREATE POLICY "Service role insert for binance_rate_history" ON "public"."binance_rate_history" FOR INSERT WITH CHECK (true);'
        )
      ).toBe(false);
    });
  });

  describe('migration removes anonymous access to scrape_attempts', () => {
    it('drops the anonymous insert and select policies', () => {
      expect(
        migration.includes(
          'DROP POLICY IF EXISTS "Allow all insert" ON "public"."scrape_attempts";'
        )
      ).toBe(true);
      expect(
        migration.includes(
          'DROP POLICY IF EXISTS "Allow all select" ON "public"."scrape_attempts";'
        )
      ).toBe(true);
    });

    it('adds a service_role insert policy', () => {
      expect(migration).toContain(
        'CREATE POLICY "Service role insert for scrape_attempts" ON "public"."scrape_attempts"\n  FOR INSERT TO "service_role" WITH CHECK (true);'
      );
    });

    it('scopes SELECT to authenticated users only', () => {
      expect(migration).toContain(
        'CREATE POLICY "Authenticated select on scrape_attempts" ON "public"."scrape_attempts"\n  FOR SELECT TO "authenticated" USING (true);'
      );
    });
  });

  describe('migration tightens grants', () => {
    it('gives anon SELECT-only on rate history', () => {
      expect(migration).toContain(
        'GRANT SELECT ON TABLE "public"."bcv_rate_history" TO "anon";'
      );
      expect(migration).toContain(
        'GRANT SELECT ON TABLE "public"."binance_rate_history" TO "anon";'
      );
    });

    it('removes anon grants on scrape_attempts', () => {
      expect(
        migration.includes(
          'GRANT ALL ON TABLE "public"."scrape_attempts" TO "anon";'
        )
      ).toBe(false);
    });
  });

  describe('baseline stays synchronized with the migration', () => {
    it('has no anonymous upsert/update policies on rate history', () => {
      expect(
        baseline.includes('Allow anonymous upsert on bcv_rate_history')
      ).toBe(false);
      expect(
        baseline.includes('Allow anonymous update on bcv_rate_history')
      ).toBe(false);
      expect(
        baseline.includes('Allow anonymous upsert on binance_rate_history')
      ).toBe(false);
      expect(
        baseline.includes('Allow anonymous update on binance_rate_history')
      ).toBe(false);
    });

    it('scopes the service-role insert policies on rate history', () => {
      expect(baseline).toContain(
        'CREATE POLICY "Service role insert for bcv_rate_history" ON "public"."bcv_rate_history" FOR INSERT TO "service_role" WITH CHECK (true);'
      );
      expect(baseline).toContain(
        'CREATE POLICY "Service role insert for binance_rate_history" ON "public"."binance_rate_history" FOR INSERT TO "service_role" WITH CHECK (true);'
      );
    });

    it('keeps public SELECT on rate history (preserved intended reads)', () => {
      expect(baseline).toContain(
        'CREATE POLICY "Allow anonymous select on bcv_rate_history" ON "public"."bcv_rate_history" FOR SELECT USING (true);'
      );
      expect(baseline).toContain(
        'CREATE POLICY "Public read access for bcv_rate_history" ON "public"."bcv_rate_history" FOR SELECT USING (true);'
      );
      expect(baseline).toContain(
        'CREATE POLICY "Allow anonymous select on binance_rate_history" ON "public"."binance_rate_history" FOR SELECT USING (true);'
      );
    });

    it('has no anonymous scrape_attempts policies', () => {
      expect(
        baseline.includes('"Allow all insert" ON "public"."scrape_attempts"')
      ).toBe(false);
      expect(
        baseline.includes('"Allow all select" ON "public"."scrape_attempts"')
      ).toBe(false);
      expect(baseline).toContain(
        'CREATE POLICY "Authenticated select on scrape_attempts" ON "public"."scrape_attempts" FOR SELECT TO "authenticated" USING (true);'
      );
      expect(baseline).toContain(
        'CREATE POLICY "Service role insert for scrape_attempts" ON "public"."scrape_attempts" FOR INSERT TO "service_role" WITH CHECK (true);'
      );
    });

    it('grants are tightened in the baseline', () => {
      expect(baseline).toContain(
        'GRANT SELECT ON TABLE "public"."bcv_rate_history" TO "anon";'
      );
      expect(baseline).toContain(
        'GRANT SELECT ON TABLE "public"."scrape_attempts" TO "authenticated";'
      );
      expect(
        baseline.includes(
          'GRANT ALL ON TABLE "public"."scrape_attempts" TO "anon";'
        )
      ).toBe(false);
    });
  });

  it('notifies PostgREST to reload the schema cache', () => {
    expect(migration).toContain("NOTIFY pgrst, 'reload schema'");
  });
});
