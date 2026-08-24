# Implementation Tasks: Admin Analytics Dashboard

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,700–2,200 total |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Strict TDD is enabled and the repository has a Jest Node project. Node service and API work is ordered RED → GREEN → TRIANGULATE → REFACTOR. Real-database and deployment checks are local-only evidence; they must not become committed E2E tests, fixtures, migrations, or environment files.

## 1. Dependencies and root analytics mount

**Artifact status: repo-committed (`package.json`, `package-lock.json`, `app/layout.tsx`).**

- [x] **1.1.** Add compatible Next 16/React 19 runtime versions of `@vercel/analytics` and `@vercel/speed-insights` to `package.json`, update `package-lock.json` with the package manager, and do not add environment gating or unrelated dependencies. <!-- sdd-owner: implementation -->

- [x] **1.2.** Update `app/layout.tsx` to import `Analytics` and `SpeedInsights` and mount exactly one of each immediately after `RouteAwareProviders`, before `Toaster`; do not add a nested mount or alter provider/payment-order behavior. <!-- sdd-owner: implementation -->

- [x] **1.3.** Verify the dependency manifest and `app/layout.tsx` contain one import/mount for each Vercel component, the lockfile resolves the selected versions without peer/type errors, and `npm run type-check` passes for the package/layout integration. <!-- sdd-owner: implementation -->

## 2. Shared fail-closed admin guard

**Artifact status: repo-committed (`lib/admin/guard.ts`, `tests/node/lib/admin-guard.test.ts`).**

- [x] **2.1. RED:** Create `tests/node/lib/admin-guard.test.ts` before the helper, mocking `@/lib/auth/get-authenticated-user` and `@/lib/payment-orders/admin-utils`; specify that authentication is attempted first, auth failures propagate, an authenticated non-admin causes `requireAdmin()` to throw `AppError` with code `FORBIDDEN` and status `403`, and an admin is accepted. Confirm the new test fails because `lib/admin/guard.ts` is not implemented. <!-- sdd-owner: implementation -->

- [x] **2.2. GREEN:** Implement `lib/admin/guard.ts` with `getAdminAccess()` and `requireAdmin()`. Reuse the existing `isAdmin()` policy from `lib/payment-orders/admin-utils.ts`, preserve its empty/unset `ADMIN_USER_IDS` fail-closed behavior, perform `getAuthenticatedUser()` before any authorization/data work, and leave the payment-orders page/route untouched. <!-- sdd-owner: implementation -->

- [x] **2.3. TRIANGULATE:** Run the guard Node lane and compare the helper against the design call flow: `getAuthenticatedUser()` → `isAdmin()`; verify auth failures are not converted to `403`, non-admins are, and no service-role client is imported or constructed by the guard. <!-- sdd-owner: implementation -->

- [x] **2.4. REFACTOR:** Keep the guard framework-light and typed, avoid message-string authorization checks, centralize the auth/admin sequence without duplicating `isAdmin()` parsing, and retain the focused tests in `tests/node/lib/admin-guard.test.ts`. <!-- sdd-owner: implementation -->

## 3. Admin stats DTO, aggregate reducers, and service

**Artifact status: repo-committed (`lib/admin-stats/types.ts`, `lib/admin-stats/aggregates.ts`, `lib/admin-stats/service.ts`, `tests/node/lib/admin-stats-service.test.ts`).**

- [x] **3.1. RED:** Add `tests/node/lib/admin-stats-service.test.ts` with mocked `createServiceClient()` and chainable aggregate responses before implementing the service. Fixtures must cover default and bounded windows, UTC zero-filled `newByDay`, distinct `last_activity_at` DAU/WAU/MAU, peak date/tie behavior, empty activity, all six resource families, transaction ownership through `accounts.user_id`, nullable-account exclusion, merged per-user counts, and monthly usage counters. Assert narrow aggregate projections rather than raw-row retrieval and confirm database rejection fails the whole call. Confirm the suite fails because the new admin-stats modules are absent. <!-- sdd-owner: implementation -->

- [x] **3.2. GREEN:** Implement `lib/admin-stats/types.ts` with the documented DTOs, `StatsWindow`, query-window types, and `parseStatsWindow()` defaulting to `30d` and rejecting values outside `7d|30d|90d` with the project validation error. Implement `lib/admin-stats/aggregates.ts` as framework-free reducers/materializers for UTC registration buckets, distinct activity windows, earliest-date peak ties, empty activity status, and per-user resource-family merges. <!-- sdd-owner: implementation -->

- [x] **3.3. GREEN:** Implement `lib/admin-stats/service.ts` following `lib/payment-orders/order-service.ts` conventions: lazily obtain `createServiceClient()` only when `getAdminStats()` is called, capture one `now`, perform bounded users/activity and monthly usage reads, perform fixed aggregate reads for accounts, transactions joined through accounts, budgets, goals, subscriptions, and feedbacks, return only the DTO, log safe generic service failures, and rethrow so callers cannot receive partial metrics. Keep service-role access confined to this server module. <!-- sdd-owner: implementation -->

