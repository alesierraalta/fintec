# Exploration: exclude-test-users-and-usage-metrics

**Skill resolution:** `paths-injected` (architecture-patterns and supabase-postgres-best-practices were loaded from the supplied paths).

## Executive findings

- The repository can identify a canonical test account (`test@fintec.com`) and deterministic eval fixtures (`eval-fixture-{userKey}@fintec.local`), but it cannot inventory hosted Auth users without a service-role/Auth Admin query. Do not infer that every `@example.com` test literal is a production account.
- Test data should be excluded from analytics by an explicit, reviewable user-ID/email allowlist resolved from `public.users`; avoid broad email regexes and never delete based only on a pattern.
- Auth deletion is feasible, but is destructive. `public.users.id -> auth.users.id` is `NO ACTION` (no `ON DELETE` clause), so delete the profile first, then call `auth.admin.deleteUser`; profile-owned rows cascade. This must be a protected, audited maintenance operation, not part of the dashboard request.
- Existing “usage tracking” is not a reliable behavioral source: `incrementUsage()` is a no-op and `getUserUsage()` computes only current-month transaction count from transactions; all other counters are returned as zero. Existing rows are still useful as historical data if present.
- The strongest no-instrumentation answer to “what users do most” is counts of existing resources (transactions, accounts, budgets, goals, subscriptions, feedback), transaction dates, AI message/session counts, and the existing usage rows. A feature-event taxonomy would require new instrumentation.

## 1. Test-user identification inventory

### Canonical auth user

- `tests/support/auth/canonical-user.ts:3-19` defines the primary environment keys `FINTEC_TEST_USER_EMAIL/PASSWORD/NAME/BASE_CURRENCY`, with legacy fallbacks `E2E_CANONICAL_USER_*` and `TEST_USER_*`.
- `tests/support/auth/canonical-user.ts:22-27` defaults the identity to `test@fintec.com`, password `Test123!`, display name `Test User`, USD. Helpers are disabled for `NODE_ENV=production` unless explicitly overridden (`:50-57`).
- `lib/testing/canonical-fixtures.ts:14-35,116-176` creates recognizable fixture data (`Fintec Canonical Cash`, `Fintec Canonical Income`, `Fintec Canonical Expense`) and upserts the authenticated user's profile. `app/api/testing/bootstrap/route.ts:1-68` exposes that bootstrap only outside production.
- Auth-required Playwright runs share one canonical user (`playwright.config.ts:62-65,85-94`); the setup/auth helpers consume the canonical env keys. k6 browser config also uses `FINTEC_TEST_USER_EMAIL`, `E2E_CANONICAL_USER_EMAIL`, and `TEST_USER_EMAIL` (`performance/k6/browser/transaction-flow.js:44-51`); k6 config falls back to `test@fintec.com` (`performance/k6/lib/config.js:19-26`). CI performance workflows pass the secret `PERF_TEST_USER_EMAIL` into `TEST_USER_EMAIL` (`.github/workflows/perf-staging.yml:34-37,70-73`; nightly `:35-38,70-73,128-131`; PR `:96-99`).

### Deterministic eval users

- `evals/fixtures/seed.ts:72-82` uses password `EvalFixture123!` and email pattern `eval-fixture-{userKey}@fintec.local`; `:85-135,265-283` creates/upserts the Auth and profile fixture.
- `evals/fixtures/teardown.ts:4-35` is the only clear Auth-admin deletion utility found. It deletes `public.users` first, then calls `client.auth.admin.deleteUser`.
- Eval callers include `evals/baseline/run-baseline.ts:27-37,96-103` and `evals/gate/run-gate.ts:20-30,77-84`. These are identifiable by the `eval-fixture-*@fintec.local` pattern and should be cleaned up by their runner.

### Other email patterns (not sufficient alone for deletion)

- Unit/API/E2E test literals use `test@example.com`, `new@example.com`, `bot@example.com`, `sessiontest@example.com`, and `newuser@example.com` (examples: `tests/unit/contexts/auth-context-oauth.test.tsx:81`, `tests/unit/contexts/auth-context-signup-errors.test.tsx:112-242`, `tests/e2e/auth-*` and `tests/api/waitlist.test.ts:60-161`). These are mock/request values; most do not create hosted users.
- `@example.invalid` appears in archived real-run cleanup evidence (`openspec/changes/archive/2026-08-20-beginner-ux-10/apply-progress.md:13,28,189,239`), not an active creator. Treat it as historical evidence, not a current inventory source.
- Generic “testing”, `@example`, and `test@` matches elsewhere include documentation, mocked auth users, waitlist tests, and comments. They must not become automatic production deletion rules.

**Hosted DB limitation:** no Auth Admin credentials/API access was available, so the actual current hosted user IDs/emails remain unknown. A production read-only inventory must be performed separately with a service-role script, outputting IDs, emails, created dates, and row counts for human review.

