# Design: Admin Analytics Dashboard

## Decisions

- `/admin` is a Server Component. It authenticates and authorizes before returning any page content; it does not query analytics data. The authorized shell mounts one client island, which performs the single aggregate API request. This preserves server-first access control without duplicating database work between the RSC and API.
- `isAdmin` remains the single `ADMIN_USER_IDS` policy implementation in `lib/payment-orders/admin-utils.ts`; it is not copied into the dashboard. A new `lib/admin/guard.ts` centralizes the auth-then-admin sequence and maps non-admin access to `403` for API callers.
- V1 uses one `GET /api/admin/stats?window=7d|30d|90d` response and `Cache-Control: no-store` on both success and failure.
- UTC is the reporting timezone. `last_activity_at` is explicitly labeled session-refresh activity, not request-level traffic.
- No migration, index, RPC, view, RLS, payment-order, or mobile changes are included.

## Module map

### New files

| File | Layer | Responsibility |
| --- | --- | --- |
| `app/admin/page.tsx` | RSC/page | Calls the shared admin guard before render; redirects auth failures to `/auth/login`; returns the denied state for authenticated non-admins; renders the dashboard island for admins. No Supabase client or stats query. |
| `app/api/admin/stats/route.ts` | API coordinator | Validates the bounded `window`, calls the shared fail-closed guard first, calls `getAdminStats`, and emits the standard response envelope. Adds `no-store` to every response. |
| `lib/admin/guard.ts` | Security/application service | `getAdminAccess()` performs `getAuthenticatedUser()` followed by the existing `isAdmin()`; `requireAdmin()` throws `AppError(..., 'FORBIDDEN', 403)` for authenticated non-admins. Auth errors remain `AuthError`/`401`. |
| `lib/admin-stats/types.ts` | Service contract | `StatsWindow`, DTO types matching the specification, query-window types, and `parseStatsWindow()` (default `30d`, rejects unsupported values with `VALIDATION_ERROR`). |
| `lib/admin-stats/aggregates.ts` | Pure service logic | Framework-free reducers/materializers: UTC daily buckets, distinct activity windows/peak, and one merge function per resource family. It accepts typed aggregate rows and returns typed DTO fragments; it never imports Supabase, Next, or logger code. |
| `lib/admin-stats/service.ts` | Data/service layer | Lazy module-level singleton accessor for `createServiceClient()`, aggregate reads, error logging, and DTO assembly. The service client is not created until after the route guard succeeds. |
| `components/admin/admin-access-denied.tsx` | Presentation | Reusable server-safe denied panel with existing Spanish copy and a link back to the app. |
| `components/admin/admin-stats-dashboard.tsx` | Client island | Fetches one window-specific DTO, owns loading/error/retry/window-selection state, composes existing `StatCard`, resource summaries, and the chart component. API errors never become zero-valued cards. |
| `components/admin/admin-stats-charts.tsx` | Client presentation | Thin local Recharts composition for `newByDay` and peak/activity data using `ResponsiveContainer`; there is no existing generic chart wrapper and no new chart dependency. |
| `tests/node/api/admin-stats-route.test.ts` | Node Jest | Mocks auth, admin policy, service, and logger; verifies access, validation, envelopes, status codes, headers, and service non-invocation on denial. |
| `tests/node/lib/admin-stats-service.test.ts` | Node Jest | Mocks the service-role Supabase client responses; verifies aggregate DTOs, UTC activity, null account ownership, empty activity, and all resource-family totals/per-user merges. Pure reducers are exercised with the same fixtures. |

### Touched files

| File | Change |
| --- | --- |
| `app/layout.tsx` | Import `Analytics` and `SpeedInsights`; mount exactly one of each immediately after `</RouteAwareProviders>` and before `<Toaster>`. They are client-safe islands and need no provider context. |
| `package.json` | Add `@vercel/analytics` and `@vercel/speed-insights` as runtime dependencies at versions compatible with the existing Next 16/React 19 toolchain. |
| `package-lock.json` | Lock the two dependency additions. |

No existing payment-orders file is modified. The existing `/api/payment-orders/admin/access` endpoint remains the client-check precedent for that legacy page only; the new page/API use `lib/admin/guard.ts` and the same underlying `isAdmin` policy.

## Layering and call flow

```text
Browser
  -> RSC GET /admin
     -> lib/admin/guard.ts
        -> getAuthenticatedUser() [cookie-backed auth client]
        -> isAdmin(userId) [ADMIN_USER_IDS; empty/unset = false]
     -> redirect('/auth/login') OR AdminAccessDenied OR authorized shell
        -> components/admin/admin-stats-dashboard.tsx (client island)
           -> fetch('/api/admin/stats?window=30d', { cache: 'no-store' })
              -> app/api/admin/stats/route.ts
                 -> requireAdmin() [auth before window data/service work]
                 -> getAdminStats(window)
                    -> lazy createServiceClient() [service role, server only]
                    -> SQL/PostgREST aggregate reads
                    -> pure reducers in lib/admin-stats/aggregates.ts
                    -> typed AdminStatsDTO
                 -> successResponse(AdminStatsDTO) OR errorResponse(AppError)
           -> StatCard + local Recharts components
```

