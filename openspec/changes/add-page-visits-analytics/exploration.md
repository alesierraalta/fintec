# Exploration — add-page-visits-analytics

- Worktree: `fintec-worktrees/page-visits` (`feat/page-visits-analytics`), base `origin/main` `8ef9470`.
- Skill resolution: `none` (no injected skill paths available).
- Context-Mode: unavailable in this executor (no `ctx_batch_execute`/`ctx_execute`/`ctx_search` tools); filesystem reads/derived grep were used as fallback.
- CodeGraph: unavailable in this executor (no MCP/shell tool); structural inspection therefore used repository fallback. This must be treated as a tooling limitation, not as a CodeGraph result.

## 1. App Router and request flow

- Route pages found under `app/`: `/`, `/accounts`, `/auth/{login,register,forgot-password,reset-password}`, `/backups`, `/budgets`, `/calculator`, `/categories`, `/chat`, `/debts`, `/dev/mobile-menu-fab-regression`, `/goals`, `/p2p-offers`, `/pricing`, `/privacy`, `/profile`, `/recurring`, `/reports`, `/settings`, `/subscription`, `/subscription/success`, `/terms`, `/transactions`, `/transactions/add`, `/transfers`, `/waitlist`, `/admin`, and `/admin/payment-orders`.
- `middleware.ts` runs `updateSession(request)` only. Its matcher covers application requests while excluding `_next/static`, `_next/image`, `favicon.ico`, and common image assets. It does not currently record traffic or protect admin routes.
- `lib/supabase/middleware.ts` creates a Supabase SSR client, refreshes/validates the user with `auth.getUser()`, and returns `NextResponse`; failures are swallowed and session response is returned. Any visit write must be fire-and-forget and must never delay or fail the request response.
- `app/layout.tsx` is the global layout. It calls `getAdminVisibility()`, mounts `RouteAwareProviders`, and mounts Vercel `<Analytics />` once. `@vercel/speed-insights` is also mounted once. There is no existing request-level page-view registration.

## 2. Existing analytics

- Vercel Web Analytics is integrated globally (`@vercel/analytics`, `<Analytics />` in `app/layout.tsx`). This is separate from the requested first-party daily page-view/unique-visitor data.
- Repository search found no `page_visits`, `pageviews`, or equivalent table/query. Existing occurrences of “analytics” are Vercel integration, domain-specific goal analytics, or admin aggregate analytics; none records every request.
- The new table should therefore be a new migration plus generated/maintained Supabase database types if the repository’s type workflow requires it.

## 3. Supabase inventory and RLS

- Supabase helpers: `lib/supabase/client.ts` uses browser SSR client; `lib/supabase/server.ts` uses cookie-backed server client; `lib/supabase/admin.ts` exposes a service-role `createServiceClient()` and must remain server-only. `lib/supabase/middleware.ts` owns session refresh.
- `supabase/migrations/` contains migrations for orders, scrape attempts, AI infrastructure, rates, debt settlements, feedbacks, goal contributions, and related tables. The base public schema is represented by `supabase/schemas/baseline.sql`; `supabase/config.toml` explicitly documents that migrations are not the complete replayable base schema and the baseline is seeded locally.
- Existing public tables include `users`, `accounts`, `transactions`, `budgets`, `goals`, `subscriptions`, `feedbacks`, `usage_tracking`, and others. RLS is enabled broadly and policies are predominantly owner-scoped using `auth.uid()`; there is no general admin-bypass policy.
- Admin-only reads should follow the already-established server-only service-role pattern in `lib/admin-stats/service.ts`/`lib/supabase/admin.ts`, after `requireAdmin()`/`getAdminAccess()`. Do not expose service-role credentials or query Supabase from components.
- Recommended `page_visits` shape for design: UUID id, UTC timestamp/date, route/path, privacy-preserving visitor fingerprint (or hashed anonymized IP), optional user id only if explicitly needed, created timestamp; indexes on visit date and `(visit_date, visitor_hash)`. RLS should deny anon/authenticated direct access and permit no client writes; middleware writes through a narrowly scoped server-side mechanism. Admin reads should be server-only and independently guarded by `ADMIN_USER_IDS`.

## 4. Admin and UI reuse

