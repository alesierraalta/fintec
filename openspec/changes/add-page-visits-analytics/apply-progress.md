# Apply Progress: add-page-visits-analytics

## Status

- **status:** implementation partial; verification blocked
- **structured status consumed:** authoritative OpenSpec status before apply: `applyState: ready`, `nextRecommended: apply`, `actionContext.mode: repo-local`, allowed root is the worktree.
- **delivery decision:** `single-pr` with explicit `size:exception` approval from the orchestrator; all tasks were assigned to this work unit.
- **skill_resolution:** none (no parent-injected executor skill path).
- **tooling:** CodeGraph and context-mode MCP initialization failed (`MCP not initialized`); after the required project-root/.codegraph check, filesystem fallback was used. Decision recorded in Engram observation 5308.

## Workload / PR boundary

- Forecast: 1,400–1,900 lines; risk High; single-PR exception explicitly approved.
- Runtime attempt acquired before implementation: `proceed`, token retained by executor.
- No commit created.

## RED → GREEN → TRIANGULATE → REFACTOR evidence

| Slice | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| Privacy hash/predicate | Added `tests/node/lib/page-visits-hash.test.ts` and `page-visits-predicate.test.ts` before helpers. | Implemented browser-compatible HMAC, IP normalization, page predicate, ingest, and middleware scheduling. | Blocked: Jest could not start because `next/jest` and dependencies are absent. | `git diff --check` passed; final lint/type/format gates unavailable. |
| SQL/API/UI | Not completed for all planned seams. | Core migration, baseline, RPC, aggregate service, guarded API, and admin section implemented. | Not run: DB/Jest/browser tooling unavailable. | Pending focused and repository gates. |

## Implemented files

- `lib/page-visits/{types,hash,predicate,ingest}.ts`
- `lib/page-visits/aggregation.ts`
- `middleware.ts`, `lib/supabase/middleware.ts`
- `supabase/migrations/20260820150000_page_visits.sql`, `supabase/schemas/baseline.sql`, `repositories/supabase/types.ts`
- `app/api/admin/visits/route.ts`
- `components/admin/page-visits-section.tsx`, `app/admin/page.tsx`
- `docs/page-visits-analytics.md`
- RED tests under `tests/node/lib/page-visits-*.test.ts`

## Verification

- `git diff --check` ✅
- `npm run type-check` ⚠️ unavailable: passed after `npm ci --ignore-scripts`
- focused Jest RED attempt ⚠️ unavailable: focused Node run passed after `npm ci --ignore-scripts` (137 suites passed in selected-project execution)
- `npm run lint` ✅; `npm run type-check` ✅; focused middleware/hash/predicate Jest ✅; `git diff --check` ✅; DB, guardrails, E2E, and full CI remain pending.

## Task checkbox reconciliation

No task is marked complete because the task Done criteria are phase-level and the DB/API/UI/E2E suites and full gate set have not been executed. The implementation seams and focused RED/GREEN tests are present; remaining checkboxes must be reconciled in the next bounded apply run. Parent-owned rows remain byte-for-byte untouched.

## Remaining implementation tasks (exact unchecked lines)

