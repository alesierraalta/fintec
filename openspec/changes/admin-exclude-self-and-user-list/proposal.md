# Proposal: Exclude Admins from Metrics and Add User Roster

## Why

Admin accounts currently contribute to admin analytics, so the owner’s own activity can distort totals, activity metrics, usage metrics, and resource counts. The dashboard also lacks a direct roster for reviewing the users represented by the product.

This change will separate the metric population from the account roster: test users and configured admins will be excluded from every metric, while the dashboard will show all non-test users, including admins, with an explicit admin badge.

## What

### Metric exclusions

- Reuse `getAdminUserIds()` from `lib/payment-orders/admin-utils.ts` alongside the existing test-user exclusion seam in `lib/admin-stats/service.ts`.
- Add configured `ADMIN_USER_IDS` members to the shared excluded-user set before deriving included users and IDs.
- Apply that shared population to every existing metric: totals, activity/new-user metrics, resource counts, monthly usage, and feature usage.
- An empty or unset `ADMIN_USER_IDS` is a no-op, preserving current behavior when no admins are configured.

### User roster DTO

- Add `users.list[]` to the admin stats DTO.
- Return only the approved roster fields: `name`, `email`, `createdAt`, `lastActivityAt`, and an admin marker used by the UI. Nullable source fields remain nullable.
- Include all non-test users in the list; configured admins remain visible in the roster even though they are excluded from metrics.
- Order the roster by `created_at DESC` with a deterministic tie-breaker.

### Dashboard

- Add a new glass-card table section to `admin-stats-dashboard` using the existing dashboard styling and rendering patterns.
- Show the columns `name`, `email`, `createdAt`, and `lastActivityAt`.
- Mark configured admins with an `admin` badge.
- Reuse the existing `DashboardLoading` state so the new section is covered by the current dashboard loading experience.

### Tests

- Extend service fixtures and assertions to prove configured admins are absent from every metric while remaining in the roster.
- Cover test-user exclusion, roster inclusion, approved DTO fields, ordering, nullable values, and admin marking.
- Update the prior aggregate-only/no-PII expectation to assert the intentional, narrow roster shape instead.
- Add or extend dashboard coverage where the existing UI test harness supports roster rendering.

## Impact estimate

Small. Expected impact is limited to the admin stats service and admin-user utility usage in two library files, the stats types, the admin dashboard component, and focused service/API/UI tests. The existing admin stats endpoint remains the delivery surface; no new endpoint is required.

The change intentionally expands the admin-only DTO from aggregates to a narrow user roster containing names and email addresses. This PII posture change is an explicit owner decision, bounded by admin authorization and the selected fields.

## Risks

- **PII exposure:** Names and emails become available in the admin stats response and dashboard. This is an explicit owner-approved change; keep the roster fields narrow and avoid logging or exposing unrelated user data.
- **Configuration dependency:** If `ADMIN_USER_IDS` is empty or unset, no admin IDs are excluded and metrics include everyone again. Deployment configuration must set the variable for self-exclusion to take effect.
- **Population distinction:** Admins are excluded from metrics but included in the non-test roster, so dashboard totals will not necessarily equal the number of roster rows. The admin badge and separate semantics should make this distinction clear.
- **Growth:** The initial roster is intentionally unpaginated for the current scale. Larger populations may require pagination or another performance refinement later.
- **Unavailable users data:** The existing fail-closed behavior for the users query must remain, since both metrics and the roster depend on that read.

## Rollback

Trivial revert of the change. Reverting restores the existing aggregate-only DTO and dashboard and removes admin IDs from the shared metric exclusion set. No database migration, endpoint migration, or data backfill is required.

## Success criteria

- Every existing admin metric excludes all test users and every user ID returned by `getAdminUserIds()`.
- With an unset or empty `ADMIN_USER_IDS`, admin exclusion is a no-op and this behavior is covered by tests.
- `users.list[]` contains every non-test user, including configured admins, ordered by `created_at DESC`.
- The roster exposes only the approved fields, renders the required four columns, and marks admins with an `admin` badge.
- The roster handles nullable names and activity timestamps without breaking the dashboard.
- `DashboardLoading` covers the roster while the stats request is pending.
- Existing admin authorization, endpoint behavior, and fail-closed behavior remain unchanged.

## NON-goals

- No pagination in v1 given the current user scale.
- No roster search or filtering.
- No RLS changes.
- No new endpoint.
- No changes to the meaning of the existing metrics beyond excluding test users and configured admins.
- No broader user-profile fields or unrelated PII in the roster.
