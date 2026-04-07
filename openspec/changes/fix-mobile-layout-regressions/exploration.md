## Exploration: Mobile Layout Regressions

### Current State

Following the previous fix for header background leaks, two regressions were introduced:

1. **Header Height**: The header is excessively tall because safe-area spacing was applied twice (once as height and once as padding).
2. **Horizontal Overflow**: The bottom navigation bar forces horizontal scrolling on standard mobile widths (375px) because of fixed `min-width` constraints on its 6 items.

### Affected Areas

- `components/layout/header.tsx` — Redundant safe-area spacer and padding.
- `components/layout/mobile-nav.tsx` — Fixed `min-width` and `flex-shrink-0` causing overflow.

### Approaches

1. **Header: Streamlined Safe Area**
   - **Approach**: Remove the explicit spacer `div` and the redundant `paddingTop`. Apply `pt-safe-top` (or `padding-top: env(safe-area-inset-top)`) directly to the `header` element.
   - Pros: Simpler DOM, correct height, solid background coverage.
   - Cons: None.
   - Effort: Low.

2. **MobileNav: Fluid Distribution**
   - **Approach**: Remove `min-w-[4.25rem]`, `flex-shrink-0`, `snap-x`, and `overflow-x-auto`. Use `flex-1` and `justify-around` to ensure items scale to fit the screen width without scrolling.
   - Pros: No "terrible" horizontal scroll, items always visible.
   - Cons: Items might be slightly narrower on very small devices (320px), but still functional.
   - Effort: Low.

### Recommendation

Implement both Streamlined Safe Area for the header and Fluid Distribution for the navigation bar. This restores the intended aesthetics while keeping the background fix for the header.

### Risks

- On very narrow screens (320px), the 6 navigation items might get too close. I will reduce the internal padding/gap of the items to mitigate this.

### Ready for Proposal

Yes.
