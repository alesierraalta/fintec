# Apply Progress: Fix Binance Scraper (fix-binance-scraper)

## Summary of Changes
- Refactored `tests/node/scrapers/binance-scraper.fallback.test.ts` to assert that:
  - Fetch is called exactly twice (once for SELL, once for BUY) for USDT asset.
  - BUSD fetching is never triggered.
  - USDT avg rates map 1:1 to BUSD rates.
  - Timeout and non-2xx failures are handled and return fallback rates.
- Updated `STATIC_BINANCE_FALLBACK_RATES` in `lib/services/rates-fallback.ts` to use a modern market baseline of ~770.0 VES/USD.
- Modified `lib/scrapers/binance-scraper.ts` to:
  - Query only USDT rates in `_fetchData`.
  - Set `MAX_PAGES` to 1 to align with exact fetch call counting.
  - Handle deprecated BUSD rates by mapping USDT statistics 1:1.
  - Enhance error handling to propagate AbortError (timeouts) and non-2xx response statuses, executing `createErrorResult` gracefully.

## Completed Tasks
- [x] Task 1.1: RED Test for 2-fetch limit and 1:1 BUSD map.
- [x] Task 1.2: RED Test for timeout/error fallbacks.
- [x] Task 2.1: Update fallback rates to ~770.0.
- [x] Task 3.1: Only fetch USDT in _fetchData.
- [x] Task 3.2: Omit BUSD validation checks.
- [x] Task 3.3: Copy USDT average/ranges 1:1 to BUSD in _transformData.
- [x] Task 3.4: Catch timeouts & non-2xx errors in fetchOffers.
- [x] Task 4.1: Verify fallback tests are GREEN.
- [x] Task 4.2: Verify main scraper tests are GREEN.
- [x] Task 4.3: Verify fallback route tests are GREEN.
- [x] Task 5.1: Clean up BUSD interfaces/configs where appropriate.
- [x] Task 5.2: Document deprecation in comments.