- [x] **3.4. TRIANGULATE:** Run `tests/node/lib/admin-stats-service.test.ts` in the Node project and verify every DTO field matches `specs/admin-analytics/spec.md`; specifically verify account totals may include unowned accounts while unowned transaction rows contribute neither to transaction totals nor to any synthetic user, no PII/raw rows cross the service boundary, UTC dates are stable, and usage is limited to the selected overlapping months. <!-- sdd-owner: implementation -->

- [x] **3.5. REFACTOR:** Keep all aggregation policy in `lib/admin-stats/aggregates.ts`, all Supabase access/error logging in `lib/admin-stats/service.ts`, and all public shapes in `lib/admin-stats/types.ts`; remove duplicated reducers, framework imports from pure logic, broad `select('*')` reads, and eager service-client initialization. Preserve the fixture-driven regression coverage. <!-- sdd-owner: implementation -->

## 4. Guarded aggregate API route

**Artifact status: repo-committed (`app/api/admin/stats/route.ts`, `tests/node/api/admin-stats-route.test.ts`).**

- [x] **4.1. RED:** Create `tests/node/api/admin-stats-route.test.ts` before the route, mocking `getAuthenticatedUser`, `isAdmin`, the stats service, and the logger. Specify authenticated-admin success, unauthenticated `401`, authenticated non-admin `403`, empty/unset policy denial, no service invocation on denial, default `30d`, each supported window, unsupported-window `400` with no aggregate call, standard success/error envelopes, `meta.timestamp`, `Cache-Control: no-store` on every response, and service failure as safe `500` `INTERNAL_ERROR` with `data: null`. Confirm the suite fails because the route is absent. <!-- sdd-owner: implementation -->

- [x] **4.2. GREEN:** Implement `app/api/admin/stats/route.ts` as a `GET` handler wrapped by `withErrorHandling`. Call `requireAdmin()` before window validation/data access, parse the bounded query with `parseStatsWindow()`, call `getAdminStats()`, return `successResponse()` with the documented envelope, and ensure success, validation, auth, forbidden, and internal-error responses all set `Cache-Control: no-store` and remain dynamic. <!-- sdd-owner: implementation -->

- [x] **4.3. TRIANGULATE:** Run the route Node lane and verify status/envelope/header behavior against the specification, including `403` fail-closed behavior, no service-role/service invocation for denied callers, `400` without aggregate execution for unsupported windows, generic non-PII `500` output, and logger use without tokens, IDs, secrets, or database details. <!-- sdd-owner: implementation -->

- [x] **4.4. REFACTOR:** Keep the route as a thin coordinator: no Supabase queries, aggregation, policy parsing, or DTO construction in `app/api/admin/stats/route.ts`; centralize response/header handling so no error path loses `no-store`, and retain the payment-orders admin-access route unchanged. <!-- sdd-owner: implementation -->

## 5. Server-guarded admin overview and UI island

**Artifact status: repo-committed (`app/admin/page.tsx`, `components/admin/admin-access-denied.tsx`, `components/admin/admin-stats-dashboard.tsx`, `components/admin/admin-stats-charts.tsx`, `tests/app/admin/page.test.tsx`).**

- [x] **5.1. RED:** Add `tests/app/admin/page.test.tsx` before the page/components, following the repository `tests/app/page.test.tsx` render-and-mock pattern (and the current `tests/app/chat/page.test.tsx` server-page equivalent if the named reference is unavailable). Mock the shared guard, `next/navigation`, dashboard island, `StatCard`/chart boundaries, and `fetch` as needed; specify auth failure redirect to `/auth/login`, authenticated non-admin denied state without dashboard/data, authorized render of the dashboard island, loading state, successful aggregate composition, explicit empty-activity state, retry/window behavior, and failed-fetch error state that does not render zero-valued metrics. Confirm the test fails because the new page/components are absent. <!-- sdd-owner: implementation -->

- [x] **5.2. GREEN:** Implement `app/admin/page.tsx` as a Server Component that calls `getAdminAccess()` before returning page content, redirects auth failures to the existing `/auth/login` flow, renders `AdminAccessDenied` for authenticated non-admins, and renders the authorized shell with `AdminStatsDashboard`; do not query Supabase or stats directly from the page. <!-- sdd-owner: implementation -->

- [x] **5.3. GREEN:** Implement `components/admin/admin-access-denied.tsx`, `components/admin/admin-stats-dashboard.tsx`, and `components/admin/admin-stats-charts.tsx` using Spanish copy, existing dark glass/iOS tokens, `DashboardLoading`, `StatCard`, and Recharts. The client island must fetch only `/api/admin/stats?window=...` with `cache: 'no-store'`, limit selection to `7d|30d|90d`, compose registration/DAU/WAU/MAU cards, UTC new-user and peak presentation, all resource totals/per-user opaque-ID counts, monthly usage, retry/error states, and an explicit session-refresh activity empty state. Never render failed data as zero and never expose PII/raw resource rows. <!-- sdd-owner: implementation -->

