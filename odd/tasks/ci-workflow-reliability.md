# Feature: CI Workflow Reliability with Local Supabase

## Objective

Make FinTec's required GitHub Actions checks deterministic without contacting `example.supabase.co` or a shared production/test tenant. Keep the auth-required E2E lane meaningful, run RLS tests against the committed local Supabase baseline, and make performance checks target reachable public routes without weakening thresholds.

## Why

PR #88 exposed existing baseline failures on `main` (`8458b23e`): auth-required setup and required Jest checks resolve `example.supabase.co` (DNS `ENOTFOUND`), k6 uses the same placeholder, and Lighthouse audits a non-existent `/dashboard` route. The user authorized a separate CI-reliability PR; PR #88 remains focused and unmerged.

## Scope

### In scope

- `.github/workflows/ci.yml`: required-checks and Playwright lanes.
- `.github/workflows/perf-pr.yml`: local Supabase environment for build/server/k6 and reachable Lighthouse paths.
- Minimal CI-only test provisioning/configuration needed to create the synthetic canonical user in the local Supabase stack.
- A small shared helper/action for exporting local Supabase values only if it reduces duplication and fails closed.
- `docs/testing/test-plan-ci-reliability.md` and this ODD task document.

### Out of scope

- Any edits to PR #88's P2P behavior or merging PR #88.
- Real/shared Supabase credentials, production data, cloud enrollment, or remote service mutations.
- Disabling required checks, bypassing the auth-required lane, skipping RLS tests, or loosening k6/Lighthouse thresholds to obtain green CI.
- Broad refactors of application auth or repository behavior.

## Hard Constraints

1. CI integration tests use the repository's isolated local Supabase baseline (`supabase/config.toml`), not placeholder external URLs or shared tenants.
2. Auth-required Playwright remains authenticated: provision only a synthetic canonical user in the local stack via the existing helper; do not enable `FRONTEND_AUTH_BYPASS` in that lane.
3. k6 and Lighthouse build/server processes use the same local Supabase environment; cleanup runs with `if: always()` and `supabase stop --no-backup`.
4. Lighthouse targets must exist and be public in an unauthenticated run; do not weaken existing thresholds.
5. Preserve the unrelated dirty state in the original `feat/landing-design-refresh` worktree.
6. CI-only local credentials must be sourced from the existing local test configuration and never printed or treated as secrets.

## Tasks

- [x] T1. Map CI failures, workflow jobs, auth fixture, local Supabase config, and current test-runner boundaries.
- [x] T2. Design and test a fail-closed local Supabase environment export used by CI jobs; keep values local-only.
- [x] T3. Wire the local stack into `required-checks` and E2E jobs; provision the canonical local auth user without bypassing auth.
- [x] T4. Wire the local stack into Performance PR checks; keep the k6 smoke assertions and target only reachable Lighthouse routes.
- [x] T5a. Run local `dom/node` suites, helper tests, type-check, lint, Prettier, diff-check, and `rdd-plus plan check`; record evidence.
- [ ] T5b. Run required DB/RLS, auth E2E, k6, and Lighthouse on GitHub Actions; local Docker/Supabase was intentionally not started.
- [ ] T6. Review the isolated diff, run native review on the work-unit/PR slice, and open a separate PR to `main`.

## Acceptance Criteria

- `required-checks` DB/RLS tests use the local Supabase stack and do not make requests to `example.supabase.co`.
- The no-auth lane uses its intended bypass only for no-auth tests and can reach any backend dependency locally.
- The auth-required lane signs in through local GoTrue with a synthetic canonical user, bootstraps fixtures, and does not use auth bypass.
- K6 smoke uses local Supabase, reports real endpoint observations, and does not pass by skipping all assertions or changing thresholds.
- Lighthouse receives no 404 for configured routes; the route set is valid without authentication.
- All local checks are observed; remote CI status is reported accurately. Any remaining blocked external requirement is explicit.
- The PR is isolated from PR #88 and contains only CI-reliability changes.

## Verification Plan

- Unit/integration: the existing Jest `db` project against the local Supabase seed baseline; existing auth helper tests; workflow/helper tests if a helper is added.
- Static: `npm run type-check`, `npm run lint`, secret scan, and workflow YAML validation.
- Real run: GitHub Actions on the CI PR; inspect E2E auth setup, required DB/RLS suite, k6 smoke, and Lighthouse results. Do not infer success from workflow dispatch alone.

## Progress

- Baseline failure class confirmed in both PR #88 and `main` at `8458b23e`.
- Read-only CI scout: placeholder Supabase values prevent real DB/Auth calls; `eval-gate` already demonstrates a local Supabase job; `/dashboard` is not a route.
- Clean worktree: `fix/ci-local-supabase` from `origin/main`.
- Implemented the local Supabase action, loopback-only environment export/provisioning guard, CI lane wiring, and reachable Lighthouse route list; thresholds are unchanged.
- Local verification: 293 `dom/node` suites passed, 2,092 tests passed (3 suites and 12 tests skipped); helper 5/5; oxlint, type-check, Prettier, diff-check, and `rdd-plus plan check` passed.
- The helper CLI completed with `GITHUB_ENV=/dev/null`; no Docker/Supabase was started locally. DB/Auth/k6/Lighthouse integration remains pending the ephemeral GitHub runner.
