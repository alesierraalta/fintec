## Verification Report

**Change**: fix-transaction-mobile-swipe-actions

### Completeness

| Metric           | Value |
| ---------------- | ----- |
| Tasks total      | 13    |
| Tasks complete   | 11    |
| Tasks incomplete | 2     |

Incomplete tasks:

- [ ] 4.2 Run manual iOS Safari + Android Chrome gesture/hint matrix
- [ ] 4.3 Confirm desktop non-regression and capture proposal success-criteria checklist

### Correctness (Specs)

| Requirement                                                           | Status         | Notes                                                                                                                                                                                        |
| --------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile Transaction Rows Reveal Swipe Actions on Horizontal Drag       | ✅ Implemented | `SwipeableCard` retains reveal/close threshold behavior and transaction rows continue to use the shared component.                                                                           |
| Tap and Swipe Gestures Are Mutually Exclusive Per Interaction         | ✅ Implemented | Drag intent (`DRAG_INTENT_THRESHOLD_PX = 8`) + suppression window (`POST_DRAG_CLICK_SUPPRESSION_MS = 180`) block same-gesture click after swipe-intent drag.                                 |
| Mobile Swipe Hint Must Not Obscure Transaction Currency Labels        | ✅ Implemented | Row-level hint is disabled for transaction rows (`showSwipeHint={false}`) and a separate list-level mobile hint (`.transactions-mobile-swipe-hint`) is rendered above the rows.              |
| Shared Swipeable Consumers Preserve Existing Interaction Expectations | ⚠️ Partial     | Shared API remains backward-compatible and regression tests exist, but mobile swipe checks are skipped and desktop checks currently fail due auth redirect in this verification environment. |

**Scenarios Coverage:**
| Scenario | Status |
|----------|--------|
| Horizontal drag reveals row actions | ✅ Covered |
| Vertical scroll does not trigger swipe reveal | ✅ Covered |
| Tap opens row details when no meaningful horizontal drag occurs | ✅ Covered |
| Swipe interaction suppresses same-gesture tap handling | ✅ Covered |
| Hint and currency remain visually separated on narrow rows | ✅ Covered |
| Swipe hint behavior preserves discoverability under tight space | ✅ Covered |
| Account swipe cards retain expected tap and swipe behavior | ⚠️ Partial |
| Non-target surfaces avoid unintended behavior drift | ⚠️ Partial |

### Coherence (Design)

| Decision                                                                   | Followed?  | Notes                                                                                                                         |
| -------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Add explicit drag-intent arbitration in `SwipeableCard`                    | ✅ Yes     | Implemented through drag-intent and suppression refs integrated with `onDragStart`/`onDrag`/`onDragEnd`/`onClick`.            |
| Keep reveal/close thresholds stable and independent from tap suppression   | ✅ Yes     | Reveal logic still uses `threshold`; arbitration constants are independent.                                                   |
| Make swipe hint configurable and disable row overlay hint for transactions | ✅ Yes     | `showSwipeHint`/`swipeHintClassName` added with defaults; transaction rows disable per-row hint and use contextual list hint. |
| Protect shared swipe surfaces with contract-first regression checks        | ⚠️ Partial | Component tests pass, but E2E checks are not green in this environment (mobile skipped; desktop blocked by auth redirect).    |

Design file-change alignment:

- ✅ `components/ui/swipeable-card.tsx` modified as designed.
- ✅ `app/transactions/transactions-page-client.tsx` modified as designed.
- ✅ `tests/components/swipeable-card-gesture-arbitration.test.tsx` created with arbitration and hint-contract checks.
- ✅ `tests/e2e/04-transactions-detailed.spec.ts` modified with mobile swipe and desktop non-regression scenarios.
- ✅ `tests/03-accounts-system.spec.ts` modified with mobile and desktop swipe regression scenarios.
- ✅ `components/accounts/swipeable-account-card.tsx` unchanged (compatibility via default props retained).
- ✅ `app/globals.css` includes scoped `.transactions-mobile-swipe-hint` styling.

### Testing

| Area                                                                           | Tests Exist?           | Coverage                                                       |
| ------------------------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------- |
| Shared swipe arbitration component contract                                    | Yes                    | Good                                                           |
| Hint visibility/configuration contract                                         | Yes                    | Good                                                           |
| Vertical-scroll jitter non-reveal behavior                                     | Yes                    | Good (explicit component assertion present and passing)        |
| Transactions mobile swipe + no immediate open + hint/currency separation (E2E) | Yes                    | Partial (currently skipped in this environment)                |
| Accounts shared swipe regression (E2E)                                         | Yes                    | Partial (mobile skipped; desktop run blocked by auth redirect) |
| Manual device matrix (iOS Safari + Android Chrome)                             | No (pending execution) | None                                                           |

Executed verification commands:

- `npm run test -- tests/components/swipeable-card-gesture-arbitration.test.tsx` -> PASS (6/6)
- `PLAYWRIGHT_NO_AUTH_SETUP=1 FRONTEND_AUTH_BYPASS=1 npx playwright test tests/e2e/04-transactions-detailed.spec.ts tests/03-accounts-system.spec.ts --project="Mobile Chrome" --grep "mobile swipe" --reporter=line` -> SKIPPED (2 skipped)
- `PLAYWRIGHT_NO_AUTH_SETUP=1 FRONTEND_AUTH_BYPASS=1 npx playwright test tests/e2e/04-transactions-detailed.spec.ts tests/03-accounts-system.spec.ts --project="chromium" --grep "desktop non-regression keeps" --reporter=line` -> FAIL (2 failed: redirected to `/auth/login` before reaching `/transactions` and `/accounts`)

### Issues Found

**CRITICAL** (must fix before archive):

- Task 4.2 remains incomplete: required manual mobile matrix evidence (iOS Safari + Android Chrome) is still missing.
- Task 4.3 remains incomplete: desktop non-regression acceptance capture against proposal success criteria is still missing.
- Shared-surface regression evidence is not release-ready: mobile E2E coverage is skipped and desktop regression E2E checks failed in this run due auth redirect.

**WARNING** (should fix):

- `openspec/config.yaml` is not present, so no `rules.verify` constraints were available to apply.
- Playwright bypass env vars are insufficient for chromium desktop regression checks in this environment (tests hit `/auth/login`), reducing confidence in automated non-regression status.

**SUGGESTION** (nice to have):

- Add/standardize CI test fixtures so transaction/account swipe rows are guaranteed to exist for regression runs.
- Consolidate a documented auth-bypass strategy for both mobile and desktop Playwright projects to avoid environment-specific gating.

### Verdict

FAIL

Core implementation and component-level behavior remain correct, but archive/release verification is still blocked by incomplete manual gates and non-green cross-surface regression evidence.
