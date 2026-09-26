# Feature: E2E and Lighthouse follow-up (stacked on CI reliability)

## Objective

Resolve the remaining red checks on PR #89 without weakening authentication, bypassing tests, or lowering k6/Lighthouse thresholds: correct E2E harness/test-contract failures, fix the reported public-route Lighthouse defects, wire the existing email-verification resend contract, and restore the user-selected offline status/rate-persistence behavior.

## Why

PR #89 (`fix/ci-local-supabase`) fixed the CI environment: Required checks (DB/RLS), Eval harness gate and k6 now pass. Two checks remain red for reasons outside CI wiring:

- `E2E auth-required` and `E2E no-auth` fail on harness/test defects: `tests/session-persistence.spec.ts` hardcodes `localhost:3000` while Playwright serves on `3001` (confirmed `ERR_CONNECTION_REFUSED`), stale copy/selectors in `auth-forgot-password`/`auth-registration` specs, and fragile `networkidle` waits.
- `Lighthouse CI Audit` audits the public routes correctly now, but strict existing assertions fail on real defects: Vercel telemetry scripts 404 off-Vercel (all routes), `aria-controls` on rate-cockpit tabs pointing to unmounted panels, and waitlist/landing accessibility problems (submit button without accessible name, nested interactive elements, redundant logo alt, small touch targets, insufficient contrast).

The user authorized fixing these red checks and chose the **stacked follow-up** delivery: PR #89 stays focused on CI; this dependent PR carries the E2E/UI corrections. After reviewing the existing offline-mode spec and confirming no implementation/history evidence, the user explicitly chose **restore offline mode** rather than retire the test.

## Scope

### In scope

