# Design: Exclude Admins from Metrics and Add User Roster

## Resolution

- `skill_resolution: paths-injected` — loaded the injected architecture and Next.js pattern skills.
- CodeGraph was unavailable to this executor and the worktree has no `.codegraph/config.json`; the focused source reads were used as the fallback. No implementation is included in this artifact.

## Decisions

1. Keep the existing single users read and exclusion seam in `lib/admin-stats/service.ts`.
2. Maintain two deliberate populations after that read:
   - `metricsSet`: users excluding both test users and configured admins.
   - `rosterList`: users excluding test users only; configured admins remain and are marked.
3. Reuse `getAdminUserIds()` without changing its parsing or empty-configuration behavior.
4. Return a narrow, explicit roster DTO. No second endpoint, database migration, pagination, or unrelated user fields are introduced.
5. Sort the roster in the service by `createdAt` descending, with a deterministic `id` ascending tie-breaker; null creation dates sort after dated users.

## Module map and file changes

### `lib/admin-stats/service.ts`

Extend the current test-user exclusion seam rather than adding a separate users query or metric-specific exclusions:

- Import `getAdminUserIds` from `lib/payment-orders/admin-utils`.
- Change the existing users select to one fetch of `id,name,email,created_at,last_activity_at`.
- Build `testExcludedIds` by applying `isTestUserEmail` to the fetched email values.
- Build `adminIds` from `getAdminUserIds()` and compose `excludedIds` as the union of `testExcludedIds` and `adminIds`.
- Derive `metricsSet`/`metricsUsers` by removing every ID in `excludedIds`; derive `metricsIds` from that set.
- Keep all existing metric derivations on this effective excluded population: users totals and activity, transaction ownership, account/resource groupings, monthly usage, and every feature-usage source. The existing handling of null/unknown ownership and unavailable optional families remains unchanged.
- Derive the roster independently from the fetched, test-filtered-only rows. Map each row to `UserRosterEntry`, normalize the existing timestamp field names to camelCase, and set `isAdmin` from `adminIds.has(String(row.id))`. Do not derive the roster from `metricsUsers`, because that would incorrectly hide administrators.
- Sort the mapped list newest-first by `createdAt`, with null values last and `id` ascending for equal or otherwise indeterminate timestamps.
- Return the list at `users.list` alongside the existing aggregate user fields.

This preserves fail-closed behavior: failure of the core users read still rejects the stats request because both populations depend on that read. Optional resource-family failures continue to use the existing unavailable results.

### `lib/admin-stats/types.ts`

Add and export the stable roster contract:

```ts
type UserRosterEntry = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string | null;
  lastActivityAt: string | null;
  isAdmin: boolean;
};
```

Add `list: UserRosterEntry[]` to `AdminStats.users`. The DTO exposes no source-column names and no fields beyond `id`, `name`, `email`, `createdAt`, `lastActivityAt`, and `isAdmin`. Nullable source values remain nullable; the UI, not the service contract, chooses the display placeholder.

### `components/admin/user-roster.tsx` (new)

Create a presentational `UserRoster` component accepting `UserRosterEntry[]`. It will:

- Render a `glass-card rounded-3xl p-6` section with a semantic, horizontally scrollable table.
- Render the four requested columns: name, email, created, and last activity; date values use the existing Spanish date-display convention and missing/invalid values render `-`.
- Render missing names and emails as `-` without substituting or exposing other fields.
- Render the literal `admin` badge only when `isAdmin` is true.
- Render an explicit empty-state message in the card instead of a header-only or empty table when the list is empty.
- Remain presentational and non-fetching; the parent already owns client-side loading and fetch state.

### `components/admin/admin-stats-dashboard.tsx`

Import `UserRoster` and render it immediately after `AdminFeatureUsage`, passing `data.users.list`. The existing `if (!data) return <DashboardLoading />` remains unchanged, so the roster is covered by the current loading state while the single stats request is pending. Error handling also remains at the existing dashboard boundary.

