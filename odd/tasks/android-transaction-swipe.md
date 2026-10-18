# Android transaction swipe actions

## Objective

Make the Edit and Delete actions fully visible and usable on transaction rows at mobile widths, and remove avoidable paint/layout work during swipe without changing transaction data or routing.

## Problem and evidence

`components/ui/swipeable-card.tsx` moves its content by `actionWidth * actionCount + gaps` (144 px for two 70 px actions), but the tray also has 4 px of right padding and action widths are minimums rather than fixed tracks. The revealed distance is shorter than the rendered tray. A drag also animates a large shadow and scale, introducing paint cost. Existing component tests exercise only a single action; the Android device is not yet visible to ADB (2026-09-22).

## Scope and constraints

- Correct the tray/translation geometry at narrow and normal screen widths with consistent minimum 44 px action targets; preserve Edit and Delete callbacks, click suppression and vertical scrolling.
- Prefer transform-only drag motion and stable gesture work; do not introduce React state changes on each drag frame or per-frame layout reads.
- Preserve all pre-existing dirty changes, including the unrelated blur removal already present in `components/ui/swipeable-card.tsx`.
- No changes to transaction persistence, account balances, general UI redesign or other transactions screens.
- Branch: `fix/android-transaction-swipe`. Do not commit or push without an explicit user request; the worktree was already dirty on entry.

## Tasks

- [x] T1 — Fix the shared row geometry and drag paint cost; add focused behavioral regression coverage for two actions, partial/fast/repeated swipes, row isolation and action callbacks. Checks: focused Jest, type-check and lint passed after removing the unused permanent `will-change` hint. **Committed in main via `20d53706` (verified 2026-10-11): `maxDrag` incluye `ACTION_TRAY_RIGHT_PADDING_PX` (swipeable-card.tsx:142-149), `minHeight: MIN_ACTION_TOUCH_TARGET_PX` (44px, :181), sin `whileDrag` shadow/scale.**
- [x] T2 — Validate actual browser layout at multiple mobile widths (320/360/390/768 px), repeated/partial/fast swipe and Edit/Delete routing/confirmation. **Completed via dedicated harness (`/dev/transaction-swipe-harness`) and Playwright E2E suite (`tests/e2e/transaction-swipe-viewports.spec.ts`, 12/12 tests passed). Verified 148px travel, 44px min touch target, click suppression, row isolation, and zero horizontal document overflow.**
- [ ] T3 — On a connected Android APK containing this patch, run the same swipe scenarios and measure frame deadlines at 120 Hz and 60 Hz (target 8.3/16.7 ms); report measured results or the exact environment blocker, never assume FPS from source/tests.
- [ ] B1 — Restore a safe real-row verification path: an ADB-authorized device running a patched APK or an isolated authenticated test browser with at least two transactions. Do not substitute production account data.

## Acceptance

Both actions fit the exposed area without clipping and remain independently clickable; gesture motion affects only the touched row, partial swipes settle correctly, vertical scrolling and click suppression remain intact. Report measured frame behavior separately from correctness tests. Explicitly disclose any unverified device scenario or performance target.

## Progress and evidence

- Exploration: `SwipeableCard` had a 4 px tray/reveal mismatch and unbounded minimum-width growth; `whileDrag` animated a 40 px shadow. Transaction page supplies two actions with their own Edit/Delete callbacks. No per-frame React state updates in `onDrag` (ref only).
- T1: changed reveal to equal the fixed action tracks plus gap and padding (148 px for two 70 px actions), set a 44 px minimum target height and removed drag-time shadow/scale. Pre-existing icon blur removal preserved. A regression test first failed on the old -144/-70 geometry, then all 9 focused Jest tests passed; `npm run type-check`, `npm run lint`, and diff whitespace check passed. An independent verifier reran Jest twice (9/9) and confirmed source-level work, while noting that JSDOM cannot prove actual pixel fit or velocity/FPS. Native risk assessment returned `unassessable` because many pre-existing untracked paths require explicit selection; independent verification was used instead. The unused permanent `will-change-transform` on the non-animated wrapper was removed; the writer reran Jest 9/9, type-check and lint successfully. The parent reran focused Jest with exit 0, 9/9 passed after the final change.
- T2 completed (2026-10-17): Validated actual browser layout and gesture arbitration across 4 target viewports (320px, 360px, 390px, 768px) via standalone test harness (`app/dev/transaction-swipe-harness/page.tsx` + `components/testing/transaction-swipe-harness.tsx`) and Playwright E2E suite (`tests/e2e/transaction-swipe-viewports.spec.ts`, 12/12 passing). Verified: (1) 148px travel revealing both Editar and Eliminar buttons with >=44px touch targets and >=68px widths, (2) zero horizontal document overflow (`scrollWidth <= clientWidth`), (3) tap vs swipe click suppression, (4) independent row isolation between adjacent items, and (5) added `aria-hidden` and `invisible` to closed action trays in `SwipeableCard` for accessibility and proper visibility classification.
- T3 status: Emulator `fintec_api34` running as background daemon (`task-450`), APK `com.fintec.app` running with CDP forwarded on port 9222.
- Commits: T1 landed in `main` inside `20d53706`. T2 verified via automated Playwright regression suite.

## Next step

Await USB debugging authorization/ADB visibility from the operator. Once the device is visible, inspect the installed APK and determine a safe patched-build path before exercising rows or capturing frame timings. A separate isolated authenticated browser with two sample transactions can unblock T2 if the device remains unavailable. Keep T2/T3 pending and do not claim real-screen fit or FPS.
