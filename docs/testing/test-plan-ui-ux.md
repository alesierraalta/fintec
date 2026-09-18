# Test plan — FinTec UI/UX modernization pilot

Created: 2026-09-18 · Last updated: 2026-09-18 · Plan path: `docs/testing/test-plan-ui-ux.md` · Sandbox: existing local dev server + Playwright Chromium · Findings precision: 6 / 6 rows with a verdict
Baseline: `HEAD` before pilot · untracked files: existing repository work in progress preserved · fingerprint: `91c80dbe4dfeef22ce5d656635bbfce70e018a09964b1e4137ce685487de9f09`

This is a bounded UI/runtime plan beside the existing receipt-scanner plan. It does not replace or rewrite `docs/testing/test-plan.md`.

## Inventory

| Surface              | Entry points                                       | Owner module                                                              | Notes                                                                  |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| App shell/navigation | `/`, `/transactions`, header, mobile nav, add menu | `components/layout/*`, `components/transactions/add-transaction-menu.tsx` | Desktop/mobile responsive contract and primary action                  |
| Dashboard            | `/` in authenticated/no-auth bypass lane           | `components/dashboard/*`                                                  | Summary hierarchy, empty state, recent transactions                    |
| Transactions         | `/transactions`, filters, search, empty state      | `app/transactions/transactions-page-client.tsx`                           | Filter-aware no-results and first-use empty state                      |
| Add transaction      | `/transactions/add`, header/FAB navigation         | `components/transactions/*`                                               | Route reachability; authenticated save remains limited in no-auth lane |
| Batch receipts       | `/transactions?action=batch`                       | `components/receipts/batch-receipt-uploader-modal.tsx`                    | Select/process/review, safe areas, modal focus, reduced motion         |
| Shared overlays      | Modal/dialog/sheet                                 | `components/ui/modal.tsx`                                                 | Unique IDs, focus containment/return, Escape/native back               |
| Frontend stack       | package manifests and resolved modules             | `package.json`, `package-lock.json`, `pnpm-lock.yaml`                     | Audit only; no dependency upgrade in pilot                             |

## Ranked targets

| Target                                   | Blast radius | Churn / past fixes           | Consequence class            | Existing evidence                  | Altitude            | Target rung | Sibling skill         | Verdict | Status |
| ---------------------------------------- | ------------ | ---------------------------- | ---------------------------- | ---------------------------------- | ------------------- | ----------- | --------------------- | ------- | ------ |
| Add action route reachability            | High         | Prior navigation drift       | Broken core journey          | `audit.md`, T2 focused test        | Journey             | L5          | `real-run-validation` | probe   | fixed  |
| Dashboard/transactions surface hierarchy | High         | Repeated card/glass patterns | Usability/readability        | before/after screenshots           | Component / E2E     | L4          | `real-run-validation` | probe   | fixed  |
| Filtered no-results semantics            | Medium       | Confirmed runtime defect     | Misleading user guidance     | runtime search capture + unit test | Component / Journey | L4          | `exploit-testing`     | probe   | fixed  |
| Batch workflow orientation               | High         | Existing mobile polish       | Friction / missed state      | batch screenshots + progress tests | Component / E2E     | L5          | `real-run-validation` | probe   | fixed  |
| Modal accessibility and safe area        | High         | Prior mobile fixes           | Blocked keyboard/mobile user | modal tests + batch E2E            | Component / E2E     | L5          | `exploit-testing`     | probe   | fixed  |
| Motion/reduced-motion behavior           | Medium       | Existing Framer Motion use   | Jank/accessibility           | reduced-motion Playwright checks   | E2E                 | L4          | `real-run-validation` | probe   | fixed  |

## Real-run recipes

| Journey                       | Start command                                                              | Data setup                   | Sample requests                        | Expected observable                                                              |
| ----------------------------- | -------------------------------------------------------------------------- | ---------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| Dashboard/transactions browse | `FRONTEND_AUTH_BYPASS=1 PLAYWRIGHT_NO_AUTH_SETUP=1 npm run dev -- -p 3001` | no-auth lane                 | `GET /`, `GET /transactions`           | Page loads, no overflow, primary action visible                                  |
| Add route selection           | same server + Playwright                                                   | no-auth lane                 | Click `Agregar` → individual/batch     | Individual reaches `/transactions/add`; batch opens uploader                     |
| Batch scan review             | Playwright route mock for `/api/ai/scan-receipt`                           | representative receipt image | upload, delayed scan, missing account  | progress stage changes, review is actionable, save remains disabled when invalid |
| Accessibility close           | Playwright with `reducedMotion: reduce`                                    | open modal/sheet             | Tab, Shift+Tab, Escape, cancel/confirm | focus stays in modal, close confirmation is honored, no pulse/spinner animation  |

## Layer matrix

