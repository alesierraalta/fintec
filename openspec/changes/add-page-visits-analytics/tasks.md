# Implementation Tasks: Page Visits Analytics

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,400–1,900 total |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

Strict TDD is enabled in `openspec/config.yaml`. Tasks marked RED must introduce the failing seam before the corresponding GREEN implementation. The repository has Jest Node/DOM/DB lanes, Playwright E2E, type-check, lint, formatter, and Supabase guardrails.

> **Implementation authority for the privacy conflict:** `design.md` supersedes the stale `specs/page-visits/spec.md` clauses that require a `user_agent` column or anonymous/authenticated INSERT policies. The implementation stores no User-Agent and denies direct client INSERT/SELECT; only the server-only service-role path writes and aggregates.

## PR 1 — Storage, privacy helpers, and middleware

### 1. Migration, RLS, and database contract

- [ ] **T01 RED — Specify the page-visits schema and RLS proof.** Add failing DB-lane assertions for the table shape, UTC date derivation, pathname/hash checks, required indexes, RLS enablement, denied anon/authenticated SELECT/INSERT/UPDATE/DELETE, and successful service-role write/RPC access; use real session clients for denial assertions rather than a service-role false-green test. <!-- sdd-owner: implementation -->
  - **Descripción:** Define la prueba ejecutable del contrato SQL antes de crear la migración.
  - **Archivos:** `tests/db/page-visits-rls.test.ts`, `tests/db/support/env.ts` only if the existing DB harness needs a page-visits fixture/config seam.
  - **Done:** The DB test fails for the absent `page_visits` relation and explicitly rejects `user_agent`, client grants, raw IP, and unbounded aggregate access.
  - **Estimación:** 1 focused session, 2–3 h.
  - **Dependencias:** None.

- [x] **T02 GREEN — Create the bounded page-visits migration and local schema fixture.** Implement the next timestamped `supabase/migrations/<timestamp>_page_visits.sql` with UUID identity, `visited_at`, UTC `visit_date`, normalized `path`, keyed `ip_hash`, optional validated `country_code`, checks, `(visited_at, path)`, `(visit_date, ip_hash)`, and `(visit_date, path)` indexes; enable RLS, revoke direct client table privileges, and add the restricted SQL aggregate function/RPC with a 90-day maximum. Mirror the executable schema in `supabase/schemas/baseline.sql` because `supabase/config.toml` disables migration replay for the local DB lane. <!-- sdd-owner: implementation -->
  - **Descripción:** Persistir únicamente el mínimo privado y dejar el agregado en la base de datos sin políticas permisivas para clientes.
  - **Archivos:** `supabase/migrations/<timestamp>_page_visits.sql`, `supabase/schemas/baseline.sql`, `repositories/supabase/types.ts`.
  - **Done:** Applying/resetting the schema creates the table and RPC, exposes no `user_agent`/PII column, grants no anon/authenticated direct write/read, and the service role can insert and call only the bounded aggregate path; generated/manual Supabase types include `page_visits` and the RPC without widening client access.
  - **Estimación:** 1–2 focused sessions, 4–6 h.
  - **Dependencias:** T01.

- [ ] **T03 TRIANGULATE — Run the migration and RLS verification against the configured DB lane.** Execute `npm run test:db -- tests/db/page-visits-rls.test.ts` (or the repository-equivalent DB selector), inspect index/RLS/RPC failures, and verify the SQL path never returns event rows, hashes, User-Agent values, or identity fields. <!-- sdd-owner: implementation -->
  - **Descripción:** Probar las fronteras reales de privilegios y la compatibilidad con el baseline local, no solo el SQL como texto.
  - **Archivos:** `tests/db/page-visits-rls.test.ts`, `supabase/migrations/<timestamp>_page_visits.sql`, `supabase/schemas/baseline.sql` only if corrections are required.
  - **Done:** Service-role insertion and bounded aggregate pass; anonymous/authenticated clients receive denial for direct reads and writes; repeated same-day hashes aggregate once and empty days are materializable.
  - **Estimación:** 1 focused session, 2–4 h including DB setup.
  - **Dependencias:** T02.

