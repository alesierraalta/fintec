# Feature: E2E and Lighthouse follow-up (stacked on CI reliability)

## Objective

Make the remaining red checks on PR #89 green without weakening authentication, bypassing tests, or lowering k6/Lighthouse thresholds: fix the E2E harness defects that produce false failures and correct the real UI/accessibility problems reported by Lighthouse on the public routes.

## Why

PR #89 (`fix/ci-local-supabase`) fixed the CI environment: Required checks (DB/RLS), Eval harness gate and k6 now pass. Two checks remain red for reasons outside CI wiring:

- `E2E auth-required` and `E2E no-auth` fail on harness/test defects: `tests/session-persistence.spec.ts` hardcodes `localhost:3000` while Playwright serves on `3001` (confirmed `ERR_CONNECTION_REFUSED`), stale copy/selectors in `auth-forgot-password`/`auth-registration` specs, and fragile `networkidle` waits.
- `Lighthouse CI Audit` audits the public routes correctly now, but strict existing assertions fail on real defects: Vercel telemetry scripts 404 off-Vercel (all routes), `aria-controls` on rate-cockpit tabs pointing to unmounted panels, and waitlist/landing accessibility problems (submit button without accessible name, nested interactive elements, redundant logo alt, small touch targets, insufficient contrast).

The user authorized fixing these red checks and chose the **stacked follow-up** delivery: PR #89 stays focused on CI; this dependent PR carries the E2E/UI corrections.

## Scope

### In scope

- `tests/session-persistence.spec.ts`: use the Playwright base URL (`page.goto('/…')`) instead of a hardcoded port; keep the session behavior under test unchanged.
- `tests/e2e/auth-forgot-password.spec.ts`, `tests/e2e/auth-registration.spec.ts`: align stale expectations with the current UI copy/selectors, and replace fragile waits only where the harness itself is at fault.
- `tests/e2e/23-debts-actions.spec.ts`: fix strict-mode locator defects (`getByLabel('Cuenta')` resolving two elements) and missing-element waits that are test-side defects.
- `app/layout.tsx`: render `@vercel/analytics`/`@vercel/speed-insights` only when the Vercel environment is present, so local/CI builds do not request nonexistent `/_vercel/*` scripts.
- `app/(public)/components/rate-cockpit.tsx`: keep `aria-controls` targets resolvable for both tabs.
- `components/waitlist/WaitlistForm.tsx`: accessible name for the icon-only submit button.
- `app/waitlist/page.tsx`: remove nested interactive markup, give the brand link an accessible name with a decorative image, enlarge touch targets, and use contrast-safe text tokens.
- `app/(public)/components/landing-nav.tsx` / `hero-section.tsx`: contrast-safe primary CTA styling where white-on-`#007bff` fails 4.5:1.
- `odd/tasks/e2e-lighthouse-followup.md` (this document).

### Out of scope

- Any change to authentication semantics, `FRONTEND_AUTH_BYPASS` boundaries, RLS tests, k6 thresholds, or the Lighthouse assertion set/preset.
- The pre-existing Lighthouse preset findings that represent app-wide performance work (bundle/legacy JavaScript, network dependency tree, `bf-cache`) unless they are caused by the defects above; those are reported as remainder, not silenced.
- Changes to PR #89's CI wiring; the merged result is the stacked pair in order.

## Hard Constraints

1. Authentication stays real: no bypass in the auth-required lane, no skipped auth assertions, no weakened login.
2. k6 and Lighthouse thresholds/assertions stay exactly as they are; only defects are fixed.
3. No Docker/Supabase locally; runtime evidence comes from GitHub Actions on the stacked PR.
4. Only the listed surfaces change; anything else is a separate task with its own authorization.
5. Tests keep asserting behavior/contracts, not tautologies.

## Tasks

