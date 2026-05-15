# Apply Report: Harden Profile Update Write Model

## Status

Implemented with focused strict TDD route-handler coverage.

## Executive Summary

`PUT /api/auth/profile` now builds a self-service profile update object from an explicit allow-list (`name`, `baseCurrency`) and passes only that object to `usersProfileRepository.update`. Payloads with no allowed profile fields return `400` before repository access. The route no longer uses a restricted-field/deny-list branch for privileged subscription fields.

## Changed Files

- `app/api/auth/profile/route.ts` — allow-list canonicalization and empty-update rejection.
- `tests/node/api/auth-profile-route.test.ts` — route-handler RED/GREEN tests for allowed forwarding, mixed payload exclusion, nested unknown exclusion, no-valid-field rejection, and valid-update failure behavior.
- `tests/node/api/profile-security.test.ts` — focused security tests aligned from restricted-field rejection to allow-list exclusion.
- `openspec/changes/harden-profile-update-write-model/tasks.md` — completed task checkboxes for this apply slice.
- `openspec/changes/harden-profile-update-write-model/apply-progress.md` — cumulative evidence.
- `openspec/changes/harden-profile-update-write-model/apply-report.md` — this report.

## TDD Evidence

| Phase | Command | Result |
| --- | --- | --- |
| Safety net | `npm run test -- --selectProjects node --runInBand tests/node/api/auth-profile-route.test.ts tests/node/api/profile-security.test.ts` | Failed 1 obsolete broad-update expectation; `profile-security.test.ts` passed. |
| RED | Same targeted command after test rewrite | Failed 3 expected assertions: mixed payload should succeed with only allowed fields, unknown-only should return `400`, duplicate security mixed payload should succeed. |
| GREEN/REFACTOR | Same targeted command after route implementation | Passed 2 suites, 11 tests. |
| Type check | `npm run type-check` | Passed. |
| Lint | `npm run lint` | Passed with 414 warnings, 0 errors. |

## Deviations / Blockers

- Repository contract/implementation narrowing (`repositories/contracts/users-profile-repository.ts`, `repositories/supabase/users-profile-repository-impl.ts`) was not changed because the assigned scope restricted edits to route and focused route-handler tests unless absolutely necessary.
- `tests/integration/profile-security.test.ts` still duplicates the previous restricted-field behavior and was not changed or run in this focused node route-handler slice.
- Full `npm run test:ci` was not run; recommend during verify.
- Engram memory tools were unavailable, so no memory write-back was possible.

## Next Recommended

Run verify with at least the focused runner again plus `npm run test:ci`. If the parent wants full design completion, apply a follow-up slice to narrow repository update types/mapping and align/remove the integration duplicate.

## Skill Resolution

injected
