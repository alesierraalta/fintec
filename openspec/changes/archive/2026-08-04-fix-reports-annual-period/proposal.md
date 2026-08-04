# Proposal: Fix annual report date period boundaries and timezone handling

## Intent

The annual financial report (and standard period reports like week, month, and quarter) currently exhibits two critical date-handling defects:
1. **Unbounded End Dates**: Non-custom period filters (such as `'year'`) assign an unbounded maximum date (`new Date(8640000000000000)`) as the end boundary instead of capping at the end of the specified period (e.g. December 31st 23:59:59.999 for annual reports). This allows future transactions or out-of-period entries to spill into current reports.
2. **Timezone Shift & Parsing Errors**: Date strings formatted as `YYYY-MM-DD` or ISO timestamp strings without explicit local offsets are parsed by JavaScript's default `Date` constructor as UTC midnight. In negative UTC timezones (such as UTC-4 or UTC-5 in the Americas), UTC midnight translates to late evening of the preceding day (e.g. `2026-01-01T00:00:00Z` becomes `2025-12-31T20:00:00-04:00`). This shifts transactions occurring on January 1st to the prior year and excludes them from annual calculations.

The intent of this change is to fix period boundaries for all report periods (ensuring annual reports are strictly bounded from Jan 1 00:00:00.000 to Dec 31 23:59:59.999) and centralize timezone-safe date parsing into a utility module.

## Scope

### In Scope
* **New Module (`lib/reports/period-boundaries.ts`)**: Encapsulated helpers for calculating strict `start` and `end` Date objects for each period type (`week`, `month`, `quarter`, `year`, `custom`) and parsing date strings using local timezone context.
* **Desktop Report Component (`components/reports/desktop-reports.tsx`)**: Update transaction filtering and trend key generation to use `period-boundaries.ts`.
* **Mobile Report Component (`components/reports/mobile-reports.tsx`)**: Update transaction filtering and trend key generation to use `period-boundaries.ts`.
* **Unit Test Suite (`tests/lib/reports/period-boundaries.test.ts`)**: Comprehensive unit tests covering boundary calculations, timezone offsets (negative/positive UTC), leap years, and month-end dates.
* **E2E Visual Tests (`tests/e2e/21-reports-period-selector.spec.ts`)**: E2E tests validating period boundary selectors and visual rendering.

### Out of Scope
* Database schema or RPC API modifications.
* Altering stored transaction date formats in backend repositories.
* Changing debt calculation rules outside of reporting period filtering.

## Approach

1. **Centralized Period Boundary Utility (`lib/reports/period-boundaries.ts`)**:
   * Implement `getPeriodRange(period: string, referenceDate?: Date, customRange?: { start: string; end: string })` returning bounded `{ start: Date, end: Date }`.
     * `year`: `YYYY-01-01T00:00:00.000` to `YYYY-12-31T23:59:59.999` (Local time).
     * `month`: `YYYY-MM-01T00:00:00.000` to `YYYY-MM-[lastDay]T23:59:59.999`.
     * `quarter`: Start of Q1/Q2/Q3/Q4 00:00:00.000 to End of Q1/Q2/Q3/Q4 23:59:59.999.
     * `week`: 7 days prior / start of week 00:00:00.000 to current day / end of week 23:59:59.999.
     * `custom`: Start date 00:00:00.000 to End date 23:59:59.999.
   * Implement `parseLocalDate(dateStr: string | Date): Date` to safely parse dates without UTC midnight shift.
   * Implement `formatPeriodKey(date: Date, isLongPeriod: boolean): string` for consistent trend grouping keys (`YYYY-MM` vs `YYYY-MM-DD`).

2. **Component Refactoring (`desktop-reports.tsx` & `mobile-reports.tsx`)**:
   * Replace inline `getPeriodStartDate` and hardcoded `new Date(8640000000000000)` end dates with `getPeriodRange`.
   * Refactor `filteredTransactions` filtering loop to use `parseLocalDate` for transaction comparison.
   * Update trend chart key generation logic (`generateAllKeys` and `groupedData` population) to use `formatPeriodKey` and local date helpers.

3. **Testing & Verification**:
   * Create `tests/lib/reports/period-boundaries.test.ts` testing year/month/quarter/custom boundaries, leap year February 29th, and negative timezone simulations.
   * Update `tests/e2e/21-reports-period-selector.spec.ts` with assertions verifying annual period boundaries and visual report rendering.

## Affected Areas

| File / Component | Type | Description |
| --- | --- | --- |
| `lib/reports/period-boundaries.ts` | New File | Centralized date range & timezone parsing utility. |
| `components/reports/desktop-reports.tsx` | Modified | Updated period calculation, transaction filtering, and chart grouping. |
| `components/reports/mobile-reports.tsx` | Modified | Updated period calculation, transaction filtering, and chart grouping. |
| `tests/lib/reports/period-boundaries.test.ts` | New File | Unit tests for period boundary calculation and timezone handling. |
| `tests/e2e/21-reports-period-selector.spec.ts` | Modified | E2E visual tests for period selection and boundary assertions. |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Negative UTC offset shifting dates on DST transitions | Low | Use explicit local calendar component extraction (`getFullYear`, `getMonth`, `getDate`) instead of naive UTC timestamp math. |
| Month-end boundary mismatch in 28/30/31 day months | Medium | Unit tests explicitly asserting month-end ranges for Feb (including leap years), April, June, Sept, Nov. |

## Rollback Plan

1. Revert modifications in `components/reports/desktop-reports.tsx` and `components/reports/mobile-reports.tsx`.
2. Delete `lib/reports/period-boundaries.ts` and `tests/lib/reports/period-boundaries.test.ts`.
3. Revert changes to `tests/e2e/21-reports-period-selector.spec.ts`.

## Dependencies

* Native JavaScript `Date` API / existing project date helper routines.
* Vitest / Playwright test runners.

## Success Criteria

* [ ] Annual report period (`'year'`) strictly bounds transaction filter between `Jan 1 00:00:00.000` and `Dec 31 23:59:59.999`.
* [ ] Date string parsing in negative UTC timezones (e.g. UTC-4/5) includes January 1st transactions correctly without shifting them to December 31st of the previous year.
* [ ] `desktop-reports.tsx` and `mobile-reports.tsx` correctly apply `period-boundaries.ts`.
* [ ] 100% test pass rate in `tests/lib/reports/period-boundaries.test.ts`.
* [ ] E2E visual tests in `tests/e2e/21-reports-period-selector.spec.ts` pass cleanly.
