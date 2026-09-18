# FinTec UI/UX Modernization Pilot

Date: 2026-09-18

## Executive decision

The product did not need a React Bits rewrite. The runtime audit showed a stronger problem than outdated styling: navigation contracts, empty-state semantics, surface hierarchy, overlay accessibility, and breakpoint decisions were inconsistent.

The pilot therefore keeps the existing FinTec black/blue/green identity and introduces a calmer utility system:

1. clarity and task orientation;
2. consistent surfaces and spacing;
3. predictable mobile/desktop behavior;
4. accessible overlays and forms;
5. restrained motion;
6. decoration only when it communicates state.

React Bits is treated as a source of ideas. Only the Stepper concept was adapted, as a native semantic batch progress indicator. No React Bits dependency was installed.

## A. Runtime UI/UX audit

### Evidence

- Runtime report: `artifacts/ui-ux-audit/current/audit.md`
- Structured capture: `artifacts/ui-ux-audit/current/audit.json`
- Accounts reachability: `artifacts/ui-ux-audit/current/accounts-reachability.json`
- Before screenshots: `artifacts/ui-ux-audit/current/`
- Before/after comparison screenshots: `artifacts/ui-ux-audit/current/before/`, `artifacts/ui-ux-audit/current/after-final/`

The no-auth Playwright lane exercised 33 captures, 47 interactions, desktop/mobile routes, add transaction, batch upload, filters, validation, loading, error route, reduced motion, and required widths. Authenticated data-backed saves remain unverified because the lane has no real accounts/categories.

### Critical usability findings

| Finding                                                                                                                   | Classification                                                         | Evidence                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Desktop individual add action used `/transactions?action=add`, but the page only handled `action=batch`.                  | Difficult to use / broken journey                                      | `components/layout/header.tsx`; runtime click probe                                                           |
| A filtered transaction list reused the first-use empty state and told an existing user to create their first transaction. | Difficult to use                                                       | `app/transactions/transactions-page-client.tsx`; search `nomatch` probe                                       |
| Application shell, add menu, and modal used different mobile breakpoints (`1024`, `768`, `640`).                          | Difficult to use / responsive inconsistency                            | `contexts/sidebar-context.tsx`, `components/transactions/add-transaction-menu.tsx`, `components/ui/modal.tsx` |
| Modal title/description IDs were global, and focus was not contained.                                                     | Accessibility / difficult to use                                       | `components/ui/modal.tsx`                                                                                     |
| Loaded batch review could be closed without warning that edits would be discarded.                                        | Difficult to use / data-entry risk                                     | `components/receipts/batch-receipt-uploader-modal.tsx`                                                        |
| Dashboard recent transactions displayed the literal `Categoría` instead of a resolved category name.                      | Clarity defect                                                         | `components/dashboard/recent-transactions.tsx`                                                                |
| `/accounts` remained at 67 skeleton elements in the no-auth lane.                                                         | Runtime/data reachability limitation; requires authenticated follow-up | `artifacts/ui-ux-audit/current/accounts-reachability.json`                                                    |

### Visual findings

- The same rounded, blurred, bordered, shadowed card treatment was applied to page structure, metrics, sections, and controls.
- Repeated colored dots and uppercase labels competed with actual content hierarchy.
- Desktop transactions had four visually equal metric cards before the list, while the primary add action was separated from the empty-state decision.
- Mobile navigation and bottom labels were dense at 390px even without horizontal overflow.
- Batch review was functionally strong after prior mobile work, but needed an explicit stage model and better overlay semantics.

### What was not a confirmed production defect

- No horizontal overflow was observed at 320, 360, 375, 390, 430, 768, or 1440px in the final browser checks.
- No product console errors, page errors, HTTP >=400 responses, or request failures occurred in the final no-auth pilot run.
- The black `N` in screenshots is Next.js development tooling, not FinTec UI.
- Authenticated persistence, live categories, and native Android hardware back require a separate lane.

## B. Technology audit

### Current stack

