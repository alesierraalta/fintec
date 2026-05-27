# Rates Specification

## Purpose

BCV exchange rate retrieval, scraper validation, and scrape pipeline behavior.

## Requirements

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

### Requirement: Scrape pipeline MUST acquire a lock before scraping

`ScrapeAndPersistRates` MUST acquire a named lock before executing any scrape. If the lock cannot be acquired within TTL, the attempt MUST be recorded as `skipped_locked`.

#### Scenario: Single scraper acquires lock

- Given no concurrent scrape is running for the same provider
- When `ScrapeAndPersistRates` is called
- Then the lock MUST be acquired
- And the scrape MUST proceed

#### Scenario: Concurrent scrape is blocked by lock

- Given a scrape is already running for the same provider
- When `ScrapeAndPersistRates` is called concurrently
- Then the second call MUST NOT acquire the lock
- And the attempt MUST be recorded as `skipped_locked`

### Requirement: Scrape pipeline MUST record every attempt

Each `ScrapeAndPersistRates` invocation MUST produce a `ScrapeAttempt` with attempt ID, provider, trigger, stage, status, and timestamps.

#### Scenario: Successful scrape records success attempt

- Given the BCV scraper returns valid USD and EUR rates
- And the rates are persisted to the database
- When `ScrapeAndPersistRates` completes
- Then the attempt MUST have status `success`
- And MUST include extracted currencies `["USD", "EUR"]`

#### Scenario: Fetch failure records fetch-stage attempt

- Given the BCV scraper fails with a network or timeout error
- When `ScrapeAndPersistRates` completes
- Then the attempt MUST have status `failure`
- And stage MUST be `fetch`

#### Scenario: Parse failure records parse-stage attempt

- Given the BCV scraper fails with a parse error
- When `ScrapeAndPersistRates` completes
- Then the attempt MUST have status `failure`
- And stage MUST be `parse`

#### Scenario: Validation failure records validate-stage attempt

- Given the BCV scraper fails validation (partial extraction)
- When `ScrapeAndPersistRates` completes
- Then the attempt MUST have status `failure`
- And stage MUST be `validate`

#### Scenario: Persist failure records persist-stage attempt

- Given the BCV scraper returns valid rates
- But the database persistence fails
- When `ScrapeAndPersistRates` completes
- Then the attempt MUST have status `failure`
- And stage MUST be `persist`

### Requirement: Scrape pipeline MUST return attempt ID and result

`ScrapeAndPersistRates` MUST return an object with `attemptId`, `status`, and optional `result` or `failureStage`/`failureReason`.

#### Scenario: Success returns attempt ID and data

- Given the pipeline completes successfully
- When checking the return value
- Then `attemptId` MUST be a non-empty string
- And `status` MUST be `"success"`
- And `result` MUST contain the scraped rates

#### Scenario: Locked skip returns attempt ID and skipped status

- Given a concurrent scrape holds the lock
- When `ScrapeAndPersistRates` returns
- Then `status` MUST be `"skipped_locked"`
- And `attemptId` MUST be present

### Requirement: Scrape pipeline MUST persist successful rates

When the BCV scraper returns valid rates, `ScrapeAndPersistRates` MUST call `ExchangeRateDatabase.storeExchangeRate()` with the scraped data before recording the attempt.

#### Scenario: Successful rates are stored in database

- Given the BCV scraper returns USD 151.52 and EUR 172.42
- When `ScrapeAndPersistRates` runs
- Then `storeExchangeRate` MUST be called with matching USD and EUR
- And the attempt MUST be recorded as `success`
