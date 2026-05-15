# Proposal: Harden Profile Update Write Model

## Intent

Remove subscription and billing authority from the user profile update endpoint so user-submitted JSON cannot influence privileged fields such as `tier`, `subscription_status`, `subscription_tier`, or `subscription_id`.

The current `PUT app/api/auth/profile/route.ts` handler explicitly knows about restricted subscription fields and still forwards those fields into `usersProfileRepository.update(...)`. Even with a deny-list guard, this keeps privileged billing state in the user-owned profile write model. The safer target is a split write model: profile self-service updates accept only user-owned profile fields; subscription state is written only by trusted webhook/admin-only paths.

## Scope

In scope:

- Narrow the `PUT /api/auth/profile` write model to user-owned fields only:
  - `name`
  - `baseCurrency`
  - preferences/user-owned profile fields if already supported by the existing profile model
- Remove subscription/billing field handling from `app/api/auth/profile/route.ts`.
- Split or narrow shared input types/helpers only if required to prevent privileged fields from being accepted by profile self-service updates.
- Add focused tests proving the route cannot pass subscription/billing fields to the profile repository.
- Preserve trusted subscription update paths, especially webhook/admin-only flows.

Out of scope:

- Database migrations.
- Broad billing/subscription refactors.
- UI redesign or profile page behavior changes beyond compatibility with the narrowed update payload.
- Reworking RLS policies unless exploration proves the current route relies on unsafe table-level write permissions.
- Changing webhook/admin subscription authority except to ensure no dependency on the self-service profile update model.

## Affected Areas

- `app/api/auth/profile/route.ts`
  - Primary route handler to harden.
  - `PUT` should construct an allow-listed profile update payload and should not mention subscription/billing field names.
- `repositories/contracts/users-profile-repository.ts`
  - Likely affected if `UpdateUserProfileInput` currently mixes user-owned profile fields with privileged subscription fields.
- `repositories/supabase/users-profile-repository-impl.ts`
  - Potentially affected if repository-level `update` remains a shared privileged method. If needed, introduce/narrow a self-service update path while keeping trusted paths separate.
- Focused route/repository tests
  - Add or update tests around `PUT /api/auth/profile` payload handling and repository calls.

Supabase/RLS impact:

- Affected table: user profile table used by `SupabaseUsersProfileRepository` (appears to include profile and subscription columns).
- Expected RLS policy changes: none for this narrow change.
- Security expectation: even if table columns remain co-located, application write models must separate user-owned profile writes from trusted subscription writes.

Test lane:

- Jest route/unit tests are the primary lane.
- Playwright lane: auth-required only if an existing profile integration/E2E test is touched or added; otherwise not required for this narrow backend hardening.
- Performance/k6: not applicable; no expected measurable performance impact.

## Risks

- Existing code may rely on `UsersProfileRepository.update` for both self-service profile updates and trusted subscription writes. If so, narrowing the shared type directly could break trusted webhook/admin flows unless a separate privileged method/type is introduced.
- A deny-list-only test could pass while the route still knows about privileged fields. Tests should prefer allow-list behavior and assert privileged fields are not forwarded.
- Type-only changes may miss runtime JSON behavior; tests should exercise request payloads containing privileged fields.
- If profile preferences exist under nested JSON, care is needed to avoid accidentally allowing arbitrary privileged keys inside a broad object.

## Rollback Plan

- Revert the route/type/test changes for this change directory if compatibility issues appear.
- No data migration rollback is expected.
- Trusted webhook/admin subscription state should remain untouched, so rollback should not affect existing subscription records.

## Success Criteria

- `PUT app/api/auth/profile/route.ts` no longer references privileged subscription/billing field names.
- User-submitted profile update JSON can update only the approved self-service profile fields.
- Privileged fields such as `tier`, `subscription_status`, `subscription_tier`, and `subscription_id` are not forwarded to `usersProfileRepository.update` from the profile endpoint.
- Subscription state remains writable only through trusted webhook/admin-only paths.
- Focused tests demonstrate RED/GREEN TDD evidence for the vulnerability and the fix.
- Relevant Jest tests pass; broader lint/type-check commands are identified for apply/verify phases.
