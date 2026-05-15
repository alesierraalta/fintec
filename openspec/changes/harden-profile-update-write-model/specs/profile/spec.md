# Delta for Profile

## ADDED Requirements

### Requirement: Profile Self-Service Updates Use an Allow-Listed Write Model

`PUT /api/auth/profile` MUST construct its repository update input from an explicit allow-list of user-owned profile fields only. The self-service profile write model MUST include supported user-owned fields such as `name` and `baseCurrency`, and MAY include existing supported user-owned preference fields. It MUST NOT include subscription, billing, entitlement, role, ownership, identity, or persistence-control fields such as `tier`, `subscription_status`, `subscription_tier`, `subscription_id`, `role`, `id`, `user_id`, `created_at`, or `updated_at`.

#### Scenario: Allowed profile fields are forwarded to the repository

- GIVEN an authenticated user sends `PUT /api/auth/profile` with allowed user-owned profile fields
- WHEN the route handler builds the profile update payload
- THEN `usersProfileRepository.update` is called with only the authenticated user's identifier and the allowed profile fields
- AND the repository update input contains no fields outside the self-service profile allow-list

#### Scenario: Privileged subscription fields do not reach the repository

- GIVEN an authenticated user sends `PUT /api/auth/profile` with allowed profile fields and privileged fields such as `tier`, `subscription_status`, `subscription_tier`, or `subscription_id`
- WHEN the route handler processes the request
- THEN the privileged fields MUST be ignored or rejected before the repository boundary
- AND if `usersProfileRepository.update` is called, its update input MUST contain only allowed self-service profile fields
- AND the route implementation MUST NOT depend on forwarding privileged fields and later removing them inside the repository

#### Scenario: Persistence and ownership fields do not reach the repository

- GIVEN an authenticated user sends `PUT /api/auth/profile` with fields such as `id`, `user_id`, `created_at`, or `updated_at`
- WHEN the route handler processes the request
- THEN those fields MUST be ignored or rejected before the repository boundary
- AND if `usersProfileRepository.update` is called, its update input MUST NOT contain any caller-supplied persistence or ownership fields

### Requirement: Unknown Profile PUT Fields Are Excluded by Construction

`PUT /api/auth/profile` MUST NOT pass arbitrary JSON keys from the request body into the repository update operation. Unrecognized fields MUST be rejected with a client error or ignored during allow-list canonicalization, but they MUST be excluded by construction before any repository update call.

#### Scenario: Unrecognized top-level fields are rejected or ignored before update

- GIVEN an authenticated user sends `PUT /api/auth/profile` with an unrecognized top-level field such as `isAdmin`, `planOverride`, or `metadata`
- WHEN the route handler canonicalizes the request body
- THEN the unrecognized field MUST NOT be present in the repository update input
- AND the route MUST either reject the request with a client error or proceed using only recognized allowed fields

#### Scenario: Payload with no allowed update fields does not perform a broad update

- GIVEN an authenticated user sends `PUT /api/auth/profile` with only unrecognized or privileged fields
- WHEN the route handler processes the request
- THEN the route MUST NOT call `usersProfileRepository.update` with an empty, arbitrary, or pass-through update object
- AND the response MUST indicate that no valid self-service profile update was accepted

### Requirement: Subscription State Remains Trusted-Path Only

Subscription and billing state MUST remain writable only through trusted webhook or admin-only paths. Hardening `PUT /api/auth/profile` MUST NOT require database schema migrations or Row-Level Security policy changes for this change.

#### Scenario: Self-service profile update cannot alter subscription authority

- GIVEN a user attempts to change subscription or billing state through `PUT /api/auth/profile`
- WHEN the request is processed
- THEN the self-service profile route MUST NOT update subscription or billing state
- AND subscription state remains controlled by trusted webhook or admin-only flows

#### Scenario: No database schema or RLS change is required

- GIVEN the profile table may continue to contain both user-owned profile columns and privileged subscription columns
- WHEN this change is implemented
- THEN the application write model MUST separate self-service profile updates from trusted subscription updates
- AND the change MUST NOT require database schema migrations or RLS policy changes

### Requirement: Jest Route Handler Tests Prove the Write Boundary

The primary automated test lane for this change MUST be Jest node route handler tests for `PUT /api/auth/profile`. These tests MUST exercise runtime JSON request payloads and assert the repository boundary, not only TypeScript compile-time types.

#### Scenario: Jest test proves privileged fields are excluded at runtime

- GIVEN a Jest node route handler test with a mocked authenticated user and mocked `usersProfileRepository.update`
- WHEN the test sends a JSON payload containing allowed profile fields plus privileged subscription fields
- THEN the test MUST assert that the repository update mock receives only allowed profile fields
- AND the test MUST fail if any privileged field is forwarded to the repository update input

#### Scenario: Jest test proves unknown fields are excluded at runtime

- GIVEN a Jest node route handler test with a mocked authenticated user and mocked `usersProfileRepository.update`
- WHEN the test sends a JSON payload containing allowed profile fields plus unknown top-level fields
- THEN the test MUST assert that unknown fields are rejected or absent from the repository update input
- AND the test MUST fail if the route forwards request JSON by spreading or passing through arbitrary keys

#### Scenario: Jest test proves no valid fields avoids unsafe repository update

- GIVEN a Jest node route handler test with a payload containing only privileged or unknown fields
- WHEN `PUT /api/auth/profile` handles the request
- THEN the test MUST assert that `usersProfileRepository.update` is not called with an empty or unfiltered object
- AND the test MUST assert the route returns a deterministic client-facing outcome for invalid self-service update input
