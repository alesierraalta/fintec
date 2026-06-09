# Tasks: Fix Binance Scraper

## Phase 1: Test-Driven Development (TDD) / Red Phase

- [x] 1.1 Red Test: Update `tests/node/scrapers/binance-scraper.fallback.test.ts` to assert only 2 requests are made. Change the test to verify that `fetch` is called exactly twice (once for USDT SELL, once for USDT BUY) and that BUSD is never fetched, while BUSD values match USDT rates 1:1. Run the test to ensure it fails (RED).
- [x] 1.2 Red Test: Add fallback test cases in `tests/node/scrapers/binance-scraper.test.ts` or `tests/node/scrapers/binance-scraper.fallback.test.ts` verifying scraper behavior under network timeout or non-2xx API failure. Verify that the scraper does not crash, return value indicates failure (`success` is `false`), and details are populated with static fallback values reflecting the new ~770.0 baseline. Run the tests to verify failure (RED).

## Phase 2: Static Fallback Rates Update

- [x] 2.1 Update static Binance P2P fallback rates in `lib/services/rates-fallback.ts`. Modify `STATIC_BINANCE_FALLBACK_RATES` to shift from stale ~61.5 VES/USD to a realistic market rate of ~770.0 (e.g., `usd_ves: 770.0`, `usdt_ves: 770.0`, `busd_ves: 770.0`, `sell_rate: 771.0`, `buy_rate: 769.0`, `spread: 2.0` or similar realistic values).

## Phase 3: Core Implementation (Binance Scraper Modification)

- [x] 3.1 Refactor P2P API requests in `lib/scrapers/binance-scraper.ts`. In `_fetchData()`, modify the `Promise.all` block to only call `this.fetchOffers('SELL', 'USDT')` and `this.fetchOffers('BUY', 'USDT')`. Remove BUSD calls completely. Adjust return payload structure to map `busd` to empty array/stub placeholder, or simplify types.
- [x] 3.2 Adjust parser and validation methods in `lib/scrapers/binance-scraper.ts`. Update `_parseData` and `_validateData` signatures or validations to omit mandatory checks for BUSD, ensuring the scraper proceeds solely based on USDT data.
- [x] 3.3 Refactor data transformation in `lib/scrapers/binance-scraper.ts`. In `_transformData()`, map the calculated USDT statistics (e.g. `usdtGeneralAvg`, `usdtSellStats`, `usdtBuyStats`) 1:1 into BUSD stats (`busd_ves` and related price ranges), ensuring BUSD matches USDT exactly.
- [x] 3.4 Enhance error handling in `lib/scrapers/binance-scraper.ts`. Update `fetchOffers` or execution wrapper to catch abort signals (timeouts) and non-2xx status errors, mapping them correctly to return the new static fallback rates from `lib/services/rates-fallback.ts` using `createErrorResult()`.

## Phase 4: Verification / Green Phase

- [x] 4.1 Verify modified fallback test suite by running `npm test tests/node/scrapers/binance-scraper.fallback.test.ts` (verify GREEN).
- [x] 4.2 Verify main scraper test suite by running `npm test tests/node/scrapers/binance-scraper.test.ts` (verify GREEN).
- [x] 4.3 Verify fallback route test suite by running `npm test tests/node/api/rates-fallback-route.test.ts` (verify GREEN).

## Phase 5: Cleanup & Documentation

- [x] 5.1 Clean up any unused BUSD interfaces or configurations in `lib/scrapers/types.ts` or `lib/scrapers/config.ts` if applicable.
- [x] 5.2 Add comments documenting that Binance BUSD P2P endpoints are deprecated and mapped 1:1 to USDT.
