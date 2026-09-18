# ODD Task: Transaction Action Flow Polish

## Feature

`transaction-action-flow-polish`

## Status

Committed locally; pending push to `origin/main`

## Commit evidence

- Behavior commit: `a86217f` (`feat(transactions): polish mobile batch review flow`)

## Goal

Validate the transaction entry menu and batch receipt review on real mobile viewports, then make the smallest visual and interaction improvements that remove remaining density, accessibility, and motion inconsistencies.

## Baseline

- Branch: `main`
- Baseline commit: `a9b550f3`
- Focused unit tests: `33/33` passing
- Mobile E2E audit: `2/2` passing
- Existing screenshots show the menu is functional, while batch review remains dense and the reduced-motion/a11y contracts are incomplete.

## Non-goals

- No redesign of the broader transactions page.
- No new dependencies.
- No changes to financial classification, scanning, persistence, or submission behavior.
- No commit or push unless explicitly requested by the user.

## Allowed edit surfaces

- `components/ui/modal.tsx`
- `components/transactions/add-transaction-menu.tsx`
- `components/receipts/batch-receipt-uploader-modal.tsx`
- `tests/e2e/batch-mobile-audit.spec.ts`
- `tests/components/modal.test.tsx`
- `tests/unit/components/add-transaction-menu.test.tsx`
- `tests/unit/components/batch-receipt-uploader.test.tsx`

## Tasks

- [x] Audit current transaction menu, modal, batch review, screenshots, and focused tests.
- [x] Apply a bounded polish pass: complete reduced-motion variants, improve mobile review hierarchy/footer geometry, and close remaining dialog/accordion accessibility gaps.
- [x] Run focused unit tests and real mobile E2E validation at 320/375/390/430px plus desktop; record observed results and remaining limitations.

## Evidence

- Existing visual audit: `artifacts/screenshots/01-add-menu-375.png`, `04-batch-review-375.png`, `06-batch-review-320.png`, `08-batch-review-desktop.png`.
- Existing E2E: `tests/e2e/batch-mobile-audit.spec.ts`.
- Independent read-only audit identified incomplete reduced-motion handling, dense/clipped mobile review, missing `aria-controls`, and absent live announcements.
- Final focused unit validation: 3 suites, 38 tests passed.
- Final real browser validation: 2/2 `batch-mobile-audit` tests passed; no horizontal overflow at 320/360px, safe-area clearance passed, footer geometry passed, and reduced-motion journey passed.
- Final static checks: TypeScript, focused Oxlint, Prettier, and `git diff --check` passed.
- Native review was not completed: START returned an expired consent binding, created no lineage, and performed no mutation. No review authority was burned.
- The validated implementation is committed as `a86217f`; push to `origin/main` is the remaining delivery step.
