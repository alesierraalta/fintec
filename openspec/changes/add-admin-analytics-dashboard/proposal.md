# Proposal: Admin Analytics Dashboard and Vercel Observability

## Intent

FinTec currently requires scattered database queries to answer basic platform-health questions: how many users are registered, how many are active, when usage peaks, and which resources users have created. This makes operational review slow, inconsistent, and difficult to explain. The change creates one admin-only dashboard for these aggregate metrics and fully lights the Vercel dashboards that are already enabled platform-side.

The dashboard is an operational view for authorized administrators, not a user-management surface. It exposes aggregate platform health and per-user resource counts without returning profile or other PII rows. Vercel Web Analytics is already collecting data (`hasData=true`); installing and mounting both Vercel components restores the code-side integration and enables Speed Insights collection after deployment.

## Scope

### In Scope

1. **Vercel observability dependencies**
   - Add `@vercel/analytics` and `@vercel/speed-insights`.
   - Mount `<Analytics />` and `<SpeedInsights />` in `app/layout.tsx` beside the existing top-level providers/toast components.
   - Do not add client-side environment gating; the packages are self-contained and the existing Vercel project configuration supplies the platform-side dashboards.

2. **Admin overview page**
   - Add the overview at `/admin` without changing the existing `/admin/payment-orders` path.
   - Prefer a Server Component/server-side admin check over the existing client-only guard pattern, avoiding an unauthorized shell flash where practical.
   - Reuse `StatCard`, `DashboardLoading`, `recharts`, the existing dark glass/iOS design tokens, and Spanish UI copy. Add an admin-specific presentation component only if composition is needed; do not duplicate existing primitives.
   - Render the cheap aggregate snapshot on the server where practical so the page remains useful without JavaScript; client behavior is limited to chart interaction or refresh rather than being the security boundary.

3. **Aggregate admin-stats service**
   - Add a service under `lib/admin-stats/` following `lib/payment-orders/order-service.ts` conventions and using `createServiceClient()` only on the server.
   - Keep database access and aggregation logic in `lib/`; the page and route must not query Supabase directly.
   - Return aggregate DTOs only. Per-user resource summaries are grouped aggregate entries containing an opaque/internal user identifier and counts, never email, name, auth metadata, or raw resource rows.
   - V1 metrics:
     - total registered users;
     - new users over time, bucketed by `users.created_at` for the selected bounded window;
     - active users for trailing DAU/WAU/MAU windows using distinct users whose `users.last_activity_at` falls within 24 hours, 7 days, or 30 days;
     - peak users as the maximum daily distinct active-user count in the selected window, including the peak date;
     - total and per-user counts for accounts, transactions, budgets, goals, subscriptions, and feedbacks;
     - monthly `usage_tracking` counters (`transaction_count`, `backup_count`, `api_calls`, `export_count`, and `ai_requests`) as a supplemental usage section, using the existing `(user_id, month_year)` rows and no schema changes.
   - Transactions must be attributed through `transactions.account_id -> accounts.user_id`; nullable `accounts.user_id` values are excluded from user-attributed counts and do not create a synthetic user. Other resource tables use their existing `user_id` relationship.
   - Peak and active metrics explicitly use `last_activity_at` granularity. Because that field is updated by the session-refresh trigger rather than every request, the dashboard describes these as session-refresh activity, not exact request-level traffic. Empty or stale activity data produces an explicit empty/zero state rather than an invented metric.

4. **Guarded aggregate API**
   - Add one endpoint: `GET /api/admin/stats?window=30d`.
   - Use one aggregate response to keep the dashboard to one client request when it refreshes, rather than coordinating several narrow endpoints. The window is bounded to supported values, defaults to 30 days, and may be expanded later without changing the endpoint family.
   - Guard the route on the server with `getAuthenticatedUser` and `isAdmin`; keep the check fail-closed and independent of the UI guard. Use the existing `withErrorHandling` and success/error response conventions.
   - Use `Cache-Control: no-store` for v1. Admin metrics should reflect current data, and avoiding shared caching prevents accidental reuse of an authenticated response while keeping cache policy simple. A short private TTL can be introduced later if aggregate query cost warrants it.

