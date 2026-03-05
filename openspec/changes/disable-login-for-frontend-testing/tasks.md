# Tasks: Disable Login for Frontend Testing

## Phase 1: Foundation and Safety Rails

- [x] 1.1 Create `lib/auth/is-frontend-auth-bypass-enabled.ts` with a strict parser for truthy values (`1`, `true`, `yes`) and non-production enforcement.
- [x] 1.2 Add unit tests for the helper in `tests/node/lib/auth/is-frontend-auth-bypass-enabled.test.ts` covering dev/test/prod plus truthy/falsy and malformed values.
- [x] 1.3 Document the new `FRONTEND_AUTH_BYPASS` env variable and safe-usage note in `README.md` or `docs/testing/` entry used by Playwright workflows.

## Phase 2: Server Guard Integration

- [x] 2.1 Modify `app/_lib/require-authenticated-user.ts` to call `isFrontendAuthBypassEnabled()` only when Supabase user lookup returns unauthenticated/error.
- [x] 2.2 Keep redirect fail-closed path in `app/_lib/require-authenticated-user.ts` so unauthenticated requests still redirect to `/auth/login` when bypass is disabled.
- [x] 2.3 Add node unit tests in `tests/node/app/_lib/require-authenticated-user.test.ts` for spec scenario "Default behavior remains login-gated when bypass is not enabled".
- [x] 2.4 Add node unit tests in `tests/node/app/_lib/require-authenticated-user.test.ts` for spec scenario "Production runtime rejects bypass activation".

## Phase 3: Test Runner and E2E Wiring

- [x] 3.1 Update `package.json` script `e2e:no-auth` to set both `PLAYWRIGHT_NO_AUTH_SETUP=1` and `FRONTEND_AUTH_BYPASS=1`.
- [x] 3.2 Update `playwright.config.ts` comments/config docs so no-auth mode clearly maps to setup skip plus frontend guard bypass behavior.
- [x] 3.3 Create `tests/e2e/auth-bypass-protected-routes.spec.ts` to verify unauthenticated access to protected pages works only in no-auth bypass mode (spec scenario "Protected page renders without login redirect when bypass is explicitly enabled").
- [x] 3.4 Extend `tests/e2e/auth-bypass-protected-routes.spec.ts` to verify auth-protected API endpoints still reject unauthenticated requests (spec scenario "API auth contract is unchanged when bypass is enabled").

## Phase 4: Verification and Guardrails

- [x] 4.1 Run `npm run test -- tests/node/lib/auth/is-frontend-auth-bypass-enabled.test.ts tests/node/app/_lib/require-authenticated-user.test.ts` and fix failures.
- [ ] 4.2 Run `npm run e2e:no-auth -- --project=chromium tests/e2e/auth-bypass-protected-routes.spec.ts` to verify bypass workflow.
- [ ] 4.3 Run one authenticated E2E smoke (`npm run e2e -- --project=chromium tests/10-authentication-analysis.spec.ts`) to confirm default auth path remains intact.
- [ ] 4.4 Confirm rollback path by temporarily disabling `FRONTEND_AUTH_BYPASS` in local env and verifying protected routes redirect to `/auth/login`.
