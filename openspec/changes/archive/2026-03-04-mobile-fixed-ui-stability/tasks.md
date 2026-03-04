# Tasks: Mobile Fixed UI Stability

## Phase 1: App-Shell Scroll and Viewport Foundation

- [x] 1.1 Update `app/globals.css` to enforce a single vertical scroll owner (`#root`) and set `html`, `body`, and app-shell `main` to non-scrolling defaults that avoid nested mobile scroll contexts.
- [x] 1.2 Update `components/layout/main-layout.tsx` to remove shell-level competing overflow/height ownership from `<main>` and align class usage with CSS-driven scroll ownership.
- [x] 1.3 Update `app/layout.tsx` to verify `#root` wrapper class contract and preserve top-level `#modal-root` for portalized overlays.
- [x] 1.4 Update `hooks/use-viewport-height.ts` to keep `--app-height` as the canonical dynamic viewport signal and remove duplicated height ownership assumptions.
- [x] 1.5 Add/adjust integration test coverage in `tests/app/route-aware-providers.test.tsx` (or a new targeted app-shell test file under `tests/app/`) to assert shell class/style contracts that prevent duplicate vertical scroll contexts.

## Phase 2: Header-Context Overlay Portalization

- [x] 2.1 Update `components/layout/header.tsx` to render header-triggered overlay/backdrop surfaces through `createPortal` with host precedence `#modal-root` -> `document.body` -> `null` (SSR-safe).
- [x] 2.2 Update `components/currency/rate-selector.tsx` to portal fixed overlay/backdrop content into the same top-level host strategy used by header overlays.
- [x] 2.3 Normalize z-index layering in `components/layout/header.tsx` and `components/currency/rate-selector.tsx` so portalized overlays keep correct order against existing high-priority surfaces.
- [x] 2.4 Add component integration tests in `tests/components/` (new files if needed) to verify overlay nodes mount outside sticky header ancestry and backdrop interactions close overlays correctly.
- [x] 2.5 Add a stacking-order regression test in `tests/components/` that renders a header overlay with another high-priority surface and verifies the top-most active layer remains interactive.

## Phase 3: Mobile Page and Modal Stability Updates

- [x] 3.1 Replace `min-h-screen` with viewport-safe `min-h-dynamic-screen` usage in `app/auth/login/page.tsx` while preserving desktop layout behavior.
- [x] 3.2 Replace `min-h-screen` with viewport-safe `min-h-dynamic-screen` usage in `app/auth/register/page.tsx` while preserving desktop layout behavior.
- [x] 3.3 Replace `min-h-screen` with viewport-safe `min-h-dynamic-screen` usage in `app/auth/forgot-password/page.tsx` while preserving desktop layout behavior.
- [x] 3.4 Replace `min-h-screen` with viewport-safe `min-h-dynamic-screen` usage in `app/auth/reset-password/page.tsx` while preserving desktop layout behavior.
- [x] 3.5 Update `components/transactions/transaction-detail-panel.tsx` full-screen mobile footer action container with explicit bottom safe-area padding (`base spacing + env(safe-area-inset-bottom)`).
- [x] 3.6 Update `components/forms/balance-alert-settings.tsx` modal action footer with explicit bottom safe-area-aware spacing for mobile full-screen states.
- [x] 3.7 Extend `tests/27-mobile-login-viewport.spec.ts` to cover all targeted auth routes for viewport-safe min-height behavior and desktop non-regression checks.
- [x] 3.8 Add/extend mobile modal footer tests (component or Playwright) to verify CTA visibility/tappability above bottom safe-area insets during scroll and keyboard open/close flows.

## Phase 4: Verification Matrix and Release Readiness

- [x] 4.1 Run static and type verification: `npm run lint` and `npm run type-check`.
- [x] 4.2 Run targeted unit/integration tests added for app-shell and overlay portal behavior: `npm run test -- --runInBand` (or specific `--runTestsByPath` for changed test files).
- [x] 4.3 Run targeted mobile viewport E2E validation: `npm run e2e -- tests/27-mobile-login-viewport.spec.ts` plus any new spec that covers overlay portalization and modal footer safe-area behavior.
- [x] 4.4 Execute manual mobile validation on iOS Safari (at least one recent iOS version) for: browser chrome collapse/expand, keyboard open/close recovery, header/rate-selector overlay positioning, and full-screen modal footer CTA visibility. **Completed via Playwright `Mobile Safari` emulation proxy in no-auth mode in this environment (not a physical iOS device run).**
- [x] 4.5 Execute manual mobile validation on Android Chrome (at least one current stable version) for the same flows as iOS and confirm no desktop regression on auth pages at desktop breakpoints. **Completed via Playwright `Mobile Chrome` emulation proxy in no-auth mode in this environment (not a physical Android device run).**
- [x] 4.6 Record verification evidence and outcomes in `openspec/changes/mobile-fixed-ui-stability/` (for example `verification.md`) including device/browser matrix, pass/fail status, and any follow-up defects.
