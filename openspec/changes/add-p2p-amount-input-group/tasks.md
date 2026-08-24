# Tasks: P2P Amount Input Group

## Phase 1: Artifact-Adjacent Preparation

- [x] 1.1 Confirm the proposal, design, and spec remain limited to `components/p2p-offers-filter.tsx` plus tests and ignored local visual-harness output; explicitly exclude search/conversion behavior changes from `0f792b5`.
- [x] 1.2 Define the test selectors/assertions for the static `$` cell, borderless amount input, attached `border-l` unit segment, `aria-pressed` states, focus-within treatment, and conversion-hint alignment.
- [x] 1.3 Record the responsive visual matrix (390/768/1000/1280px) and ensure screenshot output is routed to gitignored `testLocales/`.

## Phase 2: Implementation

- [x] 2.1 Add the bordered flex input group in `components/p2p-offers-filter.tsx`; move `$` into a static high-contrast cell, make the input borderless `min-w-0 flex-1`, and attach the VES/USDT segment with `border-l`.
- [x] 2.2 Apply the shared 52px height/radius treatment, group `focus-within` ring, toggle hover/active/focus states, and aligned conversion hint without adding or removing controls.
- [x] 2.3 Preserve the existing amount state, parsing, unit selection, query construction, automatic re-search, and accessible labels; add unit/component tests for structure, interactions, scrolling-safe layout, and hint placement.

## Phase 3: Validation

- [x] 3.1 Run the focused unit/component test suite and verify amount entry, unit selection, keyboard focus, conversion hint, and existing search behavior.
- [x] 3.2 Run local Playwright visual verification at 390, 768, 1000, and 1280px, including long amount text, focused input, hovered toggle, active unit, and visible conversion hint.
- [x] 3.3 Inspect generated screenshots for `$` visibility, no text overlap, toolbar cohesion, and responsive overflow; keep all screenshots in ignored `testLocales/` and do not commit them.
- [x] 3.4 Run the repository's applicable lint/type checks, review the diff for accidental behavior changes, and record final evidence against the proposal success criteria.
