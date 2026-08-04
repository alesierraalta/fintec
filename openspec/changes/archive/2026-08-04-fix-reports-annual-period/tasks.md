# Tasks: Fix Annual Report Date Period Boundaries and Timezone Handling

## Phase 1: Core Utility Implementation (`lib/reports/period-boundaries.ts`)

- [x] Task 1.1: Create type definitions and interface declarations in `lib/reports/period-boundaries.ts`.
  - Define `ReportPeriod` type (`'week' | 'month' | 'quarter' | 'year' | 'custom' | string`), `CustomDateRange` interface (`{ start: string; end: string }`), and `PeriodBoundaryRange` interface (`{ start: Date; end: Date }`).
- [x] Task 1.2: Implement `parseLocalDate` in `lib/reports/period-boundaries.ts`.
  - Parse date strings (`YYYY-MM-DD` or ISO strings) and `Date` objects using local calendar component extraction (`getFullYear`, `getMonth`, `getDate`) to avoid UTC midnight timezone shifts in negative UTC zones.
- [x] Task 1.3: Implement `getPeriodRange` in `lib/reports/period-boundaries.ts`.
  - Calculate strict inclusive start (`00:00:00.000`) and end (`23:59:59.999`) local dates for `year`, `month`, `quarter`, `week`, and `custom` period types.
  - Eliminate unbounded future date instances (`new Date(8640000000000000)`).
- [x] Task 1.4: Implement `formatPeriodKey` and `generatePeriodTrendKeys` in `lib/reports/period-boundaries.ts`.
  - Implement `formatPeriodKey` returning `YYYY-MM` for long periods (annual) and `YYYY-MM-DD` for short periods.
  - Implement `generatePeriodTrendKeys` generating sequential bucket keys for chart rendering across period boundaries.

## Phase 2: Unit Testing (`tests/lib/reports/period-boundaries.test.ts`)

- [x] Task 2.1: Create unit tests for `getPeriodRange` across all period types.
  - Test `'year'` range returning `Jan 1 00:00:00.000` to `Dec 31 23:59:59.999`.
  - Test `'month'` range for 28-day, 29-day (leap year), 30-day, and 31-day months.
  - Test `'quarter'` ranges (Q1 through Q4) and `'week'` ranges.
  - Test `'custom'` range bounds matching provided `customRange`.
- [x] Task 2.2: Create unit tests for negative UTC timezone safety in `parseLocalDate`.
  - Verify parsing `"YYYY-01-01"` in UTC-4/UTC-5 timezones evaluates to January 1st local time without shifting to December 31st of the previous year.
- [x] Task 2.3: Create unit tests for `formatPeriodKey` and `generatePeriodTrendKeys`.
  - Verify key output formats (`YYYY-MM` vs `YYYY-MM-DD`) and full trend key array generation.

## Phase 3: Component Refactoring (`desktop-reports.tsx` & `mobile-reports.tsx`)

- [x] Task 3.1: Refactor `components/reports/desktop-reports.tsx`.
  - Import `getPeriodRange`, `parseLocalDate`, `formatPeriodKey`, and `generatePeriodTrendKeys` from `lib/reports/period-boundaries.ts`.
  - Remove inline `getPeriodStartDate` and hardcoded `new Date(8640000000000000)` end date.
  - Update `filteredTransactions` logic to evaluate `parseLocalDate(t.date)` against inclusive `start` and `end` bounds.
  - Update chart trend grouping logic (`generateAllKeys` and `groupedData`) to use the new period key utilities.
- [x] Task 3.2: Refactor `components/reports/mobile-reports.tsx`.
  - Import `getPeriodRange`, `parseLocalDate`, `formatPeriodKey`, and `generatePeriodTrendKeys` from `lib/reports/period-boundaries.ts`.
  - Remove inline `getPeriodStartDate` and hardcoded `new Date(8640000000000000)` end date.
  - Update `filteredTransactions` logic to evaluate `parseLocalDate(t.date)` against inclusive `start` and `end` bounds.
  - Update chart trend grouping logic (`generateAllKeys` and `groupedData`) to use the new period key utilities.

## Phase 4: E2E Testing & Final Verification

- [x] Task 4.1: Update end-to-end tests in `tests/e2e/21-reports-period-selector.spec.ts`.
  - Add test cases verifying annual report period filtering excludes future/out-of-period transactions.
  - Verify visual chart rendering and trend key bucket slots for "Este Año" (12 monthly buckets) and custom date ranges.
- [x] Task 4.2: Execute test suite and type check verification.
  - Run `vitest` unit test suite for `tests/lib/reports/period-boundaries.test.ts`.
  - Run Playwright E2E tests for `tests/e2e/21-reports-period-selector.spec.ts`.
  - Verify clean TypeScript compilation and linting across all modified files.
