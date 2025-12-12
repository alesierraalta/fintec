# Task List: Add BUSD and Historical Rate Trends

## 1. Backend & Data Layer Updates
- [x] **Update Python Scraper** (`scripts/binance_scraper_ultra_fast.py`)
    - [x] Modify `_get_offers_concurrent` to optionally include "BUSD" as an asset.
    - [x] Implement fallback logic: If BUSD P2P returns no results, use USDT rates (as they are practically equivalent for this use case).
    - [x] Update the return JSON structure to include `busd_ves` field.
- [x] **Update Type Definitions** (`lib/services/currency-service.ts`)
    - [x] Update `BinanceRates` interface to include `busd_ves: number`.
    - [x] Update `getSupportedCurrencies` to include 'BUSD' in the `crypto` array.
- [x] **Update History Service** (`lib/services/binance-history-service.ts`)
    - [x] Create a new method `getMultiPeriodTrends()` that returns an object with `1d`, `1w`, and `1m` trends.
    - [x] Reuse existing `calculateTrends(days)` logic by calling it three times with 1, 7, and 30 days.
    - [x] Ensure `saveRates` logic persists data correctly (it currently saves a generic `usd` value; ensure this is sufficient or add `busd` column if strictly necessary. *Decision: Use existing `usd` column as the reference rate for "Dollar" assets to keep DB simple, since BUSD/USDT/USDC usually track together vs VES.*).

## 2. API & Service Integration
- [x] **Update API Route** (`app/api/binance-rates/route.ts`)
    - [x] Map the new `busd_ves` field from the Python script output to the response JSON.
- [x] **Update Currency Service** (`lib/services/currency-service.ts`)
    - [x] Expose the new `getMultiPeriodTrends` method via the singleton instance.
    - [x] Update `fetchBinanceRates` to populate `busd_ves` from the API response.

## 3. Frontend State & Hooks
- [x] **Update Realtime Hook** (`hooks/use-realtime-rates.ts` & `lib/services/websocket-server.ts`)
    - [x] Ensure `busd_ves` is propagated through the WebSocket/polling mechanism.
- [x] **Create Trend Hook** (`hooks/use-rate-trends.ts`)
    - [x] Create a new hook to fetch the 1D/1W/1M trends from the service (or via a new API endpoint if client-side access is needed).
    - *Note:* Since `binanceHistoryService` is server-side (Dexie/Node), we might need a server action or API route to expose trends to the client.
    - [x] **Task:** Create `app/api/trends/route.ts` to return the multi-period trends.

## 4. UI Implementation
- [x] **Create Trend Indicator Component** (`components/currency/trend-indicator.tsx`)
    - [x] Design a small component taking `percentage` and `period` as props.
    - [x] Use Green Arrow (Up) for positive, Red Arrow (Down) for negative (assuming standard finance colors; or inverse if "rate going up" is bad for local currency context? *Standard: Green = Value Up*).
    - [x] Display the timeframe label (1D, 1W, 1M).
- [x] **Update Exchange Rate Display** (`components/exchange-rate-display.tsx`)
    - [x] Add a new card/section for **BUSD/VES**.
    - [x] Integrate the `TrendIndicator` component next to the rates.
    - [x] Fetch and pass the trend data to these indicators.
- [x] **Update Calculator/Converter** (`components/currency/rates-history.tsx` or `rate-selector.tsx`)
    - [x] Add "BUSD" to the currency dropdowns.
    - [x] Ensure it uses the `busd_ves` rate for calculations.

## 5. Verification
- [ ] **Test Scraper:** Run `python scripts/binance_scraper_ultra_fast.py` and verify JSON output contains `busd_ves`.
- [ ] **Test UI:** Verify BUSD appears in the calculator.
- [ ] **Test Trends:** Verify 1D/1W/1M indicators show logical values (or 0% if no history).
