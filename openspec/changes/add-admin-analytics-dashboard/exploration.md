# Exploration — add-admin-analytics-dashboard

- Worktree: `fintec-worktrees/admin-dashboard` @ `feat/admin-analytics-dashboard` (base origin/main b139cf3)
- Skills: `paths-injected` (architecture-patterns, nextjs-patterns, supabase-postgres-best-practices — all read).
- CodeGraph: unavailable in this executor (no shell/MCP toolset); filesystem reads used as fallback.
- User intent (verbatim): "reactivar los dashboards de vercel, y si no es posible, crear mi propio dashboard para poder ver recursos, usuarios, recursos por usuario... como administrador, ver los usuarios activos, recursos etc... pico de usuarios, usuarios registrados etc..."

## 1. Admin guard pattern (verified)

- Existing admin page is **client-guarded**, not server-redirected:
  - `app/admin/payment-orders/page.tsx:1` `'use client'`; `checkAuth()` (:29-52) does `supabase.auth.getSession()` then `fetch('/api/payment-orders/admin/access', { Authorization: Bearer })`; renders spinner (`authorized === null`, :55-62), "Acceso Denegado" card (:64-77), or content.
  - Guard API: `app/api/payment-orders/admin/access/route.ts:10-24` — `getAuthenticatedUser(request)` + `isAdmin(userId)` → `{ success, data: { isAdmin } }`; auth errors map to 401 (:26-40).
  - `lib/payment-orders/admin-utils.ts:13-31` `isAdmin()` reads env `ADMIN_USER_IDS` (comma-separated UUIDs); `getAdminUserIds()` (:33-49). **Empty/unset env ⇒ nobody is admin** (fail-closed).
- Middleware: `middleware.ts:11-13` only calls `updateSession` (session refresh); matcher excludes static assets (:16-19). No route protection lives there.
- Auth seam for APIs: `lib/auth/get-authenticated-user.ts:44-58` — React-`cache()`d server client from cookies (`lib/supabase/server.ts`), returns userId, throws `AuthError` (→401 under `withErrorHandling`, `lib/api-middleware.ts:22-47`).
- **Reusable seam decision**: `app/admin/layout.tsx` does NOT exist (only `payment-orders/` under `app/admin/`). Options: (a) replicate per-page client guard; (b) new `app/admin/layout.tsx` with a shared client guard component; (c) Server Component page + server-side `isAdmin(getAuthenticatedUser())` + `redirect()` — aligns with nextjs-patterns skill ("Server Components by default") and removes the flash-of-shell. Data must be guarded at the API/service layer regardless of UI guard choice.

## 2. Data-access layering (verified, 2 examples)

- **Service-role service pattern** (cross-user data): `lib/payment-orders/order-service.ts:9-18` — module-level `const supabase = createServiceClient()`, repository via `createServerPaymentOrdersRepository({ serviceSupabase })`, `logger.error('[OrderService] …')` per function; admin path `listAllOrders(status, limit, offset)` (:73-87). Types from `types/payment-order`.
- **User-scoped API pattern** (RLS-bound): `app/api/feedback/route.ts:12-51` — `withErrorHandling(async (req) => {…})`, `createClient()` (anon key + user cookie ⇒ RLS applies), zod validation (`FeedbackSchema`), repo factory, `successResponse` envelope.
- **Where an admin-stats layer fits**: new `lib/admin-stats/` (or `lib/analytics/admin-stats-service.ts`) following order-service conventions: module-level `createServiceClient()` from `lib/supabase/admin.ts:7-20` (throws without `SUPABASE_SERVICE_ROLE_KEY`; typed `Database` from `repositories/supabase/types`), aggregate-only functions, exposed through one guarded route `app/api/admin/stats/route.ts` using `getAuthenticatedUser` + `isAdmin` + `withErrorHandling`. AGENTS constraints honored: `app/api` coordinates `lib/` services (app/api/AGENTS.md), `lib/` owns logic (lib/AGENTS.md), `app/` pages never touch DB directly (app/AGENTS.md).

## 3. Data model inventory for platform metrics (verified vs supabase/schemas/baseline.sql)

Core identity & activity:
- `public.users` :2798-2826 — `id uuid` (=auth.users id), `email`, `name`, `created_at`, tier fields (`tier` free/base/premium check constraint, `subscription_tier/status/started_at/expires_at`), `transaction_count_current_month`, and **`last_activity_at`** :2825 with comment: *"Updated automatically by trigger on auth.sessions.refreshed_at. Reflects real user activity."* → this is the natural basis for **active users (DAU/WAU/MAU)** and registered-user counts/trends.
- ⚠️ The trigger creating `last_activity_at` exists only in baseline (dump) — no file under `supabase/migrations/` matches `last_activity_at|refreshed_at`. Verify it actually populates in prod before relying on it; fallback activity proxies: `usage_tracking.updated_at`, `ai_conversation_sessions.last_message_at`.