| Layer                      | Skill                          | Scope                                                      | Status                                   |
| -------------------------- | ------------------------------ | ---------------------------------------------------------- | ---------------------------------------- |
| Security                   | `appsec-adversarial-auditor`   | no auth/data boundary changes                              | n/a — no auth or permission code changed |
| Runtime and faults         | `runtime-reliability-testing`  | browser errors, request failures, overflow, reduced motion | done                                     |
| Persistence and migrations | `database-persistence-testing` | no persistence/schema change in pilot                      | n/a — no persistence touched             |
| Architecture conformance   | `clean-architecture-audit`     | shared UI tokens/overlay contracts                         | done — bounded shared-surface review     |
| Critical e2e journeys      | `real-run-validation`          | dashboard, transactions, add/batch, modal                  | done                                     |
| Sandbox                    | `docker-test-containers`       | no throwaway database needed for UI no-auth run            | n/a — no persistence route exercised     |

## Not testing, on purpose

| Target                                               | Reason                                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Authenticated financial save with live Supabase data | No-auth lane has no real account/category dataset; financial save semantics were not changed and existing domain tests remain the owner. |
| Android/Capacitor hardware back                      | Browser verification cannot prove native hardware behavior; integration registry tests pass, hardware remains pending.                   |
| Full load/soak/spike k6 profiles                     | Pilot changes are UI-only and no backend/persistence behavior changed; defer to the existing performance plan.                           |
| Automatic dependency upgrades                        | User requested classification first; no upgrade was required for the pilot.                                                              |

## Characterization (legacy)

| Test                        | Behavior pinned                                         | Believed correct? | Promote or delete after the change              |
| --------------------------- | ------------------------------------------------------- | ----------------- | ----------------------------------------------- |
| Existing batch mobile audit | Safe-area, overflow, accordion, reduced-motion behavior | Yes               | Retain and update selector for unique modal IDs |

## Execution log

| Date       | Target                | Rung reached | Findings (path:line)                                                                                                                      | Promoted tests                                    | Evidence (ledger id) | Notes                                                                                                                           |
| ---------- | --------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-18 | T2 foundation         | L4/L5        | `components/layout/header.tsx:392`, `components/transactions/add-transaction-menu.tsx:74`, `components/ui/floating-action-button.tsx:147` | add-menu/header tests                             | E2                   | Route, breakpoint, and reduced-motion checks passed                                                                             |
| 2026-09-18 | T3 hierarchy          | L4/L5        | `app/transactions/transactions-page-client.tsx:535`, `components/dashboard/recent-transactions.tsx:275`                                   | transactions empty-state and category tests       | E3                   | Desktop/mobile/filter/no-results checks passed                                                                                  |
| 2026-09-18 | T4 batch/modal        | L5           | `components/ui/modal.tsx:90`, `components/receipts/batch-receipt-uploader-modal.tsx:1084`                                                 | batch progress/close/modal focus tests; batch E2E | E4                   | 2/2 Chromium audit passed after selector/safe-area corrections                                                                  |
| 2026-09-18 | T5 dogfood/evaluation | L5           | `artifacts/ui-ux-audit/current/after/t5-browser-evidence.json`, `artifacts/ui-ux-audit/current/after/build.log`                           | 4 focused suites/48 tests; 2/2 batch E2E          | E6                   | `eval:gate` passed; production build compiled but failed repository-wide test TypeScript debt; final after screenshots captured |

## Findings

| Id  | Finding (path:line, one line)                                                                                         | Severity (consequence class) | Data safe? | Evidence id | Pinning test (suite path :: test name)                                                                                     | Status | Verdict by / date   | Reason                                                                                  | Cited-files fingerprint at verdict |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------- | --------------------------------------------------------------------------------------- | ---------------------------------- |
| F1  | `components/layout/header.tsx:392` — individual add action used unhandled `?action=add` route                         | medium (broken core journey) | yes        | E2          | `tests/components/layout/header.test.tsx :: routes individual add to /transactions/add`                                    | fixed  | parent / 2026-09-18 | Real browser reached canonical route after fix                                          | pilot fingerprint                  |
| F2  | `app/transactions/transactions-page-client.tsx:830` — filtered zero results reused first-use empty state              | medium (misleading guidance) | yes        | E3          | `tests/app/transactions/transactions-page-client.test.tsx :: distinguishes filtered no-results from first-use empty state` | fixed  | parent / 2026-09-18 | Search/clear Playwright journey and focused test pass                                   | pilot fingerprint                  |
| F3  | `components/dashboard/recent-transactions.tsx:275` — literal category label hid category identity                     | low (clarity)                | yes        | E3          | `tests/components/dashboard/recent-transactions.test.tsx :: renders category name / truthful fallback`                     | fixed  | parent / 2026-09-18 | Resolved and fallback paths covered                                                     | pilot fingerprint                  |
| F4  | `components/ui/modal.tsx:187` — global modal IDs collided across simultaneous dialogs                                 | high (accessibility)         | yes        | E4          | `tests/components/modal.test.tsx :: uses unique title and description IDs`                                                 | fixed  | parent / 2026-09-18 | Unique IDs and aria references verified                                                 | pilot fingerprint                  |
| F5  | `components/receipts/batch-receipt-uploader-modal.tsx:949` — closing loaded batch could discard review edits silently | medium (data-entry loss)     | yes        | E4          | `tests/unit/components/batch-receipt-uploader.test.tsx :: warns before closing a batch with loaded review edits`           | fixed  | parent / 2026-09-18 | Confirmation path tested and exercised                                                  | pilot fingerprint                  |
| F6  | `components/ui/floating-action-button.tsx:147` — infinite pulse lacked direct reduced-motion gating                   | medium (accessibility/jank)  | yes        | E2          | `tests/components/layout/header.test.tsx` plus reduced-motion Playwright probe                                             | fixed  | parent / 2026-09-18 | Pulse absent under reduced motion; normal motion remains bounded to one decorative ring | pilot fingerprint                  |

