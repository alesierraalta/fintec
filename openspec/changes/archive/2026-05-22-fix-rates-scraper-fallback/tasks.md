# Tasks: Fix rates scraper fallback

## 1. Testing (RED)

- [x] 1.1 Add node test proving BCV parser extracts current-style USD/EUR containers.
- [x] 1.2 Add node test proving partial BCV extraction does not become a successful mixed live/static result.
- [x] 1.3 Add API route tests for DB hit, DB miss + live scrape success, and DB miss + live scrape failure.

## 2. Scraper Logic (GREEN)

- [x] 2.1 Tighten `BCVScraper._validateData` to require USD and EUR.
- [x] 2.2 Ensure transformed successful BCV data never uses static fallback values.
- [x] 2.3 Keep error fallback data clearly marked as `success: false`.

## 3. API Behavior (GREEN)

- [x] 3.1 Add bounded live scrape recovery to `app/api/bcv-rates/route.ts` when DB has no latest snapshot.
- [x] 3.2 Return HTTP 503 instead of successful static fallback if DB and live scrape are unavailable.
- [x] 3.3 Keep response fields backward-compatible where safe (`data`, `fallback`, `fallbackReason`, timestamp/source).

## 4. Verification

- [x] 4.1 Run focused node Jest tests.
- [x] 4.2 Run type-check if focused tests pass.
- [x] 4.3 Record TDD evidence in `apply-progress.md` and verify report.

## Review Workload Forecast

Expected diff: under 250 changed lines across route, scraper, tests, and OpenSpec artifacts. Single PR is reviewable.
