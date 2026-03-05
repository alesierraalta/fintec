## Exploration: fix-transaction-mobile-swipe-actions

### Current State

`/transactions` renders each mobile row with `SwipeableCard` (`app/transactions/transactions-page-client.tsx`). `SwipeableCard` combines horizontal drag, tap-to-open details (`onClick`), and an always-visible swipe hint (`Desliza`) on the right side (`components/ui/swipeable-card.tsx`).

The swipe reveal logic is driven by `onDragEnd` (`info.offset.x < -threshold`) and card offset animation (`animate={{ x: isRevealed ? maxDrag : 0 }}`). In the same component, `onClick` can immediately close revealed actions or open details.

### Affected Areas

- `components/ui/swipeable-card.tsx` — shared drag/click state machine; likely source of mobile swipe-vs-tap conflict and hint overlap.
- `app/transactions/transactions-page-client.tsx` — mobile transaction row layout puts currency label at the same right-side zone where the swipe hint appears.
- `app/globals.css` — `.content-visibility-auto` is applied to each transaction row and may increase risk of mobile rendering/interaction edge-cases with transformed children.

### Approaches

1. **Fix gesture state in `SwipeableCard` (recommended)** — suppress tap/click handling right after horizontal drag and keep swipe reveal state stable.
   - Pros: Addresses likely root cause (drag end followed by click), reusable for all swipeable lists, minimal surface area.
   - Cons: Requires careful tuning so regular taps still open details reliably.
   - Effort: Medium.

2. **Transaction-only workaround** — disable row `onClick` on mobile (or gate it) and add explicit action trigger (kebab/details button).
   - Pros: Very predictable UX, avoids gesture ambiguity entirely.
   - Cons: Behavior divergence between screens; does not fix shared swipe component bug.
   - Effort: Medium.

3. **Visual-only adjustment** — move/hide swipe hint and adjust right-side spacing.
   - Pros: Quickly removes overlap over currency label.
   - Cons: Does not solve swipe reveal failure.
   - Effort: Low.

### Recommendation

Implement Approach 1 first: update `SwipeableCard` to treat drag and tap as mutually exclusive per interaction (e.g., track drag distance in a ref and ignore click if horizontal movement exceeded a small threshold, or short-circuit click after `onDragEnd`).

In the same change, apply a small visual tweak from Approach 3 (reposition/hide swipe hint on tight mobile rows) so the right-side currency label (`VES`/`USD`) is not visually covered.

### Risks

- Over-blocking clicks after tiny finger movement can make rows feel unresponsive.
- Shared component change can alter behavior in account cards (`components/accounts/swipeable-account-card.tsx`), so regression checks are needed.
- If `content-visibility-auto` contributes to interaction quirks on specific mobile browsers, gesture fix alone may not be fully sufficient.

### Ready for Proposal

Yes — proceed with a focused proposal to patch `SwipeableCard` gesture arbitration + mobile hint placement, then verify on `/transactions` and account cards.
