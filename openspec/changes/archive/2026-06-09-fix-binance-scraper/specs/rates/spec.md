# Delta Specification for fix-binance-scraper

## Domain: Rates

This delta specification documents changes to the exchange rates domain, specifically modifying the Binance P2P scraper and the static fallback mechanism.

## MODIFIED Requirements

### Requirement: Binance scraper MUST only query USDT rates and map BUSD 1:1

The Binance P2P scraper MUST ONLY query USDT sell and buy offers from the Binance API, completely eliminating external queries for BUSD. To maintain backward compatibility, the scraper MUST map the extracted USDT rates directly (1:1) to the BUSD fields (`busd_ves` and related BUSD statistics).

(Previously: The scraper executed concurrent requests for both USDT and BUSD (4 requests in total), and calculated separate stats for BUSD, using USDT as a fallback only when BUSD returned no data.)

#### Scenario: Successful Binance scrape maps BUSD to USDT rates
- GIVEN the Binance P2P API returns valid rates for USDT sell and buy offers
- WHEN the Binance scraper runs
- THEN the scraper MUST perform exactly 2 P2P requests (USDT SELL and BUY)
- AND the scraper MUST NOT perform any BUSD P2P requests
- AND the resulting `busd_ves` rate MUST match the `usdt_ves` rate exactly
- AND `success` MUST be true

#### Scenario: Scraper maps BUSD statistics to USDT statistics
- GIVEN the scraper parses valid USDT prices
- WHEN transforming the scraped data
- THEN all BUSD statistical fields (including averages and price ranges) MUST be mapped 1:1 from the computed USDT statistical fields

### Requirement: Binance static fallback rates MUST reflect realistic market rates

The centralized static fallback rates for Binance P2P (`STATIC_BINANCE_FALLBACK_RATES`) MUST reflect a realistic market baseline of approximately ~770.0 VES/USD. The system MUST NOT use the stale baseline of 61.5 VES/USD.

(Previously: `STATIC_BINANCE_FALLBACK_RATES` used stale baseline values of 61.5 for `usd_ves`, `usdt_ves`, `busd_ves`, 62.0 for `sell_rate`, and 61.0 for `buy_rate`.)

#### Scenario: Fallback data returns updated realistic rates
- GIVEN the database rates are unavailable
- AND the live Binance scraper execution fails
- WHEN fallback rates are built using `buildBinanceFallbackData`
- THEN the response MUST return `usd_ves`, `usdt_ves`, and `busd_ves` rates around 770.0
- AND `sell_rate` and `buy_rate` MUST align with the updated baseline (~770.0 range)
- AND the source description MUST indicate fallback status

## ADDED Requirements

### Requirement: Binance scraper MUST handle network errors and timeouts by returning fallback data

When the Binance scraper encounters a network failure, request timeout, or API error, it MUST NOT crash. Instead, it MUST catch the error and return a failure status with fallback metadata using the updated realistic fallback rates.

#### Scenario: API request timeout during scrape
- GIVEN the Binance P2P API does not respond within the configured timeout duration
- WHEN the scraper attempts to fetch USDT rates
- THEN the scraper execution MUST fail gracefully
- AND the system MUST return fallback rate data utilizing the updated static rates (~770.0)
- AND the source MUST indicate fallback mode with the timeout reason

#### Scenario: Network failure or HTTP error from Binance API
- GIVEN the Binance P2P API returns a non-2xx status code or a network error occurs
- WHEN the scraper attempts to fetch USDT rates
- THEN the scraper execution MUST fail gracefully
- AND the system MUST return fallback rate data utilizing the updated static rates (~770.0)
- AND the source MUST indicate fallback mode with the network error reason
