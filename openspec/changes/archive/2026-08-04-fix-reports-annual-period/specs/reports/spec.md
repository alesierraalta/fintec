# Reports Delta Specification: fix-reports-annual-period

## Overview
This specification defines the requirements and behavioral scenarios for fixing annual (and standard period) report date boundary calculations and timezone handling in the financial reports domain. It establishes a centralized period boundary utility (`lib/reports/period-boundaries.ts`) to eliminate unbounded end date queries and prevent negative UTC timezone shifts during date parsing.

---

## Requirements

### 1. Centralized Period Boundaries & Timezone Utility (`lib/reports/period-boundaries.ts`)

#### 1.1 Period Range Calculation (`getPeriodRange`)
- The utility MUST export a function `getPeriodRange(period: string, referenceDate?: Date, customRange?: { start: string; end: string })` that returns an object containing strictly bounded `start` and `end` JavaScript `Date` objects.
- For the `'year'` period:
  - The `start` Date MUST be set to January 1st `00:00:00.000` local time of the reference year.
  - The `end` Date MUST be set to December 31st `23:59:59.999` local time of the reference year.
- For the `'month'` period:
  - The `start` Date MUST be set to the 1st day of the current month at `00:00:00.000` local time.
  - The `end` Date MUST be set to the last day of the current month at `23:59:59.999` local time (accounting for 28, 29, 30, or 31 days depending on month and leap year).
- For the `'quarter'` period:
  - The `start` Date MUST be set to the first day of the quarter (Q1: Jan 1, Q2: Apr 1, Q3: Jul 1, Q4: Oct 1) at `00:00:00.000` local time.
  - The `end` Date MUST be set to the last day of the quarter (Q1: Mar 31, Q2: Jun 30, Q3: Sep 30, Q4: Dec 31) at `23:59:59.999` local time.
- For the `'week'` period:
  - The `start` Date MUST be set to 7 days prior / start of the week at `00:00:00.000` local time.
  - The `end` Date MUST be set to the end of the current day / week at `23:59:59.999` local time.
- For the `'custom'` period:
  - The `start` Date MUST be parsed from `customRange.start` at `00:00:00.000` local time.
  - The `end` Date MUST be parsed from `customRange.end` at `23:59:59.999` local time.
- Standard report period queries MUST NOT use unbounded future dates (e.g. `new Date(8640000000000000)`).

#### 1.2 Timezone-Safe Date Parsing (`parseLocalDate`)
- The utility MUST export a function `parseLocalDate(dateStr: string | Date): Date`.
- Date strings formatted as `YYYY-MM-DD` MUST be parsed using local calendar component extraction (`getFullYear`, `getMonth`, `getDate`) or explicit local time initialization (`YYYY-MM-DDT00:00:00.000`) to avoid UTC midnight interpretation.
- When evaluating dates in negative UTC timezones (such as UTC-4 or UTC-5), parsing `YYYY-01-01` MUST evaluate to January 1st `00:00:00.000` in local time, ensuring transactions on January 1st are NOT shifted to December 31st of the previous year.

#### 1.3 Period Trend Key Formatting (`formatPeriodKey`)
- The utility MUST export a function `formatPeriodKey(date: Date, isLongPeriod: boolean): string`.
- When `isLongPeriod` is `true` (e.g. for annual reports), keys MUST be formatted as `YYYY-MM`.
- When `isLongPeriod` is `false` (e.g. for weekly or monthly reports), keys MUST be formatted as `YYYY-MM-DD`.

---

### 2. Desktop & Mobile Report Component Refactoring

