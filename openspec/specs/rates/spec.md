# Rates Scraper Fallback Delta Spec

## ADDED Requirements

### Requirement: BCV rates endpoint must not silently succeed with static fallback data

`GET /api/bcv-rates` MUST return live or stored BCV rates when available. If neither database data nor a live scrape is available, it MUST return a non-2xx error response with `success: false` and fallback metadata rather than presenting static rates as fresh data.

#### Scenario: Database contains latest rates

- Given the exchange rate database has a latest BCV-compatible snapshot
- When a client requests `/api/bcv-rates`
- Then the response MUST be successful
- And the response MUST include the stored USD rate, timestamp, and source
- And `fallback` MUST be false

#### Scenario: Database is empty and live BCV scrape succeeds

- Given the exchange rate database has no latest snapshot
- And the live BCV scraper extracts USD and EUR rates
- When a client requests `/api/bcv-rates`
- Then the response MUST be successful
- And the response MUST include the scraped USD and EUR rates
- And `fallback` MUST be false
- And `fromLiveScrape` MUST be true

#### Scenario: Database is empty and live BCV scrape fails

- Given the exchange rate database has no latest snapshot
- And the live BCV scraper fails or only returns fallback data
- When a client requests `/api/bcv-rates`
- Then the response MUST use HTTP 503
- And `success` MUST be false
- And the response MUST include `fallback: true` and a `fallbackReason`
- And static fallback rates MUST NOT be presented as a successful fresh response

### Requirement: BCV scraper must reject partial extraction as failure

The BCV scraper MUST require both USD and EUR values from the source. It MUST NOT report `success: true` by mixing a live extracted value with a static fallback value.

#### Scenario: HTML includes both USD and EUR rates

- Given BCV HTML contains valid USD and EUR values
- When the parser extracts rates
- Then both values MUST be returned
- And the scraper may transform the result as source `BCV`

#### Scenario: HTML includes only one required currency

- Given BCV HTML contains only USD or only EUR
- When the scraper validates parsed data
- Then validation MUST fail
- And the scraper result MUST have `success: false`
- And fallback data, if included, MUST be marked as fallback/error metadata