The API guard is independent of the RSC guard. A direct API caller cannot bypass authorization, and an unauthenticated/non-admin request cannot instantiate the lazy service client or query aggregate data.

## Aggregate query plan

The service captures one `now` timestamp per request and derives UTC `start = now - windowDays`. Resource totals are all-time; the selected window applies to new-user buckets and peak daily activity. Logical SQL below is the database-side shape. The Supabase adapter uses aggregate/group projections with only the listed columns; no raw profile/resource rows cross the service boundary. Where a client query must return grouping tuples, it returns only the grouping key and count, never `select('*')` rows. All family reads are fixed and parallelizable after authorization.

### Users and activity family

```sql
-- registered total
SELECT count(*) AS total FROM public.users;

-- selected-window registrations, UTC buckets
SELECT (created_at AT TIME ZONE 'UTC')::date AS date, count(*) AS count
FROM public.users
WHERE created_at >= :start AND created_at < :now
GROUP BY 1 ORDER BY 1;

-- trailing activity counts; one user counts once per window
SELECT
  count(DISTINCT id) FILTER (WHERE last_activity_at >= :now - interval '24 hours') AS dau,
  count(DISTINCT id) FILTER (WHERE last_activity_at >= :now - interval '7 days') AS wau,
  count(DISTINCT id) FILTER (WHERE last_activity_at >= :now - interval '30 days') AS mau
FROM public.users
WHERE last_activity_at IS NOT NULL
  AND last_activity_at <= :now
  AND last_activity_at >= :now - interval '30 days';

-- peak daily distinct activity in the selected window
SELECT (last_activity_at AT TIME ZONE 'UTC')::date AS date,
       count(DISTINCT id) AS active_count
FROM public.users
WHERE last_activity_at >= :start AND last_activity_at < :now
GROUP BY 1 ORDER BY 1;
```

`aggregates.ts` materializes missing registration days as zero for a stable chart, takes the maximum daily activity count, and uses the earliest date on a tie. No activity rows produce `dau=wau=mau=peakDailyActive=0`, `peakDate=null`, and `activityStatus='empty'`. Activity outside the selected peak window can still make a trailing MAU non-zero, as defined by the DTO.

### Resource family reads

Each family is one grouped aggregate read and contributes both its total and per-user count fragment. All per-user queries use `WHERE user_id IS NOT NULL`.

```sql
-- accounts: total includes all accounts; null owners are not per-user entries
SELECT user_id, count(*) AS count
FROM public.accounts
GROUP BY user_id;

-- transactions: ownership is only through accounts; null account owners are excluded
SELECT a.user_id, count(t.id) AS count
FROM public.transactions t
JOIN public.accounts a ON a.id = t.account_id
WHERE a.user_id IS NOT NULL
GROUP BY a.user_id;

-- same shape for each existing user_id resource table
SELECT user_id, count(*) AS count FROM public.budgets GROUP BY user_id;
SELECT user_id, count(*) AS count FROM public.goals GROUP BY user_id;
SELECT user_id, count(*) AS count FROM public.subscriptions GROUP BY user_id;
SELECT user_id, count(*) AS count FROM public.feedbacks GROUP BY user_id;
```

The six family totals are the sums of their grouped rows. `resources.perUserCounts` is merged by opaque/internal `userId`; a transaction with a nullable joined `accounts.user_id` contributes to neither the transaction total nor any user entry. The DTO does not expose transaction descriptions, account names, profile rows, emails, or other columns. The resource “types” are the six documented families; no extra raw type/category data is returned.

### Usage family

`usage_tracking` is the existing table with `(user_id, month_year)` rows and columns `transaction_count`, `backup_count`, `api_calls`, `export_count`, and `ai_requests`; it has `idx_usage_tracking_user_month`. The read is cheap and bounded to months overlapping the selected window:

```sql
SELECT month_year,
       COALESCE(SUM(transaction_count), 0) AS transaction_count,
       COALESCE(SUM(backup_count), 0) AS backup_count,
       COALESCE(SUM(api_calls), 0) AS api_calls,
       COALESCE(SUM(export_count), 0) AS export_count,
       COALESCE(SUM(ai_requests), 0) AS ai_requests
FROM public.usage_tracking
WHERE month_year >= :firstMonth AND month_year <= :lastMonth
GROUP BY month_year ORDER BY month_year;
```

The user dimension is intentionally discarded. Usage is supplemental monthly activity, not a replacement for all-time resource totals.

### Index reality check

Baseline has no index on `users.created_at` or `users.last_activity_at`; it has `idx_users_tier` only. It does have `(user_id, created_at)` indexes for accounts, budgets, goals, and feedbacks, `idx_subscriptions_user_id`, transaction `account_id/date` indexes (including `idx_transactions_user_via_accounts`), and `idx_usage_tracking_user_month`. At current volume, the bounded users scans and fixed family aggregates are acceptable without DDL; this is explicitly a no-DDL change. Query duration is monitored against the two-second verification budget. If volume makes this unsafe, a measured follow-up may add indexes/RPC/view/materialization; this change does not silently add them.

