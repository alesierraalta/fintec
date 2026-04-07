## Exploration: Production Mobile Layout Issues

### Current State

The application uses a sticky header and a fixed bottom navigation bar on mobile. The header utilizes `pt-safe-top` to handle safe areas (notches/dynamic islands), and the bottom navigation uses `pb-safe-bottom`.

#### Reported Issues

1. **Header Overflow**: Components appear to "leak" or "come out" of the header in production, but not in the browser inspector.
2. **Cramped Mobile Nav**: Navigation items look closer together in production compared to the inspector.

#### Initial Findings

- **Header Structure**: The `<header>` has `sticky top-0` and `pt-safe-top`. The background is applied via `.black-theme-header`.
- **Navigation Bar**: The `MobileNav` uses `flex-1` on 6 items with a `min-w-[3.5rem]`. On small devices (e.g. 320px-375px), this results in items being very close together (~53px-60px each).
- **Environment Differences**: The mobile inspector often reports 0 for `env(safe-area-inset-top)` unless a specific modern device is simulated. In production, this value is non-zero, shifting the header's content area.

### Affected Areas

- `components/layout/header.tsx` — Sticky behavior and safe area padding implementation.
- `components/layout/mobile-nav.tsx` — Flexbox properties and item widths/gaps.
- `app/globals.css` — Global scroll ownership and safe area fallback values.

### Approaches

1. **Header Robustness**
   - **Tweak**: Use `margin-top: env(safe-area-inset-top)` and `padding-top: env(safe-area-inset-top)` with a background color that explicitly spans the entire top area. Alternatively, wrap the header content in a separate div to isolate safe-area padding from component alignment.
   - **Pros**: More stable rendering on different mobile browsers.
   - **Cons**: Minor refactor of header layout.

2. **Navigation Spacing Refactor**
   - **Tweak**: Change `flex-1` to `flex-shrink-0` on `MobileNav` items and ensure `overflow-x-auto` is working correctly. Increase the `gap` or `min-width` to provide more breathing room.
   - **Pros**: Items won't look "squashed" on small screens.
   - **Cons**: May require horizontal scrolling on the smallest devices (320px).

3. **Global Viewport Normalization**
   - **Tweak**: Review `useViewportHeight` and ensure `--app-height` is correctly calculated across all mobile browsers (especially Safari/Opera).
   - **Pros**: Fixes root cause of layout shifts.
   - **Cons**: Complex to test without a device matrix.

### Recommendation

Perform a **Targeted UI Polish**:

1. Update `Header.tsx` to ensure the background covers the safe area more robustly, possibly by adding a pseudo-element or ensuring the `header` element itself has no "invisible" gaps.
2. Update `MobileNav.tsx` to use more generous spacing and better flex shrinking behavior to prevent "cramped" looks on real devices.
3. Investigate if any non-portal overlays are affecting the header's static components.

### Risks

- Regressions in desktop layout if not correctly scoped to mobile.
- Safe-area insets returning different values or being handled differently by third-party mobile browsers (Opera, etc.).

### Ready for Proposal

Yes. The cause is likely the intersection of real device safe-area insets and tight flexbox parameters that the browser inspector doesn't faithfully replicate.