## Data flow

```text
one users read
  ├─ testExcludedIds = users whose email matches isTestUserEmail
  ├─ adminIds = getAdminUserIds()              (unchanged parser)
  ├─ excludedIds = testExcludedIds ∪ adminIds
  │    └─ metricsSet = users - excludedIds
  │         └─ all existing metrics and metric user-count groupings
  └─ rosterList = users - testExcludedIds
       └─ map approved fields + isAdmin = adminIds.has(user.id)
          sort createdAt DESC, id ASC tie-breaker
```

The two derivations are intentionally not interchangeable: metrics use the admin+test filtered set, while the roster uses the test-filtered-only set. Thus an administrator contributes to no metric, including `users.total`, activity/new-user buckets, resource totals, `resources.perUserCounts`, usage, or feature usage, but remains visible in `users.list` with `isAdmin: true`. An unset or empty `ADMIN_USER_IDS` produces an empty admin set and is a no-op; test-user exclusion still applies.

All metric source rows continue to be filtered through the shared `excludedIds` seam before aggregation. The one users fetch is still the authoritative source for both the metric population and roster; there is no N+1 lookup or additional roster endpoint.

## Edge policy and payload

- Missing `email` or `name` is represented as nullable in the DTO and rendered as `-`. Missing `createdAt` and `lastActivityAt` are also rendered as `-`; no fabricated timestamps are generated.
- An empty non-test population returns `users.list: []` and renders an explicit empty state.
- `getAdminUserIds()` retains its current trimming, empty-entry filtering, and unset/empty behavior. ID comparisons continue to use the service's string normalization.
- The roster is intentionally unpaginated in v1. The observed roughly 70-user payload is trivial for this admin-only, `no-store` response; pagination or virtualization is a future scale refinement, not part of this change.
- Names and email addresses are intentionally limited to the approved roster fields and are not logged or copied into aggregate metrics.

## Test mapping

### R11 — metric self-exclusion

Extend `tests/node/lib/admin-stats-service.test.ts` with an administrator fixture user, activity, resource, usage, and feature-usage records, and isolate/restore `process.env.ADMIN_USER_IDS` around the service suite. Assert that the configured admin is absent from:

- `users.total`, `newByDay`, DAU/WAU/MAU, and peak activity;
- resource totals and `resources.perUserCounts`;
- monthly usage and feature-usage contributions.

Assert the comparable regular user remains counted. Add a composition case proving test-user and admin exclusions both apply, plus unset/empty `ADMIN_USER_IDS` cases proving admin exclusion is a no-op while test exclusion remains. Preserve the users-query fail-closed test and optional-family unavailable behavior.

### R12 — roster contract and presentation

In the service suite, assert that the configured admin is present in `users.list` with `isAdmin: true`, regular users are present with `isAdmin: false`, test users are absent, and list order is newest `createdAt` first with the deterministic tie-breaker. Assert nullable name/activity (and missing email fixture coverage) remain null and that each row contains only the approved fields. Replace the prior aggregate-only/no-PII JSON assertion with an exact approved-roster-key assertion.

Add focused DOM coverage for `UserRoster` (and the dashboard wiring where the existing harness supports it):

- the four table columns and representative row values render;
- an administrator row renders the `admin` badge;
- missing name/email/date values render `-`;
- an empty list renders the explicit empty-state message and not an empty table.

The existing admin page authorization tests and admin stats route tests remain applicable because the endpoint and authorization contract do not change; a route response assertion may document the new `users.list` field without introducing a second delivery surface.

## Rollout and rollback

No special rollout is required. `ADMIN_USER_IDS` must be configured in deployments that want administrator self-exclusion; unset/empty configuration preserves the prior metric population while still supplying the non-test roster. The change is reversible by reverting the service/type/component/test changes; no data migration or backfill is involved.
