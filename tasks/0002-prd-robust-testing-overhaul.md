# PRD 0002: Comprehensive Quality Assurance & Robustness Overhaul

## 1. Introduction
The FINTEC project handles sensitive financial data (exchange rates, conversions, user balances). As the system grows, the cost of errors increases. This initiative aims to transition the project from "functional" to "enterprise-grade robust" by implementing a comprehensive testing strategy that covers unit logic, integration flows, system resilience, and performance under stress.

## 2. Goals
1.  **Maximize Reliability:** Achieve >90% code coverage on core financial logic and utility libraries.
2.  **Verify Resilience:** Ensure the system handles external failures (Binance/BCV down, API timeouts) gracefully without crashing.
3.  **Guarantee Precision:** Eliminate floating-point errors and verify rounding logic across all currency conversions.
4.  **Stress Resistance:** Validate that the scraping and API layers perform under load.
5.  **Regression Prevention:** Establish a suite that catches regressions immediately upon code changes.

## 3. User Stories
- **As a Developer,** I want to know immediately if my changes broke a currency calculation so I don't commit bad math.
- **As a System Admin,** I want to be confident that if Binance P2P changes its API, the system falls back to secondary sources or cache without crashing.
- **As a User,** I expect the dashboard to load instantly and accurate data to be shown even if my internet connection is flaky.
- **As a QA Engineer,** I want to simulate high-traffic scenarios to ensure the server doesn't freeze during rate updates.

## 4. Functional Requirements

### 4.1. Core Financial Logic Hardening (Jest)
*   **Precision Tests:** Implement property-based testing (using libraries like `fast-check` or extensive datasets) for `money.ts` and `currency-service.ts` to verify exchange rate calculations against thousands of random values, ensuring no floating-point artifacts.
*   **Mutation Testing:** Integrate **StrykerJS** to run against core logic. This modifies the code (mutants) and checks if tests fail. If tests pass despite code changes, the tests are weak.
*   **Strict Typing Tests:** Verify that edge case inputs (null, undefined, Infinity, NaN) are handled gracefully in all utility functions.

### 4.2. Scraper & External Data Resilience (Jest + Mocks)
*   **Circuit Breaker Verification:** Create specific tests for `BaseScraper` and `CircuitBreaker` that simulate:
    *   Consecutive failures triggering the "Open" state.
    *   Cool-off periods.
    *   Half-open probing state.
*   **Fallback Mechanics:** Verify that `fetchBinanceRates` automatically serves `USDT` if `BUSD` fails, and serves Cached/Static data if both fail.
*   **HTML Structure Changes:** Create fixtures of "broken" HTML responses to ensure scrapers throw typed errors rather than crashing the process.

### 4.3. End-to-End & User Flows (Playwright)
*   **Critical Paths:**
    1.  User Login -> Dashboard Load -> Rate Refresh.
    2.  Rate Calculator usage with toggling sources (Binance/BCV).
    3.  Offline Mode: Simulate network offline in Playwright and verify the UI shows "Disconnected" badges but displays cached data.
*   **Visual Regression (Optional):** Snapshot tests for the "Exchange Rate Display" and "Calculator" to ensure UI components don't shift unexpectedly.

### 4.4. Performance & Load Testing (K6)
*   **API Stress Test:** Implement a **K6** script to hit `/api/binance-rates` and `/api/trends` with concurrent virtual users.
    *   *Goal:* Ensure the custom caching logic works and we don't hit 429s from downstream APIs.
    *   *Threshold:* 95% of requests must complete < 200ms (served from cache).

## 5. Non-Goals
- **Rewrite of UI Framework:** We will not move away from Next.js/React.
- **100% Coverage of UI Boilerplate:** We focus on logic and interaction, not testing standard HTML rendering unless it contains logic.

## 6. Technical Considerations
- **Stack Additions:**
    - `stryker-js` (for Mutation Testing).
    - `k6` (for Load Testing).
- **Test Database:** Ensure the testing environment uses a clean, isolated state (Mock Service Worker or isolated Dexie instances) to prevent data pollution.
- **CI Pipeline:** Tests should be efficient enough to run in a pre-commit hook or CI environment without taking >10 minutes.

## 7. Success Metrics
- **Coverage:** Core Modules > 90%, Overall > 80%.
- **Mutation Score:** > 80% (meaning 80% of bugs introduced are caught by tests).
- **Performance:** Scraper API handles 50 requests/sec via cache without degradation.
- **Reliability:** 0 Uncaught Exceptions in logs during the test suite run.

## 8. Open Questions
- Do we need to set up a dedicated "mock server" for external APIs (Binance/BCV) to simulate slow networks deterministically, or is `msw` (Mock Service Worker) sufficient? *Recommendation: Start with MSW.*