- [x] **T04 REFACTOR — Harden the SQL contract and type boundary.** Remove duplicated grants/constraints or schema definitions, keep `search_path` fixed for any `SECURITY DEFINER` function, cap route/result sizes, preserve UTC half-open bounds, and keep `repositories/supabase/types.ts` aligned without importing a service client into browser-facing code. <!-- sdd-owner: implementation -->
  - **Descripción:** Dejar migración, baseline, RPC y tipos coherentes y auditables para despliegue/rollback.
  - **Archivos:** `supabase/migrations/<timestamp>_page_visits.sql`, `supabase/schemas/baseline.sql`, `repositories/supabase/types.ts`.
  - **Done:** `npm run type-check`, the focused DB test, and `npm run precommit:supabase` pass without broad grants, unbounded SQL, or duplicate schema logic.
  - **Estimación:** 1 focused session, 1–2 h.
  - **Dependencias:** T03.

### 2. Hash, types, and service-role ingestion

- [ ] **T05 RED — Define hash and ingestion unit contracts.** Add failing Node tests for known HMAC-SHA256 vectors, UTC-date keying, IPv4/IPv6 normalization, anonymous fallback, missing-secret fail-closed behavior, test-user exclusion, minimal insert payload, lazy service-role creation, and swallowed Supabase failures. <!-- sdd-owner: implementation -->
  - **Descripción:** Fijar pruebas de privacidad y de no bloqueo antes de escribir los helpers.
  - **Archivos:** `tests/node/lib/page-visits-hash.test.ts`, `tests/node/lib/page-visits-ingest.test.ts`.
  - **Done:** Tests assert that no raw IP, User-Agent, cookie, query string, user ID, secret, or event row escapes the helper and initially fail because `lib/page-visits/*` is absent.
  - **Estimación:** 1 focused session, 2–3 h.
  - **Dependencias:** T02.

- [x] **T06 GREEN — Implement the page-visits helper layer.** Create `lib/page-visits/hash.ts` for conservative IP normalization and daily HMAC digesting, `lib/page-visits/types.ts` for internal payload/range/DTO contracts, and `lib/page-visits/ingest.ts` for defensive validation, `isTestUserEmail()` reuse, fail-closed configuration, lazy `createServiceClient()`, minimal `page_visits` insertion, timeout/error isolation, and safe generic logging. Consolidate the design’s crypto responsibility in `hash.ts` rather than adding a duplicate `crypto.ts`. <!-- sdd-owner: implementation -->
  - **Descripción:** Abstraer service_role y mantener todos los datos sensibles en memoria hasta producir el digest.
  - **Archivos:** `lib/page-visits/hash.ts`, `lib/page-visits/types.ts`, `lib/page-visits/ingest.ts`, `lib/admin/test-users.ts` only for an import/API compatibility correction.
  - **Done:** The insert payload contains only normalized `path`, UTC `visited_at`, `ip_hash`, and validated optional country; test users and absent HMAC secrets are skipped, service-role creation occurs only inside ingestion, and failures resolve without throwing into middleware.
  - **Estimación:** 1–2 focused sessions, 4–5 h.
  - **Dependencias:** T05, T02.

- [ ] **T07 TRIANGULATE — Verify helper behavior and privacy invariants.** Run `npx jest --selectProjects node tests/node/lib/page-visits-hash.test.ts tests/node/lib/page-visits-ingest.test.ts --runInBand`, inspect mocked Supabase calls, and run `npm run type-check` for the new server-only imports and DTOs. <!-- sdd-owner: implementation -->
  - **Descripción:** Confirmar el vector HMAC, los límites de payload y que los errores no generan rechazos ni logs sensibles.
  - **Archivos:** `tests/node/lib/page-visits-hash.test.ts`, `tests/node/lib/page-visits-ingest.test.ts`, `lib/page-visits/hash.ts`, `lib/page-visits/types.ts`, `lib/page-visits/ingest.ts`.
  - **Done:** Focused tests and type-check pass; tests prove repeated source/day hashes are stable, different UTC days differ, and no service client is constructed for excluded or misconfigured events.
  - **Estimación:** 1 focused session, 1–2 h.
  - **Dependencias:** T06.

- [x] **T08 REFACTOR — Keep helper responsibilities non-overlapping.** Keep pure normalization/HMAC in `hash.ts`, DTOs in `types.ts`, Supabase and error isolation in `ingest.ts`, and test-user policy delegated to `lib/admin/test-users.ts`; remove any raw-request logging or duplicate secret/IP parsing. <!-- sdd-owner: implementation -->
  - **Descripción:** Preparar una superficie pequeña y reutilizable por middleware y tests sin importar Next/Supabase en lógica pura innecesaria.
  - **Archivos:** `lib/page-visits/hash.ts`, `lib/page-visits/types.ts`, `lib/page-visits/ingest.ts`, `tests/node/lib/page-visits-hash.test.ts`, `tests/node/lib/page-visits-ingest.test.ts`.
  - **Done:** `npm run lint` on the touched targets and Prettier checks pass; imports are server-safe and the helper API has one source of truth for privacy rules.
  - **Estimación:** 1 focused session, 1–2 h.
  - **Dependencias:** T07.

### 3. Middleware predicate, session seam, and fire-and-forget delivery

- [ ] **T09 RED — Specify request classification and scheduling order.** Extend `tests/middleware.test.ts` and add `tests/node/lib/page-visits-predicate.test.ts` with failing cases for GET document acceptance, `/api`, `_next`, `/static`, favicon/assets, RSC/prefetch/data headers, non-HTML Accept, query stripping, slash/control/length normalization, bounded case-insensitive bot tokens, missing User-Agent acceptance, test-user exclusion, response-before-schedule, `waitUntil`, fallback catches, and unchanged response behavior. <!-- sdd-owner: implementation -->
  - **Descripción:** Cubrir matcher y predicate compartido sin duplicar filtros dentro de la ruta de inserción.
  - **Archivos:** `tests/middleware.test.ts`, `tests/node/lib/page-visits-predicate.test.ts`.
  - **Done:** Tests fail before implementation and distinguish matcher optimization from the authoritative predicate; the event is never scheduled for excluded traffic.
  - **Estimación:** 1–2 focused sessions, 3–4 h.
  - **Dependencias:** T06, T08.

- [x] **T10 GREEN — Integrate the predicate and non-blocking middleware recording.** Add `lib/page-visits/predicate.ts` for eligibility, bot filtering, and pathname normalization; update `lib/supabase/middleware.ts` to expose the already-fetched user to a synchronous callback without a second auth lookup; update `middleware.ts` matcher/signature to construct the session response first, then schedule `recordPageVisit()` through `event.waitUntil()` or a caught fire-and-forget fallback. Preserve existing cookies, headers, session refresh, admin inclusion, test-user exclusion, and optional `PAGE_VISITS_ENABLED` kill switch semantics. <!-- sdd-owner: implementation -->
  - **Descripción:** Instrumentar todos los documentos App Router sin bloquear navegación ni persistir query/UA/IP.
  - **Archivos:** `lib/page-visits/predicate.ts`, `lib/supabase/middleware.ts`, `middleware.ts`, `lib/page-visits/ingest.ts` only if the callback payload needs a typed seam.
  - **Done:** Eligible public/authenticated/admin documents schedule exactly one event after response construction; excluded requests do not; async failures are caught, no second `auth.getUser()` occurs, and response status/headers/cookies remain unchanged.
  - **Estimación:** 1–2 focused sessions, 4–6 h.
  - **Dependencias:** T09, T06.

- [ ] **T11 TRIANGULATE — Exercise middleware and predicate regressions.** Run the focused middleware/predicate Node and DOM-compatible tests, `npm run type-check`, and a targeted latency smoke check; verify the critical path performs classification only and remains within the agreed 15 ms p95 instrumentation budget in the available performance lane. <!-- sdd-owner: implementation -->
  - **Descripción:** Validar runtime Edge-compatible, orden de scheduling y ausencia de unhandled rejections.
  - **Archivos:** `tests/middleware.test.ts`, `tests/node/lib/page-visits-predicate.test.ts`, `middleware.ts`, `lib/supabase/middleware.ts`.
  - **Done:** All focused cases pass for headers, matcher, bots, test users, missing UA, fallback scheduling, response preservation, and bounded latency; failures do not print request data.
  - **Estimación:** 1 focused session, 2–3 h.
  - **Dependencias:** T10.

