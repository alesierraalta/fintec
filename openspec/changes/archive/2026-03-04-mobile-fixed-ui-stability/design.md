# Design: Mobile Fixed UI Stability

## Technical Approach

Implement a targeted mobile stability patchset that keeps one vertical scroll owner, moves header-context overlays to a top-level portal mount, replaces fragile `min-h-screen` usage on mobile-facing auth routes with dynamic viewport-safe classes, and applies explicit bottom safe-area spacing for full-screen mobile modal footers.

This design maps directly to the proposal and `openspec/changes/mobile-fixed-ui-stability/specs/ui/spec.md` requirements by:

- eliminating duplicate scroll contexts that cause fixed/sticky drift,
- ensuring header-triggered overlays render outside sticky/backdrop-filter ancestry,
- standardizing dynamic viewport-safe height behavior,
- preserving tap-safe footer actions above device insets.

## Architecture Decisions

### Decision: Use `#root` as the single global vertical scroll owner

**Choice**: Make `#root` the only scroll container (`overflow-y: auto`) and set `html`, `body`, and app-shell `<main>` to non-scrolling contexts.

**Alternatives considered**:

- Keep `main` as the shell scroll owner and lock `#root`/`body`.
- Keep current mixed ownership (`body` + `#root` + `main`).

**Rationale**:

- `#root` already exists as a dedicated app container and already participates in dynamic-height behavior.
- A single owner reduces iOS Safari fixed/sticky jump risk during browser chrome/keyboard transitions.
- This minimizes churn compared to introducing route-specific scroll systems.

### Decision: Keep dynamic viewport source of truth in `--app-height` and remove duplicated inline height ownership

**Choice**: Treat `--app-height` (from `useViewportHeight`) as the canonical viewport signal and avoid competing hard/inline height logic where possible in shell wrappers.

**Alternatives considered**:

- Use pure CSS `100dvh` only.
- Keep current hybrid of CSS variable + repeated inline `style={{ height }}`.

**Rationale**:

- Current hook already centralizes VisualViewport handling and keyboard recovery behavior.
- A single canonical signal reduces layout thrash and mismatch risk when browser UI animates.
- Keeps existing mobile keyboard mitigation without introducing new primitives.

### Decision: Portal header-context overlays to a top-level mount (`#modal-root` with body fallback)

**Choice**: Render problematic overlays/backdrops triggered in `Header`/`RateSelector` via `createPortal` into `#modal-root` (fallback `document.body` if not present).

**Alternatives considered**:

- Keep overlays nested under header and adjust z-index only.
- Portal directly to `document.body` only.

**Rationale**:

- Sticky headers with backdrop filters create containing/stacking behavior that is fragile for `position: fixed` on iOS.
- `#modal-root` already exists in `app/layout.tsx`, so using it keeps a predictable overlay layer boundary.
- Body fallback preserves robustness for SSR/client timing edge cases.

### Decision: Restrict `min-h-screen` migration to mobile-facing auth pages in this change

**Choice**: Replace `min-h-screen` with dynamic viewport-safe classes on `app/auth/login/page.tsx`, `app/auth/register/page.tsx`, `app/auth/forgot-password/page.tsx`, and `app/auth/reset-password/page.tsx` only.

**Alternatives considered**:

- Global codemod replacing all `min-h-screen` usages.
- Add a broad shared primitive and migrate many routes now.

**Rationale**:

- Proposal explicitly targets mobile-facing routes with low blast radius.
- Prevents accidental desktop regressions from indiscriminate class replacement.
- Leaves broader primitive refactor for a follow-up change.

### Decision: Standardize mobile full-screen modal footer safe-area padding with explicit bottom-inset math

**Choice**: For full-screen mobile modal footers, use explicit safe-area-aware bottom padding (`pb-[calc(...+env(safe-area-inset-bottom))]` or equivalent utility), keeping desktop footer spacing unchanged.

**Alternatives considered**:

- Rely only on global `body` safe-area padding.
- Use no-op `p-6` and depend on device behavior.

**Rationale**:

- Footer actions are fixed/high-priority controls and need local, explicit guarantees.
- Body-level safe-area padding does not reliably protect nested full-screen panels.
- Existing codebase already uses both `pb-safe-bottom` and explicit `calc()` patterns; this aligns with current conventions.

## Data Flow

### 1) Viewport and scroll ownership

`useViewportHeight` -> sets `--app-height` on `document.documentElement`

`globals.css` consumes `--app-height` for `#root` / dynamic height utilities

`#root` handles vertical scroll -> app-shell components render fixed/sticky overlays relative to a stable viewport

### 2) Header overlay lifecycle

User action in `Header` or `RateSelector` -> local open state toggles -> overlay markup rendered via portal (`#modal-root`/`body`) -> backdrop captures outside click -> local state closes overlay