- `components/reports/desktop-reports.tsx` and `components/reports/mobile-reports.tsx` MUST import and use `getPeriodRange`, `parseLocalDate`, and `formatPeriodKey` from `lib/reports/period-boundaries.ts`.
- Component filtering logic (`filteredTransactions`) MUST evaluate transaction dates against both `start` and `end` boundaries inclusively (`transactionDate >= start && transactionDate <= end`).
- Inline implementations of `getPeriodStartDate` and hardcoded `new Date(8640000000000000)` end dates MUST be removed from report components.
- Chart trend grouping logic (`generateAllKeys` and `groupedData`) MUST use `formatPeriodKey` and local date methods to group transaction amounts into correct date buckets.

---

### 3. Unit & End-to-End Test Suite Coverage

- Unit tests in `tests/lib/reports/period-boundaries.test.ts` MUST cover:
  - Exact boundary assertions (`00:00:00.000` to `23:59:59.999`) for all period types (`year`, `month`, `quarter`, `week`, `custom`).
  - Month-end ranges for 28-day, 29-day (leap year), 30-day, and 31-day months.
  - Simulated negative UTC offsets (e.g. UTC-4/UTC-5) verifying January 1st transactions remain within the target year.
- E2E visual tests in `tests/e2e/21-reports-period-selector.spec.ts` MUST verify period selection filtering and visual chart rendering for annual and custom ranges.

---

## Scenarios

### Scenario 1: Calculating Annual Report Date Range (Happy Path)
* **Given** a user selects the annual report period (`'year'`) for reference date `2026-08-04`
* **When** `getPeriodRange('year', referenceDate)` is called
* **Then** the returned `start` Date MUST be `2026-01-01T00:00:00.000` in local time
* **And** the returned `end` Date MUST be `2026-12-31T23:59:59.999` in local time
* **And** the end date MUST NOT be set to an unbounded max timestamp (`new Date(8640000000000000)`).

### Scenario 2: Transaction Date Parsing in Negative Timezones (Edge Case)
* **Given** a user is located in a negative UTC timezone (e.g., UTC-4 America/Caracas)
* **And** a transaction exists with date string `"2026-01-01"`
* **When** `parseLocalDate("2026-01-01")` is called
* **Then** the resulting `Date` object MUST represent `2026-01-01 00:00:00` local time
* **And** the transaction MUST NOT be shifted to `2025-12-31 20:00:00`
* **And** the transaction MUST be included in the 2026 annual report calculations.

### Scenario 3: Calculating Monthly Period Boundaries Including Leap Years
* **Given** the reference date is in February of a leap year (e.g., `2028-02-15`)
* **When** `getPeriodRange('month', referenceDate)` is invoked
* **Then** the returned `start` Date MUST be `2028-02-01T00:00:00.000`
* **And** the returned `end` Date MUST be `2028-02-29T23:59:59.999`.

### Scenario 4: Custom Period Range Filtering
* **Given** a user specifies custom range start `"2026-03-10"` and end `"2026-03-20"`
* **When** `getPeriodRange('custom', referenceDate, { start: "2026-03-10", end: "2026-03-20" })` is invoked
* **Then** the returned `start` Date MUST be `2026-03-10T00:00:00.000`
* **And** the returned `end` Date MUST be `2026-03-20T23:59:59.999`.

### Scenario 5: Filtering Transactions Spilling Past Year End (Out-of-Period Filtering)
* **Given** transactions exist on `2026-12-31T23:30:00` and `2027-01-01T00:05:00`
* **When** the annual report for `2026` filters transactions using `getPeriodRange('year')`
* **Then** the transaction on `2026-12-31T23:30:00` MUST be included in the 2026 report
* **And** the transaction on `2027-01-01T00:05:00` MUST be excluded from the 2026 report.

### Scenario 6: Generating Chart Trend Keys for Annual vs Short Periods
* **Given** a transaction date of `2026-05-15`
* **When** `formatPeriodKey(date, true)` is called for an annual report (`isLongPeriod = true`)
* **Then** it MUST return `"2026-05"`
* **When** `formatPeriodKey(date, false)` is called for a monthly report (`isLongPeriod = false`)
* **Then** it MUST return `"2026-05-15"`.
