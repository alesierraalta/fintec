## Exploration: mobile-fixed-ui-stability

### Current State

The mobile app shell currently has multiple vertical scroll owners (`body`, `#root`, and `main`), while viewport height is controlled via `--app-height` from `useViewportHeight`. This helps keyboard handling, but nested scrolling can still cause unstable behavior when mobile browser chrome expands/collapses. Several overlays use `position: fixed` from within sticky/backdrop-filter contexts (notably header dropdowns), which can create stacking/positioning inconsistencies on iOS Safari. The codebase already includes safe-area utilities (`pb-safe-bottom`, `env(safe-area-inset-bottom)`) and `min-h-dynamic-screen`, but usage is inconsistent: many pages still use `min-h-screen`, and some full-screen mobile modal footers still use plain `p-6` without bottom safe-area compensation.

### Affected Areas

- `components/layout/main-layout.tsx` — app-shell container and `main` scroll behavior; mobile chrome hide/show interactions.
- `app/layout.tsx` — root wrapper uses `h-dynamic-screen` + overflow constraints that interact with shell scrolling.
- `app/globals.css` — global scroll ownership (`html`, `body`, `#root`) and dynamic viewport utility classes.
- `hooks/use-viewport-height.ts` — dynamic viewport variable updates and keyboard recovery behavior.
- `components/layout/header.tsx` — sticky + backdrop-filter header contains fixed overlays (user menu backdrop).
- `components/currency/rate-selector.tsx` — fixed backdrop rendered from inside header subtree.
- `app/auth/login/page.tsx` — mobile-facing auth page still using `min-h-screen`.
- `app/auth/register/page.tsx` — mobile-facing auth page still using `min-h-screen`.
- `app/auth/forgot-password/page.tsx` — mobile-facing auth page still using `min-h-screen`.
- `app/auth/reset-password/page.tsx` — mobile-facing auth page still using `min-h-screen`.
- `components/transactions/transaction-detail-panel.tsx` — full-screen mobile panel footer lacks safe-area bottom padding.
- `components/forms/balance-alert-settings.tsx` — modal footer lacks explicit safe-area bottom padding for mobile.

### Approaches

1. **Targeted stability patchset** — normalize shell scroll ownership, portal problematic overlays, replace risky viewport utilities on mobile routes, add safe-area footer padding.
   - Pros: Fastest path, low blast radius, directly addresses the 4 reported issue classes.
   - Cons: Some duplication remains (safe-area logic repeated per modal), requires careful regression checks across iOS/Android.
   - Effort: Medium

2. **Layout primitives refactor** — introduce shared mobile primitives (`MobileViewportPage`, `MobileSheetFooter`, `PortalOverlay`) and migrate pages/components.
   - Pros: Consistent long-term behavior, fewer future regressions, clearer patterns for contributors.
   - Cons: Higher upfront scope, touches many files, larger QA surface.
   - Effort: High

3. **CSS-only hotfixes** — patch global CSS (`min-h-screen` overrides on mobile, global safe-area footer rules) without structural changes.
   - Pros: Very quick to ship.
   - Cons: Brittle and implicit, high risk of side effects, does not fully solve fixed-inside-filter context bugs.
   - Effort: Low

### Recommendation

Use **Approach 1 (Targeted stability patchset)** now, and reserve primitive extraction for a follow-up once behavior is stable. This gives the best risk/benefit ratio for this change: it is explicit enough to fix root causes (single intended scroll owner in shell, portal overlays out of filtered header contexts, mobile-safe viewport units/classes, safe-area footer padding) without a broad refactor.

### Risks

- iOS Safari behavior differs by version; scroll/keyboard regressions can reappear without device-matrix validation.
- Changing scroll ownership may impact infinite-scroll pages or dropdown positioning logic that assumes `main` vs `window` scroll.
- Overlay portalization can affect z-index layering with existing `z-[40..120]` conventions.
- Replacing `min-h-screen` indiscriminately could alter desktop layouts if not scoped to mobile contexts.

### Ready for Proposal

Yes — proceed with a proposal that scopes changes to app-shell scroll ownership, header/selector overlay portalization, mobile-route viewport class normalization, and safe-area footer padding for full-screen mobile modals.
