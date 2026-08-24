# Design: Exclude Test Users and Add Feature Usage Metrics

## Scope and decisions

The existing `lib/admin-stats` service remains the only analytics orchestration layer. `aggregates.ts` remains a pure reducer boundary; the service supplies it only normalized, included-user rows. No new stats route, migration, RPC, instrumentation, RLS policy, or dashboard deletion control is introduced.

The reviewed default matcher set is deliberately narrow: `test@fintec.com` and `eval-fixture-*@fintec.local`. Broad literals found in test mocks (`@example.com`, `test@`, `testing`, and fixture names) are not defaults; operators may explicitly configure a simple pattern for them through `TEST_USER_EMAIL_PATTERNS`.

## Module map: exact new and touched files

### New

- `lib/admin/test-users.ts`
  - Owns `DEFAULT_TEST_USER_EMAIL_PATTERNS`, `getTestUserPatterns()`, and `isTestUserEmail(email)`, plus the small parser/compiler used by both analytics and maintenance code.
  - `TEST_USER_EMAIL_PATTERNS` is a comma-separated replacement list. Only non-empty patterns containing email-safe literals plus `*` or `%` are accepted; `*` and `%` mean an arbitrary substring. Matching is case-insensitive and whole-email anchored. Regex syntax is escaped and never interpreted as operator input.
  - An absent variable uses the two reviewed defaults. An empty entry, unsupported character/syntax, overlong pattern/list, or otherwise malformed override logs one warning without values, emails, or secrets and falls back to the defaults. A null/empty email never matches. `getTestUserPatterns()` returns the effective patterns without compiled regex objects so it is safe to use in diagnostics/tests.

- `lib/admin-stats/feature-usage.ts`
  - Framework-free reducers and DTO builders. Inputs are already filtered rows plus `{ now, window, days }`; no Supabase or logger dependency.
  - Builds the stable keys `transactions_created`, `budgets_created`, `goals_created`, `feedbacks_submitted`, `ai_sessions`, and `ai_messages`.
  - Timestamp-backed counts use UTC timestamps in the selected window. `transactions_created` includes `count` and a complete UTC `byDay` series for the window. `feedbacks_submitted` includes selected-window `count` and a `recentCount` for the trailing seven days. The other entries use `count`.
  - A successful source with no matching timestamped rows is `empty` with `count: 0`; a failed/missing source or unusable timestamp column is `unavailable` with a non-sensitive reason and no count. Null timestamps are skipped, and the section is `partial` when rows were present but could not be placed in a window; they are never converted into zero activity.
  - Reduces filtered `usage_tracking` rows into aggregate month entries without applying the selected timestamp window. `monthlyCounters` entries retain `monthYear`, `transactionCount`, `backupCount`, `apiCalls`, `exportCount`, and `aiRequests`, and add `status`, `source: "usage_tracking"`, and `basis: "month_based"`.

- `components/admin/admin-feature-usage.tsx`
  - Client component because Recharts is browser-rendered. Uses a vertical-layout `BarChart` (`layout="vertical"`) inside the existing `glass-card rounded-3xl p-6` treatment.
  - Renders a counters row for available feature items and a compact accessible text/table fallback alongside the chart. It shows source provenance and the statement that values are aggregate activity from existing records, not complete event telemetry. `empty` and `unavailable` entries are visibly labelled and are not plotted as zero bars.

- `contexts/admin-access-context.tsx`
  - Small client context carrying only the server-derived boolean `isAdmin`; it has no auth lookup or loading state. This is presentation data, not an authorization boundary.

- `scripts/admin/delete-test-users.ts`
  - Local-only two-phase CLI. Exports pure helpers for argument parsing, simple target matching delegation, grouped dependency-count reduction, snapshot reconciliation, confirmation validation, and audit serialization so tests need no database.

### Touched

