# Product Requirements Document (PRD): Add BUSD and Historical Rate Trends

## 1. Introduction
This feature aims to enhance the existing currency conversion/calculator tools within the "Accounts" section. It addresses the lack of **Binance Dollar (BUSD)** support and the absence of historical rate context. By providing real-time percentage variations against previous timeframes (Day, Week, Month), users can make better-informed financial decisions.

## 2. Goals
1.  **Expand Currency Support:** Enable users to select and convert using **Binance Dollar (BUSD)** in the calculator/converter.
2.  **Provide Historical Context:** Display percentage changes for exchange rates compared to the previous day (24h), previous week (7d), and previous month (30d).
3.  **Improve Decision Making:** Use visual indicators to help users quickly assess if the current rate is favorable.

## 3. User Stories
*   **Story 1:** As a user holding crypto assets, I want to select "Binance Dollar" (BUSD) in the currency calculator so that I can estimate the value of my holdings in other currencies.
*   **Story 2:** As a user planning a currency exchange, I want to see the percentage change of the rate compared to yesterday, last week, and last month so that I can decide if now is a good time to convert.
*   **Story 3:** As a user, I want to see visual indicators (e.g., green for up, red for down) next to the rates so that I can quickly scan for market trends.

## 4. Functional Requirements

### 4.1. Currency Selection
*   **FR-01:** The application MUST add "Binance Dollar" (BUSD) to the list of available currencies in the Global Rate Selector / Calculator.
*   **FR-02:** Selecting BUSD MUST trigger the same rate retrieval and calculation logic as existing supported currencies (e.g., USDT, VES).

### 4.2. Historical Rate Variations
*   **FR-03:** The interface MUST display three distinct percentage variation metrics for the selected currency pair:
    1.  **1D:** Variation vs. 24 hours ago (or previous day's close).
    2.  **1W:** Variation vs. 7 days ago.
    3.  **1M:** Variation vs. 30 days ago.
*   **FR-04:** The formula for variation shall be: `((Current Rate - Historical Rate) / Historical Rate) * 100`.
*   **FR-05:** If historical data is unavailable for a specific timeframe, the system MUST display a neutral state (e.g., "--" or grayed out) rather than crashing or showing incorrect data.

### 4.3. UI/UX
*   **FR-06:** Positive variations MUST be displayed in **Green** with an upward indicator (arrow or similar).
*   **FR-07:** Negative variations MUST be displayed in **Red** with a downward indicator.
*   **FR-08:** Zero/Neutral variations MUST be displayed in **Gray/Neutral** color.
*   **FR-09:** The variations should be displayed prominently near the main conversion result or rate display area.

## 5. Non-Goals (Out of Scope)
*   Creating full interactive historical charts (e.g., candlestick charts).
*   Adding "buy/sell" execution functionality (this is strictly a calculator/display feature).
*   Forecasting or predictive analytics for future rates.

## 6. Technical Considerations
*   **Data Source:** Verify if the existing `binance_scraper_ultra_fast.py` or `exchange-rate-provider.ts` currently fetches BUSD. If not, the scraper/provider must be updated.
*   **Storage:** Ensure the database or cache stores sufficient historical data points to calculate 1W and 1M trends.
*   **Components:** Likely involves updating `components/exchange-rate-display.tsx` or similar components used in the accounts/calculator views.

## 7. Success Metrics
*   **Accuracy:** Rate variations match external sources (e.g., Binance public data) within a reasonable margin of error.
*   **Usability:** Users successfully select BUSD and view rates without UI errors.
*   **Performance:** Loading historical data does not significantly degrade the load time of the Accounts page (< 200ms added latency).
