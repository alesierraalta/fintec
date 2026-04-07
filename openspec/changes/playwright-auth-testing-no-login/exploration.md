## Exploration: playwright-auth-testing-no-login

### Current State

Playwright is configured so all browser projects depend on a global `setup` project that runs `tests/auth.setup.ts` (`playwright.config.ts`). That setup performs UI login with hardcoded credentials (`test@fintec.com` / `[TEST_PASSWORD]`) and throws if still on `/auth/*`.

Running the setup in this environment reproduces the reported failure: login stays on `/auth/login` and throws `No se pudo autenticar con el usuario existente` (`tests/auth.setup.ts:58`). Because setup is a dependency for all projects by default, many unrelated tests are blocked behind this fragile authentication bootstrap.

The codebase already contains a safer no-login path: `PLAYWRIGHT_NO_AUTH_SETUP=1` skips setup and `FRONTEND_AUTH_BYPASS=1` allows frontend protected pages to render in non-production (`app/_lib/require-authenticated-user.ts`, `lib/auth/is-frontend-auth-bypass-enabled.ts`, `package.json` script `e2e:no-auth`).

### Affected Areas

- `playwright.config.ts` — global dependency on `setup` currently gates all projects.
- `tests/auth.setup.ts` — brittle UI-login bootstrap with hardcoded credentials and long waits.
- `package.json` — contains `e2e:no-auth` script, but default `e2e` still routes through setup.
- `app/_lib/require-authenticated-user.ts` — server guard where frontend bypass is applied.
- `lib/auth/is-frontend-auth-bypass-enabled.ts` — non-production + explicit-flag safety boundary.
- `tests/e2e/auth-bypass-protected-routes.spec.ts` — validates bypass behavior and API auth remains enforced.
- `tests/27-mobile-login-viewport.spec.ts` — example of tests that do not require authenticated user but still get blocked by setup dependency.

### Approaches

1. **No-auth as default test mode; isolate real-auth tests** — run Playwright suites without login setup by default, keep a small explicit authenticated suite for auth/session verification.
   - Pros: Removes primary flake/hang source; unblocks most UI tests; aligns with existing bypass safety rails.
   - Cons: Existing tests that assert specific user identity (for example `Test User`) must be refactored or tagged into auth-required suite.
   - Effort: Medium.

2. **Keep global auth setup and harden login seeding** — continue requiring setup, but create deterministic test user/session before tests.
   - Pros: Preserves current test assumptions.
   - Cons: More infra coupling; still fragile when auth provider/network changes; does not decouple unrelated tests from auth.
   - Effort: Medium/High.

3. **Hybrid projects (auth + no-auth matrix in one run)** — define separate Playwright projects for bypass and authenticated flows.
   - Pros: Clear separation in one config; gradual migration path.
   - Cons: More config complexity and potentially longer CI time.
   - Effort: Medium.

### Recommendation

Adopt Approach 1 for this change scope: make no-auth mode the default for general E2E/UI tests and move true authentication/session tests into a dedicated auth-required lane. Keep frontend bypass strictly opt-in and non-production only, and preserve API unauthorized checks to avoid masking security regressions.

### Risks

- False confidence if tests continue asserting authenticated-only UI while running in bypass mode.
- Bypass flag leakage to unintended environments if scripts/config are not explicit and documented.
- Drift between auth-required flows and no-auth flows unless the dedicated auth smoke suite is always run in CI.

### Ready for Proposal

Yes — proceed with a proposal that re-baselines Playwright to no-auth by default, defines an explicit auth-required suite, and adds CI guardrails to run both lanes.