- [x] **T12 REFACTOR — Consolidate middleware filtering and rollback seams.** Remove duplicated matcher/predicate logic, keep `PAGE_VISITS_ENABLED` default/disable behavior explicit, ensure `waitUntil` is feature-detected, and keep session-refresh behavior unchanged for API/static requests even when analytics is skipped. <!-- sdd-owner: implementation -->
  - **Descripción:** Dejar un único predicado reusable y una única ruta de scheduling antes de pasar a agregados.
  - **Archivos:** `middleware.ts`, `lib/page-visits/predicate.ts`, `lib/supabase/middleware.ts`, `tests/middleware.test.ts`, `tests/node/lib/page-visits-predicate.test.ts`.
  - **Done:** Prettier/lint/type-check and focused tests pass; no client bundle imports service-role/HMAC code and disabling analytics changes no navigation behavior.
  - **Estimación:** 1 focused session, 1–2 h.
  - **Dependencias:** T11.

## PR 2 — Aggregation API and admin UI

### 4. UTC aggregation and guarded API

- [ ] **T13 RED — Define aggregation and API route contracts.** Add failing Node tests for `7d|30d|90d` exact UTC bounds/default `30d`, invalid range without service access, contiguous zero-filled buckets, repeated same-day hash counts, visitor-day totals, top routes capped at 20, earliest-date peak ties, empty ranges, aggregate-only DTOs, and route 401/403/400/500/200 plus `Cache-Control: no-store` behavior. <!-- sdd-owner: implementation -->
  - **Descripción:** Especificar reducers/materialización y autorización antes de conectar el RPC.
  - **Archivos:** `tests/node/lib/page-visits-aggregation.test.ts`, `tests/node/api/admin-visits-route.test.ts`.
  - **Done:** Tests mock only `createServiceClient()`/`requireAdmin()` and initially fail because `aggregation.ts` and `/api/admin/visits` are absent; no test expects raw event rows.
  - **Estimación:** 1–2 focused sessions, 3–4 h.
  - **Dependencias:** T04, T08.

- [x] **T14 GREEN — Implement the server aggregation service and guarded endpoint.** Create `lib/page-visits/aggregation.ts` with typed range parsing, lazy service-role RPC invocation, bounded dates, zero-fill/peak/top-route DTO materialization, and no raw-row transfer; create `app/api/admin/visits/route.ts` as a dynamic `GET` using `requireAdmin()` before validation/data access, existing `withErrorHandling`/response envelopes, and `Cache-Control: no-store` on success and every handled error. <!-- sdd-owner: implementation -->
  - **Descripción:** Exponer solo agregados SQL acotados y mantener la guardia existente como única autorización.
  - **Archivos:** `lib/page-visits/aggregation.ts`, `app/api/admin/visits/route.ts`, `repositories/supabase/types.ts` if the RPC type needs alignment.
  - **Done:** Admin receives exactly the DTO contract for 7/30/90 days; unauthenticated/non-admin callers cannot invoke the service; invalid ranges return 400 without querying; no response contains hashes, UA, IP, identity, query strings, or event rows.
  - **Estimación:** 1–2 focused sessions, 4–6 h.
  - **Dependencias:** T13, T02.

- [ ] **T15 TRIANGULATE — Verify aggregation and API integration boundaries.** Run the focused Node suites, `npm run test:db -- tests/db/page-visits-rls.test.ts`, `npm run type-check`, and inspect RPC/query arguments to confirm indexed half-open UTC bounds, bounded top routes, exact daily cardinality, safe errors, and no service access before authorization. <!-- sdd-owner: implementation -->
  - **Descripción:** Comparar el contrato público con el RPC real y detectar fugas o desbordes de rango.
  - **Archivos:** `tests/node/lib/page-visits-aggregation.test.ts`, `tests/node/api/admin-visits-route.test.ts`, `lib/page-visits/aggregation.ts`, `app/api/admin/visits/route.ts`.
  - **Done:** Unit/API/DB assertions pass for populated, sparse, empty, repeated-hash, invalid-range, unauthorized, and service-error cases; all route outcomes carry `no-store` and generic non-PII errors.
  - **Estimación:** 1 focused session, 2–3 h.
  - **Dependencias:** T14.

