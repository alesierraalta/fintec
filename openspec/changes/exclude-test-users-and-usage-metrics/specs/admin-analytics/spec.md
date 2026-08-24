# Delta for Admin Analytics

## ADDED Requirements

### Requirement: R7 Test users are excluded from every admin metric

The admin stats service MUST construct one server-side excluded-user ID set before calculating metrics. It MUST resolve IDs from `public.users` by matching `email` case-insensitively against the centralized `TEST_USER_EMAIL_PATTERNS` matcher. When the variable is absent, the matcher MUST use the reviewed safe defaults `test@fintec.com` and `eval-fixture-*@fintec.local`; when a valid comma-separated override is present, the override MUST replace those defaults. The matcher MUST support only the documented simple glob-like `*` and `%` wildcards and MUST NOT interpret patterns as arbitrary regular expressions. An empty, malformed, or unsupported override MUST log a warning and fall back to the safe defaults.

The excluded ID set MUST be applied consistently to `users.total`, `users.newByDay`, `users.dau`, `users.wau`, `users.mau`, `users.peakDailyActive`, `resources.totals`, `resources.perUserCounts`, `usage.byMonth`, and `featureUsage`. Transaction ownership MUST continue to be resolved through `accounts` before exclusion. An excluded user MUST never appear in `resources.perUserCounts`, and the aggregate response MUST NOT expose the matched email addresses.

#### Scenario: Default patterns exclude a canonical and eval fixture user

- GIVEN `TEST_USER_EMAIL_PATTERNS` is unset
- AND `public.users` contains `test@fintec.com`, `eval-fixture-run-1@fintec.local`, and a real customer
- WHEN an authorized administrator requests `GET /api/admin/stats?window=30d`
- THEN the canonical and eval fixture IDs are excluded from `users.total`, activity metrics, resource totals, monthly usage, and feature usage
- AND neither excluded ID appears in `data.resources.perUserCounts`
- AND the response is HTTP `200` without email fields for any matched user

#### Scenario: Valid environment patterns replace defaults

- GIVEN `TEST_USER_EMAIL_PATTERNS` is `qa+*@fintec.local,fixture-%@fintec.local`
- AND the configured patterns are syntactically valid
- WHEN the stats service resolves its exclusion set
- THEN matching is case-insensitive and uses only those configured patterns
- AND an address matching a default pattern but not an override pattern is not excluded solely because it matches the default

#### Scenario: Malformed configuration fails closed

- GIVEN `TEST_USER_EMAIL_PATTERNS` contains an empty entry or unsupported pattern syntax
- WHEN the stats service parses the configuration
- THEN it logs a warning without logging service credentials or unrelated user data
- AND it uses the reviewed safe defaults instead of treating the configuration as an empty exclusion set or a broad match-all rule
- AND the stats request does not fail solely because the override is malformed

#### Scenario: Exclusion applies before transaction attribution and reduction

- GIVEN an excluded user owns account `A-test` and a non-excluded user owns account `A-real`
- AND transactions belong to both accounts
- WHEN the aggregate stats are calculated
- THEN the transaction rows for `A-test` contribute to none of the user, resource, usage, or feature aggregates
- AND the transaction rows for `A-real` contribute normally
- AND no synthetic or anonymous per-user bucket is created for the excluded owner

### Requirement: R8 Admin stats expose honest feature-usage aggregates

`GET /api/admin/stats` MUST extend its existing successful `data` DTO with a `featureUsage` section. The section MUST contain `status: "available" | "empty" | "partial" | "unavailable"`, `window`, `items`, and `monthlyCounters`. Each `items` entry MUST contain `key`, `count` when `status` is `"available"` or `"empty"`, `status: "available" | "empty" | "unavailable"`, `source`, and `basis: "selected_window"`; supported keys MUST include `transactions_created`, `budgets_created`, `goals_created`, `feedbacks_submitted`, `ai_sessions`, and `ai_messages`. Timestamp-backed entries MUST count existing rows in the selected `7d`, `30d`, or `90d` window using the source timestamps, including `created_at` where that field exists. Optional source families with missing timestamps or failed reads MUST use `status: "unavailable"` and MUST NOT fabricate a zero count.

`monthlyCounters` MUST contain the existing `usage_tracking` fields `monthYear`, `transactionCount`, `backupCount`, `apiCalls`, `exportCount`, and `aiRequests`, plus `status`, `source: "usage_tracking"`, and `basis: "month_based"`. These counters MUST remain independent of the selected timestamp window and MUST be labeled as stored supplemental counters. The existing `usage.byMonth` contract MUST remain consistent with the same excluded-user set.

The dashboard MUST render a `Uso por funcionalidad` section using the existing admin chart/card presentation, with an accessible horizontal bar chart for available timestamp-backed items and visible provenance stating that the values are aggregate activity from existing records rather than complete event telemetry. Empty and unavailable families MUST have explicit states; failed or absent sources MUST not be rendered as measured zeroes. The DTO MUST remain aggregate-only and MUST NOT expose raw rows, email, name, authentication metadata, or message content.

#### Scenario: Timestamp-backed feature usage respects the selected window

- GIVEN an authorized administrator requests `GET /api/admin/stats?window=7d`
- AND transaction, feedback, budget, goal, AI session, and AI message rows have usable timestamps both inside and outside that window
- WHEN the stats request succeeds
- THEN each available `featureUsage.items` entry counts only rows in the selected window
- AND each entry has `basis: "selected_window"` and identifies its source field in `source`
- AND rows belonging to excluded users are not counted

#### Scenario: Monthly counters are independent and provenance-labeled

