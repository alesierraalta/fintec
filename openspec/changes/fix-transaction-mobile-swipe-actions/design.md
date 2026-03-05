# Design: Fix Transaction Mobile Swipe Actions

## Technical Approach

Implement a focused interaction fix in the shared `SwipeableCard` gesture lifecycle so a single touch interaction resolves to either drag or tap, never both. Keep the existing reveal mechanics (`threshold`, spring animation, action tray) but add explicit drag-intent tracking, click suppression windows, and deterministic event sequencing around `onDragStart`/`onDragEnd`.

For the mobile `Desliza` hint, remove row-level overlap risk on transaction rows by making the hint configurable at the component boundary and moving discoverability to a non-overlapping placement in the transactions list context. This keeps shared behavior intact for account cards and other swipe surfaces.

## Architecture Decisions

### Decision: Add explicit drag-intent arbitration in `SwipeableCard`

**Choice**: Track horizontal movement and suppress tap/click when gesture movement crosses a small drag-intent threshold, plus a short post-drag suppression window.

**Alternatives considered**:

- Continue using only `isDragging` state from Framer drag callbacks.
- Disable row click entirely on mobile transaction rows.

**Rationale**:

- `isDragging` alone is insufficient because click can still fire after drag end in mobile pointer sequences.
- A small threshold (intent) + short cooldown (sequencing) avoids accidental opens without making taps feel dead.
- Preserves desktop and keyboard behavior with minimal API churn.

### Decision: Keep reveal/close thresholds stable and independent from tap suppression

**Choice**: Retain reveal thresholds (`offset.x < -threshold`, close when dragging right past partial threshold) while separating tap suppression constants from reveal constants.

**Alternatives considered**:

- Use one larger threshold for both reveal and tap arbitration.
- Increase reveal threshold globally to reduce accidental drags.

**Rationale**:

- Reveal ergonomics and tap arbitration solve different problems.
- Decoupled constants allow precise tuning without changing established swipe distance muscle memory.

### Decision: Make swipe hint configurable and disable row overlay hint for transactions

**Choice**: Add `showSwipeHint` (default `true`) and optional `swipeHintClassName` to `SwipeableCard`; set `showSwipeHint={false}` for transaction rows and render one mobile-only contextual hint in the transaction list header/intro area.

**Alternatives considered**:

- Keep row hint and only reposition with CSS in each row.
- Hide all hints globally.

**Rationale**:

- Transaction rows have right-aligned amount/currency content where overlay collisions occur.
- A single contextual hint preserves discoverability without per-row overlap.
- Default behavior remains unchanged for account cards and future consumers.

### Decision: Protect shared swipe surfaces with contract-first regression checks

**Choice**: Add focused component tests for gesture arbitration contract and run targeted manual/e2e checks for both transactions and account cards.

**Alternatives considered**:

- Rely only on manual QA.
- Add only transaction tests.

**Rationale**:

- The change is in shared infrastructure (`SwipeableCard`) and can regress multiple screens.
- Contract tests on the shared component catch sequencing regressions before page-level smoke tests.

## Data Flow

### 1) Gesture arbitration lifecycle

User touch on card
|
v
`onDragStart` -> set `isDragging=true`, clear previous suppression
|
v
`onDrag` -> accumulate `abs(offset.x)` in ref
|
+-- movement < dragIntentPx --> gesture still tap-eligible
|
+-- movement >= dragIntentPx -> mark as drag-intent, suppress next click
|
v
`onDragEnd` -> apply reveal/close thresholds -> set suppression deadline (`now + cooldownMs`) -> `isDragging=false`
|
v
`onClick` -> if revealed: close; else if suppression active: ignore; else invoke `onClick`

### 2) Hint visibility flow for transactions

Transactions page renders row -> passes `showSwipeHint={false}` to `SwipeableCard`
|
v
No per-row overlay hint in amount/currency zone
|
v
Single mobile contextual hint shown in list container/header area

## File Changes

| File                                                           | Action | Description                                                                                                                                                                          |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/ui/swipeable-card.tsx`                             | Modify | Add drag-intent refs, post-drag click suppression, optional hint controls (`showSwipeHint`, `swipeHintClassName`), and deterministic click gating while preserving keyboard support. |
| `app/transactions/transactions-page-client.tsx`                | Modify | Disable per-row hint for transaction swipe cards and place one mobile-safe hint in list context so currency labels are never covered.                                                |
| `components/accounts/swipeable-account-card.tsx`               | Verify | Confirm existing usage requires no code change due to backward-compatible defaults, but validate interaction behavior after shared updates.                                          |
| `tests/components/swipeable-card-gesture-arbitration.test.tsx` | Create | Cover drag-vs-tap exclusivity, reveal-close sequencing, and click suppression cooldown behavior.                                                                                     |
| `tests/e2e/04-transactions-detailed.spec.ts`                   | Modify | Add/adjust mobile swipe scenario to verify swipe reveal does not trigger transaction open and hint does not overlap row amount/currency content.                                     |
| `tests/03-accounts-system.spec.ts`                             | Modify | Add/adjust swipe smoke check for account cards to confirm shared component behavior remains stable.                                                                                  |

## Interfaces / Contracts

```ts
// components/ui/swipeable-card.tsx
interface SwipeableCardProps {
  children: ReactNode;
  actions: SwipeAction[];
  threshold?: number;
  actionWidth?: number;
  className?: string;
  onClick?: () => void;
  disableSwipe?: boolean;
  showSwipeHint?: boolean; // default true
  swipeHintClassName?: string; // optional styling override
}

// Internal interaction contract
const DRAG_INTENT_THRESHOLD_PX = 8;
const POST_DRAG_CLICK_SUPPRESSION_MS = 180;
```

```ts
// Behavioral contract
// 1) A gesture that exceeds DRAG_INTENT_THRESHOLD_PX must not call row onClick.
// 2) onDragEnd decides reveal state before click handling is allowed again.
// 3) Keyboard activation (Enter/Space) keeps current button semantics and bypasses drag suppression.
```

## Testing Strategy

| Layer          | What to Test                               | Approach                                                                                                                                                                                    |
| -------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/Component | Drag-vs-tap arbitration in `SwipeableCard` | React Testing Library + pointer/mouse event simulation: ensure drag-intent suppresses `onClick`, plain tap still calls `onClick`, and revealed card tap closes without navigation callback. |
| Unit/Component | Hint rendering contract                    | Assert `showSwipeHint=false` removes row-level hint, default remains visible for existing consumers.                                                                                        |
| E2E            | Transaction mobile interaction             | Playwright mobile viewport: swipe left reveals actions, immediate row open does not occur, tapping after cooldown opens details, and amount/currency text remains unobstructed.             |
| E2E            | Account card regression                    | Playwright account screen smoke: swipe reveals actions and tap-to-open still works when not dragging.                                                                                       |
| Manual         | Device realism checks                      | On iOS Safari and Android Chrome: slow drag, short flick, accidental micro-move tap, revealed->tap-close, and landscape narrow-width rows for hint visibility.                              |

## Migration / Rollout

No data migration required.

Rollout plan:

1. Land `SwipeableCard` arbitration and hint configurability first.
2. Apply transaction-page hint placement update.
3. Run targeted component tests and mobile E2E smoke.
4. Execute manual QA matrix on real/tethered mobile browsers before merge.

## Open Questions

- [ ] `openspec/config.yaml` is referenced by the orchestrator context but is not present in this repository; confirm if there are `rules.design` constraints outside `openspec/` that must be applied.
