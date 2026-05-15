# Apply Progress: Harden Profile Update Write Model

## Workload / PR Boundary

- Delivery strategy: single PR.
- Review workload forecast: Low risk, under 400 changed lines.
- Scope held to profile route handler and focused node route-handler tests, plus OpenSpec apply artifacts.

## Completed Tasks

- 1.1 Confirmed no schema, migration, SQL, or RLS files were modified.
- 1.2 Checked direct `usersProfileRepository.update` usage; no trusted webhook/admin flow was discovered using this self-service route method in the focused search.
- 2.1 Rewrote the broad update route test to expect only `name` and `baseCurrency`.
- 2.2 Added runtime mixed-payload coverage proving privileged fields are excluded before the repository boundary.
- 2.3 Added runtime unknown-only payload coverage proving no empty/broad update is performed.
- 2.4 Added route-local allow-list canonicalization for self-service profile fields.
- 2.5 Removed deny-list/restricted-field branch from `PUT /api/auth/profile`.
- 2.6 Added deterministic `400` for payloads with no allowed profile fields while preserving `401` auth and `500` valid-update failure behavior.
- 3.1 Confirmed no UI files were touched.
- 3.2 Playwright not run because no UI files changed.
- 4.1 Captured RED targeted Jest failure after adding route-boundary tests.
- 4.2 Added triangulation with a different mixed payload containing unknown and nested fields.
- 4.3 Updated duplicate node profile-security assertions to allow-list semantics.
- 4.4 Ran targeted node route-handler Jest tests successfully.
- 4.5 Refactored to small generic helpers without privileged-domain terminology.

## Files Changed

- `app/api/auth/profile/route.ts` — replaces deny-list profile PUT handling with route-local allow-list canonicalization.
- `tests/node/api/auth-profile-route.test.ts` — updates route-handler tests for allowed-only forwarding, mixed payload exclusion, no-valid-fields rejection, and repository failure with a valid update body.
- `tests/node/api/profile-security.test.ts` — aligns focused duplicate security tests with allow-list behavior.
- `openspec/changes/harden-profile-update-write-model/tasks.md` — marks completed apply tasks.
- `openspec/changes/harden-profile-update-write-model/apply-progress.md` — cumulative apply evidence.
- `openspec/changes/harden-profile-update-write-model/apply-report.md` — focused subagent handoff report.
- `repositories/contracts/users-profile-repository.ts` — narrowed `UpdateUserProfileInput` to self-service fields only (`name`, `baseCurrency`); removed subscription/billing fields.
- `repositories/supabase/users-profile-repository-impl.ts` — removed subscription/billing field mappings from `update()`; now maps only `name`, `base_currency`, and `updated_at`.
- `tests/integration/profile-security.test.ts` — removed; was a stale duplicate of `tests/node/api/profile-security.test.ts` running in wrong Jest environment (jsdom instead of node) with outdated deny-list semantics.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1-2.3 | `tests/node/api/auth-profile-route.test.ts` | Jest node route handler | ⚠️ Initial safety net had 1 pre-existing obsolete expectation failing in `auth-profile-route.test.ts`; `profile-security.test.ts` passed | ✅ Added/rewrote failing route-boundary expectations; 3 failures observed | ✅ Targeted Jest passed after route allow-list implementation | ✅ Added mixed privileged payload, unknown-only payload, and nested unknown payload cases | ✅ Extracted small generic route-local helpers |
| 4.3 | `tests/node/api/profile-security.test.ts` | Jest node route handler | ✅ Existing file passed before rewrite | ✅ Updated duplicate tests to fail against deny-list behavior for mixed payload | ✅ Targeted Jest passed | ✅ Covered allowed+non-profile and non-profile-only payloads | ✅ Removed stale RED-phase comments and restricted-field assertion shape |
| 2.7-2.8 | `tests/node/api/auth-profile-route.test.ts`, `tests/node/api/profile-security.test.ts` | Jest node route handler + repository contract | ✅ All 11 existing tests passed before narrowing | ✅ Narrowed contract and impl; no type errors, all 11 tests still pass | ✅ N/A — narrowing is verified by compile-time type check and unchanged runtime behavior | ✅ N/A |

## Test Commands Run

- `npm run test -- --selectProjects node --runInBand tests/node/api/auth-profile-route.test.ts tests/node/api/profile-security.test.ts` — safety net: failed 1 obsolete broad-update expectation in `auth-profile-route.test.ts`, 7/8 tests passed.
- `npm run test -- --selectProjects node --runInBand tests/node/api/auth-profile-route.test.ts tests/node/api/profile-security.test.ts` — RED: failed 3 expected route-boundary assertions before production change.
- `npm run test -- --selectProjects node --runInBand tests/node/api/auth-profile-route.test.ts tests/node/api/profile-security.test.ts` — GREEN/REFACTOR: passed 2 suites, 11 tests.
- `npm run type-check` — passed.
- `npm run lint` — passed with 414 warnings and 0 errors (warnings pre-existing across repo scope).
- `npm run test -- tests/node/api/auth-profile-route.test.ts tests/node/api/profile-security.test.ts --runInBand` — follow-up worker GREEN after narrowing contract/impl: passed 2 suites, 11 tests.
- `npm run type-check` — follow-up worker: passed with narrowed `UpdateUserProfileInput`.
- `npm run lint` — follow-up worker: passed, 0 errors.

## Remaining Tasks

- 4.6 Run `npm run test:ci` during verify phase.

## Memory / Persistence

- Engram memory tools were not available in this delegated tool set, so no memory write-back was performed.
