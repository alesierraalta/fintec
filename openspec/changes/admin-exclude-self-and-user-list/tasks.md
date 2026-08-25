# Implementation Tasks: Exclude Admins from Metrics and Add User Roster

Strict TDD applies to both implementation groups: **RED → GREEN → TRIANGULATE → REFACTOR**. Group 1 is the first PR boundary; Group 2 depends on its DTO contract and is the second PR boundary. All verification uses the repository Jest node/DOM projects plus type-check, lint, and formatting checks.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 430–520 total: PR 1 ~280–340; PR 2 ~150–180 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → service dual-set derivation, types, and service suite; PR 2 → roster component, dashboard wiring, and component suite |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

## 1. Service dual-set derivation, DTO types, and service suite

**PR boundary:** PR 1. **Committed paths:** `lib/admin-stats/service.ts`, `lib/admin-stats/types.ts`, `tests/node/lib/admin-stats-service.test.ts`. Start with the service RED fixtures; finish when all metric, roster, DTO-key, ordering, nullable-value, and configuration cases pass. Verify with the focused node suite and type-check. Rollback is limited to these service/type/test changes and leaves the endpoint unchanged.

### RED

- [x] 1.1. Add a failing mixed fixture in `tests/node/lib/admin-stats-service.test.ts` containing a test user, a configured admin, a regular user, nullable roster fields, equal `created_at` values, and records for accounts/transactions, every resource family, activity, monthly usage, and feature usage; isolate and restore `process.env.ADMIN_USER_IDS` in the service suite. <!-- sdd-owner: implementation -->

- [x] 1.2. Add failing assertions in `tests/node/lib/admin-stats-service.test.ts` proving the configured admin and test user are absent from `users.total`, `newByDay`, DAU/WAU/MAU, peak activity, resource totals, `resources.perUserCounts`, monthly usage, and `featureUsage`, while the regular user remains counted. <!-- sdd-owner: implementation -->

- [x] 1.3. Add failing roster assertions in `tests/node/lib/admin-stats-service.test.ts` for `users.list`: admins remain present with `isAdmin: true`, regular users have `isAdmin: false`, test users are absent, rows are newest-first with deterministic `id` ascending tie-breaking, nullable `name`/`email`/timestamps remain null, and each row contains only the approved DTO keys. Replace the prior aggregate-only/no-PII assertion with this narrow roster-key assertion. <!-- sdd-owner: implementation -->

- [x] 1.4. Add failing configuration cases in `tests/node/lib/admin-stats-service.test.ts` for unset and empty `ADMIN_USER_IDS`, proving admin exclusion is a no-op while test-user exclusion remains; retain the users-query fail-closed and optional-family-unavailable cases. <!-- sdd-owner: implementation -->

### GREEN

- [x] 1.5. Add and export `UserRosterEntry` in `lib/admin-stats/types.ts` with only `id`, `name`, `email`, `createdAt`, `lastActivityAt`, and `isAdmin`, preserving nullable source values; add `list: UserRosterEntry[]` to `AdminStats.users`. <!-- sdd-owner: implementation -->

- [x] 1.6. Update `lib/admin-stats/service.ts` to import `getAdminUserIds` from `lib/payment-orders/admin-utils`, select `id,name,email,created_at,last_activity_at` in the single users read, build `testExcludedIds` and configured `adminIds`, and compose the effective excluded set for all existing metric derivations. <!-- sdd-owner: implementation -->

- [x] 1.7. In `lib/admin-stats/service.ts`, derive the roster independently from the test-filtered users, map the approved camelCase DTO fields, set `isAdmin` from `adminIds.has(String(row.id))`, sort by `createdAt` descending with nulls last and `id` ascending ties, and return it at `users.list` without changing `app/api/admin/stats/route.ts`. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] 1.8. Run `npx jest --selectProjects node tests/node/lib/admin-stats-service.test.ts --runInBand` and verify the configured admin contributes to none of the listed metric families or user-count groupings but remains in the roster; verify unset/empty configuration, test-user composition, ordering, nullable values, exact keys, fail-closed users, and optional-family degradation. <!-- sdd-owner: implementation -->

- [x] 1.9. Run `npm run type-check` and inspect `lib/admin-stats/service.ts` to confirm every metric source uses the metrics population while `users.list` uses the separate roster population, with no second users query or PII logging. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] 1.10. Refactor `lib/admin-stats/service.ts` to keep the two population derivations named and adjacent at the shared users boundary, preserve existing null/unknown ownership behavior and unavailable-family results, and run `npx prettier --check lib/admin-stats/service.ts lib/admin-stats/types.ts tests/node/lib/admin-stats-service.test.ts`. <!-- sdd-owner: implementation -->