## Evidence ledger

| Id  | Claim                                         | Executed                                | Inputs and parameters                                                                                             | Observed                                                                                           | Mutation or negative control → result                                                      | Reproduction                                                                                                                        | Label (`observado` / `razonado`, literal) |
| --- | --------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| E1  | Current UI baseline exists                    | Playwright Chromium                     | no-auth lane; 320/390/768/1440; routes/interactions; screenshots                                                  | 33 screenshots, 47 interactions, no overflow; accessibility signals and route limitations recorded | Unknown route 404 intentionally produced expected error; no product 5xx                    | `artifacts/ui-ux-audit/current/audit.md`                                                                                            | observado                                 |
| E2  | Foundation contracts work                     | Jest, type-check, lint, Playwright      | focused tests; desktop/800/390; reduced motion                                                                    | route, breakpoint, and FAB checks passed                                                           | Reduced-motion pulse absent; normal menu remained interactive                              | subagent verification output + current diff                                                                                         | observado                                 |
| E3  | Hierarchy/empty states work                   | Jest + Playwright                       | desktop 1440 and mobile 390; filter/search/clear                                                                  | no-results and first-use copy distinct; no overflow; screenshots captured                          | Search `nomatch` → no-results; clear → first-use state                                     | `artifacts/t3-uiux-verification/`                                                                                                   | observado                                 |
| E4  | Batch/modal pilot works                       | Jest + Playwright                       | 320/390/768/1440; mocked scan; reduced motion; safe-area                                                          | 46 focused tests; 2/2 batch E2E; progress stages, focus, close confirmation, safe-area pass        | Empty close no prompt; loaded close cancel preserves modal; reduced motion removed spinner | `/tmp/fintec-t4-modal-verification/` and `test-results/e2e-batch-mobile-audit-*/`                                                   | observado                                 |
| E5  | React Bits evaluation is evidence-based       | Official repo/source inspection         | README, package.json, LICENSE, AnimatedList, Stepper, Dock, AnimatedContent, CountUp, BlurText, issue/PR research | copy-paste variants, mixed dependencies, MIT+Commons Clause, component-specific a11y/perf risks    | Direct source review rejected wholesale adoption; Stepper idea adapted only                | `artifacts/ui-ux-audit/current/` + official URLs in final report                                                                    | observado                                 |
| E6  | Final dogfood and evaluation are reproducible | Jest, Playwright, Next build, eval gate | focused suites; 320/360/375/390/430/768/1440; mocked scan; `npm run eval:gate`                                    | 0 browser errors/HTTP failures; no overflow; eval gate PASS; 25 after screenshots                  | `artifacts/ui-ux-audit/current/after/`                                                     | production build compiled then failed on 51 repository test TypeScript errors; performance probe observed dev-only CLS/jank signals | observado                                 |

## Calibration history

| Date       | Skill version       | K   | Found | Recall | Misses (file:line operator, why)                                     | False positives |
| ---------- | ------------------- | --- | ----- | ------ | -------------------------------------------------------------------- | --------------- |
| 2026-09-18 | test-strategy 0.3.7 | n/a | n/a   | n/a    | UI pilot used existing bounded plan rather than mutation calibration | n/a             |

## Blocked by testability

| Target                      | Rung | Why                                                                                                                      | Minimal change that opens it                                                                                         |
| --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Live category rendering     | L5   | no-auth dataset has no transactions                                                                                      | run authenticated lane with canonical fixture user                                                                   |
| Native back hardware        | L5   | browser cannot emit Capacitor hardware event                                                                             | run on connected Android device/emulator                                                                             |
| Production build green gate | L5   | `next build` compiles the app but repository-wide test TypeScript debt fails the build (51 errors across existing tests) | repair the existing test/type baseline in a separate scoped task; pilot production source emitted no new build error |

## Remaining, in order

1. Resolve repository-wide test TypeScript debt blocking `next build` (separate scope; not a UI pilot change).
2. Authenticated live-data visual pass for category labels and save flows.
3. Native Android back/focus pass if the Android pilot proceeds.