- [x] **T16 REFACTOR — Keep aggregation policy and route coordination separate.** Leave SQL access and DTO materialization in `lib/page-visits/aggregation.ts`, keep `app/api/admin/visits/route.ts` thin, avoid duplicate admin guards/range parsers, and preserve the payment-orders/admin-stats routes unchanged. <!-- sdd-owner: implementation -->
  - **Descripción:** Reducir el blast radius y asegurar que el navegador nunca recibe filas de eventos.
  - **Archivos:** `lib/page-visits/aggregation.ts`, `app/api/admin/visits/route.ts`, `tests/node/lib/page-visits-aggregation.test.ts`, `tests/node/api/admin-visits-route.test.ts`.
  - **Done:** Prettier/lint/type-check and focused tests pass; route contains no Supabase query, reducer, or authorization policy duplication.
  - **Estimación:** 1 focused session, 1–2 h.
  - **Dependencias:** T15.

### 5. Admin visits UI and page composition

- [ ] **T17 RED — Specify the visits section and preserve existing admin flows.** Add/extend DOM and server-page tests for authorized composition, 401 redirect, non-admin denial, `Visitas` heading, 30-day initial request, 7/30/90 selector, loading skeleton, retryable error, explicit zero/empty state, stat cards, Recharts container, peak indicators, top-routes table, and absence of raw rows or service-role imports in client code. <!-- sdd-owner: implementation -->
  - **Descripción:** Fijar el comportamiento visual y las regresiones de autorización antes de crear el componente.
  - **Archivos:** `tests/components/page-visits-section.test.tsx`, `tests/app/admin/page.test.tsx` (reuse the existing admin page test if present).
  - **Done:** Tests fail for the missing section and assert existing `AdminStatsDashboard`, login redirect, denied state, and payment-orders behavior remain intact.
  - **Estimación:** 1–2 focused sessions, 3–4 h.
  - **Dependencias:** T16.

- [x] **T18 GREEN — Build and compose the admin visits section.** Create `components/admin/page-visits-section.tsx` as a client island fetching only `/api/admin/visits?range=...` with `cache: 'no-store'`; use `StatCard`, `.glass-card`, `DashboardLoading`, `ResponsiveContainer`, `AreaChart`, Spanish/i18n labels, daily page views/unique visitors, peaks, bounded top routes, and honest loading/error/empty states; compose it in `app/admin/page.tsx` without a second guard or payment-orders change. <!-- sdd-owner: implementation -->
  - **Descripción:** Integrar una sección agregada y responsive en la página admin existente.
  - **Archivos:** `components/admin/page-visits-section.tsx`, `app/admin/page.tsx`, `tests/components/page-visits-section.test.tsx`, `tests/app/admin/page.test.tsx`.
  - **Done:** Authorized admins see cards/chart/table and range changes reload the matching API; unauthorized flows stay unchanged; no component queries Supabase, renders raw rows, sets cookies, or creates a parallel analytics shell.
  - **Estimación:** 1–2 focused sessions, 5–7 h.
  - **Dependencias:** T17, T14.

- [ ] **T19 TRIANGULATE — Verify UI states and browser-safe boundaries.** Run the focused DOM/page tests, `npm run type-check`, `npm run lint`, and inspect rendered accessibility labels/ResponsiveContainer behavior for loading, empty, error, populated, and range-change states. <!-- sdd-owner: implementation -->
  - **Descripción:** Confirmar que el DTO se presenta sin inventar ceros ni filtrar datos sensibles.
  - **Archivos:** `components/admin/page-visits-section.tsx`, `app/admin/page.tsx`, `tests/components/page-visits-section.test.tsx`, `tests/app/admin/page.test.tsx`.
  - **Done:** DOM tests, type-check, and lint pass; cards, chart, peaks, table, selector, retry, and empty state reflect only aggregate DTO data and existing admin/payment-order behavior remains green.
  - **Estimación:** 1 focused session, 2–3 h.
  - **Dependencias:** T18.