### 3) Mobile auth viewport behavior

Auth page mounts with dynamic viewport-safe class -> page min-height tracks `--app-height` fallback chain -> browser chrome/keyboard changes update visible content bounds without static `100vh` clipping

### 4) Full-screen modal footer safety

Mobile modal opens -> footer applies safe-area-aware bottom padding -> CTA row remains above inset area while content scrolls independently

## File Changes

| File                                                   | Action | Description                                                                                                                         |
| ------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `app/layout.tsx`                                       | Modify | Keep/verify top-level portal host (`#modal-root`) and root container class contract for single-scroll-owner strategy.               |
| `app/globals.css`                                      | Modify | Normalize scroll ownership (`html/body/#root/main`) and ensure dynamic viewport utility behavior matches single-owner approach.     |
| `components/layout/main-layout.tsx`                    | Modify | Remove nested scroll ownership from shell `main` and align shell height handling with CSS variable-based viewport ownership.        |
| `hooks/use-viewport-height.ts`                         | Modify | Preserve canonical viewport variable updates and ensure behavior remains compatible with single scroll owner and keyboard recovery. |
| `components/layout/header.tsx`                         | Modify | Portal mobile/desktop user-menu and notification backdrops/panels out of sticky/backdrop header subtree.                            |
| `components/currency/rate-selector.tsx`                | Modify | Portal dropdown/backdrop to top-level layer to avoid filtered ancestor fixed-position issues.                                       |
| `app/auth/login/page.tsx`                              | Modify | Replace mobile-facing `min-h-screen` usage with dynamic viewport-safe min-height class(es).                                         |
| `app/auth/register/page.tsx`                           | Modify | Replace mobile-facing `min-h-screen` usage with dynamic viewport-safe min-height class(es).                                         |
| `app/auth/forgot-password/page.tsx`                    | Modify | Replace mobile-facing `min-h-screen` usage with dynamic viewport-safe min-height class(es).                                         |
| `app/auth/reset-password/page.tsx`                     | Modify | Replace mobile-facing `min-h-screen` usage with dynamic viewport-safe min-height class(es).                                         |
| `components/transactions/transaction-detail-panel.tsx` | Modify | Add explicit safe-area bottom padding to full-screen mobile footer action container.                                                |
| `components/forms/balance-alert-settings.tsx`          | Modify | Add safe-area-aware footer bottom spacing for mobile modal action row.                                                              |

## Interfaces / Contracts

```ts
// Overlay host resolution contract (component-local helper or shared util)
// Behavior: prefer dedicated modal root, fallback to body.
type OverlayHostResolver = () => HTMLElement | null;

// Expected return precedence:
// 1) document.getElementById('modal-root')
// 2) document.body
// 3) null (SSR / pre-mount)
```

```ts
// CSS class contract for viewport-safe mobile page shells
// Existing class to standardize on in this change:
// .min-h-dynamic-screen { min-height: var(--app-height, 100dvh); }

// Usage contract:
// - apply on mobile-facing route wrappers that previously used min-h-screen
// - avoid broad desktop-only replacements in this change
```

```ts
// Footer safe-area contract for full-screen mobile modals
// Effective bottom padding = baseSpacing + safeAreaInsetBottom

// Example target semantics (not implementation code):
// padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
```

## Testing Strategy

| Layer       | What to Test                                                                                          | Approach                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Overlay host resolution behavior and class selection helpers (if extracted)                           | Jest tests for resolver fallback order and conditional class application logic.                                                                       |
| Integration | Header/rate-selector overlays render in portal layer with correct close behavior                      | React Testing Library: assert overlay nodes mount outside header subtree and backdrop clicks close menus.                                             |
| Integration | App shell uses single scroll owner without nested overflow conflicts                                  | Component-level render checks on className/style contracts for `#root` and shell `main`; keyboard/viewport hook event simulation where practical.     |
| E2E         | Mobile iOS/Android flows: scroll stability, keyboard open/close, overlay anchoring, safe-area footers | Playwright mobile projects (WebKit + Chromium) across auth, dashboard header menus, rate selector, transaction detail panel, and balance alert modal. |

## Migration / Rollout

No data migration required.

Rollout plan:

1. Ship change as a single UI stability patchset behind normal deploy process.
2. Run targeted mobile QA matrix (iOS Safari + Android Chrome) for keyboard and chrome transitions.
3. Monitor post-release UI bug reports for overlay layering and modal CTA visibility regressions.

## Open Questions

- [ ] `openspec/config.yaml` was referenced but is not present in the repo; confirm whether any `rules.design` constraints exist elsewhere.
- [ ] Confirm preferred z-index ordering contract for portalized header overlays vs existing high-priority surfaces (`z-[60]`, `z-[10000]`, etc.) to avoid cross-feature conflicts.