- `lib/admin-stats/service.ts`
  - Selects `email` with `id`, `created_at`, and `last_activity_at` from `users`.
  - Resolves `excludedUserIds` once from those rows with `isTestUserEmail`, then derives `includedUserIds`. Before any reducer call, it filters every user-owned family to `includedUserIds`. Accounts retain null-owner rows for the existing total, but only included owners enter grouped/per-user output. Transactions first map `account_id -> included owner`; excluded and unknown owners are discarded before both resource and feature reduction.
  - Reads timestamp projections needed by feature usage and optional AI families. Existing all-time resource reads remain all-time; the pure reducer applies the selected bounds to shared rows, while feature-only reads use `.gte/.lte` when a source is not needed for an all-time resource. This avoids duplicating the large transactions read while still making every timestamp-backed feature window-aware.
  - Reads `ai_conversation_sessions(user_id, started_at, message_count)` and `ai_conversation_messages(user_id, created_at)` as optional families. The confirmed schema uses `started_at` for sessions and `created_at` for messages. Query errors degrade only those feature entries. The required `users` read still fails the request.
  - Passes the same filtered source set to `mergeResourceCounts`, `buildActivity`, `buildNewByDay`, the existing monthly usage mapper, and `buildFeatureUsage`. No email is included in the returned DTO. Per-family reads intentionally remain simple full reads; filtering normalized rows once in the service is cheaper and safer than repeating PostgREST `in/not-in` syntax (especially for empty sets) and prevents a family from drifting from the canonical exclusion set.

- `lib/admin-stats/types.ts`
  - Adds `FeatureUsageStatus`, `FeatureUsageItem`, `MonthlyCounter`, and `AdminStats.featureUsage` without renaming existing `users`, `resources`, or `usage` fields.
  - `featureUsage` is `{ status, window, items, monthlyCounters }`. Items have `key`, `status`, `source`, `basis: "selected_window"`, optional `count`, optional `byDay`, optional `recentCount`, and optional safe `reason`. `monthlyCounters` is a stable envelope `{ status, source: "usage_tracking", basis: "month_based", items, reason? }`; each item retains the existing month/counter field names. The envelope is `unavailable` with no items when the family fails. No user identifiers, emails, names, message content, or raw rows are exposed.

- `lib/admin/guard.ts`
  - Adds a soft `getAdminVisibility(): Promise<boolean>` that calls the existing `getAdminAccess()` and returns false on missing/invalid auth or any guard failure. It logs no identity details and fails closed. `requireAdmin()` and `getAdminAccess()` keep their current behavior.

- `app/layout.tsx`
  - Becomes an async server layout, obtains `getAdminVisibility()`, and passes the boolean to `RouteAwareProviders`. The server computes it before the initial navigation markup, including unauthenticated requests, so no client authorization round trip or admin-link flash is possible.

- `app/route-aware-providers.tsx`
  - Accepts `isAdmin` and mounts `AdminAccessProvider` around the existing provider tree. Authenticated client pages continue using the unchanged `MainLayout` API.

- `components/layout/sidebar.tsx`
  - Consumes the context and conditionally adds one `Admin` link to `/admin` (using `Shield` or the existing admin-appropriate icon). The menu remains a client component for pathname/sidebar interactions, but its access input is server-derived. The route and stats API remain independently guarded.
  - `components/layout/mobile-nav.tsx` is intentionally unchanged; mobile navigation is a declared non-goal.

- `components/admin/admin-stats-dashboard.tsx`
  - Renders `AdminFeatureUsage` beside the existing charts/resources/monthly cards and preserves current unavailable handling and loading/error behavior.

- `.gitignore`
  - Adds `.local-audit/`. Audit files stay local and are never bundled, committed, or served.

- `tests/node/lib/admin-stats-service.test.ts`
  - Extends fixtures with canonical, eval-pattern, override, case, null-owner, and non-matching users and verifies exclusion before every aggregate family.

- `tests/node/lib/feature-usage.test.ts` (new)
  - Tests pure window reducers, UTC daily transaction buckets, feedback recent counts, optional timestamp states, AI rows, and independent monthly counters.

- `tests/node/api/admin-stats-route.test.ts`
  - Keeps the existing guard-order/auth/window/no-store assertions and adds a representative `featureUsage` DTO-key assertion; the route source itself is unchanged.

- `tests/components/admin-sidebar.test.tsx` (new)
  - Supplies the access context and verifies admin, non-admin, and unauthenticated/false cases render exactly one or no `/admin` link.

- `tests/node/scripts/delete-test-users.test.ts` (new)
  - Tests pure matcher delegation, grouped FK counts, audit writer serialization, confirmation rules, and snapshot count/ID reconciliation without a live Supabase client.

## DTO and data flow

### Central exclusion flow