- [x] **T20 REFACTOR — Align UI styling, labels, and client/server boundaries.** Reuse existing admin primitives instead of duplicating loading/cards/chart logic, centralize `admin.visits` labels through the existing i18n mechanism when available, and keep the server page responsible only for access control and composition. <!-- sdd-owner: implementation -->
  - **Descripción:** Pulir la sección sin introducir framework de analítica, guardia ni traducción paralela.
  - **Archivos:** `components/admin/page-visits-section.tsx`, `app/admin/page.tsx`, `tests/components/page-visits-section.test.tsx`, `tests/app/admin/page.test.tsx`, existing message file only if the repository has one.
  - **Done:** Prettier/lint/type-check and DOM tests pass; the component is aggregate-only, Spanish copy has the established fallback, and no unrelated admin file changes remain.
  - **Estimación:** 1 focused session, 1–2 h.
  - **Dependencias:** T19.

## PR 3 — End-to-end proof, documentation, cleanup, and gates

### 6. Visit-to-admin E2E flow

- [ ] **T21 RED — Add the authenticated visit-to-admin browser flow.** Create an `@auth-required` Playwright test that visits an eligible page, waits for the non-blocking ingestion to be observable through the bounded admin API, opens `/admin`, selects a supported range, and verifies the visits section reflects aggregate counts without exposing event rows; use only the repository’s approved test fixture and an isolated DB cleanup strategy. <!-- sdd-owner: implementation -->
  - **Descripción:** Probar el recorrido real middleware → Supabase → RPC → API → UI, sin credenciales ni snapshots productivos.
  - **Archivos:** `tests/e2e/page-visits-analytics.spec.ts`, `tests/utils/database-cleanup.ts` only if a scoped page-visits cleanup helper is required, `tests/e2e/00-supabase-auth-smoke.spec.ts` only for shared fixture conventions.
  - **Done:** The auth-required lane proves an eligible document increases/appears in the admin aggregate, a query-bearing navigation stores only its pathname, and the browser sees no hash/IP/User-Agent/event rows; no-auth lane is not made dependent on admin credentials.
  - **Estimación:** 1–2 focused sessions, 4–6 h including local DB stabilization.
  - **Dependencias:** T20, T03, T16.

- [ ] **T22 TRIANGULATE — Run the E2E and migration-backed flow safely.** Execute the smallest auth-required Playwright target with `npm run e2e:auth-required -- tests/e2e/page-visits-analytics.spec.ts`, verify asynchronous ingestion has a bounded wait/retry rather than a fixed sleep, and confirm teardown cannot delete non-fixture rows or run against production. <!-- sdd-owner: implementation -->
  - **Descripción:** Separar evidencia real de navegador/DB de los tests unitarios y evitar contaminación de datos.
  - **Archivos:** `tests/e2e/page-visits-analytics.spec.ts`, `tests/utils/database-cleanup.ts` if touched.
  - **Done:** E2E passes in the configured local/auth lane or records a documented environment blocker without weakening committed assertions or committing credentials.
  - **Estimación:** 1 focused session, 2–4 h.
  - **Dependencias:** T21.

### 7. Documentation and cleanup

- [x] **T23 GREEN/REFACTOR — Document operation, privacy, and rollback.** Add `docs/page-visits-analytics.md` covering `PAGE_VISITS_ENABLED`, `PAGE_VISITS_HMAC_SECRET`, server-only `SUPABASE_SERVICE_ROLE_KEY`, daily HMAC semantics/rotation, retention by `visit_date`, no raw-IP/User-Agent/query logging, migration/baseline deployment order, monitoring, and kill-switch rollback; update the nearest existing environment/deployment index only if one is actually present. <!-- sdd-owner: implementation -->
  - **Descripción:** Hacer auditable la configuración y el manejo de secretos sin incluir valores reales ni crear un `.env` comprometido.
  - **Archivos:** `docs/page-visits-analytics.md`, `README.md` or existing docs index only if the repository convention requires a link.
  - **Done:** Docs explain setup, rotation invalidation across dates, bounded ranges, RLS/service-role boundaries, retention decision, rollout and rollback; no secret, IP, UA, cookie, user ID, or hosted data is committed.
  - **Estimación:** 1 focused session, 1–2 h.
  - **Dependencias:** T04, T12, T16, T20.

