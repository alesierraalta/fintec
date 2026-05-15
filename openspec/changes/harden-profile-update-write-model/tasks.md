# Tasks: Harden Profile Update Write Model

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180-280 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## 1. Schema / Database

- [x] 1.1 Confirm no schema, migration, or RLS edits are needed for this change by checking that apply will not modify `supabase/**`, `migrations/**`, or SQL/RLS policy files. Link: `No database schema or RLS change is required`.
- [x] 1.2 During apply, if a trusted webhook/admin flow is discovered using `usersProfileRepository.update`, stop and split a trusted update method instead of widening the self-service profile update input. Discovery targets: `app/api/**`, `repositories/**`, webhook/admin subscription code. Link: `Subscription State Remains Trusted-Path Only`.

## 2. Business Logic

- [x] 2.1 RED: In `tests/node/api/auth-profile-route.test.ts`, rewrite the existing broad profile/subscription update expectation so a runtime `PUT /api/auth/profile` request with `name` and `baseCurrency` expects `usersProfileRepository.update('user-1', { name, baseCurrency })`. Verify it fails before implementation. Link: `Allowed profile fields are forwarded to the repository`.
- [x] 2.2 RED: In `tests/node/api/auth-profile-route.test.ts`, add a mixed-payload test with allowed fields plus non-profile/privileged top-level fields and assert the repository mock receives only `{ name, baseCurrency }`. Verify it fails if the route spreads or forwards request JSON. Link: `Privileged subscription fields do not reach the repository`, `Jest test proves privileged fields are excluded at runtime`.
- [x] 2.3 RED: In `tests/node/api/auth-profile-route.test.ts`, add a payload containing only unknown/non-self-service keys and assert response status `400` and `usersProfileRepository.update` is not called. Verify it fails before implementation. Link: `Payload with no allowed update fields does not perform a broad update`.
- [x] 2.4 GREEN: In `app/api/auth/profile/route.ts`, add a route-local allow-list canonicalization helper for self-service profile fields (`name`, `baseCurrency`) and pass only that object to `usersProfileRepository.update(user.id, updateInput)`.
- [x] 2.5 GREEN: In `app/api/auth/profile/route.ts`, remove restricted-field/deny-list behavior and avoid route constants, comments, or branches that enumerate privileged payment/subscription field names.
- [x] 2.6 GREEN: In `app/api/auth/profile/route.ts`, return deterministic `400` before repository access when the canonicalized update has no allowed fields; preserve existing `401` unauthenticated behavior and `500` repository-failure behavior for valid updates.
- [x] 2.7 GREEN: In `repositories/contracts/users-profile-repository.ts`, narrow `UpdateUserProfileInput` to self-service fields only: `name?: string` and `baseCurrency?: string`.
- [x] 2.8 GREEN: In `repositories/supabase/users-profile-repository-impl.ts`, remove non-profile field mappings from the self-service `update` implementation; keep authenticated-user targeting and internal `updated_at` handling unchanged.

## 3. UI

- [x] 3.1 Confirm no UI files are touched. If apply discovers a profile UI caller requires payload adjustment, keep it limited to existing allowed fields and document why in apply progress. Discovery targets: profile client/API caller files under `app/**`, `components/**`, and hooks/services that call `/api/auth/profile`.
- [x] 3.2 Do not run Playwright for this change unless UI files are modified; if modified, use the auth-required lane identified in `openspec/config.yaml`.

## 4. Testing

- [x] 4.1 RED evidence: Run `npm run test -- tests/node/api/auth-profile-route.test.ts --runInBand` after adding failing tests and record the failing expectations in apply progress.
- [x] 4.2 TRIANGULATE: In `tests/node/api/auth-profile-route.test.ts` or `tests/node/api/profile-security.test.ts`, add a second mixed-payload runtime test with different unknown key shapes, including a nested object, proving the route is allow-list based rather than key-specific.
- [x] 4.3 TRIANGULATE: Updated duplicate assertions in `tests/node/api/profile-security.test.ts` to expect allow-list exclusion. Removed stale `tests/integration/profile-security.test.ts` — it was a duplicate of the node test running in wrong Jest environment (jsdom instead of node) with outdated deny-list semantics.
- [x] 4.4 GREEN evidence: Run targeted Jest tests: `npm run test -- tests/node/api/auth-profile-route.test.ts --runInBand` and, if retained/changed, `npm run test -- tests/node/api/profile-security.test.ts --runInBand` plus `npm run test -- tests/integration/profile-security.test.ts --runInBand`.
- [x] 4.5 REFACTOR: After tests pass, simplify route helper names and structure only if needed (`isRecord`, `hasUpdateFields`, `buildSelfServiceProfileUpdate`); do not extract broad shared helpers or introduce privileged-domain terminology.
- [ ] 4.6 Verification before handoff: Run `npm run type-check`, `npm run lint`, and `npm run test:ci`; record any unavailable/too-slow command with reason and targeted evidence.
