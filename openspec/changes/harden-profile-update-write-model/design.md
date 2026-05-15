# Design: Harden Profile Update Write Model

## Technical Approach

Replace the current self-service profile update path with an allow-list write model constructed at the route boundary. The route will parse runtime JSON, canonicalize only supported user-owned profile fields into a small update object, and pass that object to `usersProfileRepository.update(user.id, updateInput)` only when at least one allowed field is present.

This is intentionally not a deny-list. The route must not enumerate privileged payment, entitlement, ownership, identity, or persistence keys. Any field outside the self-service profile allow-list is ignored by construction. A request containing a mix of allowed and non-allowed keys succeeds using only the allowed keys; a request containing no allowed keys returns a deterministic client error and does not call the repository.

The repository contract should also express the narrower self-service model so the boundary is protected by both runtime behavior and TypeScript shape. Trusted payment/admin authority remains outside this route and outside this self-service repository update input.

## Architecture Decisions

### Decision: Use allow-list canonicalization at the route boundary

**Choice**: Add a small helper near the `PUT` handler that constructs `UpdateUserProfileInput` from recognized self-service profile fields only: currently `name` and `baseCurrency`.

**Alternatives considered**:

- Keep a restricted-field check before updating.
- Pass the full JSON body to the repository and filter there.

**Rationale**:

- A restricted-field check requires the profile route to know privileged domain field names and fails open when new privileged fields are added later.
- Repository-only filtering allows unsafe payload shape to cross the route/repository boundary.
- Allow-list construction makes arbitrary runtime JSON safe by default and keeps the self-service route focused on user-owned profile attributes.

### Decision: Ignore unknown/non-self-service fields when valid profile fields exist

**Choice**: If the request contains at least one allowed self-service field, update only those fields and ignore everything else. If no allowed self-service field is present, return `400` and skip the repository update.

**Alternatives considered**:

- Reject any request containing unknown or privileged keys.
- Silently accept no-op requests.

**Rationale**:

- Ignoring extras is backward-compatible with clients that may send additional UI state.
- Returning `400` for no valid update avoids ambiguous successful no-op writes and prevents calls with empty update objects.
- The implementation remains allow-list based and does not require route-level privileged-field knowledge.

### Decision: Narrow the repository update contract to the self-service profile model

**Choice**: Change `UpdateUserProfileInput` to include only self-service profile fields and update the Supabase repository implementation accordingly.

**Alternatives considered**:

- Keep the broader type and rely on route behavior.
- Add a separate method while leaving the existing broad update method unchanged.

**Rationale**:

- Current repository usage search shows `usersProfileRepository.update` is exercised by the profile route/tests, not trusted payment/admin flows.
- Narrowing the existing contract reduces accidental misuse and makes tests/type-checks fail if the route tries to forward non-profile state.
- If apply discovers a trusted flow using this method outside current search results, introduce a separate trusted method/type in that flow rather than widening the self-service update input.

### Decision: Keep database schema and RLS unchanged

**Choice**: Do not modify Supabase tables, columns, migrations, or RLS policies for this change.

**Alternatives considered**:

- Split profile and entitlement columns into separate tables.
- Add RLS column-level protections.

**Rationale**:

- The spec targets the application write model, not storage layout.
- Existing trusted payment/admin paths remain the authority for non-profile state.
- No migration is needed to prevent the profile route from forwarding unsafe update keys.

## Authentication and Authorization Flow

`PUT /api/auth/profile` keeps the existing server-auth discipline:

1. Create the server Supabase client with `createClient()`.
2. Call `supabase.auth.getUser()`.
3. Return `401` when there is no authenticated user or auth returns an error.
4. Parse request JSON only after auth succeeds.
5. Build a self-service profile update object from the allow-list.
6. Return `400` without repository access when the canonicalized update is empty.
7. Call `createServerUsersProfileRepository({ supabase })` and update only the authenticated user's row by `user.id`.

No client-supplied ownership, identity, persistence, entitlement, payment, or admin fields participate in authorization or update targeting.

## Data Flow

```text
Authenticated PUT request
  -> app/api/auth/profile/route.ts
  -> supabase.auth.getUser()
      -> no user/error: 401
      -> user present:
           parse JSON body
           canonicalizeSelfServiceProfileUpdate(body)
             -> copies only allowed self-service keys
             -> ignores every other key without naming it
           if canonical update is empty:
             -> 400, repository not called
           else:
             -> usersProfileRepository.update(user.id, canonicalUpdate)
             -> SupabaseUsersProfileRepository maps profile fields to DB columns
             -> 200 success
```

## File Changes