```text
public.users (id,email,created_at,last_activity_at)
        |
        v
getTestUserPatterns -> isTestUserEmail(email)
        |
        v
excludedUserIds + includedUserIds   [one service boundary]
        |
        +--> filter users -> activity/new-user reducers
        +--> filter user-owned family rows -> resource grouping
        +--> accounts filtered -> account_id -> owner map
        |       -> discard excluded/unknown transaction owners
        +--> filter usage_tracking -> existing usage.byMonth
        +--> filter feature rows (transactions, budgets, goals, feedbacks, AI)
                -> buildFeatureUsage pure reducers
                -> aggregate-only AdminStats DTO
```

The exclusion set is ID-based after the one email match. Email is never sent to the browser and is not used by individual reducers. This also handles email changes after the service resolves the current profile rows.

### Feature usage flow

```text
all-time resource reads + optional feature-family reads
        |
        v
service normalizes ownership and removes excluded IDs
        |
        +--> timestamp rows + [now, selected window]
        |       -> count valid UTC timestamps
        |       -> transactions total + byDay
        |       -> feedback total + trailing-seven-day recentCount
        |       -> budgets/goals/AI sessions/messages
        |
        +--> filtered usage_tracking rows
                -> month-based counter passthrough/aggregation

buildFeatureUsage -> status-aware featureUsage DTO -> AdminFeatureUsage UI
```

The service treats query failure as an unavailable family. The reducer distinguishes `empty` (source worked and matched no rows) from `unavailable` (source/column/query did not provide a trustworthy count). Monthly counters do not inherit the selected timestamp window. The existing route contract is deliberately not modified: `app/api/admin/stats/route.ts` keeps `requireAdmin()` before window parsing/service access, and the DTO grows through `getAdminStats`; `lib/admin-stats/aggregates.ts` also remains unchanged.

## Exclusion correctness matrix

| Metric family | Filter location | Correctness reason |
|---|---|---|
| `users.total`, `newByDay` | user rows immediately after email resolution | Excluded profiles cannot enter totals or creation buckets. |
| `dau/wau/mau/peakDailyActive` | same filtered user rows before `buildActivity` | Activity is derived from the same included population and retains the session-refresh basis. |
| accounts and other resource totals | raw user-owned rows filtered before `grouped`/`mergeResourceCounts` | One normalized input prevents a family from reintroducing an excluded owner. Null account owners remain only in the existing aggregate total. |
| transactions | accounts filtered first; transaction rows attributed only to included account owners | Ownership is resolved through accounts, so an excluded account cannot become an anonymous transaction bucket. |
| `resources.perUserCounts` | filtered grouped rows and included owner set | Excluded IDs never become per-user keys; aggregate response remains non-PII. |
| `usage.byMonth` and `featureUsage.monthlyCounters` | usage rows filtered before mapping/reduction | Stored counters from excluded users are omitted without applying a false timestamp window. |
| timestamp-backed feature items | feature rows filtered before `buildFeatureUsage`, then bounded by timestamp | All feature entries inherit the same ID set and selected window. |
| optional AI feature items | same filtered AI rows; family status preserved on query failure | Missing AI infrastructure cannot contaminate required metrics or be represented as fabricated zeroes. |

## Deletion script design and security posture

The script requires `SUPABASE_SERVICE_ROLE_KEY` before creating `createServiceClient()` and imports no app/browser bundle. It also requires `NEXT_PUBLIC_SUPABASE_URL`; credentials are read from the local process only. It refuses any target in `getAdminUserIds()`/`ADMIN_USER_IDS` before deletion.

Phase 1 is the default and is non-destructive:

1. Paginate `auth.admin.listUsers({ page, perPage })` until the page is short, match each Auth email with `isTestUserEmail`, and require a corresponding `public.users` profile for a deletion target.
2. For each target print a table containing `id`, `email`, `created_at`, and counts for `accounts`, `transactions`, `budgets`, `goals`, `subscriptions`, `feedbacks`, `notifications`, and `usage_tracking`.
3. Direct profile-owned tables are queried by `user_id` and reduced by user ID. Transactions are queried by `account_id` after the account-to-owner map is built. This follows the explored FK map without selecting content or unrelated PII.
4. Write `.local-audit/delete-test-users-<timestamp>.json` with mode, timestamps, target count, dependency counts, reconciliation metadata, per-target outcomes, and deleted Auth IDs only. Emails are printed for the operator but omitted from the retained audit JSON. Zero matches or any inventory/count failure exits non-zero.