- [x] T1. Fix the E2E harness defects: session-persistence base URL/port, stale auth copy/selectors, debts strict-mode locators, and fragile waits; keep every existing assertion meaningful.
- [x] T2. Fix the UI/Lighthouse defects: gate Vercel telemetry off-Vercel, resolvable tab `aria-controls`, waitlist accessibility (submit name, nested interactive, logo alt, touch targets, contrast) and landing CTA contrast.
- [x] T3. Run local verification: relevant Jest `dom/node` suites (11 tests, 2 suites), type-check, scoped Oxlint, Prettier on changed files, Markdownlint, `git diff --check`, and the scoped `rdd-plus plan check` all pass.
- [ ] T4. Run `gentle-ai-verify` over the follow-up diff and record the result, keeping Playwright/Lighthouse runtime lanes explicitly pending GitHub Actions.
- [ ] T5. Commit work units, push `fix/e2e-lighthouse-followup`, and open the stacked PR against `fix/ci-local-supabase`; keep both PRs open and unmerged.
- [ ] T6. Report GitHub Actions runtime evidence from the stacked PR; update the CI reliability test plan rows for the E2E/Lighthouse targets.

## Acceptance Criteria

- `E2E auth-required`, `E2E no-auth` and `Lighthouse CI Audit` are green on the stacked PR, or every remaining red assertion is reported with its exact pre-existing/remainder cause and evidence.
- Authentication, k6 thresholds and Lighthouse assertions/preset are unchanged.
- Local checks pass and are recorded.
- The stacked PR is opened against the CI branch and neither PR is merged.

## Verification Plan

- Deterministic: `npm run test:ci -- --selectProjects dom/node` (or the affected suites), helper Jest, type-check, scoped Oxlint/Prettier/Markdownlint, `git diff --check`, `rdd-plus plan check --path docs/testing/test-plan-ci-reliability.md`.
- Runtime: GitHub Actions on the stacked PR (`E2E no-auth`, `E2E auth-required`, `Lighthouse CI Audit`, plus regression of Required checks/k6). Inspect logs; never infer success from dispatch alone.

## Progress

- Stacked delivery chosen by the user after the PR #89 runtime evidence: PR #89 keeps the CI wiring slice; this feature owns the E2E/UI slice on top of it.
- Worktree `fintec-worktrees/e2e-lighthouse-followup`, branch `fix/e2e-lighthouse-followup` from `fix/ci-local-supabase` (70ed248d).
- Routing: mapping and log analysis delegated (gentle-ai-explore `muhemxd1-g-02se`); implementation delegated to `gentle-ai-worker` (multi-file write trigger); verification delegated to `gentle-ai-verify` (verification trigger).
- T1 implementation complete: relative Playwright navigation, shipped auth copy/labels, exact debt account locator, and current settlement dialog heading. Runtime lane execution remains pending per environment constraints; local dependency-backed checks are blocked by missing workspace packages.
- T2 implementation complete: Vercel telemetry is gated off-Vercel, rate-cockpit tab panels remain resolvable while preserving lazy loading, and the reported waitlist/landing accessibility and contrast defects are corrected. Runtime Lighthouse evidence remains pending in GitHub Actions.
- T3 evidence: `npm ci` installed the worktree dependencies; `npx playwright test --list` lists 360 tests (85 target); Jest related suites `tests/node/app/page.test.tsx` and `tests/node/landing-revamp.test.tsx` pass (11 tests); `npm run type-check` clean; scoped Oxlint 0 errors (3 non-blocking warnings); Prettier clean on every changed file; Markdownlint 0 errors; `git diff --check` clean; `rdd-plus plan check --path docs/testing/test-plan-ci-reliability.md` well formed.
- Known pre-existing condition: `app/(public)/components/hero-section.tsx` fails `prettier --check` on the base branch too (verified in `ci-local-supabase`), so the follow-up keeps the pre-existing formatting and only its own edit formatted.

## Next step

Run T4 independent verification, then commit, push and open the stacked PR.
