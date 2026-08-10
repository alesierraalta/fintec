-- Harden RLS on exchange-rate history and scrape-attempt tables (issues #47, #48).
--
-- Previously:
--   * bcv_rate_history / binance_rate_history allowed anonymous INSERT + UPDATE
--     via the "Allow anonymous upsert/update" policies, AND the "Service role
--     insert" policies had NO role restriction (no TO clause), so they applied
--     to anon/authenticated too. Any caller holding the public anon key could
--     inject arbitrary rows or overwrite official published BCV/Binance rates
--     that feed VES<->USD conversion history.
--   * scrape_attempts allowed anonymous INSERT + SELECT via "Allow all
--     insert"/"Allow all select" (no role restriction): log poisoning of the
--     scraper monitoring ledger and public leakage of operational details.
--
-- After:
--   * Rate history stays publicly readable (SELECT USING true preserved for
--     anon + authenticated; the rates-history chart reads it anonymously).
--   * INSERT/UPDATE on rate history is scoped to service_role only. The cron
--     route, background scraper, and the on-demand pipeline all write via the
--     server-only service client, so legitimate writers are unaffected.
--   * scrape_attempts INSERT is scoped to service_role; SELECT is scoped to
--     authenticated. service_role keeps full access (BYPASSRLS).
--
-- Grants are tightened to match: rate history keeps SELECT for
-- anon/authenticated (no write grants at all); scrape_attempts drops anon
-- entirely and keeps SELECT for authenticated only.

-- ---------------------------------------------------------------------------
-- bcv_rate_history
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous upsert on bcv_rate_history" ON "public"."bcv_rate_history";
DROP POLICY IF EXISTS "Allow anonymous update on bcv_rate_history" ON "public"."bcv_rate_history";
DROP POLICY IF EXISTS "Service role insert for bcv_rate_history" ON "public"."bcv_rate_history";

CREATE POLICY "Service role insert for bcv_rate_history" ON "public"."bcv_rate_history"
  FOR INSERT TO "service_role" WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- binance_rate_history
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous upsert on binance_rate_history" ON "public"."binance_rate_history";
DROP POLICY IF EXISTS "Allow anonymous update on binance_rate_history" ON "public"."binance_rate_history";
DROP POLICY IF EXISTS "Service role insert for binance_rate_history" ON "public"."binance_rate_history";

CREATE POLICY "Service role insert for binance_rate_history" ON "public"."binance_rate_history"
  FOR INSERT TO "service_role" WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- scrape_attempts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all insert" ON "public"."scrape_attempts";
DROP POLICY IF EXISTS "Allow all select" ON "public"."scrape_attempts";
DROP POLICY IF EXISTS "Service role insert for scrape_attempts" ON "public"."scrape_attempts";

CREATE POLICY "Service role insert for scrape_attempts" ON "public"."scrape_attempts"
  FOR INSERT TO "service_role" WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated select on scrape_attempts" ON "public"."scrape_attempts";

CREATE POLICY "Authenticated select on scrape_attempts" ON "public"."scrape_attempts"
  FOR SELECT TO "authenticated" USING (true);

-- ---------------------------------------------------------------------------
-- Grants: rate history keeps public SELECT; scrape_attempts loses anon.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE "public"."bcv_rate_history" FROM "anon";
REVOKE ALL ON TABLE "public"."bcv_rate_history" FROM "authenticated";
GRANT SELECT ON TABLE "public"."bcv_rate_history" TO "anon";
GRANT SELECT ON TABLE "public"."bcv_rate_history" TO "authenticated";

REVOKE ALL ON TABLE "public"."binance_rate_history" FROM "anon";
REVOKE ALL ON TABLE "public"."binance_rate_history" FROM "authenticated";
GRANT SELECT ON TABLE "public"."binance_rate_history" TO "anon";
GRANT SELECT ON TABLE "public"."binance_rate_history" TO "authenticated";

REVOKE ALL ON TABLE "public"."scrape_attempts" FROM "anon";
REVOKE ALL ON TABLE "public"."scrape_attempts" FROM "authenticated";
GRANT SELECT ON TABLE "public"."scrape_attempts" TO "authenticated";

-- service_role keeps ALL on all three tables (BYPASSRLS; cron + pipeline write).

NOTIFY pgrst, 'reload schema';
