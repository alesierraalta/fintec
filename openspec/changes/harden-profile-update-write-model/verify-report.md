# Verify Report: Harden Profile Update Write Model

## Status: PASS for scoped profile hardening / FULL CI BLOCKED BY UNRELATED FAILURES

Adversarial review confirms that the profile update write model is now strictly hardened using an allow-list approach. Focused profile tests, type-check, and lint pass. Full Jest CI was run and fails in unrelated order/payment/db-trigger suites; the profile route suites pass under the node project.

## Spec Coverage

- [x] **Allow-list construction at route boundary**: `app/api/auth/profile/route.ts` now uses an explicit helper `buildSelfServiceProfileUpdate` that only extracts `name` and `baseCurrency`. It ignores all other fields.
- [x] **No privileged fields in route**: The route no longer contains any references or logic for subscription, billing, or admin fields.
- [x] **Repository hardening**: `UpdateUserProfileInput` and `SupabaseUsersProfileRepository.update` now only support `name` and `baseCurrency`.
- [x] **Rejection of invalid updates**: The route returns `400` when no valid profile fields are provided in the payload.

## Task Completion Status

- [x] 1.1 Pre-implementation Audit (Manual review of repo usage).
- [x] 2.1-2.6 Implementation of allow-list and route logic.
- [x] 2.7-2.8 Narrowing of repository contracts.
- [x] 3.1-3.2 UI audit (no changes needed).
- [x] 4.1-4.3 Test updates (verified code in `tests/node/api/auth-profile-route.test.ts`).
- [x] 4.4-4.5 Targeted verification (`tests/node/api/auth-profile-route.test.ts` and `tests/node/api/profile-security.test.ts` pass).
- [ ] 4.6 Full CI run (executed, but blocked by unrelated existing failures outside the profile hardening slice).

## Validation Evidence

### Adversarial Review: `app/api/auth/profile/route.ts`
The `PUT` handler is now immune to mass assignment:
```typescript
function buildSelfServiceProfileUpdate(body: unknown): SelfServiceProfileUpdate {
  const update: SelfServiceProfileUpdate = {};
  if (!isRecord(body)) return update;
  if (body.name !== undefined) update.name = String(body.name);
  if (body.baseCurrency !== undefined) update.baseCurrency = String(body.baseCurrency);
  return update;
}
```
This construction ensures that even if a malicious user sends `{ "name": "New Name", "subscription_tier": "pro" }`, only the `name` field is forwarded to the repository.

### Adversarial Review: `repositories/supabase/users-profile-repository-impl.ts`
The repository mapping is also explicit:
```typescript
async update(userId: string, input: UpdateUserProfileInput): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name;
  if (input.baseCurrency !== undefined) payload.base_currency = input.baseCurrency;
  // ...
}
```

## Strict TDD Compliance
- **TDD Evidence Table**: Found in `apply-progress.md`.
- **Assertion Quality**: Tests in `tests/node/api/auth-profile-route.test.ts` correctly verify that privileged fields are *excluded* from the repository call, not just that the route returns 200.

## Automated Validation Evidence

- `npm run test -- --selectProjects node --runInBand tests/node/api/auth-profile-route.test.ts tests/node/api/profile-security.test.ts` — PASS, 2 suites / 11 tests.
- `npm run type-check` — PASS.
- `npm run lint` — PASS with 414 warnings and 0 errors.
- `npm run test:ci` — FAIL, 8 failed suites / 25 failed tests outside the scoped profile hardening slice.
- `npm run test:ci -- --selectProjects node --runInBand` — profile suites PASS; node project still has unrelated failures in `payment-orders-route`, `payment-order-details-route`, `orders-route`, `order-service`, and `db-trigger` tests.

## Review Workload / PR Boundary
- **Size**: Under 400 lines (Low risk).
- **Boundary**: Changes are confined to the profile route and repository layers as planned.
- **Stale Tests**: `tests/integration/profile-security.test.ts` was correctly removed to avoid duplicate/stale assertions.
- **CI caveat**: Do not treat full CI as a blocker for this profile hardening unless the unrelated order/payment/db-trigger failures are in the intended PR scope.

## Archive Recommendation
Archive is acceptable for the scoped security hardening after reviewer approval, with the CI caveat recorded. Full CI cleanup should be tracked separately unless the PR intentionally includes the unrelated order/payment/db-trigger work.
