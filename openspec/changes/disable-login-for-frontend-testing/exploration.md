## Exploration: disable-login-for-frontend-testing

### Current State

Frontend route access is currently login-gated at multiple layers. Server components call `requireAuthenticatedUser()` and redirect to `/auth/login` when no user exists (`app/_lib/require-authenticated-user.ts`). Protected pages like `/`, `/transactions`, `/accounts`, `/reports`, and others use this guard directly.

Client auth state is managed by `AuthProvider` (`contexts/auth-context.tsx`), which reads Supabase session state and drives login/logout flows. Additional client guards also redirect to `/auth/login` (`components/auth/auth-guard.tsx`).

For testing, Playwright already supports skipping auth setup (`PLAYWRIGHT_NO_AUTH_SETUP`) in `playwright.config.ts`, but this only skips creating `playwright/.auth/user.json`; it does not bypass the app's protected-route login redirects. That means most authenticated UI flows still block when login fails or test credentials are unavailable.

### Affected Areas

- `app/_lib/require-authenticated-user.ts` — primary server-side login gate for protected frontend pages.
- `app/page.tsx` — dashboard entry point blocked by the server auth redirect.
- `app/transactions/page.tsx` — representative protected route currently requiring login.
- `contexts/auth-context.tsx` — client auth source of truth for loading/user state in UI.
- `playwright.config.ts` — existing test mode toggle that currently avoids setup but not gating.
- `tests/auth.setup.ts` — current E2E login bootstrap that can fail and block downstream flows.

### Approaches

1. **Explicit dev/test bypass flag in frontend guards (recommended)** — add a dedicated env-controlled bypass path for frontend page guards only, active in non-production workflows.
   - Pros: Directly solves blocked frontend testing, minimal and targeted surface area, controllable by environment.
   - Cons: Requires careful guardrails to prevent accidental production enablement.
   - Effort: Medium.

2. **Playwright-only auth improvements without app bypass** — keep app gating unchanged, improve setup/login robustness and fixture seeding.
   - Pros: No application auth behavior change.
   - Cons: Does not address root issue when login itself is unavailable/unreliable; still fragile for local testing.
   - Effort: Medium.

3. **Global auth bypass including API auth** — relax auth checks widely in test/dev.
   - Pros: Fastest path to unblocked UI and API testing.
   - Cons: Unsafe; high risk of masking auth bugs and weakening security boundaries.
   - Effort: Low.

### Recommendation

Use Approach 1 with strict safety constraints: implement an explicit, opt-in frontend-only bypass for non-production test/dev execution and keep API/server security enforcement intact outside that scoped path. Do not alter production behavior, and fail closed by default.

### Risks

- Bypass flag leakage into production environment could unintentionally expose protected UI routes.
- Divergence between bypassed frontend behavior and real authenticated production behavior can hide auth-related regressions.
- If bypass covers too much (for example API auth helpers), tests may pass while security contracts silently regress.

### Ready for Proposal

Yes — proceed with proposal scoped to frontend login bypass in development/testing only, with explicit production safeguards and rollback criteria.