| File | Action | Description |
| --- | --- | --- |
| `app/api/auth/profile/route.ts` | Modify | Replace restricted-field logic with allow-list canonicalization for `PUT`; remove route knowledge of privileged payment/subscription domain fields; return `400` for empty canonical updates. |
| `repositories/contracts/users-profile-repository.ts` | Modify | Narrow `UpdateUserProfileInput` to self-service profile fields only (`name`, `baseCurrency`). |
| `repositories/supabase/users-profile-repository-impl.ts` | Modify | Remove mapping of non-profile fields from `update`; continue setting `updated_at` internally and updating by authenticated user id. |
| `tests/node/api/auth-profile-route.test.ts` | Modify | Replace the current broad-update expectation with route-boundary tests for allowed-field forwarding, mixed payload canonicalization, and empty canonical payload rejection. |
| `tests/node/api/profile-security.test.ts` | Modify or merge | Convert duplicate security tests away from restricted-field rejection and toward allow-list boundary assertions, or remove duplication if `auth-profile-route.test.ts` owns the coverage. |
| `tests/integration/profile-security.test.ts` | Modify or remove if redundant | Keep only if this lane is intentionally distinct; otherwise avoid duplicated assertions that can drift from the node route-handler lane. |

## Interfaces / Contracts

```ts
// repositories/contracts/users-profile-repository.ts
export interface UpdateUserProfileInput {
  name?: string;
  baseCurrency?: string;
}
```

```ts
// app/api/auth/profile/route.ts
function buildSelfServiceProfileUpdate(
  body: unknown
): UpdateUserProfileInput {
  const update: UpdateUserProfileInput = {};

  if (isRecord(body)) {
    if (body.name !== undefined) update.name = String(body.name);
    if (body.baseCurrency !== undefined) {
      update.baseCurrency = String(body.baseCurrency);
    }
  }

  return update;
}
```

Implementation notes for apply phase:

- The helper may stay private to the route unless tests need direct unit coverage; primary tests should exercise it through runtime `Request` JSON.
- Preserve existing behavior for allowed fields unless current route validation requires stricter semantics.
- Do not introduce route constants containing privileged payment/subscription key names.
- Do not spread request bodies into repository calls.
- Do not call `usersProfileRepository.update(user.id, {})`.

## Test Design and TDD Plan

Strict TDD evidence should be captured in the apply phase.

### RED

Add or update Jest node route-handler tests first:

1. **Allowed fields forwarded**: send JSON with `name` and `baseCurrency`; assert `usersProfileRepository.update` receives `('user-1', { name, baseCurrency })`.
2. **Mixed payload canonicalized**: send JSON with allowed fields plus representative non-profile top-level keys; assert update receives only `{ name, baseCurrency }` and the response succeeds.
3. **Unknown-only payload rejected**: send JSON with no allowed self-service keys; assert status `400` and `usersProfileRepository.update` is not called.
4. **Runtime boundary, not type-only**: use actual `Request`/`NextRequest` JSON bodies and repository mocks so the test fails if the implementation spreads arbitrary body keys.
5. **Unauthenticated unchanged**: keep existing `401` behavior.
6. **Repository failure unchanged for valid update**: call `PUT` with a valid allowed field while the repository rejects; expect `500`.

The existing test named `updates mutable profile and subscription fields` should be rewritten because its expected behavior is now the vulnerability.

### GREEN

Implement the smallest change:

1. Add route-local canonicalization helper.
2. Remove restricted-field branch and logging from `PUT`.
3. Return `400` for empty canonical update.
4. Pass only the canonicalized update to the repository.
5. Narrow repository contract and Supabase mapping.

### TRIANGULATE

Add a second mixed-payload test with different non-profile key shapes, including nested objects, to prove the implementation is not accidentally key-specific or shallow-spreading the body.

### REFACTOR

If route code becomes noisy, extract only generic helper names such as `isRecord`, `hasUpdateFields`, or `buildSelfServiceProfileUpdate`. Keep helper names and route comments free of privileged payment/subscription terminology.

## Test Commands

Targeted development commands:

```text
npm run test -- tests/node/api/auth-profile-route.test.ts --runInBand
npm run test -- tests/node/api/profile-security.test.ts --runInBand
```

If `tests/integration/profile-security.test.ts` remains active, run it as well:

```text
npm run test -- tests/integration/profile-security.test.ts --runInBand
```

Pre-verify commands:

```text
npm run type-check
npm run lint
npm run test:ci
```

Playwright and k6 are not required for this narrow backend route hardening unless apply changes frontend profile flows or shared subscription/payment flows. No-auth/auth-required E2E lanes remain out of scope for the planned code changes.

## Migration / Rollout

No database migration, RLS change, or data backfill is required.

Rollout plan:

1. Land route-handler tests proving the unsafe boundary fails.
2. Implement allow-list canonicalization and narrow repository types.
3. Run targeted Jest tests, then type-check/lint/Jest CI.
4. Confirm trusted payment/admin update flows compile and remain untouched.
5. Deploy as a backend hardening change with no feature flag.

Rollback plan:

- Revert the route, repository contract, repository implementation, and tests from this change.
- No schema rollback is needed.
- Trusted payment/admin authority should be unaffected because this design does not modify those paths.

## Open Questions

- [ ] Should `name` and `baseCurrency` be string-coerced as today-like permissive behavior, or validated more strictly in a follow-up? This design keeps validation minimal to avoid widening scope.
- [ ] Should duplicate profile security tests be consolidated into one node route-handler suite during apply to reduce maintenance burden?