- GIVEN `usage_tracking` contains rows for `monthYear: "2026-02"`
- AND the administrator selects `window=7d`
- WHEN the stats request succeeds
- THEN `data.featureUsage.monthlyCounters` includes the stored `transactionCount`, `backupCount`, `apiCalls`, `exportCount`, and `aiRequests` values for that month when available
- AND each counter entry has `source: "usage_tracking"` and `basis: "month_based"`
- AND the counters are not silently filtered to seven days or presented as complete event telemetry

#### Scenario: Optional feature source is unavailable rather than zero-filled

- GIVEN the AI tables are absent, their timestamp field is unavailable, or the AI query fails
- WHEN an authorized administrator requests the stats
- THEN the request can still return HTTP `200` when the required users/activity aggregates succeed
- AND the affected `featureUsage.items` entries have `status: "unavailable"` and a non-sensitive reason such as `source_unavailable` or `query_failed`
- AND those entries omit `count` rather than returning a fabricated `0`
- AND the dashboard shows an explicit unavailable state

#### Scenario: Feature usage has no matching rows

- GIVEN all supported feature sources are available but have no rows in the selected window
- WHEN the stats request succeeds
- THEN the affected entries have `status: "empty"` and `count: 0`
- AND `featureUsage.status` is `"empty"` or `"partial"` as appropriate
- AND the dashboard displays an explicit empty state instead of a misleading ranking

### Requirement: R9 Admin navigation visibility is server-gated

The main application navigation MUST render an `Admin` entry linking to `/admin` only when the authenticated user passes the existing `isAdmin`/`getAdminAccess()` policy. Unauthenticated users and authenticated non-admins MUST receive no `Admin` link in the rendered output, including during initial navigation rendering; a client-side authorization check MUST NOT produce a temporary link or client flash. This presentation rule MUST NOT replace the independent `/admin` page and `GET /api/admin/stats` authorization requirements from R1.

#### Scenario: Administrator receives the navigation entry

- GIVEN an authenticated user ID is included in `ADMIN_USER_IDS`
- WHEN the main application navigation is rendered
- THEN it contains one `Admin` entry linking to `/admin`
- AND the entry is available without a client-side authorization round trip

#### Scenario: Non-admin navigation omits the entry

- GIVEN an authenticated user ID is not included in `ADMIN_USER_IDS`, including when the configuration is missing or empty
- WHEN the main application navigation is rendered
- THEN no `Admin` entry or `/admin` navigation link is present in the rendered output
- AND the user remains denied by the independently guarded `/admin` page and stats API

#### Scenario: Unauthenticated navigation has no admin flash

- GIVEN no authenticated session is available
- WHEN the main application navigation is rendered and hydrated
- THEN no `Admin` entry or `/admin` navigation link is present before or after hydration
- AND the navigation does not disclose admin access through a client-side loading state

### Requirement: R10 Test-user deletion is a two-phase audited local operation

The repository MUST provide a local maintenance script that uses the Supabase Auth Admin API and service-role credentials only in the operator workflow. The default invocation MUST be a dry run: it MUST inventory matched Auth users, print each user's `id`, `email`, and `created_at`, report dependent-row counts for relevant profile-owned tables, write an audit JSON record, and delete nothing. A dry run with zero matches MUST abort with a non-zero process exit status.

Deletion MUST require `--confirm` and either an interactive exact target-count token or explicit non-interactive `--yes`. Before deleting, the script MUST re-read the target set and abort with a non-zero exit status if the target count or target IDs differ from the reviewed set. It MUST abort without deletion when the final target count is zero, when a target is included in `ADMIN_USER_IDS`, or when `SUPABASE_SERVICE_ROLE_KEY` is missing. For each target, it MUST delete the `public.users` profile before calling `supabase.auth.admin.deleteUser(id)`, then verify that both the profile and Auth user are absent before reporting that target as deleted. A failed readback MUST be recorded as a failure and MUST NOT be reported as success.

The audit JSON MUST contain execution metadata, mode, target counts, dependent-row counts, per-target outcome, and deleted Auth IDs, and MUST NOT contain service-role credentials or other secrets. The operation MUST be local-only and MUST NOT add a dashboard delete control, recurring deletion job, migration, or DDL requirement.

#### Scenario: Default invocation performs an auditable dry run

- GIVEN the operator supplies the required local project and service-role configuration
- AND two Auth users match the centralized test-user matcher
- WHEN the operator invokes the script without `--confirm`
- THEN the process lists both users with `id`, `email`, and `created_at`
- AND it reports dependent-row counts for each relevant table and writes an audit JSON file
- AND no profile row or Auth user is deleted
- AND the process exits successfully only if the inventory completes and contains at least one match

#### Scenario: Confirmation and exact count are mandatory

- GIVEN the dry run recorded two target IDs
- WHEN the operator invokes the script with `--confirm` but supplies neither the exact count confirmation nor `--yes`
- THEN the script exits non-zero and deletes nothing
- WHEN the operator supplies `--confirm --yes` and the re-read still contains exactly the same two target IDs
- THEN deletion may begin

#### Scenario: Changed target set or administrator target aborts safely

- GIVEN the reviewed dry run recorded two targets
- AND the re-read finds one additional match or a target listed in `ADMIN_USER_IDS`
- WHEN the operator starts confirmed execution
- THEN the script exits non-zero before deleting any target
- AND the audit JSON records the mismatch or administrator-protection failure without claiming deletion success

#### Scenario: Profile-first deletion verifies both stores

- GIVEN a confirmed target is not an administrator and the target set matches the dry run
- WHEN the script deletes that target
- THEN it deletes the `public.users` profile first
- AND it calls `supabase.auth.admin.deleteUser` only after the profile deletion succeeds
- AND it reads back both `public.users` and Auth absence before marking the Auth ID as deleted in the audit JSON
- AND a profile, Auth, or readback failure produces a non-zero result and a failed outcome rather than a false success
