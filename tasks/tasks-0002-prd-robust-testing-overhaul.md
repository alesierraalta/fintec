# Tasks: Robust Quality Assurance Overhaul

## Relevant Files
- `stryker.conf.json` - Configuration for mutation testing.
- `tests/lib/money.property.test.ts` - Property-based tests for financial calculations.
- `tests/services/currency-service.property.test.ts` - Property-based tests for currency conversions.
- `tests/scrapers/circuit-breaker.resilience.test.ts` - Resilience tests for circuit breaker logic.
- `tests/scrapers/binance-scraper.fallback.test.ts` - Tests for scraper fallback mechanisms.
- `playwright/e2e/offline-mode.spec.ts` - E2E tests for offline functionality.
- `k6/api-stress-test.js` - K6 load testing script.

### Notes
- Ensure `fast-check` is installed for property-based testing: `npm install --save-dev fast-check`.
- K6 is typically a separate binary, but we can write the JS scripts in the repo.
- Run mutation tests with `npx stryker run`.

## Tasks
- [ ] 1.0 Environment & Tooling Setup
  - [ ] 1.1 Install `stryker-cli`, `@stryker-mutator/core`, `@stryker-mutator/jest-runner`, and `fast-check`.
  - [ ] 1.2 Initialize Stryker configuration (`stryker.conf.json`) targeting `lib/money.ts` and `lib/services/currency-service.ts` initially.
  - [ ] 1.3 Create a `k6` directory for load test scripts.

- [ ] 2.0 Core Financial Logic Hardening (Jest + Mutation)
  - [ ] 2.1 Create `tests/lib/money.property.test.ts` using `fast-check` to verify `money.ts` operations (add, subtract, allocate) against thousands of random inputs.
  - [ ] 2.2 Run Stryker on `lib/money.ts` and improve tests until mutation score > 80%.
  - [ ] 2.3 Create `tests/services/currency-service.property.test.ts` to verify bidirectional conversion consistency (e.g., convert A->B->A equals A within epsilon).
  - [ ] 2.4 Add specific test cases for `Infinity`, `NaN`, and `null` inputs in `money.ts` and `currency-service.ts` to ensure graceful error handling.

- [ ] 3.0 Scraper Resilience & Fallbacks (Jest + Mocks)
  - [ ] 3.1 Create `tests/scrapers/circuit-breaker.resilience.test.ts` to simulate complex failure sequences (Open -> Half-Open -> Open) and verify `canAttempt()` logic.
  - [ ] 3.2 Create `tests/scrapers/binance-scraper.fallback.test.ts` that mocks `_fetchData` to fail for BUSD but succeed for USDT, and verifies the response structure.
  - [ ] 3.3 Create fixtures of malformed/empty HTML responses and verify that `BaseScraper` implementations throw specific `ScraperError` types instead of crashing.

- [ ] 4.0 End-to-End Critical Flows (Playwright)
  - [ ] 4.1 Create `playwright/e2e/offline-mode.spec.ts`:
    - Simulate offline network.
    - Verify "Disconnected" badge appears.
    - Verify cached rates are still displayed.
  - [ ] 4.2 Create `playwright/e2e/calculator-flow.spec.ts`:
    - Navigate to calculator.
    - Toggle between "Binance" and "BCV" sources.
    - Verify input/output calculations match displayed rates.

- [ ] 5.0 Performance Stress Testing (K6)
  - [ ] 5.1 Create `k6/api-stress-test.js` targeting `/api/binance-rates`.
    - Configure for 50 virtual users.
    - Assert 95th percentile response time < 200ms.
  - [ ] 5.2 Create a `package.json` script `test:load` to run the K6 script (assuming K6 is installed in environment or via Docker).