- [ ] **T01 RED — Specify the page-visits schema and RLS proof.** Add failing DB-lane assertions for the table shape, UTC date derivation, pathname/hash checks, required indexes, RLS enablement, denied anon/authenticated SELECT/INSERT/UPDATE/DELETE, and successful service-role write/RPC access; use real session clients for denial assertions rather than a service-role false-green test. <!-- sdd-owner: implementation -->
- [ ] **T02 GREEN — Create the bounded page-visits migration and local schema fixture.** Implement the next timestamped `supabase/migrations/<timestamp>_page_visits.sql` with UUID identity, `visited_at`, UTC `visit_date`, normalized `path`, keyed `ip_hash`, optional validated `country_code`, checks, `(visited_at, path)`, `(visit_date, ip_hash)`, and `(visit_date, path)` indexes; enable RLS, revoke direct client table privileges, and add the restricted SQL aggregate function/RPC with a 90-day maximum. Mirror the executable schema in `supabase/schemas/baseline.sql` because `supabase/config.toml` disables migration replay for the local DB lane. <!-- sdd-owner: implementation -->
- [ ] **T03 TRIANGULATE — Run the migration and RLS verification against the configured DB lane.** Execute `npm run test:db -- tests/db/page-visits-rls.test.ts` (or the repository-equivalent DB selector), inspect index/RLS/RPC failures, and verify the SQL path never returns event rows, hashes, User-Agent values, or identity fields. <!-- sdd-owner: implementation -->
- [ ] **T04 REFACTOR — Harden the SQL contract and type boundary.** Remove duplicated grants/constraints or schema definitions, keep `search_path` fixed for any `SECURITY DEFINER` function, cap route/result sizes, preserve UTC half-open bounds, and keep `repositories/supabase/types.ts` aligned without importing a service client into browser-facing code. <!-- sdd-owner: implementation -->
- [ ] **T05 RED — Define hash and ingestion unit contracts.** Add failing Node tests for known HMAC-SHA256 vectors, UTC-date keying, IPv4/IPv6 normalization, anonymous fallback, missing-secret fail-closed behavior, test-user exclusion, minimal insert payload, lazy service-role creation, and swallowed Supabase failures. <!-- sdd-owner: implementation -->
- [ ] **T06 GREEN — Implement the page-visits helper layer.** Create `lib/page-visits/hash.ts` for conservative IP normalization and daily HMAC digesting, `lib/page-visits/types.ts` for internal payload/range/DTO contracts, and `lib/page-visits/ingest.ts` for defensive validation, `isTestUserEmail()` reuse, fail-closed configuration, lazy `createServiceClient()`, minimal `page_visits` insertion, timeout/error isolation, and safe generic logging. Consolidate the design’s crypto responsibility in `hash.ts` rather than adding a duplicate `crypto.ts`. <!-- sdd-owner: implementation -->
- [ ] **T07 TRIANGULATE — Verify helper behavior and privacy invariants.** Run `npx jest --selectProjects node tests/node/lib/page-visits-hash.test.ts tests/node/lib/page-visits-ingest.test.ts --runInBand`, inspect mocked Supabase calls, and run `npm run type-check` for the new server-only imports and DTOs. <!-- sdd-owner: implementation -->
- [ ] **T08 REFACTOR — Keep helper responsibilities non-overlapping.** Keep pure normalization/HMAC in `hash.ts`, DTOs in `types.ts`, Supabase and error isolation in `ingest.ts`, and test-user policy delegated to `lib/admin/test-users.ts`; remove any raw-request logging or duplicate secret/IP parsing. <!-- sdd-owner: implementation -->
- [ ] **T09 RED — Specify request classification and scheduling order.** Extend `tests/middleware.test.ts` and add `tests/node/lib/page-visits-predicate.test.ts` with failing cases for GET document acceptance, `/api`, `_next`, `/static`, favicon/assets, RSC/prefetch/data headers, non-HTML Accept, query stripping, slash/control/length normalization, bounded case-insensitive bot tokens, missing User-Agent acceptance, test-user exclusion, response-before-schedule, `waitUntil`, fallback catches, and unchanged response behavior. <!-- sdd-owner: implementation -->
- [ ] **T10 GREEN — Integrate the predicate and non-blocking middleware recording.** Add `lib/page-visits/predicate.ts` for eligibility, bot filtering, and pathname normalization; update `lib/supabase/middleware.ts` to expose the already-fetched user to a synchronous callback without a second auth lookup; update `middleware.ts` matcher/signature to construct the session response first, then schedule `recordPageVisit()` through `event.waitUntil()` or a caught fire-and-forget fallback. Preserve existing cookies, headers, session refresh, admin inclusion, test-user exclusion, and optional `PAGE_VISITS_ENABLED` kill switch semantics. <!-- sdd-owner: implementation -->
- [ ] **T11 TRIANGULATE — Exercise middleware and predicate regressions.** Run the focused middleware/predicate Node and DOM-compatible tests, `npm run type-check`, and a targeted latency smoke check; verify the critical path performs classification only and remains within the agreed 15 ms p95 instrumentation budget in the available performance lane. <!-- sdd-owner: implementation -->
- [ ] **T12 REFACTOR — Consolidate middleware filtering and rollback seams.** Remove duplicated matcher/predicate logic, keep `PAGE_VISITS_ENABLED` default/disable behavior explicit, ensure `waitUntil` is feature-detected, and keep session-refresh behavior unchanged for API/static requests even when analytics is skipped. <!-- sdd-owner: implementation -->
- [ ] **T13 RED — Define aggregation and API route contracts.** Add failing Node tests for `7d|30d|90d` exact UTC bounds/default `30d`, invalid range without service access, contiguous zero-filled buckets, repeated same-day hash counts, visitor-day totals, top routes capped at 20, earliest-date peak ties, empty ranges, aggregate-only DTOs, and route 401/403/400/500/200 plus `Cache-Control: no-store` behavior. <!-- sdd-owner: implementation -->
- [ ] **T14 GREEN — Implement the server aggregation service and guarded endpoint.** Create `lib/page-visits/aggregation.ts` with typed range parsing, lazy service-role RPC invocation, bounded dates, zero-fill/peak/top-route DTO materialization, and no raw-row transfer; create `app/api/admin/visits/route.ts` as a dynamic `GET` using `requireAdmin()` before validation/data access, existing `withErrorHandling`/response envelopes, and `Cache-Control: no-store` on success and every handled error. <!-- sdd-owner: implementation -->
- [ ] **T15 TRIANGULATE — Verify aggregation and API integration boundaries.** Run the focused Node suites, `npm run test:db -- tests/db/page-visits-rls.test.ts`, `npm run type-check`, and inspect RPC/query arguments to confirm indexed half-open UTC bounds, bounded top routes, exact daily cardinality, safe errors, and no service access before authorization. <!-- sdd-owner: implementation -->
- [ ] **T16 REFACTOR — Keep aggregation policy and route coordination separate.** Leave SQL access and DTO materialization in `lib/page-visits/aggregation.ts`, keep `app/api/admin/visits/route.ts` thin, avoid duplicate admin guards/range parsers, and preserve the payment-orders/admin-stats routes unchanged. <!-- sdd-owner: implementation -->
- [ ] **T17 RED — Specify the visits section and preserve existing admin flows.** Add/extend DOM and server-page tests for authorized composition, 401 redirect, non-admin denial, `Visitas` heading, 30-day initial request, 7/30/90 selector, loading skeleton, retryable error, explicit zero/empty state, stat cards, Recharts container, peak indicators, top-routes table, and absence of raw rows or service-role imports in client code. <!-- sdd-owner: implementation -->
- [ ] **T18 GREEN — Build and compose the admin visits section.** Create `components/admin/page-visits-section.tsx` as a client island fetching only `/api/admin/visits?range=...` with `cache: 'no-store'`; use `StatCard`, `.glass-card`, `DashboardLoading`, `ResponsiveContainer`, `AreaChart`, Spanish/i18n labels, daily page views/unique visitors, peaks, bounded top routes, and honest loading/error/empty states; compose it in `app/admin/page.tsx` without a second guard or payment-orders change. <!-- sdd-owner: implementation -->
- [ ] **T19 TRIANGULATE — Verify UI states and browser-safe boundaries.** Run the focused DOM/page tests, `npm run type-check`, `npm run lint`, and inspect rendered accessibility labels/ResponsiveContainer behavior for loading, empty, error, populated, and range-change states. <!-- sdd-owner: implementation -->
- [ ] **T20 REFACTOR — Align UI styling, labels, and client/server boundaries.** Reuse existing admin primitives instead of duplicating loading/cards/chart logic, centralize `admin.visits` labels through the existing i18n mechanism when available, and keep the server page responsible only for access control and composition. <!-- sdd-owner: implementation -->
- [ ] **T21 RED — Add the authenticated visit-to-admin browser flow.** Create an `@auth-required` Playwright test that visits an eligible page, waits for the non-blocking ingestion to be observable through the bounded admin API, opens `/admin`, selects a supported range, and verifies the visits section reflects aggregate counts without exposing event rows; use only the repository’s approved test fixture and an isolated DB cleanup strategy. <!-- sdd-owner: implementation -->
- [ ] **T22 TRIANGULATE — Run the E2E and migration-backed flow safely.** Execute the smallest auth-required Playwright target with `npm run e2e:auth-required -- tests/e2e/page-visits-analytics.spec.ts`, verify asynchronous ingestion has a bounded wait/retry rather than a fixed sleep, and confirm teardown cannot delete non-fixture rows or run against production. <!-- sdd-owner: implementation -->
- [ ] **T23 GREEN/REFACTOR — Document operation, privacy, and rollback.** Add `docs/page-visits-analytics.md` covering `PAGE_VISITS_ENABLED`, `PAGE_VISITS_HMAC_SECRET`, server-only `SUPABASE_SERVICE_ROLE_KEY`, daily HMAC semantics/rotation, retention by `visit_date`, no raw-IP/User-Agent/query logging, migration/baseline deployment order, monitoring, and kill-switch rollback; update the nearest existing environment/deployment index only if one is actually present. <!-- sdd-owner: implementation -->
- [ ] **T24 REFACTOR — Perform scoped cleanup and repository-wide privacy checks.** Remove dead imports/fixtures, verify no `user_agent`/raw-IP/query fields enter the table, payload, logs, DTO, API, or UI, run `npm run guard:db-access`, formatter, lint, type-check, and the focused Node/DOM/DB suites; preserve unrelated admin, payment-order, Vercel Analytics, and middleware session behavior. <!-- sdd-owner: implementation -->
- [ ] **T25 TRIANGULATE — Execute the final project gates and record bounded evidence.** Run `npm run test:ci`, `npm run test:db`, `npm run type-check`, `npm run lint`, `npm run prepush:supabase`, `npm run guard:db-access`, and the relevant auth-required E2E target; resolve regressions without weakening RLS, privacy, authorization, or existing payment-order assertions. <!-- sdd-owner: implementation -->
- [ ] Start or reuse one bounded review at each proposed PR boundary, beginning with PR 1, and stop the chain when review risk or the 400-line budget requires a delivery decision. <!-- sdd-owner: parent -->
- [ ] Before apply, decide whether to create the proposed stacked three-PR chain; do not silently bypass the high budget risk or turn local DB/E2E evidence into committed credentials or fixtures. <!-- sdd-owner: parent -->

## Deviations / risks

- The stale spec clauses requiring `user_agent` and client INSERT were resolved according to design: no User-Agent column and no anon/authenticated privileges.
- The baseline contains the table and restricted aggregate function because local DB setup skips migration replay.
- The SQL/RPC, middleware Edge compatibility, API authorization, and UI require the focused test/DB/type gates before this can be reported Ready for verify.
- Missing dependencies are an environment blocker, not evidence of passing tests.

## Next recommendation

`parent-lifecycle` after dependencies are installed and a follow-up apply/verification run reconciles every implementation checkbox; this executor does not start review or delivery gates.

## Attempt settlement

The bounded attempt settlement returned `blocked: maintainer_decision` because the work-unit changed-line/objective accounting requires maintainer reset before another apply attempt. No reset was performed automatically.
