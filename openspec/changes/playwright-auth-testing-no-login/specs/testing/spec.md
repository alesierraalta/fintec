# Testing Specification

## Purpose

Define lane-based Playwright execution behavior so general UI coverage runs without authentication bootstrap by default, true authentication behavior is validated in a dedicated lane, and CI enforces both lanes with explicit bypass safety boundaries.

## Requirements

### Requirement: No-Auth Lane Is the Default Playwright Path

The system MUST make the no-auth lane the default for general Playwright execution and MUST NOT require login bootstrap for that default path.

#### Scenario: Default run executes broad UI coverage without login bootstrap

- GIVEN a developer or CI runner invokes the default Playwright workflow
- WHEN tests are selected for the general lane
- THEN the run MUST execute without requiring UI login setup or seeded credentials
- AND protected frontend page coverage in that lane MUST rely on explicit bypass-safe test conditions

#### Scenario: Auth-dependent tests are not silently treated as no-auth tests

- GIVEN a test that requires real authenticated identity or session behavior
- WHEN that test is included in the default no-auth lane
- THEN lane selection controls MUST prevent accidental execution in the no-auth lane
- AND the test MUST be redirected to the auth-required lane contract before it can pass as valid coverage

### Requirement: Auth-Required Lane Is Explicit and Scoped

The system SHALL provide an explicit auth-required lane for real authentication and session coverage, and SHOULD keep that lane focused on auth-critical smoke behavior.

#### Scenario: Auth-required lane validates real login and session behavior

- GIVEN a test suite tagged or named for authentication and session coverage
- WHEN the explicit auth-required lane is invoked
- THEN the run MUST execute with real authentication setup appropriate for session validation
- AND results MUST represent login and authenticated-session behavior rather than bypassed frontend access

#### Scenario: General lane invocation does not implicitly trigger auth lane behavior

- GIVEN only the default Playwright lane is invoked
- WHEN no explicit auth-required selection is provided
- THEN auth-lane-only setup and tests MUST NOT be run implicitly
- AND auth coverage status MUST remain tied to explicit auth-lane execution

### Requirement: CI Enforces Dual-Lane Coverage

The system MUST run both the default no-auth lane and the explicit auth-required lane in CI as separate, visible checks.

#### Scenario: CI reports independent status for both lanes

- GIVEN a CI pipeline execution for code changes affecting Playwright coverage
- WHEN the pipeline runs test jobs
- THEN the no-auth lane and auth-required lane MUST execute as distinct checks
- AND each lane MUST publish an independent pass/fail result

#### Scenario: Missing or failed lane blocks successful CI outcome

- GIVEN one lane is skipped, misconfigured, or fails
- WHEN CI evaluates required checks
- THEN CI MUST treat the overall testing gate as not satisfied
- AND merge readiness MUST require both lane checks to be successful

### Requirement: Bypass Flags Have Explicit Non-Production Safety Boundaries

The system MUST allow frontend auth bypass only through explicit opt-in in non-production contexts and MUST NOT allow bypass behavior to weaken API authorization checks.

#### Scenario: Explicit opt-in enables frontend bypass only in non-production

- GIVEN runtime is non-production
- AND bypass flags are explicitly enabled for test execution
- WHEN a no-auth lane test accesses a frontend protected route
- THEN frontend route access MAY proceed without login redirect for that test context
- AND this behavior MUST be attributable to explicit lane and flag configuration

#### Scenario: Production or implicit contexts do not permit bypass side effects

- GIVEN runtime is production or bypass flags are not explicitly enabled
- WHEN protected frontend routes or auth-protected API endpoints are accessed without authentication
- THEN frontend access MUST follow normal authentication enforcement
- AND API endpoints MUST continue returning unauthorized responses for unauthenticated requests
