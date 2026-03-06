# Proposal: Make No-Auth Playwright the Default Test Lane

## Intent

Stabilize and speed up Playwright feedback by removing fragile UI-login bootstrap from the default path. Most UI and routing coverage should run without auth setup, while true authentication/session behavior is validated in an explicit auth-required lane.

## Scope

### Goals

- Make no-auth execution the default for Playwright local and CI-oriented workflows.
- Isolate real-auth coverage into an explicit, named lane with focused smoke tests.
- Preserve security confidence by keeping backend/API unauthorized checks covered when bypass mode is enabled.

### In Scope

- Rebaseline Playwright project/dependency setup so `tests/auth.setup.ts` is not a universal prerequisite.
- Update npm scripts and test-selection conventions (naming/tagging/project split) to clearly separate no-auth and auth-required suites.
- Add or adjust targeted tests that verify frontend bypass behavior and auth-required smoke behavior.
- Add CI guardrails that run both lanes explicitly (fast no-auth lane + smaller auth-required lane).
- Document lane usage, required flags, and failure triage expectations.

### Non-Goals

- Replacing Supabase/Auth provider implementation or redesigning product authentication.
- Weakening API authentication, RLS, or server-side authorization behavior.
- Expanding auth-required lane into full parity with all no-auth scenarios in this change.

## Constraints

- Frontend auth bypass remains opt-in and non-production only.
- Auth bypass must not apply to API auth checks.
- Existing tests that assert authenticated identity must be moved/refactored, not silently run in bypass mode.
- Default developer command should be deterministic and should not require seeded credentials.

## Approach

Use a two-lane Playwright strategy:

1. **Default lane (no-auth):** skip global auth setup and run with explicit bypass flags where frontend route guards would otherwise redirect.
2. **Auth-required lane:** run only tests that validate login/session/authenticated identity, using dedicated setup/storage state and explicit invocation.
3. **Selection contract:** enforce lane intent through naming/tagging/project config so tests cannot accidentally execute in the wrong lane.
4. **CI contract:** run both lanes as separate steps/jobs, with no-auth as broad coverage and auth-required as focused regression coverage.

## Affected Areas

| Area                                             | Impact            | Description                                                                                                                       |
| ------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `playwright.config.ts`                           | Modified          | Change default dependency/storage-state behavior so auth setup is no longer global; define explicit auth-required execution lane. |
| `package.json`                                   | Modified          | Make default e2e script no-auth-oriented and add explicit auth-required script(s).                                                |
| `tests/auth.setup.ts`                            | Modified          | Restrict setup usage to auth lane and reduce coupling to unrelated tests.                                                         |
| `tests/e2e/auth-bypass-protected-routes.spec.ts` | Modified/Verified | Keep bypass safety checks and API unauthorized assertions as guardrails.                                                          |
| `tests/session-persistence.spec.ts`              | Modified/Tagged   | Ensure session/login coverage is explicitly auth-lane scoped.                                                                     |
| `.github/workflows/ci.yml`                       | Modified          | Add explicit execution of both no-auth and auth-required lanes.                                                                   |
| `docs/` or test runbook files                    | Modified          | Document lane purpose, flags, and troubleshooting flow.                                                                           |

## Risks

| Risk                                                                                    | Likelihood | Mitigation                                                                                   |
| --------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| Auth-dependent tests silently run in no-auth lane and give misleading pass/fail signals | Med        | Enforce lane tagging/naming rules and fail fast when auth assertions appear in no-auth lane. |
| Bypass flags are overused outside intended environments                                 | Low/Med    | Keep bypass gated by non-production checks and explicit env flags; document approved usage.  |
| Auth lane becomes flaky and ignored over time                                           | Med        | Keep auth lane intentionally small, stable, and mandatory in CI.                             |
| CI duration increases due to dual-lane execution                                        | Low        | Keep auth lane scoped to smoke/auth-critical scenarios; run in parallel where possible.      |

## Rollout Strategy

Roll out in three phases: (1) introduce lane split and keep current defaults temporarily for validation, (2) flip default to no-auth with auth lane explicitly required in CI, (3) prune legacy assumptions and finalize documentation once both lanes are stable for consecutive runs.

## Rollback Plan

If instability or coverage gaps are detected, revert script/config lane defaults to previous auth-setup-first behavior, restore broad dependency on `setup`, and keep bypass tests as verification-only. Re-run smoke checks to confirm previous baseline behavior before reattempting lane separation.

## Dependencies

- Existing bypass guard implementation in `lib/auth/is-frontend-auth-bypass-enabled.ts` and `app/_lib/require-authenticated-user.ts`.
- Playwright project/dependency features for project-scoped setup.
- CI environment variable support for explicit lane execution.

## Success Criteria

- [ ] Default `npm run e2e` path runs without requiring UI login bootstrap credentials.
- [ ] Auth-required tests run only via explicit command/project/lane and pass independently.
- [ ] No-auth lane retains API unauthorized coverage to prevent masked security regressions.
- [ ] CI executes both lanes and reports them as distinct checks.
- [ ] Flake/blocking incidents related to global auth setup materially decrease after migration.
