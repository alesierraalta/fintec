# Proposal: Disable Login for Frontend Testing

## Intent

Unblock frontend development and test workflows that are currently stalled by login/session setup failures, while preserving production authentication guarantees.

## Scope

### In Scope

- Add an explicit, opt-in bypass mode for frontend login gating in non-production environments.
- Apply bypass only to frontend route-protection flow used for page rendering and navigation redirects.
- Add test/dev documentation and verification checks to ensure production auth behavior remains unchanged when bypass is off.

### Out of Scope

- Disabling or weakening API authentication/authorization checks.
- Changing Supabase auth policies, RLS, or backend identity validation logic.
- Replacing the existing login/signup UX or rebuilding auth architecture.

## Requirements and Scenarios

1. **Requirement: Non-production explicit opt-in only**
   - Scenario: With bypass flag enabled in local/test environment, protected frontend pages load without redirecting to `/auth/login`.
   - Scenario: Without bypass flag, current login redirect behavior remains unchanged.

2. **Requirement: Production remains fail-closed**
   - Scenario: In production runtime, bypass is ignored even if misconfigured flag values are present.
   - Scenario: Unauthenticated users in production are still redirected to `/auth/login` for protected routes.

3. **Requirement: Backend auth integrity preserved**
   - Scenario: API endpoints that require auth still return unauthorized responses when no valid auth context is provided.
   - Scenario: No changes are introduced to server-side API auth helpers that validate bearer/session tokens.

## Approach

Implement a centralized `isFrontendAuthBypassEnabled` decision path with strict guards (environment + explicit flag). Use it in frontend page gating logic (for example `requireAuthenticatedUser`) to bypass redirect only during intended development/testing workflows.

Keep backend/API auth enforcement untouched. Add focused tests or assertions for both paths: bypass-enabled non-production behavior and default/production behavior. Ensure default remains secure and no-op unless explicitly enabled.

## Affected Areas

| Area                                                                      | Impact               | Description                                                                            |
| ------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| `app/_lib/require-authenticated-user.ts`                                  | Modified             | Add guarded bypass branch for frontend page auth redirects in dev/test mode.           |
| `lib/auth/` (new helper file)                                             | New                  | Centralize environment + flag checks to prevent accidental broad bypass usage.         |
| `app/page.tsx` and other protected pages using `requireAuthenticatedUser` | Verified             | Confirm route behavior changes only when bypass is enabled.                            |
| `playwright.config.ts` / `package.json` scripts                           | Potentially Modified | Align E2E dev/test workflow with the new bypass flag when running frontend-only tests. |
| `tests/` (targeted auth-gating tests)                                     | Modified             | Add/adjust tests to assert bypass scope and production-safe behavior.                  |

## Risks

| Risk                                                                 | Likelihood | Mitigation                                                                                |
| -------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| Bypass accidentally active in production                             | Low        | Hard-block bypass when runtime is production; add explicit guard tests and safe defaults. |
| Frontend tests miss real auth regressions because bypass is overused | Medium     | Keep bypass opt-in per workflow, maintain a separate suite with real auth enabled.        |
| Scope creep into API auth code weakens security posture              | Low        | Restrict implementation to frontend gating modules; no changes in API auth helpers.       |

## Rollback Plan

Revert bypass-related changes in `app/_lib/require-authenticated-user.ts`, remove the bypass helper/flag wiring, and restore existing login redirect behavior for all environments. Verify with targeted smoke checks that unauthenticated protected routes redirect to `/auth/login` again.

## Dependencies

- Existing frontend route guard usage of `requireAuthenticatedUser` across protected pages.
- Environment variable management for local/test execution.
- Existing Playwright workflow (`PLAYWRIGHT_NO_AUTH_SETUP`) for E2E runs.

## Success Criteria

- [ ] In local/test workflows with explicit bypass enabled, frontend protected routes are testable without manual login.
- [ ] In default mode (no bypass flag), current login gating behavior is unchanged.
- [ ] In production mode, bypass cannot be enabled and protected routes still require authentication.
- [ ] Auth-required API endpoints continue to reject unauthenticated access exactly as before.
