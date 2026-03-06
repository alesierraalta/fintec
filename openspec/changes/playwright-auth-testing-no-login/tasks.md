# Tasks: Make No-Auth Playwright the Default Test Lane

## Phase 1: Lane Foundation and Guardrails

- [x] 1.1 Refactor `playwright.config.ts` to define explicit lane selection (`no-auth` vs `auth-required`) with `grepInvert: /@auth-required/` for default projects and `grep: /@auth-required/` for auth lane projects.
- [x] 1.2 Update `playwright.config.ts` so the `setup` project and `playwright/.auth/user.json` storage state are only attached to auth-required projects, not to the default browser matrix.
- [x] 1.3 Create `scripts/testing/validate-playwright-lane.mjs` to fail fast when lane/env combinations are invalid (for example `PLAYWRIGHT_LANE=auth-required` with `FRONTEND_AUTH_BYPASS=1`).
- [x] 1.4 Add script wiring in `package.json` for `e2e` (default no-auth), `e2e:no-auth`, `e2e:auth-required`, and CI-focused variants that invoke `scripts/testing/validate-playwright-lane.mjs` before `playwright test`.

## Phase 2: Test Classification and Auth-Lane Migration

- [x] 2.1 Tag auth-dependent suites with `@auth-required` in `tests/session-persistence.spec.ts` and keep assertions scoped to real login/session behavior.
- [x] 2.2 Classify `tests/10-authentication-analysis.spec.ts` by either tagging remaining auth-smoke cases with `@auth-required` or retiring non-deterministic diagnostics that do not meet auth-smoke criteria.
- [x] 2.3 Remove lane coupling in `tests/26-recent-transactions-display.spec.ts` (including any direct auth setup assumptions/imports) and make the suite explicitly no-auth-safe or mark it `@auth-required`.
- [x] 2.4 Keep `tests/e2e/auth-bypass-protected-routes.spec.ts` in the no-auth lane and add explicit assertions for bypass-on frontend access and bypass-off/unauthenticated API denial scenarios.
- [x] 2.5 Update `tests/auth.setup.ts` to document and enforce auth-lane-only intent (no implicit dependency from default lane and clear failure output for auth-lane setup issues).

## Phase 3: CI Lane Enforcement and Required Checks

- [x] 3.1 Modify `.github/workflows/ci.yml` to run no-auth and auth-required Playwright lanes as separate jobs (for example `e2e-no-auth` and `e2e-auth-required`) with distinct commands.
- [x] 3.2 Ensure `.github/workflows/ci.yml` publishes independent pass/fail status for each lane and that workflow conditions do not allow one lane to be skipped silently.
- [x] 3.3 Scope the auth-required CI lane to a stable smoke target (initially Chromium) while keeping no-auth on the broader matrix used for UI regression coverage.
- [x] 3.4 Add a CI step that runs `node scripts/testing/validate-playwright-lane.mjs` in each lane so misconfigured env flags fail before test execution.

## Phase 4: Documentation and Operational Migration

- [x] 4.1 Update `README.md` testing section to define lane contracts, canonical commands (`npm run e2e`, `npm run e2e:auth-required`), and explicit bypass safety boundaries.
- [x] 4.2 Update `tests/README.md` to document test classification/tagging rules (`@auth-required`), migration guidance for existing specs, and troubleshooting by lane.
- [x] 4.3 Add a short migration checklist in `tests/README.md` for moving a spec between lanes (selector/tag update, script selection, expected auth behavior, and CI lane mapping).

## Phase 5: Validation and Acceptance Gate

- [x] 5.1 Validate no-auth contract locally with `npm run e2e -- --project=chromium tests/e2e/auth-bypass-protected-routes.spec.ts` and confirm no login bootstrap is required.
- [x] 5.2 Validate auth-required contract locally with `npm run e2e:auth-required -- --project=chromium tests/session-persistence.spec.ts` and confirm login/session checks run with auth setup enabled.
- [x] 5.3 Run `npm run e2e -- --grep "@auth-required"` and verify no tests are selected (guard against auth-tag leakage into default lane selection).
- [x] 5.4 Run `npm run e2e:auth-required -- --grep-invert "@auth-required"` and verify no tests are selected (guard against non-auth leakage into auth lane selection).
- [x] 5.5 Execute CI-equivalent lane commands locally (`npm run e2e:ci:no-auth` and `npm run e2e:ci:auth-required`) and record results in the change notes before handoff to implementation.
