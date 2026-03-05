# Proposal: Fix Transaction Mobile Swipe Actions

## Intent

Improve mobile transaction row interactions so swipe-to-reveal actions work reliably without accidental tap handling, and remove visual overlap between the swipe hint and right-side currency labels.

## Scope

### In Scope

- Improve drag-vs-tap arbitration in `components/ui/swipeable-card.tsx` so horizontal drag and row tap are mutually exclusive per gesture.
- Fix mobile row visual overlap where `Desliza` can appear over currency labels in transaction rows rendered by `app/transactions/transactions-page-client.tsx`.
- Verify compatibility for other `SwipeableCard` consumers, especially account swipe cards in `components/accounts/swipeable-account-card.tsx`.

### Out of Scope

- Redesigning transaction row actions or introducing new explicit action buttons.
- Broad refactors to global mobile layout primitives unrelated to swipe gesture behavior.
- Replacing `SwipeableCard` with a different interaction pattern.

## Approach

Apply the exploration-recommended root-cause fix in `SwipeableCard`: track meaningful horizontal movement and suppress click/tap callbacks for the same interaction when drag exceeds a small threshold. Keep reveal/close transitions stable around `onDragEnd` to avoid immediate tap re-trigger.

In parallel, adjust mobile hint placement/visibility rules so `Desliza` no longer competes with currency text on constrained row widths. Prefer a narrow, localized UI tweak in transaction row usage or component styling rather than behavior divergence.

Run focused regression checks on both transaction rows and account swipe cards to ensure taps still open details when intended and swipe reveal remains discoverable.

## Affected Areas

| Area                                             | Impact               | Description                                                                              |
| ------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------- |
| `components/ui/swipeable-card.tsx`               | Modified             | Add stricter drag/tap arbitration and stabilize post-drag click behavior.                |
| `app/transactions/transactions-page-client.tsx`  | Modified             | Update mobile row rendering/styling to prevent swipe hint overlap with currency labels.  |
| `components/accounts/swipeable-account-card.tsx` | Verified             | Confirm shared swipe behavior remains correct for account cards after component change.  |
| `app/globals.css`                                | Potentially Modified | If needed, apply minimal style adjustment supporting non-overlapping mobile hint layout. |

## Risks

| Risk                                                                         | Likelihood | Mitigation                                                                              |
| ---------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| Tap suppression threshold is too aggressive, making rows feel unresponsive   | Medium     | Use conservative movement threshold and validate with manual mobile interaction checks. |
| Shared component change causes regressions in non-transaction swipe surfaces | Medium     | Perform compatibility checks on account swipe cards before completion.                  |
| Visual fix removes hint clarity, reducing swipe discoverability              | Low        | Keep hint visible where space allows and validate readability on narrow screens.        |

## Rollback Plan

Revert the `SwipeableCard` arbitration changes and mobile hint styling adjustments in this change set, restoring prior swipe/tap behavior and hint positioning. If partial rollback is needed, retain only non-breaking style changes while removing gesture logic changes.

## Dependencies

- Existing `SwipeableCard` drag and click handlers in `components/ui/swipeable-card.tsx`.
- Mobile transaction row layout constraints in `app/transactions/transactions-page-client.tsx`.
- Manual QA on mobile viewport/device emulation for transactions and account cards.

## Success Criteria

- [ ] On mobile transaction rows, horizontal swipe reliably reveals actions without accidental immediate tap/open behavior.
- [ ] On mobile transaction rows, `Desliza` no longer visually overlaps the currency label.
- [ ] Account swipe card interactions remain functional after shared component updates.
- [ ] Desktop interaction behavior for affected views remains unchanged.
