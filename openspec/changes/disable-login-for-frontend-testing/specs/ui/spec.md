# Delta for UI

## ADDED Requirements

### Requirement: Frontend Route Guards Support Explicit Test Bypass In Non-Production

The system MUST allow protected frontend pages to bypass login redirects only when an explicit bypass flag is enabled and runtime is non-production.

#### Scenario: Protected page renders without login redirect when bypass is explicitly enabled

- GIVEN a protected page that uses the server-side route guard
- AND runtime is `development` or `test`
- AND the frontend auth bypass flag is enabled
- WHEN an unauthenticated request is made to that page
- THEN the page render flow MUST continue without redirecting to `/auth/login`

#### Scenario: Default behavior remains login-gated when bypass is not enabled

- GIVEN a protected page that uses the server-side route guard
- AND no bypass flag is set
- WHEN an unauthenticated request is made to that page
- THEN the user MUST be redirected to `/auth/login`

### Requirement: Frontend Auth Bypass Is Ignored In Production

The system MUST NOT allow frontend auth bypass in production runtime, even if bypass-related flags are present.

#### Scenario: Production runtime rejects bypass activation

- GIVEN runtime is `production`
- AND bypass-related environment variables are set to truthy values
- WHEN an unauthenticated request is made to a protected page
- THEN the request MUST be treated as unauthenticated
- AND the user MUST be redirected to `/auth/login`

#### Scenario: Production runtime preserves authenticated behavior

- GIVEN runtime is `production`
- AND the requester is authenticated
- WHEN a protected page is rendered
- THEN the page MUST render successfully
- AND no bypass branch is required for access

### Requirement: Bypass Scope Is Limited To Frontend Route Gating

The system SHALL limit bypass logic to frontend page-guard paths and SHALL NOT alter API authentication behavior.

#### Scenario: API auth contract is unchanged when bypass is enabled

- GIVEN bypass is enabled for non-production frontend testing
- WHEN an unauthenticated request calls an auth-protected API route
- THEN the API route MUST continue returning an unauthorized response

#### Scenario: Server-side page guard bypass does not modify auth provider state machine

- GIVEN bypass is enabled for non-production frontend testing
- WHEN client auth context initializes without a valid session
- THEN existing auth context behavior SHOULD remain unchanged
- AND bypass responsibility MUST stay in server-side page access guard logic

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