Per-user resource rows (all have `user_id uuid` unless noted):
- `accounts` :2325-2342 (`user_id nullable!`, `active bool`, `created_at`)
- `transactions` :528-568 — **NO user_id column**; per-user rollups require join `transactions.account_id → accounts.user_id` (confirmed by RLS policies doing exactly that subselect, :4010). Has `created_at`, `date`, `type`.
- `budgets` :2508, `goals` :63 (+`goal_contributions` migration 20260323220000), `debt_settlements` (migration 20260707023350)
- `subscriptions` :2745-2767 (`tier` free/base/premium, `status` active/cancelled/past_due/paused/trialing, stripe+paddle ids) — tier-mix metrics
- `feedbacks` :2650-2663 (`sentiment up/down/neutral`) — sentiment counts
- `orders` :2665-2678 + `payment_orders` (baseline :119) — commerce activity
- `notifications` :2633, `ai_conversation_sessions` :2398-2411 (`message_count`, `last_message_at`), `ai_conversation_messages` :2381
- `usage_tracking` :2781-2796 — per `(user_id, month_year)` UNIQUE counters: `transaction_count, backup_count, api_calls, export_count, ai_requests`; indexed `idx_usage_tracking_user_month` :3386. Good cheap source for "resources used" trend without heavy joins.

RLS posture (critical):
- Baseline dump DOES include policies: owner-only on `users` (:3847 insert, :3920 update, :3994 select), `accounts` (:3734/:3803/:3884/:3950), `transactions` (:3782/:3863/:3936/:4010 via accounts subselect), `budgets`, `goals`, `usage_tracking` (:3795-:4023); `ENABLE ROW LEVEL SECURITY` at :4027 (accounts), :4161 (transactions), :4170 (users). Newer-table policies live in migrations (e.g., feedbacks `20260820143000_add_feedbacks.sql:18-28`, goal_contributions, orders `20260401153000…sql:19-33`).
- **No admin-bypass policy exists anywhere** ⇒ any cross-user SELECT must use the service-role client, server-side only. Client-side anon-key queries can only ever see the caller's own rows.
- Regression doctrine proven by `tests/db/payment-orders-rls-cross-user.test.ts:14-21`: never assert cross-user visibility with service role; use real signed-in user clients.

## 4. Charting / UI stack (verified)

- Charts: **recharts ^3.3.0** already a dependency (package.json deps) — used by `components/dashboard/spending-chart.tsx:4` (`PieChart, Pie, Cell, ResponsiveContainer, Tooltip`), container pattern at :460. Reuse for admin trends (line/bar) with same import style.
- Stat cards: `components/dashboard/stat-card.tsx:6-14` props `{ title, value: string, change, changeType: 'positive'|'negative'|'neutral', icon: LucideIcon, description?, className? }` — glass/iOS styling with dark tokens; directly reusable for "Usuarios registrados", "Activos hoy", "Recursos totales", etc.
- Loading: `components/ui/suspense-loading.tsx:78-86` `DashboardLoading()` (plus PageLoading/ReportsLoading siblings) — reuse or add `AdminLoading`.
- Design system: `docs/design.md` §1 — dark-mode-first (forced `.dark`), pure-black bg, glass morphism (`.glass-card`), iOS aesthetic, HSL tokens in `app/globals.css`; Spanish-language UI copy convention (existing admin page: "Panel de Administración", "Volver al Inicio").

## 5. Testing seams (verified)

- Node API-route tests: `tests/node/api/payment-orders-admin-access-route.test.ts:6-19` — `jest.mock` `@/lib/auth/get-authenticated-user`, `@/lib/payment-orders/admin-utils`, `@/lib/utils/logger`; call exported `GET(new Request(…) as any)`; assert `{ success, data }` envelope + status (200/401 cases :24-79). New `/api/admin/stats` test should mirror this exactly (mock the stats service instead of hitting Supabase).
- Service-level unit tests fit same node project (mock `createServiceClient`).
- db project: `tests/db/*` run against real Supabase with seed/teardown fixtures (`@/evals/fixtures/seed|teardown`) and `tests/db/support/auth-client` (`createServiceRoleClient`, `createUserSessionClient`) — optional integration test for aggregate SQL correctness.
- jsdom app tests exist under `tests/app/` & `tests/dom/app/**` (e.g., goals page wiring); canonical-user helpers `tests/support/auth/canonical-user.ts:1-30` define env-driven e2e credentials (Playwright lanes: no-auth / auth-required via package.json scripts). Run commands: `npm test` (jest), `npm run test:supabase` (--selectProjects node), `npm run type-check`, `npm run lint` (oxlint).

## 6. app/layout.tsx structure for Vercel components (verified)