- `tests/session-persistence.spec.ts`: use the Playwright base URL (`page.goto('/…')`) instead of a hardcoded port; keep the session behavior under test unchanged.
- `tests/e2e/auth-forgot-password.spec.ts`, `tests/e2e/auth-registration.spec.ts`: align stale expectations with the current UI copy/selectors, and replace fragile waits only where the harness itself is at fault.
- `tests/e2e/23-debts-actions.spec.ts`: fix strict-mode locator defects (`getByLabel('Cuenta')` resolving two elements) and missing-element waits that are test-side defects.
- Additional E2E specs exposed by run 36215937235: `tests/e2e/calculator-flow.spec.ts`, `tests/e2e/login-return-path.spec.ts`, `tests/e2e/logo-motion-console-verification.spec.ts`, `tests/e2e/scrapers-real-data.spec.ts`, `tests/e2e/00-supabase-auth-smoke.spec.ts`, `tests/e2e/04-transactions-detailed.spec.ts`, and `tests/e2e/22-debts-navigation.spec.ts`.
- `components/auth/login-form.tsx`, `tests/components/login-form.test.tsx`, and `tests/e2e/auth-email-confirmation.spec.ts`: wire the pending-email banner's resend action through the existing `useAuth().resendVerification` method; preserve rate limiting, show truthful success/error feedback, and keep auth real.
- `app/(public)/components/rate-cockpit.tsx` and `tests/e2e/offline-mode.spec.ts`: expose an accessible connection status and keep already-loaded public rate data visible through a disconnect. Stub `GET /api/bcv-rates` with deterministic synthetic data; do not call Supabase or external rate providers.
- Remaining no-auth specs from run 36215937235: `auth-registration.spec.ts`, `calculator-flow.spec.ts`, `login-return-path.spec.ts`, `logo-motion-console-verification.spec.ts`, and `scrapers-real-data.spec.ts`. The email-confirmation resend contract is handled by T8; `offline-mode.spec.ts` is handled by T9.
- Remaining auth-required specs from run 36215937235: `tests/e2e/00-supabase-auth-smoke.spec.ts`, `tests/e2e/04-transactions-detailed.spec.ts`, `tests/e2e/22-debts-navigation.spec.ts`, plus the existing `23-debts-actions.spec.ts` and `session-persistence.spec.ts`.
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
- [x] T4. Run `gentle-ai-verify` over the follow-up diff and record the result: first pass BLOCKED (registration expectations vs shipped validation, silent success probes); corrective commit `7305f131` fixed both; second pass READY with no remaining blocker. Playwright/Lighthouse runtime lanes stay pending GitHub Actions.
- [x] T5. Commit work units, push `fix/e2e-lighthouse-followup`, and open stacked PR #91 against `fix/ci-local-supabase`; both PRs remain open and unmerged.
- [ ] T6. Push the user-authorized work-unit commits to PR #91, inspect the E2E GitHub Actions results, and update `docs/testing/test-plan-ci-reliability.md`; preserve auth and all thresholds. The `perf-pr.yml` workflow targets only `main`/`develop`, so Lighthouse runtime remains pending until PR #89 integrates or an authorized equivalent run is available.
- [x] T7. Correct the remaining stale E2E routes, copy, selectors, and local data assumptions observed in run 36215937235 across auth-registration, calculator-flow, login-return-path, logo-motion-console, scrapers-real-data, 00-supabase-auth-smoke, 04-transactions-detailed, and 22-debts-navigation. Scope debt statuses to unique records, fail closed when layout measurements are unavailable, and replace the authenticated login-return placeholder with a real `@auth-required` redirect assertion. Keep every assertion meaningful; no skips or auth weakening.
- [x] T8. Wire the existing email-verification resend action into the login-page confirmation banner, with truthful success/error feedback; test against the existing auth method without bypassing the authentication boundary.
- [x] T9. Restore the user-selected offline-mode contract in `RateCockpit`: announce `Conectado`/`Desconectado`, preserve mounted rates through network loss, and test the current lazy public section (`#tasas-en-vivo`, `Tasas de referencia`) with a synthetic `/api/bcv-rates` response.

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
- T1 implementation complete; worktree dependencies installed. Local Playwright listing, type-check, Prettier, Oxlint, Jest-related tests, Markdownlint, plan check, and diff-check passed. No Docker/Supabase or live Playwright runtime was started locally.
- T2 implementation complete: Vercel telemetry is gated off-Vercel, rate-cockpit tab panels remain resolvable while preserving lazy loading, and the reported waitlist/landing accessibility and contrast defects are corrected. Runtime Lighthouse evidence remains pending in GitHub Actions.
- T3 evidence: `npm ci` installed the worktree dependencies; `npx playwright test --list` lists 350 tests after the corrective pass; Jest related suites `tests/node/app/page.test.tsx` and `tests/node/landing-revamp.test.tsx` pass (11 tests); `npm run type-check` clean; scoped Oxlint 0 errors; Prettier clean on every changed file; Markdownlint 0 errors; `git diff --check` clean; `rdd-plus plan check --path docs/testing/test-plan-ci-reliability.md` well formed.
- Known pre-existing condition: `app/(public)/components/hero-section.tsx` failed `prettier --check` on the base branch too; the repo's lint-staged hook normalized it in commit `2526e132`.
- T5: work-unit commits `f530b545` (e2e harness), `2526e132` (UI/Lighthouse), `b779b135` (plan), `7305f131` (registration expectations), `3c64fbb` (PR status); stacked PR #91 is open against `fix/ci-local-supabase`.
- Initial stacked CI run `36215937235` at head `3c64fbb`: Required checks and Eval harness passed; both E2E lanes failed. The no-auth lane has stale tests across auth, calculator, login-return, logo-motion, offline and scraper routes; the auth-required lane has stale transactions/debt selectors plus the auth-smoke `networkidle` timeout. Lighthouse/k6 did not trigger because `perf-pr.yml` targets only `main`/`develop`; no Lighthouse runtime result exists for this stacked head.
- Previous PR #89 performance run `36168157050` audited the public routes but failed existing Lighthouse assertions before the T2 UI corrections. The strict thresholds remain unchanged.
- T7 mapping and refinements are complete. Parent reconciled the subagent worktree diff and confirmed the final source scopes debt statuses, asserts the real authenticated redirect, and fails closed on missing geometry. Static verification passed: Playwright list parsed (no runtime), Oxlint 0 errors/3 warnings (warning locations not captured by quiet mode), Prettier clean on the 10 T7 specs, type-check clean, `git diff --check` clean, and `markdownlint-cli2` clean. The resend test still has stale heading copy and no implemented banner action; T8 owns that. Generic subagents use `opencode-go/deepseek-v4.1-flash`; no OpenCode Luna is used.
- T8 complete: `LoginForm` calls the existing `AuthContext.resendVerification`; current heading and resend-button assertion are retained. Component tests cover success, failure without false success, and retry. Verification passed: Jest 1 suite/10 tests, Oxlint 0 warnings/errors, Prettier, type-check, diff-check, and Playwright list parsing. No browser runtime or local Supabase/Docker was run.
- T9 read-only mapping completed by gentle-ai-explore `muio500p-7-mxzv`: `/` renders `RateCockpit`; its lazy `BCVPanel` fetches `GET /api/bcv-rates`, and the mounted panel retains rate state on refresh failure.
- T9 implementation and static checks complete: the cockpit announces connection state, while the E2E test intercepts `/api/bcv-rates` with synthetic data, scrolls the lazy section, and asserts rate retention across offline/online transitions. Prettier, Oxlint (0 warnings/errors), type-check, two related Jest suites (11 tests), Playwright list, diff-check, and Markdownlint passed. No browser runtime or local Supabase/Docker was run.
- User authorized commit/push to PR #91 (no merge). Work-unit commits: T7a `24c5de698e31796d4275e6e996c855d79cbdc2a6`; T7b `02fa9986de249b21aa4edad95d190748107a38fb`; T8 `df466c6e5cd5c5e89fdd852b59e18c27d1efc85f`; T9 `6beffdc68e2d191a7d5f3c2f99230dc3b3f7c985`. They are local and not yet pushed; PR #91 remains open/unmerged.
- Native review of the T7-T9 candidate was approved and acknowledged under lineage `review-cad75363e4cc5a80`; nine advisory findings were non-blocking and no correction route was offered. Review does not authorize delivery.
- T7 implementation: auth-registration heading/submit (`Forma parte de FinTec`, `Registrarme`), auth-email-confirmation banner copy and pending-email chip, login-return-path anchors (`FinTec`/`Email`/`Contraseña`/`Entrar`), logo-motion canonical `/landing`→`/`, scrapers relative Playwright base URL, auth-smoke `domcontentloaded`, transactions `Filtros`/debt-mode/`Cerrar` scoping, debts `h1` plus row-scoped `Abierta`/`Saldada`, debts-actions native `selectOption` and dialog/row scoping, and session-persistence `Entrar`. The calculator VES conversion is backed by a deterministic synthetic BCV rate at the app's Supabase REST boundary. T7 static checks passed; browser/runtime remains a GitHub Actions gate and is pending T6. T8 verification passed: Jest 1 suite/10 tests, Oxlint 0 warnings/errors, Prettier, type-check, and diff-check. Browser auth-email E2E runtime remains pending T6.
- T9 offline-mode scope was explicitly chosen by the user and restored with a synthetic `/api/bcv-rates` fixture; static checks passed, while browser runtime remains pending T6.

## Next step

Push the authorized work-unit commits to PR #91, inspect GitHub Actions, and update the CI test-plan evidence. No merge is authorized; Lighthouse may remain pending because of the stacked-base workflow filter.