Phase 2 requires `--confirm`. It loads the explicitly selected dry-run audit snapshot, re-inventories live Auth/profile/dependent rows, and calls `reconcileTargets(snapshot,current)`; both count and sorted target IDs must match. It aborts before any delete on zero, mismatch, missing profile, administrator target, missing service key, or failed confirmation. The default confirmation is the exact target count typed interactively; `--yes` is supported only as an explicit CI-less local override. The count token is the primary safety measure because it makes a human review and target cardinality check unavoidable; `--yes` is never implicit.

For each target, the script deletes `public.users` first, then calls `auth.admin.deleteUser(id)`. It reads back both profile absence and Auth absence before marking the target deleted. A profile/auth/readback failure records the failure, preserves deleted-so-far IDs and outcomes in the audit file, logs no secrets, exits non-zero, and never claims the remaining targets succeeded. The audit writer uses an atomic temporary file/rename where supported so an interrupted run leaves the last complete record.

## Error and edge policy

- Matcher overrides are validated as a whole. Malformed, empty, or unsupported configuration warns and uses the two narrow defaults; it never becomes match-all or an empty exclusion set.
- A valid override replaces, rather than extends, defaults. Explicit broad patterns are operator responsibility and still use literal-plus-wildcard matching only.
- Required `users` failure fails the stats request. Accounts/resource/usage/feature families are independently optional as in the existing service. A failed feature family produces `unavailable` entries and may produce `partial` section status while the rest of the DTO remains usable.
- Missing optional columns/tables, including AI tables, produce `source_unavailable`; query failures produce `query_failed`. Neither is emitted as `count: 0`. A successful query with no rows is `empty` and zero is valid.
- `usage_tracking` counters are labelled month-based stored supplemental data and are not compared with or filtered to `7d/30d/90d`.
- Script inventory, reconciliation, confirmation, count, profile deletion, Auth deletion, and readback failures all write an outcome and terminate non-zero where safety cannot be proven. Mid-run failure records deleted-so-far and does not retry automatically.

## Test plan mapped to R7–R10

- **R7:** Extend `admin-stats-service.test.ts` with mixed-case `test@fintec.com`, `eval-fixture-run@fintec.local`, override-only patterns, prefix/contains/suffix edge cases supplied explicitly, malformed entries, and excluded ownership across users, activity, accounts, transactions, budgets, goals, subscriptions, feedbacks, usage, and per-user output. Assert no email/name fields.
- **R8:** `feature-usage.test.ts` covers all keys, UTC window boundaries, transaction `byDay`/total, feedback recent count, budgets/goals timestamp availability, confirmed AI session/message columns, unavailable-vs-empty behavior, excluded rows, and month counters independent of the window. The route test asserts `featureUsage.status`, `window`, `items`, and `monthlyCounters` are present while `requireAdmin()` remains first and no-store remains set.
- **R9:** `admin-sidebar.test.tsx` renders the actual client Sidebar with mocked subscription/sidebar hooks and server-context values `true`/`false`; admin sees one `/admin` link, non-admin and unauthenticated/false see none. The context has no loading state, proving no client flash path.
- **R10:** `delete-test-users.test.ts` invokes pure helpers with mocked rows only: Auth pagination normalization, dependency grouping including account-to-transaction ownership, audit JSON redaction/writing, exact-count/`--yes` confirmation, admin target rejection, target reconciliation, and failure outcome preservation. No test calls a real DB or Auth Admin API.

Run the focused Jest node/component suites, then repository type-check, lint, formatting check, and the existing admin route/service suites. No live deletion test is part of CI.

## Rollout and rollback

Deploy the matcher/service/UI/navigation code first; exclusion becomes active immediately for admin stats, while existing route/API guards remain authoritative. Deploy the script but do not run it automatically. An operator later runs the default dry run against the intended hosted project, reviews every printed target and dependency count, retains the ignored audit file, and runs confirmed deletion only after explicit approval.

Rollback of code/config restores prior analytics visibility and removes the navigation/feature section; no schema rollback is needed. Deletion is irreversible and cannot be undone by rollback, so restoration would require an independent database/Auth backup recovery process.