- `app/admin/page.tsx` is already a Server Component: it calls `getAdminAccess()`, redirects status `401` to `/auth/login`, renders `AdminAccessDenied` for authenticated non-admins, and renders `AdminStatsDashboard` for admins.
- `lib/admin/guard.ts` centralizes `getAdminAccess()`, `getAdminVisibility()`, and `requireAdmin()`; `lib/payment-orders/admin-utils.ts` is the existing `ADMIN_USER_IDS` policy and fails closed when unset/empty.
- Existing admin dashboard components are under `components/admin/`: `AdminStatsDashboard`, `AdminStatsCharts`, feature usage, and user roster. The dashboard fetches `/api/admin/stats?window=...` and uses `DashboardLoading`, `StatCard`, glass-card classes, and Recharts. Page-visits UI should extend this dashboard or compose a focused child section rather than create a parallel admin authorization or analytics stack.
- `recharts` is already installed and used by `components/dashboard/spending-chart.tsx`; `ResponsiveContainer` is the established chart sizing pattern. Use a line/bar chart with explicit daily UTC labels and both page views and unique visitors.
- Design guidance in `docs/design.md`: dark mode, black background, `.glass-card`, rounded iOS-style surfaces, and Spanish UI copy.

## 5. Middleware recording design constraints

- Record the matched application request once per middleware invocation, but exclude static assets and likely non-page/API noise according to the product definition. The stated scope is “toda la app”; decide explicitly whether API requests count as page views. A safe initial definition is document/navigation requests only, excluding `/api`, auth callbacks, and internal paths, to avoid inflating views from client data fetches.
- Use `void recordPageVisit(...).catch(logger.warn)` (or equivalent) after constructing the response so the write is non-blocking and failures never affect navigation. Avoid awaiting a Supabase network write in middleware.
- Never store raw IP. If using IP for unique visitors, normalize the forwarded address, apply a keyed server-side HMAC/hash with a rotating salt, and store only the digest; document retention/rotation. `x-forwarded-for` is untrusted and must be parsed conservatively. A stronger privacy option is a short-lived first-party anonymous cookie, but that requires response-cookie handling and does not count visitors across devices.
- Bot filtering should use a bounded, case-insensitive User-Agent denylist/heuristic (known crawler tokens) and remain conservative to avoid excluding real users. Do not treat missing User-Agent as a bot automatically.
- Reuse `lib/admin/test-users.ts`: resolve authenticated test-user emails to IDs before recording, or skip known test users when the middleware can obtain a verified user. Do not make an extra blocking `auth.getUser()` call solely for analytics; prefer session context already available or asynchronous server-side filtering. Ensure excluded test users are excluded consistently from both writes and aggregates.
- Consider deduplication semantics: page views are each accepted request; unique visitors are `count(distinct visitor_hash)` per UTC day. A unique visitor may be anonymous and must not require a user row.

## 6. Testing seams

- `tests/middleware.test.ts` mocks `next/server` and `@/lib/supabase/middleware`, verifies the exported middleware, matcher exclusions, delegation, and response passthrough. Extend it to assert recording is invoked, fire-and-forget failures do not alter the response, and excluded paths/bots are skipped.
- `tests/app/admin/page.test.tsx` (or the current admin page test location) mocks `getAdminAccess`, navigation, denied UI, and dashboard island; preserve the existing 401/non-admin/admin flow tests when adding the visit section.
- Existing Node Jest route tests mock auth/admin policy/service and assert response envelopes/statuses. Add a page-visits aggregate service/route test for daily UTC bucketing, distinct visitor counts, empty data, admin-only access, and no raw IP leakage.
- Add migration/RLS integration coverage in `tests/db` if the database test project is available: authenticated/non-admin clients cannot read or insert; admin application route can read; service-side insertion works; duplicate visitor hashes on one UTC date count once.

## 7. Recommended implementation boundary / risks

- Reuse `lib/admin/guard.ts`, `ADMIN_USER_IDS`, existing admin dashboard/chart primitives, Supabase admin helper, response envelope conventions, and middleware session seam. Do not add a second admin guard, chart dependency, or parallel analytics service.
- Main architectural risk is middleware latency/runtime compatibility: a direct Supabase insert from Edge middleware can be costly and unreliable. Prefer a small server-compatible ingestion function, `waitUntil` where the deployment/runtime supports it, and bounded error handling; verify the chosen Supabase client is Edge-safe.
- Main privacy risk is visitor re-identification. Store only a keyed digest, minimize retention, avoid raw headers in logs, and keep admin payload aggregate-only.
- Main metric risk is counting API/client requests as page views or counting test/bot traffic. Define the request predicate and exclusions in one reusable module and test it independently.

## Key Learnings

1. Middleware currently refreshes Supabase sessions only; there is no page-visit persistence and no `page_visits` table.
2. Admin authorization, Supabase service-role access, glass-card UI, Recharts, and test seams already exist and should be extended rather than duplicated.
3. Page visits require a new migration/RLS policy plus non-blocking middleware ingestion, UTC daily aggregation, and privacy-preserving visitor hashing.
4. Context-Mode and CodeGraph were unavailable in this executor, so those mandatory checks could not be performed and must be rerun by an equipped orchestrator before design approval.