## 2. Deletion feasibility and impact

### Existing deletion code

- No admin/user deletion service or admin route was found. `repositories/supabase/index.ts:187-200` contains only a TODO/commented-out user data clear and explicitly warns it deletes all data.
- `evals/fixtures/teardown.ts:20-35` is the existing controlled teardown; integration tests also call `auth.admin.deleteUser` (`tests/node/integration/finance-supabase-contract.test.ts:134-139`). No RPC for deleting a user was found. Other RPCs are feature-specific.

### FK/cascade map (baseline and migrations)

- `public.users.id` references `auth.users.id` without `ON DELETE` (`supabase/schemas/baseline.sql:3667-3669`): PostgreSQL default is `NO ACTION`. Therefore deleting Auth first can fail while the profile exists; delete `public.users` first.
- Direct profile-owned cascades in baseline: `accounts.user_id`, `budgets.user_id`, `goals.user_id`, `notifications.user_id`, `feedbacks.user_id`, `subscriptions.user_id`, `usage_tracking.user_id`, AI sessions/messages/profile/memories, categories, recurring transactions, RAG documents, goal contributions (`baseline.sql:3479,3560-3585,3590-3608,3629-3664`).
- Dependency cascades: `transactions.account_id -> accounts` and transfers/debt-settlements/recurring transactions follow their transaction/account links (`baseline.sql:3510-3518,3587-3648`). `ai_conversation_messages.session_id -> ai_conversation_sessions` is cascade (`:3493-3504`).
- `payment_orders.user_id -> users` cascades; `payment_orders.reviewed_by` and `transaction_id` use `SET NULL` (`baseline.sql:3608-3621`). Category parents use `SET NULL`; goal account and transaction references use `SET NULL` (`:3519-3523,3578-3584`). No explicit `RESTRICT` was found; the important non-cascade behavior is the users/Auth `NO ACTION` edge.
- Migrations independently declare some rows against `auth.users`: priority-1 AI tables and `orders` use `REFERENCES auth.users(id) ON DELETE CASCADE` (`supabase/migrations/202601112247_priority1_ai_infrastructure.sql:11-75`, `20260401153000_create_orders_for_manual_binance_checkout.sql:3-5`), feedbacks uses Auth directly (`20260820143000_add_feedbacks.sql:3-6`), and goal contributions uses `public.users` (`20260323220000_add_goal_contributions.sql:6`). This split reinforces the need for a staged deletion/readback check.

Deleting a real user irreversibly removes financial records, AI history, notifications, subscriptions and analytics counters; external billing/provider records are not necessarily deleted. A deletion design must require exact ID confirmation, exclude admins, show a dependency count, use service role only server-side, audit the action, and verify both profile/Auth absence. Prefer soft exclusion/cleanup over production deletion until reviewed.

## 3. Excluding test users from admin stats

Current service behavior is in `lib/admin-stats/service.ts:35-78`: it reads `users` without email, reads each resource family independently, derives transaction ownership through account rows, then aggregates in `aggregates.ts:27-84`. Existing Supabase filter convention is `.in('account_id', scope.accountIds)` in `lib/supabase/subscriptions.ts:138-146`; no `.neq()` convention was found in `lib`.

Options:

1. **Explicit IDs at service boundary (recommended for production safety).** Configure a server-only `ADMIN_ANALYTICS_EXCLUDED_USER_IDS` list, validate UUIDs, filter users and every user-owned family before aggregation (and exclude account owners before transaction attribution). Pros: exact, cheap, no email privacy in DTO, robust to email changes. Cons: requires discovering/maintaining IDs.
2. **Exact configured emails resolved from `users`.** Select `id,email` and match a separately configured `ADMIN_ANALYTICS_EXCLUDED_USER_EMAILS` list, then use the resulting IDs for all families. Pros: operationally easier when only test email is known. Cons: email changes and normalization must be handled; must never use broad `@example`/`test` regexes.
3. **Query-level filters (`.not('id','in','(...)')` / `.neq`).** Reduces rows transferred, but Supabase/PostgREST syntax and empty-list handling need careful tests; multiple family queries can drift. It still needs the same canonical exclusion set and does not solve joined transaction ownership alone.
4. **Aggregates-only filter.** Easy to unit-test, but unsafe: `users.total`, DAU/new-user metrics and usage remain contaminated, and every future family must remember the filter. Use a normalized excluded-ID set before both service reads/normalization and aggregate functions, optionally with query-level filtering as an optimization.

Do not infer exclusions from display names (`Test User`) or fixture resource names; names are mutable and can collide with real data.

## 4. Available usage/behavior sources without new instrumentation

