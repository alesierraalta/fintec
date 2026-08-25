# Exploration: admin-exclude-self-and-user-list

## Resolution

- `skill_resolution: paths-injected` — loaded `/home/alesierraalta/documents/projects/fintec/.claude/skills/supabase-postgres-best-practices/SKILL.md`.
- CodeGraph MCP/CLI was not available to this executor; `.codegraph/config.json` was checked and absent, so the focused filesystem reads below are the fallback. No implementation was performed.

## Findings

### 1. User roster schema and current query

`supabase/schemas/baseline.sql:2798-2817` defines `public.users` with:

- `id uuid` (PK),
- `email text NOT NULL`,
- `name text`,
- `created_at timestamptz`,
- `last_activity_at timestamptz`.

There is no `display_name` column in the baseline. The older schema string in `repositories/supabase/types.ts:341-350` also uses `name`, but omits the later `last_activity_at` field. The current authoritative service query is `lib/admin-stats/service.ts:85`: `read('users', 'id,email,created_at,last_activity_at')`. A roster can therefore add `name` to this single users read and expose only the deliberately selected fields. `last_activity_at` is documented as session-refresh activity at `baseline.sql:2823`.

### 2. Exclusion seam and blast radius

The existing test-user exclusion is at `lib/admin-stats/service.ts:85-95`: users are read once, test emails are mapped into `excluded`, and `includedUsers` is derived at line 95. The derived `includedIds` at lines 96-97 and all downstream family handling use that same exclusion:

- transaction ownership is admitted only when `includedIds.has(userId)` (`service.ts:112-120`);
- accounts filter user ownership (`service.ts:124-139`);
- budgets/goals/subscriptions/feedbacks use `includedRows(..., excluded)` (`service.ts:141-158`);
- monthly usage filters `user_id` (`service.ts:160-174`);
- feature usage filters every source, including AI sessions/messages and usage (`service.ts:175-199`).

Adding `getAdminUserIds()` IDs to the same `excluded` set at the current upstream point covers totals, per-user resource counts, activity/new-user metrics, usage, and feature usage identically. `includedUsers` also naturally controls `users.total`, new-by-day, DAU/WAU/MAU, and peak activity (`service.ts:203-211`). Preserve the existing null/unknown ownership behavior: rows with null/non-string `user_id` are not removed by generic filters, while transactions with unresolved/null ownership are already excluded from transaction metrics.

`lib/payment-orders/admin-utils.ts:39-53` exports `getAdminUserIds()`. It returns `[]` when `ADMIN_USER_IDS` is unset/empty and trims/removes empty comma-separated entries. Adding an empty set is a safe no-op. IDs are compared as strings, matching the service's `String(row.id)` normalization. IDs configured for admins who have no `public.users` row simply have no effect.

### 3. API/DTO shape

There is one endpoint: `app/api/admin/stats/route.ts:9-20`, guarded by `requireAdmin`, calling `getAdminStats(window)` and returning the result through `successResponse`; no separate roster route is needed. Add a typed `users.list` array beside the existing aggregate fields in `lib/admin-stats/types.ts:59-70`, e.g. a small roster item containing `id`, `email`, `name: string | null`, `createdAt`, and `lastActivityAt` (exact naming should follow the project's existing DTO convention).

The service's user query already supplies 70 users in the hosted probe context. A list of roughly that size is modest, but the endpoint is `no-store` (`route.ts:17-20`) and the roster introduces PII where the previous service test explicitly required no `email|name|description` in JSON (`tests/node/lib/admin-stats-service.test.ts:131-167`). Keep the selected payload narrow; do not return arbitrary user columns or resource details in the roster.

### 4. Admin UI conventions

`components/admin/admin-stats-dashboard.tsx:1-7` already fetches the single DTO, renders `DashboardLoading` while data is null (`:38`), and uses `glass-card rounded-3xl p-6` sections throughout (`:91-151`). Existing per-user rendering at `:139-151` uses compact flex rows rather than a shared table component. No admin table/list component or `<table>` convention was found in the focused component search. A roster section can follow the same glass-card pattern, preferably a semantic responsive `<ul>`/rows to avoid introducing a new dependency; show email and optional name, with created/activity dates formatted consistently (ordering and locale remain proposal decisions). The existing loading fallback can be reused unchanged.

### 5. Tests and fixtures

Primary coverage is `tests/node/lib/admin-stats-service.test.ts`:

- fixture users and all family rows are at `:10-54`;
- aggregate/exclusion assertions are at `:131-167`;
- unavailable/fail-closed behavior is at `:170-192`;
- activity edge cases are at `:194-247`.

Extend the fixture with a non-test user whose ID is configured in `ADMIN_USER_IDS`, plus resource/activity rows for that ID, and assert it is absent from `users.total`, activity/new-by-day, resource totals/per-user counts, monthly usage contribution, and feature usage. Save/restore `process.env.ADMIN_USER_IDS` in the service suite so tests remain isolated. Add roster assertions for exact fields, expected inclusion/exclusion, null name/activity handling, and deterministic ordering. Update the old aggregate-only/no-PII assertion because emails/names are now an intentional DTO surface; replace it with assertions that no fields beyond the approved roster shape leak.

`tests/node/api/admin-stats-route.test.ts:10-59` already verifies the single endpoint, guard, window parsing, response and no-store behavior. Its mocked partial DTO is cast as `any`, so no route contract change is inherently required, though a response assertion for `users.list` would document the new shape. UI tests should cover roster rendering and empty-name/date fallbacks if an admin dashboard test harness exists; otherwise service DTO tests are the essential regression suite.

## Open decisions for proposal

1. **Roster columns:** recommended minimum is `id`, `email`, `name` (nullable), `createdAt`, and `lastActivityAt` (nullable). Decide whether the UI needs the ID at all; omitting it reduces exposure while preserving a useful admin roster.
2. **Admin visibility:** should configured admin accounts be hidden from the roster along with metrics, or shown as roster entries marked `Administrador`? The user explicitly requests excluding `ADMIN_USER_IDS` from all metrics, but does not explicitly say to hide them from the list. Recommended default: exclude admins from the metric population but show them in the roster only if the owner wants a complete account roster; document the distinction clearly.
3. **Ordering and display:** choose deterministic ordering (recommended `created_at DESC`, then `id ASC`) and Spanish date formatting/UTC semantics. Decide whether missing `name` falls back to email.
4. **PII posture:** emails and names are a deliberate expansion from aggregate-only admin analytics. Confirm that admin authorization is the sole intended access boundary and avoid caching/logging the roster payload.

## Risks / constraints

- The roster is a PII change: `email` and `name` must be intentionally selected and never included in logs/errors or unrelated metrics.
- The service currently fails closed if the users query fails (`service.ts:84-85`); keep that behavior because both metrics and roster depend on it.
- The service client query currently reads all user rows with no ordering/limit. At the observed 70 users this is acceptable, but proposal should consider server-side ordering and a future pagination/limit strategy if growth is expected.
- The baseline has `name`, not `display_name`; selecting the latter would fail. `last_activity_at` is nullable and should remain nullable in the DTO.