## Error, empty-data, and time policy

- `requireAdmin` runs before window validation that could invoke data code and before `getAdminStats`. `AuthError` becomes `401`; authenticated non-admin becomes `403`; unsupported windows become `400` with `VALIDATION_ERROR` and no aggregate query.
- Any Supabase/database error rejects the whole service call. `service.ts` logs `logger.error('[AdminStatsService] ...', error)` without IDs, tokens, query contents, or secrets; `withErrorHandling` returns `data: null`, `error.code: 'INTERNAL_ERROR'`, and a generic message. Partial/fabricated DTOs are never returned.
- The route wraps the standard `withErrorHandling` handler and sets `Cache-Control: no-store` on the returned `NextResponse`, including handled errors. It is also explicitly dynamic; no shared cache can retain an authenticated aggregate response.
- Empty tables are valid: totals and usage arrays are zero/empty, registration buckets are zero-filled for the selected range, and absent activity is represented by `activityStatus: 'empty'`. A failed request is an error state, not an empty state.
- All `timestamptz` bucket expressions and DTO dates are UTC `YYYY-MM-DD`. The UI copy says “ventanas de actividad por UTC” and “actividad basada en actualización de sesión”. `usage_tracking.month_year` is treated as a calendar `YYYY-MM` label and is not converted to a user timezone.

## Security posture

- `createServiceClient()` is confined to `lib/admin-stats/service.ts`, uses the server-only service-role key, and is lazily initialized only after `requireAdmin` succeeds. Service role is required because existing RLS policies are owner-only and there is no admin-bypass policy; it never reaches browser code.
- The response is aggregate-only. The required opaque/internal `userId` is the sole grouping key in `perUserCounts`; no email, name, auth metadata, descriptions, account names, or raw rows are exposed. The UI may truncate this opaque key for display.
- Both the page and API fail closed when `ADMIN_USER_IDS` is absent, empty, or does not contain the authenticated UUID. The page redirects only authentication failures and returns a denied panel for authenticated non-admins.
- `no-store` is selected over a shared or private TTL for v1 because admin freshness is more important than cache reuse and it avoids accidental cross-request reuse. A measured short private TTL may be considered later.

## UI composition

`app/admin/page.tsx` supplies the title/description and renders `AdminStatsDashboard` only after the server guard. The client island defaults to `30d`, allows only `7d`, `30d`, and `90d`, and makes one request per selected window or explicit retry. It uses `DashboardLoading`, existing `StatCard`, existing dark glass/iOS tokens, and Spanish labels. It renders:

- registration total and DAU/WAU/MAU cards;
- a UTC new-user line chart and peak-date/activity annotation;
- a resource totals grid and compact per-user aggregate table;
- monthly usage counters;
- an explicit “sin actividad de actualización de sesión” state when activity is empty;
- an actionable API failure state with retry, without showing zero metrics.

`AdminStatsCharts` is the only local Recharts wrapper. It imports `ResponsiveContainer` and the needed line/bar primitives directly; `spending-chart.tsx` confirms Recharts is already installed, so no chart library or generic abstraction is added.

## Test plan

- `tests/node/api/admin-stats-route.test.ts` covers **R1** access scenarios: authenticated admin success, authenticated non-admin `403`, unauthenticated `401`, unset/empty policy behavior through mocked `isAdmin`, and confirmation that the service mock is not called on denial. It also covers **R2** contract scenarios: default `30d`, each supported window, unsupported `400`, `data/error/meta` envelope, numeric/DTO shape, and `Cache-Control: no-store`.
- The same route test covers **R5** resilience scenarios: mocked service rejection returns `500`, `data: null`, `INTERNAL_ERROR`, generic message, `no-store`, and logger invocation; no partial response is accepted.
- `tests/node/lib/admin-stats-service.test.ts` mocks `createServiceClient()` and chainable Supabase responses. Fixtures verify UTC distinct activity, peak tie/date behavior, empty activity, zero-filled new-user buckets, each resource total, transaction attribution through accounts, exclusion of null account owners, and merged per-user DTOs. It asserts only narrow aggregate projections are requested and that a service-role client is created on service invocation, not module import.
- Real Supabase/dev-environment E2E and Playwright auth-lane coverage remain out of this repository change. The two-second check is a manual/local performance verification against the configured dev database, not a committed live-database test.

## Rollout and rollback

- Add `ADMIN_USER_IDS` to every Vercel environment that should permit access; it is a comma-separated UUID list. Missing/empty configuration intentionally denies everyone. Do not print its value during verification.
- Dependency/layout deployment and dashboard deployment have no required ordering; the route is independently guarded and schema-free.
- Rollback is a single commit revert: remove the dashboard/API/service/tests, revert `app/layout.tsx`, and revert the dependency/lockfile entries. No database rollback is required.

## 2026-08-21 correction delta

- Optional resource families and monthly usage degrade independently to an explicit `{ status: 'unavailable', reason: 'query_failed' }` marker; users/activity remain fail-closed. Each degraded family emits a generic `logger.warn` event without query details, secrets, or PII.
