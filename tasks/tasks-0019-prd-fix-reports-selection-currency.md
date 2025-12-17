# Task List: Fix Reports Selection Visibility and Currency Display

## Relevant Files
- `components/reports/mobile-reports.tsx` - Contains the UI for reports, including selection states and currency display logic.
- `lib/money.ts` - Contains `formatCurrency` utility.

### Notes
- The calculation for `totalIncome` and `totalExpenses` currently sums `amountBaseMinor / 100` (Major units). `formatCurrency` expects Minor units. We need to adjust the calculation to sum `amountBaseMinor` directly (minor units) or multiply by 100 before formatting. *Decision: Sum Minor units directly to avoid precision loss and compatibility with `formatCurrency`.*

## Tasks
- [x] 1.0 Enhance Currency Display in Mobile Reports
  - [x] 1.1 Import `formatCurrency` from `@/lib/money` in `components/reports/mobile-reports.tsx`.
  - [x] 1.2 Update `totalIncome` and `totalExpenses` calculation to sum `t.amountBaseMinor` directly (without dividing by 100).
  - [x] 1.3 Update `categoryTotals` calculation to sum `t.amountBaseMinor` directly (without dividing by 100).
  - [x] 1.4 Update Overview Cards (Ingresos/Gastos/Neto) to use `formatCurrency(amount, user?.baseCurrency || 'USD')`. *Note: Need to check if `user` object has `baseCurrency` available in `useAuth` hook, otherwise default to 'USD' or check where base currency is stored.*
  - [x] 1.5 Update "Promedio por día" to calculation to use the new minor unit totals and `formatCurrency`.
  - [x] 1.6 Update "Gastos por Categoría" list to use `formatCurrency` for the displayed amounts.

- [x] 2.0 Fix Active Selection Visibility
  - [x] 2.1 In `components/reports/mobile-reports.tsx`, replace `bg-accent-primary` with `bg-primary` (or `bg-blue-600` if primary isn't working as expected, but `bg-primary` should be standard) in the `Period Selector` active state.
  - [x] 2.2 In `components/reports/mobile-reports.tsx`, replace `bg-accent-primary` with `bg-primary` in the `Tab Selector` active state.

- [x] 3.0 Refine Transaction Display
  - [x] 3.1 In "Mayores Gastos" (Top Transactions), update the rendered amount to use `formatCurrency(transaction.amountMinor, transaction.currencyCode)`. This will show "Bs." for VES and "$" for USD correctly.

- [ ] 4.0 Verification
  - [ ] 4.1 Manual Verification (Visual): Check that selected tabs/periods now have a visible blue background with white text.
  - [ ] 4.2 Manual Verification (Data): Check that totals show the base currency symbol (e.g. "$") and top transactions show their specific currency symbol (e.g. "Bs.").
