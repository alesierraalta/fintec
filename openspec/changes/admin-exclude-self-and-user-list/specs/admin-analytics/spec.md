# Delta for Admin Analytics

## ADDED Requirements

### Requirement: R11 Admin self-exclusion from metrics

The admin stats service MUST build one effective excluded-user population by composing the configured administrator IDs from `ADMIN_USER_IDS` with the existing test-user email exclusion. Every existing metric MUST use that population, including `users.total`, `users.newByDay`, DAU, WAU, MAU, peak activity, resource totals, resource `perUserCounts`, usage, and `featureUsage`. A user whose ID matches `ADMIN_USER_IDS` MUST contribute to none of those metrics and MUST NOT appear in metric user-count groupings. An unset or empty `ADMIN_USER_IDS` MUST be a no-op for admin exclusion, so configured-admin matching removes no users in that case. This metric exclusion MUST NOT remove administrators from the user roster defined by R12.

#### Scenario: Configured administrator is excluded from every metric but remains roster-visible

- GIVEN an administrator ID is present in `ADMIN_USER_IDS`
- AND that administrator has a user row, activity, resources, usage, and feature-usage records
- AND a non-test, non-administrator user has comparable records
- WHEN admin stats are calculated
- THEN the administrator contributes to none of `users.total`, `newByDay`, DAU, WAU, MAU, peak activity, resource totals, resource `perUserCounts`, usage, or `featureUsage`
- AND the administrator does not appear in `resources.perUserCounts`
- AND the administrator remains in `users.list` with `isAdmin: true`

#### Scenario: Test-user and administrator exclusions compose at the shared population boundary

- GIVEN one user matches the configured test-user email exclusion
- AND a different user ID matches `ADMIN_USER_IDS`
- AND a third user matches neither exclusion
- WHEN admin stats are calculated
- THEN both excluded users are absent from every metric listed in this requirement
- AND only the third user contributes to the metric population and metric user-count groupings
- AND neither excluded user is counted indirectly through resource ownership, usage, or feature-usage records

#### Scenario: Empty or unset administrator configuration is a no-op

- GIVEN `ADMIN_USER_IDS` is unset or empty
- AND a user has an administrator role in the deployment context but no configured administrator ID matches that user
- WHEN admin stats are calculated
- THEN no user is excluded by the administrator rule
- AND the existing test-user exclusion remains the only exclusion applied
- AND the otherwise eligible user contributes normally to the metrics

### Requirement: R12 Admin users roster

The admin stats DTO MUST expose `users.list`, containing every non-test user, including users whose IDs match `ADMIN_USER_IDS`. Each roster item MUST expose only the approved fields: `name`, `email`, `createdAt`, `lastActivityAt`, and `isAdmin`; it MAY additionally expose `id`. Nullable source values MUST remain nullable. `isAdmin` MUST be `true` for configured administrator IDs and `false` for other roster users. The list MUST be ordered by `createdAt` descending with a deterministic tie-breaker. The admin dashboard MUST render the list as a table section with `name`, `email`, `createdAt`, and `lastActivityAt` columns, an `admin` badge on rows where `isAdmin` is true, and an explicit empty state when the list has no entries.

#### Scenario: Roster includes all non-test users and marks administrators

- GIVEN the users table contains a configured administrator, a regular non-test user, and a test user
- WHEN the admin stats DTO is produced
- THEN `users.list` contains the administrator and regular user but not the test user
- AND the administrator row includes `isAdmin: true`
- AND the regular user row includes `isAdmin: false`
- AND each row contains only the approved roster fields, with `id` included only as the optional identifier
- AND the dashboard renders the administrator row with an `admin` badge

#### Scenario: Roster ordering is newest first and deterministic

- GIVEN multiple non-test users have different `createdAt` values
- AND at least two users share the same `createdAt` value
- WHEN `users.list` is produced
- THEN rows are ordered from newest `createdAt` to oldest `createdAt`
- AND rows with equal `createdAt` values use the same deterministic tie-breaker on every response

#### Scenario: Nullable roster values and empty state are represented honestly

- GIVEN a non-test user has a null `name` or `lastActivityAt`
- WHEN the DTO and dashboard are rendered
- THEN the corresponding roster field remains null in the DTO
- AND the table renders a safe empty-value presentation without failing
- WHEN no non-test users exist
- THEN `users.list` is an empty array
- AND the dashboard renders an explicit empty-state message instead of an empty or misleading table
