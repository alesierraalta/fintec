# Apply Follow-up Report: Harden Profile Update Write Model

## Status
✅ COMPLETE — all apply tasks 1.1-4.5 resolved. Task 4.6 (`npm run test:ci`) deferred to verify phase.

## Executive Summary

Completed the remaining 3 apply tasks that were not covered in the initial worker slice:

1. **Narrowed `UpdateUserProfileInput`** in `repositories/contracts/users-profile-repository.ts` — removed `tier`, `subscriptionStatus`, `subscriptionTier`, `subscriptionId`. The contract now only expresses self-service profile fields (`name`, `baseCurrency`).
2. **Updated `SupabaseUsersProfileRepository.update()`** in `repositories/supabase/users-profile-repository-impl.ts` — removed subscription/billing field mapping. The method now only maps `name`, `base_currency`, and internal `updated_at`.
3. **Removed stale `tests/integration/profile-security.test.ts`** — was a duplicate of `tests/node/api/profile-security.test.ts` running in the wrong Jest environment (jsdom/dom instead of node) with outdated deny-list semantics. The node test suite now owns all allow-list boundary assertions.

No trusted webhook/admin paths were broken — confirmed by:
- `grep` search: only `app/api/auth/profile/route.ts` calls `usersProfileRepository.update`
- `npm run type-check` passes cleanly with narrowed contract
- All 11 Jest tests pass

## Files Changed (This Follow-up)

| File | Action | Description |
|------|--------|-------------|
| `repositories/contracts/users-profile-repository.ts` | Modified | Narrowed `UpdateUserProfileInput` to `name?: string` and `baseCurrency?: string` only. |
| `repositories/supabase/users-profile-repository-impl.ts` | Modified | Removed `tier`, `subscriptionStatus`, `subscriptionTier`, `subscriptionId` mapping from `update()`. |
| `tests/integration/profile-security.test.ts` | Deleted | Stale duplicate — wrong Jest env, outdated deny-list semantics. |
| `openspec/changes/harden-profile-update-write-model/tasks.md` | Modified | Marked tasks 2.7, 2.8, 4.3 as completed. |
| `openspec/changes/harden-profile-update-write-model/apply-progress.md` | Modified | Appended follow-up evidence, TDD table entry, and test commands. |

## TDD Evidence

| Step | Action | Result |
|------|--------|--------|
| RED (compile-time) | Narrowed `UpdateUserProfileInput` — TypeScript would fail if any caller passes subscription fields | `npm run type-check` passes — no callers affected |
| GREEN | Removed subscription mapping from repository impl | All 11 Jest tests pass (route-level tests assert runtime behavior) |
| GREEN | Removed stale integration test | `npm run test` no longer fails on jsdom/Request error |
| VERIFY | `npm run test -- tests/node/api/auth-profile-route.test.ts tests/node/api/profile-security.test.ts --runInBand` | 2 suites, 11 tests, all passed |
| VERIFY | `npm run type-check` | Passed, 0 errors |
| VERIFY | `npm run lint` | Passed, 0 errors (414 pre-existing warnings) |

## Key Decisions

- **Repository narrowing safe**: Only the profile route calls `usersProfileRepository.update`. No trusted webhook/admin path uses this method. The domain-level `User` model and mappers (`mapDomainUserToSupabase`) remain unchanged for trusted paths.
- **Integration test deletion preferred over move**: The integration test was a near-duplicate of the node test with stale deny-list assertions and wrong environment. Moving it would perpetuate duplication; deletion consolidates coverage in the correct node lane.

## Risks

- None identified. The change is purely subtractive: removing fields from a type and implementation that were already blocked at the route boundary.

## Next Recommended

- **Verify phase**: Run `npm run test:ci` (task 4.6) for full CI safety net.
- **Archive phase**: Once verify passes, archive the change.
