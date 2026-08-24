# Design: P2P Amount Input Group

## Technical Direction

Refactor only the amount portion of `P2POffersFilter` from an overlay composition to an input-group composition. The group is a bordered `flex` container with a static left currency cell, a flexible input cell, and an attached right unit-toggle segment. Layout—not query logic—owns separation, so input scrolling cannot cross either boundary.

## Structure

```text
amount field column
└── amount group: flex, overflow-hidden, border, rounded, focus-within ring
    ├── currency cell: static, `$`, text-foreground
    ├── input cell: min-w-0, flex-1, borderless input
    └── unit segment: static, border-l, VES button, USDT button
└── conversion hint: existing conditional text, aligned below the group
```

The amount input keeps its current `name`, numeric attributes, placeholder, `aria-label`, value, `onChange`, and input mode. The existing `BINANCE_P2P_AMOUNT_UNITS` map and unit state handler continue to drive the toggle. No search, rate, or conversion calculation is moved or changed.

## Visual Rules

- The group owns the border, radius, background, and `focus-within` ring; the input has no competing border or inset focus ring.
- The left `$` cell is static and uses `text-foreground` for contrast, with spacing sufficient for touch and visual separation.
- The input is `min-w-0 flex-1`, so horizontal scrolling is contained by the input viewport.
- The right segment is static and uses `border-l`; buttons retain visible keyboard focus, a distinct active state, and a clear hover state.
- Preserve `h-[52px]` and consistent rounded treatment with the payment select and search button. Keep the conversion hint outside the group with the existing conditional behavior.
- Keep all controls and toolbar hierarchy unchanged: operation remains primary, filters remain secondary, and no controls are added or removed.

## Responsive Behavior

The amount group is allowed to shrink within its existing flexible toolbar column. At narrow widths the toolbar's existing grid remains responsible for stacking controls; within the group, `min-w-0`, flex sizing, and non-overlay cells prevent clipping under adornments. At wider widths the amount column continues to share the row with the payment selector and search action.

## Accessibility

Use a semantic group label for the unit controls and preserve the input's accessible unit-specific label. Keep `aria-pressed` on each unit button. The group focus-within indication complements, rather than replaces, each button's visible focus state. The `$` is decorative and remains `aria-hidden`.

## Validation

- Unit/component tests assert the static currency cell, borderless input structure, attached divider, pressed-state unit buttons, focus behavior, preserved handlers, and conversion-hint placement.
- Local Playwright visual verification checks 390, 768, 1000, and 1280px, including long/scrolled input content, focus, hover, active unit, and conversion hint states.
- Store generated screenshots and any harness scratch data under gitignored `testLocales/`; do not commit them.

## Rollback

The change is isolated to one component and its tests/harness. Revert the markup/class refactor to restore the prior toolbar without any data or API rollback.