## 2. User-roster component, dashboard wiring, and component suite

**PR boundary:** PR 2, after PR 1. **Committed paths:** `components/admin/user-roster.tsx`, `components/admin/admin-stats-dashboard.tsx`, `tests/components/admin-user-roster.test.tsx`, and the existing dashboard test harness under `tests/components/` if wiring coverage is supported. Start with DOM RED cases against the `UserRosterEntry` contract; finish when the table, badge, null placeholders, empty state, loading path, and dashboard placement are verified. Rollback removes the roster section and its focused tests without affecting the stats endpoint.

### RED

- [x] 2.1. Create failing DOM tests in `tests/components/admin-user-roster.test.tsx` for a populated roster: the glass-card section exposes four columns for `name`, `email`, `createdAt`, and `lastActivityAt`, representative row values render, and only an `isAdmin: true` row renders the literal `admin` badge. <!-- sdd-owner: implementation -->

- [x] 2.2. Extend `tests/components/admin-user-roster.test.tsx` with failing cases for null name/email/date values rendering `-`, an empty `users.list` rendering an explicit empty-state message instead of an empty table, and a non-admin row not rendering an admin badge. <!-- sdd-owner: implementation -->

- [x] 2.3. Add a failing dashboard wiring assertion in the existing dashboard component test harness under `tests/components/` (or create `tests/components/admin-stats-dashboard.test.tsx` when no harness exists) that a mocked successful stats response renders `UserRoster` after `AdminFeatureUsage` and that the existing `DashboardLoading` path remains used before data arrives. <!-- sdd-owner: implementation -->

### GREEN

- [x] 2.4. Create presentational `components/admin/user-roster.tsx` accepting `UserRosterEntry[]`; render the `glass-card rounded-3xl p-6` section with a semantic horizontally scrollable table, the four requested columns, existing Spanish date-display conventions, `-` for missing/invalid values, and the explicit empty state. <!-- sdd-owner: implementation -->

- [x] 2.5. In `components/admin/user-roster.tsx`, render the literal `admin` badge only for `isAdmin` rows and use stable row keys from the approved identifier without fetching, logging, or exposing fields outside the DTO. <!-- sdd-owner: implementation -->

- [x] 2.6. Update `components/admin/admin-stats-dashboard.tsx` to import `UserRoster` and render it immediately after `AdminFeatureUsage` with `data.users.list`; leave the single fetch, error boundary, and `if (!data) return <DashboardLoading />` behavior unchanged. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] 2.7. Run `npx jest --selectProjects dom tests/components/admin-user-roster.test.tsx tests/components/admin-stats-dashboard.test.tsx --runInBand` using the repository's available dashboard test path, and verify populated, admin, non-admin, nullable, and empty-state behavior plus dashboard loading/wiring coverage. <!-- sdd-owner: implementation -->

- [x] 2.8. Run `npm run type-check`, `npm run lint`, and `npm run format:check`; confirm the dashboard has no second endpoint, no client-side roster fetch, and no change to admin authorization or error handling. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] 2.9. Refactor `components/admin/user-roster.tsx` to keep presentation separate from data loading, reuse the dashboard glass-card/date conventions, preserve responsive table accessibility, and run `npx prettier --check components/admin/user-roster.tsx components/admin/admin-stats-dashboard.tsx tests/components/admin-user-roster.test.tsx tests/components/admin-stats-dashboard.test.tsx`. <!-- sdd-owner: implementation -->

## Parent review and lifecycle actions

- [ ] Start or reuse the bounded review for PR 1 after its focused node, type-check, and formatting gates pass; keep the review boundary limited to service/type/fixture changes. <!-- sdd-owner: parent -->

- [ ] Start or reuse the bounded review for PR 2 after its focused DOM, type-check, lint, and formatting gates pass; keep the review boundary limited to roster/dashboard changes. <!-- sdd-owner: parent -->

- [ ] Decide the pending chain strategy before apply because the forecast exceeds the 400-line review budget under `ask-on-risk`. <!-- sdd-owner: parent -->

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 430–520 total; PR 1 ~280–340; PR 2 ~150–180 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → service dual-set derivation, types, and service suite; PR 2 → user-roster component, dashboard wiring, and component suite |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High