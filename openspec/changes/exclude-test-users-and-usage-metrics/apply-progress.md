# Apply Progress: Exclude Test Users and Add Feature Usage Metrics

## Status consumed

- `changeName`: `exclude-test-users-and-usage-metrics`
- `artifactStore`: `openspec`
- `applyState`: `ready` at start; native status reported `repo-local` workspace `/home/alesierraalta/documents/projects/fintec-worktrees/admin-usage-metrics` with the same allowed edit root.
- `nextRecommended`: `apply`
- Workload decision consumed from parent: `delivery_strategy=ask-on-risk` resolved to `auto-chain`, `chain_strategy=stacked-to-main`, four PR boundaries. High 400-line risk accepted through the approved chain split.
- CodeGraph fallback: `.codegraph` was absent in this worktree and the upstream CLI reported no index; structural inspection continued with targeted filesystem reads.

## TDD Cycle Evidence

| Cycle | RED evidence | GREEN / triangulate / refactor evidence |
|---|---|---|
| PR1 matcher and exclusion | Added matcher and service exclusion tests. Initial focused Jest run failed because the new matcher module was absent and route DTO assertion failed. | Implemented `lib/admin/test-users.ts` and service ID-boundary filtering. Focused service suite passed; type-check and formatter passed after refactor. |
| PR2 feature reducers and DTO | Added `feature-usage.test.ts` and route envelope assertion; initial run failed because reducer/module and DTO were absent. | Implemented pure reducers, monthly provenance, optional AI reads, DTO types, and service wiring. Node focused suites passed: 22 tests. |
| PR3 dashboard and navigation | Added DOM tests for feature section; initial DOM run failed on Recharts `ResizeObserver` in the test environment. | Added accessible fallback when browser chart measurement is unavailable, feature dashboard, server-derived boolean context, server layout/provider wiring, and sidebar link. DOM focused suites passed: 4 tests. |
| PR4 deletion helpers | Added pure helper tests before implementation. | Implemented matcher delegation, pagination normalization, dependency grouping, reconciliation, confirmation, atomic audit writing, profile-first deletion/readback orchestration, and ignored audit path. Node helper suite passed: 3 tests. No live script invocation was run. |

## Completed implementation work

Completed implementation task IDs: 1.1–1.5, 2.1–2.6, 3.1–3.7, 4.1–4.4, 5.1–5.6, 6.1–6.6, and 7.1–7.6.

Persisted task updates: implementation rows 1.1–7.6 were converted to and marked `- [x]`; local-only rows 8.1–8.4 remain `- [ ]`. Parent-owned checkbox rows were preserved byte-for-byte and remain unchecked.

## Files changed

- Matcher and analytics: `lib/admin/test-users.ts`, `lib/admin-stats/feature-usage.ts`, `lib/admin-stats/service.ts`, `lib/admin-stats/types.ts`, `lib/admin/guard.ts`.
- UI/navigation: `components/admin/admin-feature-usage.tsx`, `components/admin/admin-stats-dashboard.tsx`, `contexts/admin-access-context.tsx`, `app/layout.tsx`, `app/route-aware-providers.tsx`, `components/layout/sidebar.tsx`.
- Maintenance: `scripts/admin/delete-test-users.ts`, `.gitignore`.
- Tests: service, feature reducer, route DTO, feature UI, sidebar, and deletion helper suites.

## Verification commands

Passed:

- `npm run type-check`
- `npm run lint` (0 errors; repository reports existing 347 warnings)
- `npx jest --selectProjects node --runInBand --runTestsByPath tests/node/lib/admin-stats-service.test.ts tests/node/lib/feature-usage.test.ts tests/node/api/admin-stats-route.test.ts tests/node/scripts/delete-test-users.test.ts` (4 suites, 22 tests)
- `npx jest --selectProjects dom --runInBand --runTestsByPath tests/components/admin-feature-usage.test.tsx tests/components/admin-sidebar.test.tsx` (2 suites, 4 tests)
- Focused `npx prettier --check` for all changed TypeScript/TSX files (passed)

The first final formatting command included `.gitignore`, which Prettier correctly rejected because no parser is inferred; it was rerun successfully excluding `.gitignore`. The initial DOM RED failure was the test environment's missing `ResizeObserver`; no test was weakened.

## Design deviations

- The feature chart provides an accessible text fallback when `ResizeObserver` is unavailable, while using the requested vertical Recharts bar chart in browsers.
- The local CLI requires `DELETE_TEST_USERS_COUNT` for a non-`--yes` non-interactive exact-count token; it never runs automatically and no database invocation was performed.
- No migrations, DDL, chart dependency, dashboard deletion control, mobile navigation change, or environment-file change was introduced.

## Remaining work and deferred actions

Local-only hosted validation was intentionally not run per execution instructions. These exact unchecked implementation lines remain in `tasks.md`:

- `8.1. [LOCAL-ONLY][RED] Prepare a local environment for scripts/admin/delete-test-users.ts ...`
- `8.2. [LOCAL-ONLY][GREEN] Run tsx scripts/admin/delete-test-users.ts without --confirm against the intended hosted database ...`
- `8.3. [LOCAL-ONLY][TRIANGULATE] Review the local inventory against the intended operator approval ...`
- `8.4. [LOCAL-ONLY][REFACTOR] Remove or retain the ignored local audit ...`

Parent-owned lifecycle rows remain unchecked and deferred:

- Start/reuse bounded review at each proposed PR boundary.
- Decide pending chain strategy and whether to apply the next PR after receipt/local-only status.

No commit, push, PR, deletion run, or delivery-gate validation was performed.

## Next recommendation

`parent-lifecycle` — parent should review the four logical PR boundaries, decide how to handle the intentionally skipped hosted validation, and own all review/receipt/delivery actions.