- `app/layout.tsx:46-62`: `<html lang="es" suppressHydrationWarning><body>` → `RouteAwareProviders` wraps main `#root` div + `<NotificationBell/>`; then `<Toaster position="top-right"/>` and `<div id="modal-root"/>` sit OUTSIDE providers. `<Analytics />` / `<SpeedInsights />` mount cleanly right after `</RouteAwareProviders>` (siblings of Toaster) — they are self-contained script-injecting components needing no provider context.
- Neither `@vercel/analytics` nor `@vercel/speed-insights` appears in package.json deps or anywhere in the repo (grep zero hits). Orchestrator context confirmed: Web Analytics hasData=true (platform-side collection already live), speed-insights id exists but hasData=false because the component was never installed. So "reactivar dashboards de Vercel" = install both packages + mount components (no config changes needed beyond deploy); note Next 16 / React 19 compatibility when choosing versions.

## 7. Directory rules (AGENTS) constraining the change

- `app/AGENTS.md`: presentation only; **no direct DB access**; don't duplicate `lib/` logic.
- `app/api/AGENTS.md`: coordinate `lib/` services + `repositories/`; normalize errors/permissions/response format; keep domain rules out of handlers.
- `lib/AGENTS.md`: central business logic; reusable across api/repositories/tests; no UI code.
- `components/AGENTS.md`: presentation pieces, no DB access, no complex business logic.
- `supabase/AGENTS.md`: schema evolution source of truth; avoid duplicating domain rules.
- Root scripts that will gate the apply phase: `lint` (oxlint incl. app/components/lib/tests), `type-check`, `test`, `prepush:verify`, plus `guard:db-access` script exists (`scripts/guardrails/check-direct-db-access.mjs`) — likely enforces the "no direct DB from app/" rule.

## Risks

1. **PII / cross-user exposure (highest)**: admin stats touch every user's row. Mitigations: aggregates-only responses (never raw rows, emails only if explicitly decided), service-role confined to `lib/` service behind `isAdmin`-guarded route, no service-role key client-side. RLS gives zero protection here because we deliberately bypass it.
2. `last_activity_at` trigger not reproducible from tracked migrations (baseline-comment only) — active-user metrics may be silently empty/stale in prod; verify early, pick fallback definition (see §3).
3. `transactions` lacks `user_id` ⇒ per-user resource counts need `accounts` join; unbounded COUNT(*) over growing tables could get slow — prefer SQL aggregation (count grouped by user_id via join) or a materialized view/RPC later; cap time windows.
4. `ADMIN_USER_IDS` must be configured in Vercel env for prod; unset = dashboard inaccessible to everyone (fail-closed but confusing).
5. Client-side guard flashes shell/content skeleton pre-auth (existing pattern); acceptable since data is API-guarded, but a server-component guard would be strictly better if chosen.
6. Adding two `@vercel/*` deps touches bundle/build; verify Next 16 peer support to avoid build breakage in `prepush:verify`.
7. `accounts.user_id` is nullable (:2328) — stats joins must tolerate null (orphans) or filter them explicitly.

## Open decisions for proposal

1. Route shape: `/admin` overview vs `/admin/dashboard`; reuse existing payment-orders page path untouched.
2. Guard style: new `app/admin/layout.tsx` (shared client guard or server redirect) vs copy per-page pattern.
3. Metrics cut for v1: registered total + new-per-period (users.created_at), active DAU/WAU/MAU (users.last_activity_at windows), peak-users definition (max DAU per day? needs explicit definition), resources-per-user (counts of accounts/transactions/budgets/goals/subscriptions per user + totals), tier mix (subscriptions/users.tier), feedback sentiment, AI usage (ai_conversation_sessions / usage_tracking.ai_requests).
4. One aggregate endpoint (`GET /api/admin/stats?window=30d`) vs several narrow ones; caching (`revalidate`/`Cache-Control`) and whether to add a SQL view/RPC vs pure supabase-js count queries.
5. Whether v1 includes @vercel packages install+mount (recommended: yes — it's the literal first half of the user's ask) and whether SpeedInsights should be conditional on env.
6. Spanish labels + which existing components (StatCard, recharts wrappers, DashboardLoading) vs new admin-specific components under `components/admin/`.

## Scope boundaries — first cut

In:
- Install `@vercel/analytics` + `@vercel/speed-insights`; mount in `app/layout.tsx` (:46-62 area).
- New admin overview page under `app/admin/` (client or server per decision #2) reusing StatCard/recharts/DashboardLoading and design.md conventions.
- `lib/admin-stats` service using `createServiceClient()`, aggregate-only functions (users, active windows, resources per user, tier mix, feedback/AI usage as decided).
- Guarded `app/api/admin/stats/route.ts` (`getAuthenticatedUser` + `isAdmin` + `withErrorHandling`, successResponse envelope).
- Node jest tests: route test mocking auth/isAdmin/service; service unit test; type-check + oxlint clean.

Out:
- No new migrations/DDL (use existing tables; RPC/view deferred until perf demands).
- No user management CRUD (impersonate/edit/delete), billing operations, or payment-order changes.
- No realtime/websocket live updates, CSV export, email digests.
- No Capacitor/mobile admin surface; no Playwright auth-lane e2e in v1 (jest flow coverage suffices locally).
- No changes to RLS policies (service-role bypass is the sanctioned path per issue-#46 precedent).