| Area                                       | Declared / resolved                                                         | Classification               | Decision                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| Next.js                                    | `package.json ^16.1.6`; resolved runtime `16.3.4`; latest observed `16.3.5` | OUTDATED BUT SAFE            | Patch upgrade is optional; not required for this pilot                 |
| React / React DOM                          | `19.2.0` / `19.2.0`; latest observed `19.3.0`                               | CURRENT                      | Keep; no UI need for minor update                                      |
| Tailwind CSS                               | declared `^3.4.18`; resolved `3.4.19`; latest `4.3.3`                       | MAJOR MIGRATION REQUIRED     | Tailwind 4 is not justified during a visual pilot; keep v3             |
| Framer Motion                              | declared `^12.23.24`; resolved `12.43.0`; latest `13.4.0`                   | OUTDATED AND RELEVANT        | Existing motion works; defer major migration and normalize usage first |
| Lucide React                               | declared/resolved `0.546.0`; latest observed `1.47.0`                       | MAJOR MIGRATION REQUIRED     | Keep the existing icon family; no benefit demonstrated by migration    |
| Playwright                                 | declared `^1.56.1`; resolved module `1.63.0`                                | CURRENT                      | Existing browser harness is sufficient                                 |
| Jest                                       | `29.7.0`; latest observed `30.5.2`                                          | MAJOR MIGRATION REQUIRED     | Not needed for UI pilot                                                |
| TypeScript                                 | `5.9.3`; latest observed `7.0.2`                                            | MAJOR MIGRATION REQUIRED     | Do not combine with UI work                                            |
| TanStack Query                             | `5.102.8`, wanted/latest `5.103.1`                                          | OUTDATED BUT SAFE            | Optional patch-only maintenance                                        |
| React Hook Form                            | `7.87.0`, wanted/latest `7.88.0`                                            | OUTDATED BUT SAFE            | Optional patch-only maintenance                                        |
| Zod                                        | `4.6.2`, wanted/latest `4.6.5`                                              | OUTDATED BUT SAFE            | Optional patch-only maintenance                                        |
| `@types/react`                             | v18 types with React 19 runtime                                             | OUTDATED AND RELEVANT        | Fix in a separate type-health task; it contributes to build noise      |
| Recharts, Sonner, next-themes, Capacitor 8 | current enough for observed usage                                           | CURRENT                      | No replacement justified                                               |
| Specialized AI/Redis/DB packages           | mixed minor/major updates                                                   | OUTDATED BUT NOT UI-RELEVANT | Do not upgrade as part of this pilot                                   |

No dependency was proven unused by this audit. No replacement is justified. The existing package and lockfile situation also has repository drift (`pnpm-lock.yaml` is untracked while scripts use npm); that is a maintenance task, not a reason to change UI dependencies.

### Build status

`next build` compiled the application successfully but failed during repository-wide TypeScript checking on 51 existing test errors across unrelated modules and fixtures. The focused pilot tests, `npm run type-check` configuration, and lint checks pass. This build debt is tracked separately in `docs/testing/test-plan-ui-ux.md` and is not silently attributed to the pilot.

## C. React Bits evaluation

Official sources reviewed:

