# Task List: Fix Reports Visual and Data Issues

## Relevant Files
- `components/reports/mobile-reports.tsx` - Contains the Period/Tab selector UI (visual bug) and the data aggregation logic for mobile (data bug).
- `components/reports/desktop-reports.tsx` - Contains data aggregation logic for desktop (data bug).
- `tests/components/reports-category-calculations.test.ts` - Likely contains tests relevant to report calculations that might need verification or updating.

### Notes
- The property `amountBaseMinor` is expected to exist on the `Transaction` type and be populated. We assume it represents the transaction amount converted to the user's base currency in minor units (e.g., cents).

## Tasks
- [x] 1.0 Fix Visual Bugs in Mobile Reports
  - [x] 1.1 In `components/reports/mobile-reports.tsx`, locate the `Period Selector` map. Change the active class condition from `text-background-primary` to `text-white` (or a contrasting color suitable for the accent background).
  - [x] 1.2 In `components/reports/mobile-reports.tsx`, locate the `Tab Selector` map. Change the active class condition from `text-background-primary` to `text-white`.

- [x] 2.0 Fix Data Logic in Mobile Reports
  - [x] 2.1 Update `totalIncome` calculation: change `t.amountMinor` to `t.amountBaseMinor` (fallback to 0 if undefined, though it should be defined).
  - [x] 2.2 Update `totalExpenses` calculation: change `t.amountMinor` to `t.amountBaseMinor`.
  - [x] 2.3 Update `categoryTotals` logic: Inside the `forEach` loop, change `t.amountMinor` to `t.amountBaseMinor` for the aggregation.
  - [x] 2.4 Update `Top Transactions` logic (if displayed with mixed currencies): Verify if `amountMinor` is appropriate here (showing original currency) or if it should also be normalized. PRD goal implies "Total amounts", but top transactions usually show the specific transaction value. *Decision: Keep Top Transactions as is (showing specific transaction amount) unless specifically asked to change, but ensuring the "Total" stats above use the normalized values.* -> *Re-reading PRD: Goal is "Total sums". I will strictly focus on the aggregate totals first.*

- [x] 3.0 Fix Data Logic in Desktop Reports
  - [x] 3.1 In `components/reports/desktop-reports.tsx`, locate the `categorySpending` useMemo hook.
  - [x] 3.2 Update the accumulation logic to use `t.amountBaseMinor` instead of `t.amountMinor`.

- [ ] 4.0 Verification & Testing
  - [x] 4.1 Manual Verification (Visual): Check that "Mensual", "Resumen", etc., are readable when selected on mobile view.
  - [x] 4.2 Manual Verification (Data): Check that the total Income/Expenses match the expected sum of converted values (e.g. check against a known mixed-currency dataset if possible, or verify the logic change via code review).
  - [x] 4.3 Run existing tests to ensure no regressions: `npm test tests/components/reports-category-calculations.test.ts`.
