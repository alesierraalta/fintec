# Proposal: Mobile Fixed UI Stability

## Intent

Improve mobile UI stability by removing scroll and viewport-height edge cases that cause jumpy layouts, inconsistent overlay positioning, and footer controls overlapping safe areas on iOS and Android browsers.

## Scope

### In Scope

- Normalize app-shell vertical scroll ownership to avoid nested scrolling conflicts between root containers and page content.
- Move fixed overlays that are currently rendered inside sticky/backdrop-filter header contexts to a stable top-level rendering strategy.
- Replace mobile-facing `min-h-screen` usage with dynamic viewport-safe classes/utilities where required.
- Add safe-area bottom padding for full-screen mobile modal footers that currently risk clipping behind device insets.

### Out of Scope

- Broad UI primitive refactors (for example, introducing new shared viewport/modal primitives across the app).
- Desktop layout redesigns or global spacing/typography refreshes unrelated to mobile stability.
- New feature work in auth, transactions, or settings beyond the stability fixes above.

## Approach

Apply a targeted stability patchset focused on the four issue classes from exploration: establish a single intended scroll owner in the app shell, portal problematic fixed overlays out of filtered header ancestry, normalize mobile viewport-height usage on affected pages, and explicitly pad mobile full-screen modal footers for bottom safe areas.

## Affected Areas

| Area                                                   | Impact   | Description                                                                            |
| ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------- |
| `app/layout.tsx`                                       | Modified | Align root container overflow/height behavior with single scroll ownership strategy.   |
| `components/layout/main-layout.tsx`                    | Modified | Reduce nested scroll owners and stabilize app-shell/main scrolling on mobile browsers. |
| `app/globals.css`                                      | Modified | Adjust global scroll and viewport utility behavior used by mobile layouts.             |
| `hooks/use-viewport-height.ts`                         | Modified | Keep dynamic viewport variable handling consistent with shell behavior.                |
| `components/layout/header.tsx`                         | Modified | Remove fixed overlay reliance inside sticky/backdrop-filter context.                   |
| `components/currency/rate-selector.tsx`                | Modified | Render backdrop/overlay in a safer top-level context to avoid iOS positioning issues.  |
| `app/auth/login/page.tsx`                              | Modified | Replace mobile `min-h-screen` usage with dynamic viewport-safe alternative.            |
| `app/auth/register/page.tsx`                           | Modified | Replace mobile `min-h-screen` usage with dynamic viewport-safe alternative.            |
| `app/auth/forgot-password/page.tsx`                    | Modified | Replace mobile `min-h-screen` usage with dynamic viewport-safe alternative.            |
| `app/auth/reset-password/page.tsx`                     | Modified | Replace mobile `min-h-screen` usage with dynamic viewport-safe alternative.            |
| `components/transactions/transaction-detail-panel.tsx` | Modified | Add safe-area bottom padding for full-screen mobile modal footer actions.              |
| `components/forms/balance-alert-settings.tsx`          | Modified | Add safe-area bottom padding for modal footer controls on mobile.                      |

## Risks

| Risk                                                                   | Likelihood | Mitigation                                                                                           |
| ---------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| Mobile browser differences reintroduce scroll/keyboard regressions     | Med        | Validate on iOS Safari (multiple versions) and Android Chrome with keyboard open/close flows.        |
| Scroll ownership changes break components assuming prior scroll parent | Med        | Regression-test infinite scroll, sticky elements, and dropdown positioning across key routes.        |
| Overlay portalization causes z-index/layering conflicts                | Med        | Audit affected overlays against existing z-index conventions and test stacked modal/dropdown states. |
| Viewport class swaps unintentionally affect non-mobile layouts         | Low        | Limit replacements to mobile-facing routes/components and verify desktop snapshots.                  |

## Rollback Plan

Revert the change set for this change folder commit, restoring previous scroll ownership, overlay mounting, viewport height classes, and modal footer padding behavior. If partial rollback is required, prioritize reverting app-shell scroll ownership and overlay portalization first, then viewport/safe-area adjustments.

## Dependencies

- Access to device/browser QA coverage for iOS Safari and Android Chrome mobile flows.
- Existing safe-area utilities and dynamic viewport helpers already present in the codebase.

## Success Criteria

- [ ] Mobile app-shell no longer exhibits unstable nested scroll behavior during browser chrome collapse/expand and keyboard transitions.
- [ ] Header/rate-selector overlays remain correctly positioned and layered on iOS Safari and Android browsers.
- [ ] Targeted mobile-facing pages use dynamic viewport-safe height behavior instead of `min-h-screen` where applicable.
- [ ] Full-screen mobile modal footers keep primary actions above bottom safe-area insets.
