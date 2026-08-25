# Verification report: admin-exclude-self-and-user-list

## Verdict

**BLOCKED** — the repository verification gates could not execute because this worktree has no `node_modules` and the required local executables (`cross-env`, `tsc`, `oxlint`, and `tsx`) are unavailable. No code was changed.

## Commands and results

| Command | Result |
|---|---|
| `npm test -- --runInBand tests/node/lib/admin-stats-service.test.ts tests/components/admin-user-roster.test.tsx tests/components/admin-stats-dashboard.test.tsx tests/node/api/admin-stats-route.test.ts` | **BLOCKED**, exit 127: `cross-env: not found` |
| `npm run type-check` | **BLOCKED**, exit 127: `tsc: not found` |
| `npm run lint 2>&1 \| tail -n 40` | **BLOCKED**, exit 127: `oxlint: not found` |
| Real-run `tsx` probe for `getAdminStats('30d')` | **NOT RUN**, `tsx` is unavailable and no dependency installation was authorized |

The focused test command covered the service, roster component, dashboard wiring, and admin stats route suites requested by the verification contract. The route suite was included because it is the affected API boundary, although it was not modified in the working tree.

## R11/R12 traceability matrix

| Requirement/scenario | Proving test file(s) | Coverage status / gap |
|---|---|---|
| R11: configured administrator excluded from metrics and retained in roster | `tests/node/lib/admin-stats-service.test.ts` — `excludes configured admins from every metric while retaining them in the roster` | **Partial automated coverage**: totals, activity, resources, usage, roster retention, and resource per-user exclusion are asserted. Feature-usage exclusion and explicit absence from every metric grouping are not fully asserted. |
| R11: test-user and administrator exclusions compose | `tests/node/lib/admin-stats-service.test.ts` — default fixture plus configured-admin test | **Partial automated coverage**: fixture contains a test user and a distinct configured admin, and the configured-admin case exercises their combined population. It does not independently assert every listed metric and feature-usage grouping for both excluded users. |
| R11: empty/unset administrator configuration is a no-op | `tests/node/lib/admin-stats-service.test.ts` — `treats empty administrator configuration as a no-op` | **Automated coverage** for empty configuration; unset behavior is covered by the per-test setup and default aggregate test. |
| R12: roster includes non-test users, marks admins, approved fields, dashboard badge | `tests/node/lib/admin-stats-service.test.ts`; `tests/components/admin-user-roster.test.tsx`; `tests/components/admin-stats-dashboard.test.tsx` | **Automated coverage** for DTO filtering/marking/field shape, table columns, badge, and dashboard wiring. |
| R12: newest-first ordering with deterministic tie-breaker | `tests/node/lib/admin-stats-service.test.ts` — default aggregate test checks `u4`, `u2`, `u3` ordering, including equal timestamps | **Automated example coverage**; repeated-response determinism is inferred from the deterministic sort implementation rather than asserted across two calls. |
| R12: nullable values and explicit empty state | `tests/node/lib/admin-stats-service.test.ts`; `tests/components/admin-user-roster.test.tsx` | **Automated coverage** for nullable DTO values, safe `-` rendering, and empty state. |
| R11/R12 real deployment data and configured owner UUID | Requested local probe; no test file | **Manual/local-only gap**: blocked by missing `tsx`/dependencies; no live result was obtained. |

## Real-run outcome

No live probe was executed. Therefore the requested values (`usersTotal`, roster length, owner roster presence, owner `isAdmin`, owner absence from `perUserCounts`, and masked `alesierraalta@gmail.com` presence) are **unavailable**, not zero or false. The probe was intentionally not written under `.local-audit/` because the contract requires one artifact and the runtime was unavailable; no temporary files or database writes were made.

## Known environmental failures

- `node_modules` is absent in this worktree.
- `npm test` cannot start because `cross-env` is unavailable.
- Type-check cannot start because `tsc` is unavailable.
- Lint cannot start because `oxlint` is unavailable.
- The real-run probe cannot start because `tsx` is unavailable.
- Dependency installation was not performed because it was not authorized by this verification task.

## Residual risks

- The focused tests, type-check, and lint remain unverified in this worktree despite the previously reported passing evidence.
- Live Supabase behavior, including the configured owner exclusion and roster visibility, remains unverified.
- Feature-usage exclusion and exhaustive per-user grouping assertions have coverage gaps identified above.

## PASS/BLOCKED summary

- Static traceability review: **PASS with coverage gaps noted**.
- Focused test gate: **BLOCKED by environment**.
- Type-check gate: **BLOCKED by environment**.
- Lint gate: **BLOCKED by environment**.
- Real-run probe: **BLOCKED by environment**.
- Overall verification: **BLOCKED**.
