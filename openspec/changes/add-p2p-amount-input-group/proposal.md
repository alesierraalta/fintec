# Proposal: P2P Amount Input Group

## Why

The amount filter in `components/p2p-offers-filter.tsx` places the `$` icon and the VES/USDT toggle on top of the input using absolute positioning and reserves space with `pr-[124px]`. On narrow screens, horizontally scrolled amount text can pass beneath both overlays, making the currency marker invisible or unreadable. This creates confusion at the moment a user is entering the amount that controls the P2P offer search.

## What Changes

- Replace the overlaid amount-field layout with a bordered input group.
- Keep `$` in its own static, high-contrast cell using `text-foreground`.
- Keep the amount input borderless and `flex-1`/`min-w-0` inside the group.
- Attach the VES/USDT toggle as a right segment separated by `border-l`; text must never pass beneath it.
- Apply a focused `focus-within` ring to the group and consistent `h-[52px]` heights and radii across the toolbar.
- Add clear hover/active states to the embedded toggle, align the conversion hint below the amount field, and preserve primary/secondary visual separation.
- Add unit coverage for structure and interaction plus local Playwright visual verification at 390, 768, 1000, and 1280px. Screenshots remain in gitignored `testLocales/` and are not committed.

Search, unit conversion, rate lookup, automatic re-search, and all other controls remain behaviorally unchanged; conversion behavior shipped in `0f792b5` is out of scope.

## Impact

### Affected Areas

- `components/p2p-offers-filter.tsx`: amount group and toolbar visual cohesion.
- Unit/component tests for the filter's accessible structure, amount editing, and unit selection.
- Local Playwright visual harness and ignored screenshot output under `testLocales/`.

### Risks

- Responsive flex sizing could introduce overflow or compress adjacent controls at intermediate widths.
- Changing focus styling on nested controls could reduce keyboard clarity if the group and buttons do not retain visible focus states.
- Visual-only changes could accidentally alter the amount input's name, value, or unit-toggle event handlers.

### Rollback

Revert the scoped filter markup/class changes and their tests. No data, API, persistence, or migration changes are required, so rollback has no state-recovery step.

## Success Criteria

- [ ] At 390, 768, 1000, and 1280px, the `$`, amount text, and VES/USDT segment remain distinct and readable with no overlap or clipping.
- [ ] The amount group has a visible focus-within treatment; amount and unit controls remain keyboard accessible with visible focus states.
- [ ] `$` uses `text-foreground`, the input is borderless within the group, and the toggle is attached by a left divider.
- [ ] Toolbar controls share the intended 52px height/radius treatment, and the conversion hint sits directly below the amount field.
- [ ] Existing search, conversion, and auto-search behavior remains covered and unchanged.
- [ ] Unit tests pass and visual screenshots are generated only in ignored `testLocales/` output.
