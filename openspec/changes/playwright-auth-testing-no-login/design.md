# Design: Playwright Auth Testing No-Login

## Technical Approach

Adopt a two-lane Playwright model with explicit contracts:

- **Default lane (`no-auth`)** runs broad UI coverage without `tests/auth.setup.ts`, using explicit bypass flags only where frontend protected-route rendering is needed.
- **Auth-required lane (`auth-required`)** runs a small, tagged smoke suite with real login/session setup and storage state.

The implementation uses three selectors together so lane intent is hard to bypass accidentally:

1. **Tags** (`@auth-required`) on tests that need real authenticated identity/session behavior.
2. **Playwright project definitions** that bind setup/storage behavior to the auth-required lane only.
3. **NPM scripts** that pin env vars, project selection, and grep filters for deterministic local and CI execution.

This maps directly to `specs/testing/spec.md` requirements for default no-auth behavior, explicit auth lane execution, CI dual-lane gating, and bypass safety boundaries.

## Architecture Decisions

### Decision: Keep No-Auth As The Default Playwright Config Path

**Choice**: `playwright.config.ts` defaults to no-auth projects and excludes auth setup dependencies unless the auth lane is explicitly selected.
**Alternatives considered**: Keep global `setup` dependency for all projects; maintain current behavior and rely on `PLAYWRIGHT_NO_AUTH_SETUP` ad hoc.
**Rationale**: Current global setup is the main flake/failure source. Defaulting to no-auth removes hard dependency on seeded credentials and login UI state.

### Decision: Use Tag + Project + Script Layering For Test Selection

**Choice**: Add `@auth-required` tagging for auth/session specs, enforce via project grep/grepInvert, and expose lane scripts (`e2e`, `e2e:auth-required`, CI variants).
**Alternatives considered**: File-path-only split; project-only split; manual `--grep` usage without script wrappers.
**Rationale**: A single selector is easy to misuse. Layered selection gives strong intent signaling and prevents auth-dependent tests from silently passing in no-auth runs.

### Decision: Keep Auth Lane Focused On Chromium Smoke First

**Choice**: Start auth-required lane on one stable desktop project (`chromium`) plus setup dependency.
**Alternatives considered**: Run auth lane on full desktop/mobile matrix immediately.
**Rationale**: Auth lane exists for confidence in login/session correctness, not broad UI matrix coverage. Constraining scope keeps runtime and flake exposure low while still gating merges.

### Decision: Add Lane Guardrails In CI And Script Layer

**Choice**: Add explicit CI jobs/checks per lane and a small guard script that validates lane/env coherence (for example, bypass flags must not be active in auth-required lane).
**Alternatives considered**: Trust convention/documentation only; infer lane by heuristics at runtime.
**Rationale**: The main risk is leakage between lanes. Fast-fail guardrails reduce false confidence and make misconfiguration visible.

### Decision: Preserve Existing Frontend Bypass Security Boundary

**Choice**: Keep bypass enforcement in `lib/auth/is-frontend-auth-bypass-enabled.ts` and `app/_lib/require-authenticated-user.ts`; extend tests/docs around it instead of widening bypass scope.
**Alternatives considered**: Introduce wider test-only bypass hooks across API or client auth layers.
**Rationale**: Existing boundary is already fail-closed in production and does not weaken API authorization. Reusing it avoids introducing new security surface area.

## Data Flow

Lane selection and execution:

    npm run e2e (default)
      -> PLAYWRIGHT_LANE=no-auth
      -> no-auth projects (no setup dependency)
      -> grepInvert @auth-required
      -> optional FRONTEND_AUTH_BYPASS only in no-auth scripts

    npm run e2e:auth-required
      -> PLAYWRIGHT_LANE=auth-required
      -> setup project (tests/auth.setup.ts)
      -> auth-required project(s) with storageState
      -> grep @auth-required

CI gating flow:

    GitHub Actions
      -> job: e2e-no-auth (required)
      -> job: e2e-auth-required (required)
      -> branch protection requires both checks green

Auth bypass boundary flow remains unchanged:

    unauthenticated protected page request
      -> requireAuthenticatedUser()
      -> auth.getUser() fails/missing
      -> isFrontendAuthBypassEnabled()
          -> true only non-production + explicit flag
          -> returns bypass user for frontend page rendering
      -> API routes still enforce auth and return 401/403

## File Changes