- `usage_tracking` schema is `user_id,month_year,transaction_count,backup_count,api_calls,export_count,ai_requests,created_at,updated_at` (`baseline.sql:2781-2796`), unique per `(user_id,month_year)` (`:3053-3055`), indexed by user/month (`:3386`). However, `lib/supabase/subscriptions.ts:113-175` reads transaction counts directly from transactions and returns backup/export/API/AI as zero; `:176-178` has `incrementUsage()` as `Promise.resolve()`. Therefore counter semantics are historical/partial, not a trustworthy complete event log.
- Transactions have `created_at`/date and account ownership through `account_id` (baseline table at `:528+`; FK `:3642-3648`). Existing account/transaction counts answer the strongest “what is used most” question. A date-bucketed transaction count is possible, but current admin service selects only `account_id` (`lib/admin-stats/service.ts:44-47`), so it would need a bounded `created_at`/`date` read.
- AI sessions have `user_id`, `started_at`, `last_message_at`, `message_count`; messages have `user_id`, `session_id`, role/content/created_at (`baseline.sql:2381-2407`). Trigger `update_session_message_count()` recalculates session message count and updates last message (`:2018-2036`, trigger `:3454-3455`). Counts of sessions/messages, user-vs-assistant messages, and AI activity by date are available without instrumentation, subject to optional-family degradation.
- Existing resource families in admin stats are accounts, transactions, budgets, goals, subscriptions, feedbacks (`lib/admin-stats/types.ts:7-34`). Feedbacks include target type/id and sentiment (`baseline.sql:2633-2650`), enabling volume/sentiment/target aggregates if selected. Orders/payment_orders contain user, service/status/amount/created_at and payment/order lifecycle fields (`baseline.sql:119+`, `:2510+`); they can measure checkout/order activity, but monetary reporting needs separate money-handling review.
- Notifications, recurring transactions, categories, goal contributions, RAG/AI tables and agent logs also exist, but are not currently read by admin stats. Their presence indicates possible future activity dimensions, not evidence that every row is a user action event.

## 5. UI extension points

- `components/admin/admin-stats-charts.tsx:1-24` is the sole local Recharts wrapper and currently renders a `LineChart` inside the `glass-card` container. Add a horizontal `BarChart`/table in the same component or a sibling component, importing `Bar`, `BarChart`, `CartesianGrid`, `Tooltip`, and `XAxis/YAxis` as needed.
- `components/admin/admin-stats-dashboard.tsx:1-60` already renders metrics, usage-month cards, unavailable states, and the chart; reuse its `isUnavailable` handling and `glass-card rounded-3xl p-6` pattern. `DashboardLoading` is already the loading fallback and should cover any new section.
- A “top actions/features” bar chart should use an explicit metric label and provenance (for example, transaction rows, AI messages, feedbacks, or usage counters), not imply a complete product-event ranking. A compact accessible table is a safer fallback for unavailable families.

## 6. Testing seams

- `tests/node/lib/admin-stats-service.test.ts:15-39` provides a table-row fixture and a fluent mock with `select/gte/lte/lt/not`; add `.neq`/`.in` chain methods if query-level filtering is chosen, and assert excluded IDs disappear from users, per-user resources, transaction ownership, and monthly usage.
- The tests cover core fail-closed users, optional-family degradation, nullable transaction ownership, UTC activity, and empty activity (`:42-128`). Preserve these contracts while adding exclusion tests.
- `tests/node/api/admin-stats-route.test.ts:18-75` mocks `requireAdmin` and `getAdminStats` and verifies auth, window validation, no-store, and safe internal errors. Route changes should keep exclusion configuration server-side; no new client-supplied exclusion parameter is safe.

## Risks and open decisions for proposal

1. Obtain a read-only hosted inventory (IDs, exact emails, row counts) before naming deletion targets; no such inventory was possible in this exploration.
2. Decide whether the first release excludes explicit IDs, exact configured emails, or both; require a fail-closed response when configuration is malformed.
3. Decide whether “delete them” means one-time manual teardown or a permanent admin deletion workflow. Recommendation: one-time, separately approved script first; no dashboard delete button in this change.
4. Define the “most-used” ranking and time basis: transactions by `created_at` versus transaction `date`, AI messages versus sessions, and whether monthly counters are included despite their incomplete writers.
5. Decide whether to add AI/feedback/orders as optional families now or ship a smaller resource/transaction/usage view. Every optional family must retain `{status:'unavailable'}` rather than fabricate zero.
6. Verify production `last_activity_at` population; prior exploration notes that its trigger appears in the baseline dump but not migrations (`openspec/changes/add-admin-analytics-dashboard/exploration.md:28`).
7. Treat production deletion as a high-risk operation: exact IDs, admin-user guard, confirmation, audit log, backup/rollback plan, and post-delete checks are mandatory.