- [React Bits](https://reactbits.dev/)
- [Installation](https://reactbits.dev/get-started/installation)
- [Official repository](https://github.com/DavidHDev/react-bits)
- [README](https://github.com/DavidHDev/react-bits/blob/main/README.md)
- [License](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md)
- [WebGL cleanup issue](https://github.com/DavidHDev/react-bits/issues/875)
- [WebGL cleanup fixes](https://github.com/DavidHDev/react-bits/pull/884)
- [Offscreen/tab rendering optimization](https://github.com/DavidHDev/react-bits/pull/908)

The repository is copy-paste oriented, offers JS/TS and CSS/Tailwind variants, and has per-component dependency variability. Its license is MIT plus Commons Clause: commercial use inside an application is allowed, while selling, sublicensing, or redistributing the components themselves is restricted. License review is required before extracting components into a separately distributed library.

| Candidate                                              | Product use                                     | Cost/risk                                                                                    | Mobile/a11y                                                                                     | Decision                                          |
| ------------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Stepper                                                | Clarifies batch stages: select, process, review | Low when semantic/static; original uses layout motion                                        | Good after native `ol/li`, `aria-current`, touch sizing                                         | **Adapted** in `batch-receipt-uploader-modal.tsx` |
| AnimatedList                                           | Transaction list entrance/reorder               | Extra per-item observers/scale/opacity; not a financial data pattern                         | Original uses clickable `div`s and global key handling without a consistent reduced-motion path | **Reject**                                        |
| CountUp                                                | Could animate dashboard values                  | Transitional financial values can mislead; original lacks product-wide motion policy         | Needs live-region/locale/reduced-motion design                                                  | **Interesting but unnecessary**                   |
| AnimatedContent / BlurText                             | Page/empty-state reveals                        | Blur/filter and GSAP/Motion lifecycle cost; decoration does not solve current UX             | Needs reduced-motion and semantic content audit                                                 | **Reject for pilot**                              |
| Dock / CardNav / PillNav / GooeyNav                    | Navigation visual experiments                   | Hover/magnification and custom interaction complexity                                        | Poor fit for predictable finance navigation/mobile                                              | **Reject**                                        |
| WebGL backgrounds (LightPillar, Plasma, Threads, etc.) | Decorative background only                      | CPU/GPU, context-loss, cleanup, and mobile touch risks are documented in official issues/PRs | No accessibility value; can worsen jank                                                         | **Avoid**                                         |

Conclusion: React Bits is useful as a reference library and occasional source extraction, not as FinTec's design system.

## D. Visual and motion strategy

### Visual rules

- Keep the FinTec black/blue/green identity; use green/red only for financial semantics.
- Use neutral page background, quiet panel surfaces, and one primary action color.
- Use cards only where elevation communicates grouping or state.
- Use a 4/8px spacing rhythm and a small radius scale.
- Keep headings sentence-oriented and remove decorative dots that do not encode state.
- Keep data labels readable and values dominant; do not animate money values by default.
- Preserve 44px minimum touch targets and visible `focus-visible` rings.

### Motion rules

Implemented semantic tokens in `app/globals.css`:

- micro: 120ms;
- popover: 180ms;
- sheet/modal: 320ms;
- navigation: 400ms;
- explicit standard/popover/sheet/navigation easing curves.

Use transform/opacity for transitions. The batch progress track now uses `scaleX` rather than animating `width`. All non-essential motion has a reduced-motion path.

## E. Pilot outcome

### Implemented

1. **Foundation/navigation**
   - unified interaction breakpoint at 1024px;
   - canonical `/transactions/add` individual route;
   - reduced-motion FAB pulse guard;
   - semantic motion tokens.
2. **Dashboard/transactions hierarchy**
   - quieter surface-panel/metric/subtle utilities;
   - simpler page headers;
   - truthful filtered-empty state with clear filters;
   - category catalog propagation and truthful fallback.
3. **Batch/modal flow**
   - adapted semantic progress indicator;
   - unique modal ARIA IDs;
   - keyboard focus containment and focus return;
   - safe-area title/close offsets;
   - accessible file inputs;
   - unsaved batch close confirmation;
   - compositor-friendly progress animation.

### Validation

- Focused Jest: 4 suites / 48 tests passed in the final pilot run.
- Type-check script: passed.
- Lint: passed.
- Batch E2E: 2/2 Chromium tests passed, including 320/360 overflow, reduced motion, and safe-area checks.
- Evaluation gate: `npm run eval:gate` passed with no blocking regression (`moneyCorrectness=1`, `hitlCorrectness=1`; non-blocking `toolSelectionAccuracy=0`).
- Browser pilot: no console errors, page errors, request failures, or HTTP >=400 responses; no horizontal overflow at required widths.
- Final screenshots: `artifacts/ui-ux-audit/current/after-final/`.

### Remaining risks

- Full production build is blocked by existing repository-wide test TypeScript debt; app compilation itself succeeds.
- Final performance probes were development-server measurements. Mobile CLS and frame intervals were unstable in the no-auth dev path; the progress bar was changed from layout width animation to transform scaleX, but production profiling should be repeated after the build gate is repaired.
- Live authenticated category/save behavior and Android hardware back remain unverified.

## Files and plans

- ODD feature tasks: `odd/tasks/ui-ux-modernization-pilot.md`
- Testing plan/evidence: `docs/testing/test-plan-ui-ux.md`
- Runtime baseline: `artifacts/ui-ux-audit/current/`
- Final pilot captures: `artifacts/ui-ux-audit/current/after-final/`