| File                                             | Action | Description                                                                                                                               |
| ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `playwright.config.ts`                           | Modify | Define explicit no-auth vs auth-required project behavior and lane-aware grep rules; remove global auth setup coupling from default lane. |
| `package.json`                                   | Modify | Make `e2e` deterministic no-auth default and add explicit auth-required and CI lane scripts.                                              |
| `tests/auth.setup.ts`                            | Modify | Scope setup semantics to auth-required lane only and remove assumptions that it runs for all tests.                                       |
| `tests/session-persistence.spec.ts`              | Modify | Tag suite/tests with `@auth-required` and align invocation assumptions to auth lane contract.                                             |
| `tests/10-authentication-analysis.spec.ts`       | Modify | Tag auth/session diagnostic flows as `@auth-required` or retire/re-scope if redundant.                                                    |
| `tests/26-recent-transactions-display.spec.ts`   | Modify | Remove direct `authSetup` import coupling; either migrate to no-auth-safe assertions or classify as auth-required.                        |
| `tests/e2e/auth-bypass-protected-routes.spec.ts` | Modify | Keep as no-auth safety suite; tighten lane assertions so bypass and non-bypass checks remain explicit.                                    |
| `.github/workflows/ci.yml`                       | Modify | Add separate Playwright no-auth and auth-required jobs/checks and wire both as merge-blocking gates.                                      |
| `scripts/testing/validate-playwright-lane.mjs`   | Create | Fail fast on invalid lane/env combinations (for example, bypass set in auth-required lane).                                               |
| `README.md`                                      | Modify | Document lane purpose, commands, and safety boundaries at project level.                                                                  |
| `tests/README.md`                                | Modify | Update Playwright workflow docs to reflect lane split, migration rules, and troubleshooting.                                              |

## Interfaces / Contracts

```ts
// Lane marker in test titles/describes
// Example: test.describe('Session persistence @auth-required', () => { ... })
type PlaywrightLaneTag = '@auth-required';

type PlaywrightLane = 'no-auth' | 'auth-required';

interface LaneEnvContract {
  PLAYWRIGHT_LANE?: PlaywrightLane;
  PLAYWRIGHT_NO_AUTH_SETUP?: '1' | 'true' | 'yes' | '';
  FRONTEND_AUTH_BYPASS?: '1' | 'true' | 'yes' | '';
}
```

Script contract:

- `npm run e2e` -> no-auth lane default, excludes `@auth-required`.
- `npm run e2e:auth-required` -> auth-required lane only, includes `@auth-required`.
- CI scripts mirror the same contract and are the only commands used in workflow jobs.

Safety contract:

- `FRONTEND_AUTH_BYPASS` can be enabled only in no-auth lane scripts.
- Auth-required lane must run with bypass disabled.
- `isFrontendAuthBypassEnabled()` remains fail-closed for `NODE_ENV=production`.

## Testing Strategy

| Layer       | What to Test                                             | Approach                                                                                        |
| ----------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Unit        | Bypass fail-closed behavior and flag truth table         | Keep/extend `tests/node/lib/auth/is-frontend-auth-bypass-enabled.test.ts` coverage.             |
| Unit        | Protected-page guard behavior under bypass vs redirect   | Keep/extend `tests/node/app/_lib/require-authenticated-user.test.ts` assertions.                |
| Integration | Lane selection contract (scripts + env + grep)           | Add guard script tests or dry-run validation in CI to ensure lane/env mismatch fails early.     |
| E2E         | No-auth protected-route behavior without login bootstrap | Keep `tests/e2e/auth-bypass-protected-routes.spec.ts` as lane safety coverage.                  |
| E2E         | Real auth/session smoke behavior                         | Run tagged suites (for example `tests/session-persistence.spec.ts`) only in auth-required lane. |
| CI          | Merge gating correctness                                 | Require both `e2e-no-auth` and `e2e-auth-required` checks to pass independently.                |

## Migration / Rollout

Phased migration to avoid coverage loss:

1. **Introduce lane scaffolding**: add scripts, config split logic, CI dual jobs, and lane guard script while keeping current tests runnable.
2. **Classify and tag auth-dependent tests**: start with obvious auth/session suites (`session-persistence`, `authentication-analysis`, any suite asserting user identity/login UI/session storage).
3. **Flip default lane behavior**: make `npm run e2e` no-auth-only and enforce `grepInvert @auth-required`.
4. **Stabilize auth-required smoke set**: keep auth suite intentionally small and deterministic; remove or rework low-signal auth diagnostics.
5. **Finalize docs and cleanup**: update README/testing docs, remove legacy assumptions that setup is global, and codify lane ownership guidance.

Rollback:

- Restore previous global setup dependency in `playwright.config.ts` and revert script defaults if dual-lane rollout introduces blocking instability.

## Open Questions

- [ ] Should auth-required CI run on `chromium` only initially, or include one mobile profile from day one?
- [ ] Do we keep `tests/10-authentication-analysis.spec.ts` as an auth-lane diagnostic suite, or replace it with smaller deterministic smoke tests?