- [ ] **T24 REFACTOR — Perform scoped cleanup and repository-wide privacy checks.** Remove dead imports/fixtures, verify no `user_agent`/raw-IP/query fields enter the table, payload, logs, DTO, API, or UI, run `npm run guard:db-access`, formatter, lint, type-check, and the focused Node/DOM/DB suites; preserve unrelated admin, payment-order, Vercel Analytics, and middleware session behavior. <!-- sdd-owner: implementation -->
  - **Descripción:** Cerrar fugas accidentales y dejar el diff limitado al cambio aprobado.
  - **Archivos:** All touched files from `T01`–`T23`; specifically audit `middleware.ts`, `lib/page-visits/*`, `lib/supabase/middleware.ts`, `app/api/admin/visits/route.ts`, `components/admin/page-visits-section.tsx`, migration/baseline/types, and tests.
  - **Done:** `npm run type-check`, `npm run lint`, `npm run guard:db-access`, `npm run format:check`, focused Jest Node/DOM/DB lanes, and the available E2E target pass; the final diff contains no unrelated cleanup or credentials.
  - **Estimación:** 1–2 focused sessions, 3–5 h.
  - **Dependencias:** T22, T23.

- [ ] **T25 TRIANGULATE — Execute the final project gates and record bounded evidence.** Run `npm run test:ci`, `npm run test:db`, `npm run type-check`, `npm run lint`, `npm run prepush:supabase`, `npm run guard:db-access`, and the relevant auth-required E2E target; resolve regressions without weakening RLS, privacy, authorization, or existing payment-order assertions. <!-- sdd-owner: implementation -->
  - **Descripción:** Verificar el conjunto completo disponible y reportar bloqueos de entorno por separado de fallos de código.
  - **Archivos:** No new implementation files; only test/config corrections within the scoped files if a gate exposes a genuine defect.
  - **Done:** All applicable gates are green, or each unavailable external lane has a sanitized blocker and a reproducible local command; no claim of live DB/E2E success is made without execution.
  - **Estimación:** 1 focused session, 2–4 h plus test runtime.
  - **Dependencias:** T24.

## Parent-owned lifecycle actions

- [ ] Start or reuse one bounded review at each proposed PR boundary, beginning with PR 1, and stop the chain when review risk or the 400-line budget requires a delivery decision. <!-- sdd-owner: parent -->
- [ ] Before apply, decide whether to create the proposed stacked three-PR chain; do not silently bypass the high budget risk or turn local DB/E2E evidence into committed credentials or fixtures. <!-- sdd-owner: parent -->

## Suggested chain boundaries

| Boundary | Contents | Estimate |
|---|---|---:|
| PR 1 | T01–T12: migration/baseline/types, hash/types/ingest, predicate, middleware, unit/DB tests | 500–700 changed lines |
| PR 2 | T13–T20: aggregation RPC client, guarded API, admin section, Node/DOM tests | 600–800 changed lines |
| PR 3 | T21–T25: auth-required E2E, operational docs, privacy cleanup, final gates | 300–400 changed lines |

## Key Learnings

1. The design deliberately resolves the specification conflict in favor of no `user_agent` persistence and no direct client writes; tasks and tests must enforce that privacy boundary.
2. The repository’s local Supabase stack uses `supabase/schemas/baseline.sql` instead of replaying `supabase/migrations`, so both artifacts need a coordinated DB test strategy.
3. Existing admin guard, service-role helper, test-user matcher, Recharts primitives, and Playwright auth/DB lanes should be reused rather than duplicated.
4. The critical runtime seam is response-first middleware scheduling; all Supabase work, HMAC-secret checks, and failures stay outside the navigation response path.
