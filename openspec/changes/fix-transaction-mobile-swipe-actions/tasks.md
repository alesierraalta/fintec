# Tasks: Fix Transaction Mobile Swipe Actions

## Phase 1: Shared Swipe Foundation

- [x] 1.1 Update `components/ui/swipeable-card.tsx` props contract to add `showSwipeHint?: boolean` (default `true`) and `swipeHintClassName?: string`, preserving backward compatibility for existing consumers. (Design: Interfaces / Contracts, Decision: configurable hint; Spec: Mobile Swipe Hint non-overlap, Shared consumers stability)
- [x] 1.2 Add drag-intent tracking in `components/ui/swipeable-card.tsx` using explicit horizontal movement refs and constants (for example `DRAG_INTENT_THRESHOLD_PX` and `POST_DRAG_CLICK_SUPPRESSION_MS`) without changing existing reveal distance thresholds. (Design: Decision drag-intent arbitration + threshold independence; Spec: Tap/Swipe mutual exclusivity)
- [x] 1.3 Implement deterministic click gating in `components/ui/swipeable-card.tsx` across `onDragStart`, `onDrag`, `onDragEnd`, and `onClick` so a swipe-qualified gesture suppresses same-interaction tap callbacks while normal taps still trigger `onClick`. (Design: Data Flow 1; Spec: Swipe reveals, Tap vs Swipe exclusivity)
- [x] 1.4 Keep keyboard activation behavior unchanged in `components/ui/swipeable-card.tsx` (Enter/Space semantics bypass drag suppression logic) and verify no API changes are required in `components/accounts/swipeable-account-card.tsx`. (Design: Behavioral contract #3; Spec: Shared consumers preserve expectations)

## Phase 2: Transactions Mobile Hint Placement

- [x] 2.1 Update `app/transactions/transactions-page-client.tsx` transaction row usage of `SwipeableCard` to pass `showSwipeHint={false}` for row cards in mobile layout where amount/currency content is right-aligned. (Design: Hint visibility flow, File Changes; Spec: Hint must not obscure currency labels)
- [x] 2.2 Add one mobile-context swipe discoverability hint in `app/transactions/transactions-page-client.tsx` (header/intro/list container area) so affordance remains visible without row-level overlap on constrained widths. (Design: Decision configurable hint + contextual hint; Spec: Discoverability under tight space)
- [x] 2.3 If spacing or typography support is needed, apply minimal non-overlapping style adjustments in `app/globals.css` scoped to the transactions mobile hint container without changing desktop visual behavior. (Proposal affected areas; Spec: Hint and currency remain visually separated)

## Phase 3: Automated Verification Coverage

- [x] 3.1 Create `tests/components/swipeable-card-gesture-arbitration.test.tsx` with component tests for: (a) tap without meaningful horizontal movement triggers `onClick`, (b) swipe-qualified drag suppresses same-gesture click, and (c) revealed-row tap closes row without firing navigation callback. (Design: Testing Strategy unit/component; Spec scenarios Tap opens + Swipe suppresses tap)
- [x] 3.2 Add tests in `tests/components/swipeable-card-gesture-arbitration.test.tsx` for hint contract: default `showSwipeHint` renders hint, and `showSwipeHint={false}` removes row-level hint. (Design: Testing Strategy hint rendering; Spec: non-overlapping hint strategy)
- [x] 3.3 Modify `tests/e2e/04-transactions-detailed.spec.ts` mobile flow to verify swipe left reveals transaction actions, does not trigger immediate row open on the same gesture, and keeps currency/hint presentation legible in narrow viewport conditions. (Design: Testing Strategy E2E transactions; Spec: Swipe reveal + vertical jitter safety + visual separation)
- [x] 3.4 Modify `tests/03-accounts-system.spec.ts` to add/adjust mobile swipe smoke coverage confirming account cards still support expected swipe reveal and tap behavior after shared `SwipeableCard` changes. (Design: Testing Strategy E2E account regression; Spec: Shared consumers preserve expectations)

## Phase 4: Manual QA and Implementation Gate

- [x] 4.1 Execute targeted verification commands for changed areas (lint/type-check and focused test runs for the updated component, account, and transactions specs) and record pass/fail outcomes in the change notes. (Design: Rollout step 3, Testing Strategy)
- [ ] 4.2 Run manual mobile interaction matrix on iOS Safari and Android Chrome covering: intentional swipe reveal, vertical-scroll jitter non-reveal, micro-move tap reliability, revealed-row tap-close behavior, and contextual hint discoverability on narrow widths. (Design: Testing Strategy manual device realism; Spec: all mobile gesture and hint scenarios)
- [ ] 4.3 Confirm desktop non-regression on `/transactions` and account-card surfaces (tap/open and swipe behavior unchanged where expected), then capture acceptance checklist completion against `openspec/changes/fix-transaction-mobile-swipe-actions/proposal.md` success criteria. (Proposal success criteria; Spec: non-target surfaces avoid behavior drift) _Automated desktop smoke tests were added, but execution is environment-limited because no swipeable rows are available in this run; requires seeded desktop data/session for full completion._

## Batch 2 Verification Evidence

- `npm run lint` -> PASS (0 errors, warnings-only baseline).
- `npm run type-check` -> PASS.
- `npm run test -- tests/components/swipeable-card-gesture-arbitration.test.tsx` -> PASS (5/5 tests).
- `PLAYWRIGHT_NO_AUTH_SETUP=1 FRONTEND_AUTH_BYPASS=1 npx playwright test tests/e2e/04-transactions-detailed.spec.ts tests/03-accounts-system.spec.ts --project="Mobile Chrome" --grep "mobile swipe" --reporter=line` -> SKIPPED (2 skipped due unavailable authenticated seed/swipeable runtime preconditions in this environment).

## Batch 3 Verification Evidence

- `npm run test -- tests/components/swipeable-card-gesture-arbitration.test.tsx` -> PASS (6/6 tests, includes dedicated "vertical scroll + minor horizontal jitter does not reveal" assertion).
- `PLAYWRIGHT_NO_AUTH_SETUP=1 FRONTEND_AUTH_BYPASS=1 npx playwright test tests/e2e/04-transactions-detailed.spec.ts tests/03-accounts-system.spec.ts --project="chromium" --grep "desktop non-regression keeps" --reporter=line` -> SKIPPED (2 skipped because no swipeable transaction/account rows are rendered in this environment).

## Pending Manual Matrix (4.2)

- [ ] iOS Safari: intentional swipe reveal opens row actions.
- [ ] iOS Safari: vertical-scroll with horizontal jitter does not reveal.
- [ ] iOS Safari: micro-move tap still opens details.
- [ ] iOS Safari: revealed row tap closes row without navigating.
- [ ] iOS Safari: contextual hint remains discoverable and non-overlapping in narrow width + landscape.
- [ ] Android Chrome: intentional swipe reveal opens row actions.
- [ ] Android Chrome: vertical-scroll with horizontal jitter does not reveal.
- [ ] Android Chrome: micro-move tap still opens details.
- [ ] Android Chrome: revealed row tap closes row without navigating.
- [ ] Android Chrome: contextual hint remains discoverable and non-overlapping in narrow width + landscape.

### Manual Evidence Template (attach for each checklist item)

- Device + OS + browser version:
- App build/commit:
- Screen/viewport orientation:
- Preconditions (account/category/transaction seed used):
- Steps executed:
- Expected result:
- Actual result:
- Evidence artifact (video/screenshot path):
- Pass/Fail:
