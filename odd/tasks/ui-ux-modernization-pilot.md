# UI/UX Modernization Pilot

## Goal

Modernize the FinTec web product around clarity, usability, responsive behavior, accessibility, consistency, and restrained motion. Use React Bits only when a component solves a verified product problem; preserve the FinTec identity and keep Android architecture independent.

## Design read

A trust-first personal-finance tool for repeated daily use, with a calm utility language: neutral surfaces, semantic income/expense colors, one primary action color, lower visual density, predictable navigation, and motion used for feedback and continuity rather than decoration.

Dials: variance 4/10 · motion 3/10 · density 5/10.

## Scope

Pilot areas:

1. Home/dashboard information hierarchy and empty state.
2. Primary navigation and add-transaction entry point.
3. Transactions list, filters, search-empty state, and action hierarchy.
4. Add transaction and batch receipts, including mobile review states.

Non-goals:

- Full application rewrite.
- Android/Kotlin/Compose changes.
- Blanket React Bits adoption.
- Dependency upgrades without a compatibility or maintenance reason.
- Financial/domain behavior changes.

## Evidence baseline

- Runtime audit: `artifacts/ui-ux-audit/current/audit.md`
- Structured runtime data: `artifacts/ui-ux-audit/current/audit.json`
- Auth/data reachability: `artifacts/ui-ux-audit/current/accounts-reachability.json`
- Before screenshots: `artifacts/ui-ux-audit/current/`
- Existing source audit: `docs/audits/fintec-ui-ux-skills-compliance-audit.md`
- React Bits official research: repository `DavidHDev/react-bits`, official README/source/license fetched during this session.

## React Bits decision

- Adapt the Stepper idea only if a semantic batch progress indicator improves orientation; do not copy its inaccessible motion implementation or add a new runtime dependency.
- Reject AnimatedList for financial transaction rows: its source uses clickable `div`s, global key handling, repeated scale/opacity transitions, and no reduced-motion path.
- Reject Dock/CardNav/PillNav/GooeyNav as the product navigation foundation: they are visually distinctive but add interaction complexity, hover/magnification assumptions, and accessibility/keyboard work to a navigation problem that needs predictability.
- Reject BlurText/AnimatedContent/CountUp as default page decoration until a measured user-feedback benefit is demonstrated; the source implementations lack a consistent reduced-motion contract and some use blur/layout work.
- Reject React Bits WebGL/background components for this pilot because the product already has mobile jank concerns and the official issue history contains component-specific CPU, WebGL cleanup/context-loss, and touch/responsive reports.

## Tasks

### T1 — Complete baseline audit and research

- Status: done
- Evidence: real Playwright interactions, screenshots, route states, responsive widths, console/network observations, package inventory, React Bits source/license review.

### T2 — Establish the visual and interaction foundation

- Status: done
- Normalize semantic surface, spacing, radius, typography, focus, touch-target, and motion tokens without introducing a new UI library.
- Choose one application breakpoint contract and document it.
- Fix the primary navigation/add-action contract without changing financial behavior.
- Keep animation compositor-friendly and reduced-motion safe.
- Evidence: `app/globals.css`, `components/layout/header.tsx`, `components/transactions/add-transaction-menu.tsx`, `components/ui/modal.tsx`, `components/ui/floating-action-button.tsx`.
- Checks: focused tests 12/12, type-check passed, lint passed, Playwright desktop/800px/390px/reduced-motion probe passed; full build and broad E2E remain pending.

### T3 — Pilot dashboard, navigation, and transactions hierarchy

- Status: done
- Reduce nested-card competition where the pilot touches it.
- Make the primary action and current location obvious.
- Distinguish first-use empty state from filtered/search empty state.
- Preserve existing data loading, filters, and transaction semantics.
- Evidence: `app/globals.css`, `components/ui/page-header.tsx`, `app/transactions/transactions-page-client.tsx`, `components/dashboard/desktop-dashboard.tsx`, `components/dashboard/mobile-dashboard.tsx`, `components/dashboard/recent-transactions.tsx`.
- Checks: focused tests 3 suites/9 tests, type-check, lint, and Playwright desktop/mobile/filter/no-results run passed; live category row remains unverified in no-auth data and is covered by focused tests.

### T4 — Pilot add transaction and batch review UX

- Status: done
- Preserve the scanner, duplicate detection, currency, account, category, and save behavior.
- Add a semantic adapted progress indicator (`Seleccionar → Procesar → Revisar`) rather than importing React Bits Stepper.
- Add unique modal IDs, keyboard focus containment/return, safe-area close positioning, accessible file inputs, and unsaved batch close confirmation.
- Evidence: `components/receipts/batch-receipt-uploader-modal.tsx`, `components/ui/modal.tsx`, `tests/e2e/batch-mobile-audit.spec.ts`.
- Checks: focused tests 4 suites/46 tests, type-check, lint, 2/2 Chromium batch mobile E2E tests, 10/10 add-menu tests, 320/360 overflow checks, safe-area and reduced-motion checks passed. Native Android back remains unverified.
- Align form labels, validation/error placement, focus, and mobile/desktop structure.
- Add an adapted semantic batch progress indicator only if it improves orientation; do not import React Bits wholesale.
- Preserve scanner, duplicate detection, currency, account, and save behavior.
- Ensure modal/sheet keyboard, Escape, focus return, scroll lock, safe areas, and reduced motion remain correct.

### T5 — Dogfood and close the pilot

- Status: in_progress (pilot evidence complete; close blocked by T6)
- Run the real app and Playwright at 320, 360, 375, 390, 430, 768, and 1440 widths.
- Capture before/after screenshots for each pilot area on desktop and mobile.
- Check keyboard/focus, reduced motion, semantic labels, contrast signals, console/network errors, layout stability, and animation cost.
- Run the repository's existing evaluation/testing tool where reachable and record whether it found actionable regressions.
- Document dependency classification and the React Bits adopt/adapt/reject matrix.
- Evidence: `artifacts/ui-ux-audit/current/after/`, `artifacts/ui-ux-audit/current/after/t5-browser-evidence.json`, `artifacts/ui-ux-audit/current/after/build.log`, `docs/testing/test-plan-ui-ux.md`.
- Checks: 4 focused suites/48 tests, 2/2 Chromium batch E2E, `eval:gate` PASS, no browser errors/HTTP failures/overflow; full build compiled then failed on existing repository-wide test TypeScript debt.

### T6 — Resolve repository-wide build TypeScript debt

- Status: pending / out of pilot scope
- The production build compiles the application but fails its repository-wide TypeScript gate on 51 existing test errors across unrelated modules and existing batch test fixtures.
- Required next step: create a separate bounded testing/type-health task; do not expand the UI pilot to repair unrelated test debt.

## Acceptance criteria

- No financial or persistence behavior changes.
- Primary add flow works from desktop and mobile and deep-links correctly.
- No horizontal overflow at required widths.
- Every changed interactive control has an accessible name and visible focus state.
- Changed motion honors `prefers-reduced-motion` and animates transform/opacity where possible.
- Before/after screenshots and observed test results are stored under the audit artifact directory.
- Any unverified authenticated behavior is explicitly marked as unverified.