- [x] **5.4. TRIANGULATE:** Run the DOM/component test and inspect the rendered UI for accessibility and honest states: loading uses the shared dashboard pattern, API errors remain actionable, empty activity is labeled as session-refresh activity rather than request traffic, charts have usable labels/containers, per-user summaries show counts plus only the opaque identifier, and no page/component imports a service-role client or queries Supabase. <!-- sdd-owner: implementation -->

- [x] **5.5. REFACTOR:** Keep `app/admin/page.tsx` responsible only for server access control and shell composition, keep fetching/state in `admin-stats-dashboard.tsx`, keep Recharts composition thin in `admin-stats-charts.tsx`, and reuse existing primitives instead of duplicating cards/loading styles or modifying `/admin/payment-orders`. <!-- sdd-owner: implementation -->

## 6. Local-only real-run and deployment evidence

**Artifact status: local-only evidence; do not commit a script, `.env*` file, credentials, snapshots, Playwright auth flow, migration, or live-database fixture.**

- [ ] **6.1.** In an untracked local environment, configure a test admin UUID in `ADMIN_USER_IDS` and the existing Supabase development credentials without printing either value; run the dev server and verify `/admin` for admin, non-admin, and unauthenticated sessions, including redirect/denied behavior and fail-closed behavior with `ADMIN_USER_IDS` empty or unset. Record only statuses and timings in local review notes. <!-- sdd-owner: implementation -->

- [ ] **6.2.** Against the configured local/dev database, request `/api/admin/stats`, `?window=7d`, `?window=30d`, `?window=90d`, and an unsupported value; verify `200/400/401/403` behavior, `Cache-Control: no-store`, the aggregate-only DTO, UTC buckets, null-account transaction exclusion, empty/stale `last_activity_at` handling, and absence of PII/raw rows. Do not add Playwright auth-lane coverage because it is explicitly out of scope for v1. <!-- sdd-owner: implementation -->

- [ ] **6.3.** Time an authorized `GET /api/admin/stats?window=30d` against the current dev data and confirm the full response completes within the two-second verification budget; verify the deployed Vercel environments have `ADMIN_USER_IDS` configured without exposing its value and confirm both Vercel integrations appear after deployment. Treat this as evidence only, not a committed performance test or deployment configuration change. <!-- sdd-owner: implementation -->

## 7. Final repository gates

**Artifact status: repo verification evidence; no new committed artifacts unless a pre-existing tool requires them.**

- [x] **7.1.** Run the focused Node Jest suite for `tests/node/lib/admin-guard.test.ts`, `tests/node/lib/admin-stats-service.test.ts`, and `tests/node/api/admin-stats-route.test.ts`, then run the repository Jest gate (`npm run test:ci`) and resolve regressions without weakening existing payment-order tests. <!-- sdd-owner: implementation -->

- [x] **7.2.** Run `npm run type-check` and verify the Vercel package imports, Next server/client boundaries, DTOs, route responses, page, and Recharts components type-check cleanly. <!-- sdd-owner: implementation -->

- [ ] **7.3.** Run `npm run lint`, `npm run guard:db-access`, and the existing build/prepush verification (`npm run prepush:verify` when the full gate is required); confirm no direct database access was introduced under `app/`, no schema/RLS/payment-order files changed, and the final diff contains only proposal-scoped files. <!-- sdd-owner: implementation -->

## Parent-owned lifecycle actions

- [ ] **7.4.** After implementation gates are green, start or reuse one bounded review for the selected PR boundary and report the receipt/evidence needed for delivery. <!-- sdd-owner: parent -->

- [ ] **7.5.** Before apply, decide whether to create the proposed stacked two-PR chain because the forecast exceeds the 400-line budget; do not silently bypass the budget or create a live-database/E2E exception. <!-- sdd-owner: parent -->

## Review Workload Forecast

| Boundary | Contents | Estimated changed lines |
|---|---|---:|
| Total | All committed implementation and tests in this change | 1,700–2,200 |
| PR 1 | `package.json`, `package-lock.json`, `app/layout.tsx`, `lib/admin/guard.ts`, Node guard tests, `lib/admin-stats/*`, service tests, API route, and route tests | 1,050–1,350 |
| PR 2 | `app/admin/page.tsx`, `components/admin/*`, and `tests/app/admin/page.test.tsx`; local-only validation remains uncommitted | 650–850 |

Chained PRs recommended: Yes
400-line budget risk: High
Estimated changed lines: 1,700–2,200 total; PR 1 1,050–1,350; PR 2 650–850
Decision needed before apply: Yes
Delivery strategy: ask-on-risk
Chain strategy: stacked-to-main
Suggested chain: PR 1 ships the Vercel mount, shared guard, typed aggregate service, and independently guarded API; PR 2 stacks the server-guarded `/admin` UI and component/page tests on PR 1.

## 2026-08-21 correction delta

- [x] Correct optional-family degradation: return explicit unavailable markers and generic warnings while keeping users/activity fail-closed.
