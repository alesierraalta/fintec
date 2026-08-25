# Apply Progress: admin-exclude-self-and-user-list

## Structured status consumed

- `schemaName`: `gentle-ai.sdd-status`
- `changeName`: `admin-exclude-self-and-user-list`
- `artifactStore`: `openspec` (authoritative)
- `applyState`: `ready` at start; implementation-owned tasks are now complete
- `actionContext`: `repo-local`; workspace root and allowed edit root are `/home/alesierraalta/documents/projects/fintec-worktrees/admin-self-userlist`
- `nextRecommended`: `parent-lifecycle` (parent review/lifecycle actions remain)
- CodeGraph MCP was unavailable; focused filesystem reads were used after confirming the worktree `.codegraph` state.

## Completed implementation

### PR1 boundary: service dual-set derivation, DTO types, and service suite

- Added `UserRosterEntry` and `users.list` to the admin stats DTO.
- Extended the single users query with the approved roster source fields.
- Composed test-user and configured-admin IDs for metrics while deriving the roster from test-filtered users only.
- Added deterministic newest-first roster ordering, nullable field preservation, and `isAdmin` marking.
- Expanded the service fixture and assertions for metric exclusion, roster inclusion, ordering, exact keys, nullable values, empty admin configuration, fail-closed users, and unavailable optional families.

### PR2 boundary: roster component, dashboard wiring, and component suite

- Added the glass-card responsive semantic table `UserRoster` with four requested columns, Spanish date formatting, safe `-` placeholders, admin badge, and explicit empty state.
- Wired `UserRoster` immediately after `AdminFeatureUsage`; existing single fetch and `DashboardLoading` behavior remain unchanged.
- Added DOM coverage for populated/null/empty roster rendering and dashboard loading/wiring.

## Persisted task updates

- Marked implementation-owned tasks `1.1` through `1.10` and `2.1` through `2.9` as `[x]` in `tasks.md`.
- Parent-owned lifecycle tasks remain unchecked and unchanged.

## TDD Cycle Evidence

| Cycle | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| PR1 service | Added mixed admin/test/regular fixture and new service assertions; initial run failed because `users.list` was undefined and configured admin was not excluded. The first worktree run also exposed missing worktree dependencies. | Implemented dual-set derivation and DTO contract; focused service suite passed. | Service + route focused suites: `18 passed`; type-check passed; inspected that metrics use `excluded` while roster uses `testExcludedIds`. | Prettier formatted service/types/service suite; final focused rerun passed. |
| PR2 UI | Added roster DOM tests before component implementation; initial component test was expected to fail before the component existed. | Implemented `UserRoster`, dashboard wiring, and dashboard harness test. | DOM focused suites: `3 passed`; loading, table, badge, placeholders, empty state, and wiring covered. | Prettier formatted component/tests; final DOM suite passed. |

## Verification evidence

- `./node_modules/.bin/jest --selectProjects node --runTestsByPath tests/node/lib/admin-stats-service.test.ts tests/node/api/admin-stats-route.test.ts --runInBand` — PASS, 18 tests.
- `./node_modules/.bin/jest --selectProjects dom --runTestsByPath tests/components/admin-user-roster.test.tsx tests/components/admin-stats-dashboard.test.tsx --runInBand` — PASS, 3 tests.
- `npm run type-check` — PASS.
- `npm run lint` — PASS with 347 pre-existing warnings and 0 errors.
- Prettier check for all changed implementation/test files — PASS.
- No database access, `.env` changes, commits, pushes, or PR creation.
- Initial unscoped Jest invocation from the repository configuration ran the full node project; focused `--runTestsByPath` invocations were used for final evidence.

## Files changed

- `lib/admin-stats/service.ts`
- `lib/admin-stats/types.ts`
- `tests/node/lib/admin-stats-service.test.ts`
- `components/admin/user-roster.tsx`
- `components/admin/admin-stats-dashboard.tsx`
- `tests/components/admin-user-roster.test.tsx`
- `tests/components/admin-stats-dashboard.test.tsx`
- `openspec/changes/admin-exclude-self-and-user-list/tasks.md`
- `openspec/changes/admin-exclude-self-and-user-list/apply-progress.md`

## Remaining tasks / deferred parent actions

- [ ] Start or reuse the bounded review for PR 1 after its focused node, type-check, and formatting gates pass; keep the review boundary limited to service/type/fixture changes. <!-- sdd-owner: parent -->
- [ ] Start or reuse the bounded review for PR 2 after its focused DOM, type-check, lint, and formatting gates pass; keep the review boundary limited to roster/dashboard changes. <!-- sdd-owner: parent -->
- [ ] Decide the pending chain strategy before apply because the forecast exceeds the 400-line review budget under `ask-on-risk`. <!-- sdd-owner: parent -->

## Delivery boundary

Both requested stacked slices were implemented on this branch without commits. Parent owns bounded review, receipts, validation/delivery gates, and the final `parent-lifecycle` transition.
