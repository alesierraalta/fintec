# Verification report: exclude-test-users-and-usage-metrics

## Verdict

| Requirement | Verdict | Basis |
|---|---|---|
| R7 | PASS | Matcher, configuration fallback, aggregate service gates, and focused service tests passed; one full transaction-attribution scenario remains local/manual-only. |
| R8 | PASS | Feature reducers, service DTO, API DTO, and dashboard tests passed; hosted data-source behavior was not exercised beyond the deletion read path. |
| R9 | PASS | Server-derived admin and non-admin sidebar rendering tests passed; unauthenticated hydration is manual-only. |
| R10 | PASS | Hosted dry-run completed successfully with no `--confirm`; helper tests and the audited dry-run path passed. Confirmed deletion was intentionally not executed. |

## Commands and results

| Command | Result |
|---|---|
| `npx jest --runInBand --selectProjects node --passWithNoTests tests/node/api/admin-stats-route.test.ts tests/node/lib/admin-stats-service.test.ts tests/node/lib/feature-usage.test.ts tests/node/scripts/delete-test-users.test.ts` | PASS — 4 suites, 22 tests |
| `npx jest --runInBand --passWithNoTests tests/components/admin-feature-usage.test.tsx tests/components/admin-sidebar.test.tsx` | PASS — 2 suites, 4 tests |
| `npm run type-check` | PASS — `tsc --noEmit` completed without errors |
| `npm run lint 2>&1 \| tail -n 20` | PASS — 0 errors, 347 warnings, 803 files |
| `DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/admin/delete-test-users.ts --audit=openspec/changes/exclude-test-users-and-usage-metrics/verify-report.md` | PASS — exit 0, no `--confirm` |

The focused suites were selected from the modified/untracked files shown by `git status`: `admin-stats-route`, `admin-stats-service`, `feature-usage`, `delete-test-users`, `admin-feature-usage`, and `admin-sidebar` tests.

## R7–R10 traceability

| Requirement/scenario | Automated proof | Coverage status |
|---|---|---|
| R7 default matcher and case-insensitive safe defaults | `tests/node/lib/admin-stats-service.test.ts` — matcher tests | Automated |
| R7 valid override replaces defaults and supports only `*`/`%` semantics | `tests/node/lib/admin-stats-service.test.ts` — override test | Automated |
| R7 malformed override falls back safely and warns without echoing value | `tests/node/lib/admin-stats-service.test.ts` — malformed configuration test | Automated |
| R7 exclusion through account ownership and all aggregate reducers | `tests/node/lib/admin-stats-service.test.ts` — aggregate/exclusion and nullable ownership tests | Automated for covered fixtures; a dedicated excluded-owner transaction fixture is local/manual-only |
| R8 selected-window timestamp-backed feature counts | `tests/node/lib/feature-usage.test.ts`, `tests/node/lib/admin-stats-service.test.ts` | Automated |
| R8 monthly counters remain month-based and provenance-labeled | `tests/node/lib/feature-usage.test.ts` | Automated |
| R8 unavailable sources omit fabricated zeroes | `tests/node/lib/feature-usage.test.ts`, `tests/node/lib/admin-stats-service.test.ts`, `tests/components/admin-feature-usage.test.tsx` | Automated |
| R8 empty-state DTO/dashboard rendering | Reducer/API/component coverage is present; a complete all-source-empty API fixture is not present | Manual/local-only gap; reason: no dedicated aggregate fixture for every supported source being empty |
| R9 admin receives `/admin` link from server-derived access | `tests/components/admin-sidebar.test.tsx` | Automated |
| R9 non-admin omits link | `tests/components/admin-sidebar.test.tsx` | Automated |
| R9 unauthenticated navigation has no hydration flash | No dedicated test | Manual/local-only gap; reason: requires rendering the server layout through an unauthenticated session and hydration |
| R10 dry-run inventory, masked listing, audit, and no deletion | Hosted dry-run below; `tests/node/scripts/delete-test-users.test.ts` helper coverage | Automated/local verification |
| R10 exact confirmation and target-set reconciliation | `tests/node/scripts/delete-test-users.test.ts` | Automated helper-level; full hosted confirmation was intentionally not run |
| R10 administrator protection, profile-first deletion, and readback failure handling | Helper implementation is present; no destructive integration test was run | Manual/local-only gap; reason: destructive hosted execution is out of scope |

## Hosted dry-run outcome

`.env.local` was present and the script completed against the configured hosted Supabase service. The invocation supplied an explicit audit path so this report remained the only verification artifact; the audit path was overwritten with this report after the dry-run evidence was captured.

- Mode: dry run (no `--confirm` and no `--yes`)
- Matched Auth users: **1**
- Observed masked target: `909e92b5-70bd-47f0-9753-dc0f0d920bee`, `m***@***`, `2026-03-19T14:55:35.474229Z`
- Deletion result: **0 users deleted**
- Process result: exit 0

The command output was email-masked before capture. No service-role credential was printed or recorded.

## Environmental failures and residual risks

- No verification command failed.
- The known pre-existing `rls-cross-user` JWT clock-skew issue was not exercised by this scoped verification, so no new observation is reported.
- The hosted run verifies only the non-destructive inventory path. Confirmed deletion, profile-first ordering, Auth/profile readback, administrator protection, and changed-target abort remain unexecuted by design.
- The report does not claim complete event telemetry for feature usage; optional source availability remains dependent on the deployed schema and hosted data.