5. **Tests**
   - Add Node Jest flow coverage for the aggregate service with a mocked service-role client and representative empty, nullable-account, activity, and resource-count cases.
   - Add a Node Jest route test modeled on the existing payment-orders admin-access test, covering an authenticated admin, non-admin denial, unauthenticated/auth failure, and service failure response. The route test mocks auth, `isAdmin`, logging, and the stats service; it must not require a live Supabase database.

### Out of Scope

- No new migrations/DDL (use existing tables; RPC/view deferred until perf demands).
- No user management CRUD (impersonate/edit/delete), billing operations, or payment-order changes.
- No realtime/websocket live updates, CSV export, email digests.
- No Capacitor/mobile admin surface; no Playwright auth-lane e2e in v1 (jest flow coverage suffices locally).
- No changes to RLS policies (service-role bypass is the sanctioned path per issue-#46 precedent).

### Explicit Non-goals

- Do not expose user emails, names, authentication fields, raw database rows, transaction descriptions, or other PII in the API or dashboard.
- Do not treat the dashboard as a replacement for Vercel's product analytics UI; the custom dashboard covers platform health and resource aggregates only.
- Do not add user CRUD, impersonation, permissions administration, exports, alerts, realtime monitoring, or mobile-specific UI as part of this first slice.
- Do not repair or recreate the `last_activity_at` trigger, alter RLS, add indexes, create an RPC/materialized view, or change database schema in this change.
- Do not modify the existing payment-orders admin page or weaken its authorization behavior.

## Decisions and Rationale

### Route and page shape

Use `/admin` for the overview because it is the natural admin landing surface and leaves `/admin/payment-orders` unchanged. The overview is server-guarded before rendering. The API remains independently guarded because UI authorization is never sufficient for cross-user data access.

### Guard style

Prefer a Server Component/server-side check using the existing authentication and `isAdmin` utilities over copying the current client-only payment-orders guard. This removes an avoidable unauthorized-shell flash and keeps the page functional without JavaScript where server rendering is cheap. The API performs the same fail-closed authorization check, and `ADMIN_USER_IDS` being empty or unset means nobody is authorized.

### V1 metric definition

Use the smallest set that answers the stated platform-health question: registration, acquisition trend, active windows, peak activity, and resource ownership/usage. `last_activity_at` is the common activity source because it is already present and indexed/maintained by the existing session-refresh behavior, but its limitation is displayed in the product wording. Resource counts are all-time totals; the selected window applies to new-user trend and peak calculations. Usage-tracking counters are monthly and supplement, rather than redefine, resource totals. Tier mix, feedback sentiment, and detailed AI-session analytics remain deferred until a concrete operational decision needs them.

Daily buckets use UTC in v1 for deterministic server aggregation over `timestamptz` values. A product timezone can be added later if administrators need local-calendar reporting.

### Endpoint and cache

Use one bounded aggregate endpoint and `no-store`. A single response avoids request orchestration and keeps authorization/data access centralized. `no-store` favors trustworthy current metrics and avoids shared-cache mistakes for an admin route; performance optimization through a private short TTL or database aggregate view is a later decision based on observed load.

### Data exposure

The service-role client is confined to the server-side service. The response contains only counts, bucket dates, metric values, and grouped per-user count summaries with an opaque/internal identifier. It never returns profile rows or PII. Nullable account ownership is handled explicitly, and unowned transactions cannot be attributed to a user.

## Affected Areas

Estimated tracked impact: approximately 8–11 files:

| Area | Type | Expected change |
| --- | --- | --- |
| `package.json` and lockfile | Modified | Add the two Vercel dependencies. |
| `app/layout.tsx` | Modified | Mount `Analytics` and `SpeedInsights`. |
| `app/admin/page.tsx` and, if needed, an admin presentation component | New | Server-guarded overview with cards and charts. |
| `app/api/admin/stats/route.ts` | New | One fail-closed aggregate endpoint. |
| `lib/admin-stats/*` | New | Service, DTOs, and aggregation helpers using the service-role client. |
| `tests/node/api/admin-stats-route.test.ts` and `tests/node/lib/admin-stats-service.test.ts` | New | Route and service Jest coverage. |

No schema, migration, RLS, environment-file, payment-order, or existing-user workflow changes are planned.

### Deployment note

`ADMIN_USER_IDS` must be present in the Vercel project environment for every deployed environment that should permit dashboard access. It is a comma-separated list of authorized user UUIDs. If it is missing or empty, access must remain denied by design; deployment verification should confirm the variable is configured without exposing its value.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Cross-user exposure or service-role leakage | High | Keep `createServiceClient()` inside `lib/admin-stats`, return aggregates only, perform independent route authorization, and never pass the service client/key to client code. |
| `last_activity_at` trigger is missing, stale, or sparse in production | High | Verify real data early; label the metric as session-refresh activity; render an explicit empty state; defer request-level activity instrumentation. |
| Nullable `accounts.user_id` or the transaction join misattributes resources | Medium | Join transactions through `accounts.user_id`, exclude null ownership, and cover orphan/null fixtures in service tests. |
| Aggregate queries become slow as tables grow | Medium | Start with bounded trend windows and SQL-level aggregates; monitor query time; defer an RPC/view/index change until measured demand justifies schema work. |
| `ADMIN_USER_IDS` is absent in Vercel | Medium | Fail closed and include the deployment note/checklist; do not introduce a permissive fallback. |
| Vercel package peer incompatibility with Next 16/React 19 | Medium | Select compatible package versions and run type-check, lint, build/prepush verification before delivery. |
| Per-user summaries are too identifying or too large | Medium | Return counts only with opaque/internal identifiers, omit profile data, and make later pagination/aggregation a follow-up if scale or privacy review requires it. |

## Rollback Plan

1. Revert `app/layout.tsx` and the dependency/lockfile changes to disable the Vercel component mounts.
2. Remove the `/admin` overview, `/api/admin/stats`, `lib/admin-stats`, and their Jest tests.
3. Leave the existing payment-orders admin page, auth utilities, RLS policies, and database schema unchanged.
4. If the dashboard is deployed but produces unexpected load, remove its navigation/link exposure first; the guarded route can then be removed without data migration or rollback work.

## Success Criteria

- [ ] `@vercel/analytics` and `@vercel/speed-insights` are installed and both components mount from `app/layout.tsx` without build/type errors.
- [ ] An administrator configured in `ADMIN_USER_IDS` can reach `/admin` and see registered users, new-user buckets, DAU/WAU/MAU, peak daily active users, and resource totals/per-user summaries.
- [ ] A non-admin or unauthenticated caller cannot render the admin overview or retrieve `/api/admin/stats`; unset/empty `ADMIN_USER_IDS` denies access.
- [ ] The stats response is aggregate-only: no emails, names, auth metadata, descriptions, or raw resource rows are returned.
- [ ] Transaction counts are attributed through accounts, null account ownership is handled without misattribution, and activity limitations/empty states are represented honestly.
- [ ] The dashboard refresh uses the single aggregate endpoint and the response is `no-store` in v1.
- [ ] Node Jest service and route flow tests cover success, denial, auth failure, service failure, empty activity, and nullable-account cases.
- [ ] Existing admin payment-order behavior is unchanged, and lint, type-check, Jest, and repository verification pass.

## Proposal question round

These product questions are included for review because the answers can improve the PRD/proposal around business rules, edge cases, and tradeoffs. The proposal currently proceeds with the assumptions shown; the user may answer, skip, correct the framing, or request a second question round.

1. **Reporting timezone:** Is UTC acceptable for daily registration/peak buckets, or should administrators see a specific business timezone such as America/Caracas? Assumption: UTC keeps v1 deterministic.
2. **Per-user identification:** Is an opaque/internal user identifier with counts sufficient, or is there an approved non-PII label administrators need for operational follow-up? Assumption: no email/name is exposed in v1.
3. **Freshness versus query load:** Is current-data `no-store` behavior preferable to a visibly stale 30–60 second snapshot? Assumption: freshness wins until measured query cost says otherwise.
4. **Activity interpretation:** Is session-refresh activity an acceptable proxy for active users/peaks, given that it is not request-level telemetry? Assumption: yes, provided the limitation is labeled and the trigger/data presence is verified before release.
