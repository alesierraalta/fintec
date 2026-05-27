# Delta for Rates — Scrape Pipeline and Attempt Model

## ADDED Requirements

### Requirement: Scrape pipeline MUST acquire a lock before scraping

`ScrapeAndPersistRates` MUST acquire a named lock before executing
any scrape. If the lock cannot be acquired within TTL, the attempt
MUST be recorded as `skipped_locked`.

#### Scenario: Single scraper acquires lock

- GIVEN no concurrent scrape is running for the same provider
- WHEN `ScrapeAndPersistRates` is called
- THEN the lock MUST be acquired
- AND the scrape MUST proceed

#### Scenario: Concurrent scrape is blocked by lock

- GIVEN a scrape is already running for the same provider
- WHEN `ScrapeAndPersistRates` is called concurrently
- THEN the second call MUST NOT acquire the lock
- AND the attempt MUST be recorded as `skipped_locked`

### Requirement: Scrape pipeline MUST record every attempt

Each `ScrapeAndPersistRates` invocation MUST produce a
`ScrapeAttempt` with attempt ID, provider, trigger, stage, status,
and timestamps. The attempt MUST be persisted before returning.

#### Scenario: Successful scrape records success attempt

- GIVEN the BCV scraper returns valid USD and EUR rates
- AND the rates are persisted to the database
- WHEN `ScrapeAndPersistRates` completes
- THEN the attempt MUST have status `success`
- AND MUST include extracted currencies `["USD", "EUR"]`

#### Scenario: Fetch failure records fetch-stage attempt

- GIVEN the BCV scraper fails with a network or timeout error
- WHEN `ScrapeAndPersistRates` completes
- THEN the attempt MUST have status `failure`
- AND stage MUST be `fetch`

#### Scenario: Parse failure records parse-stage attempt

- GIVEN the BCV scraper fails with a parse error
- WHEN `ScrapeAndPersistRates` completes
- THEN the attempt MUST have status `failure`
- AND stage MUST be `parse`

#### Scenario: Validation failure records validate-stage attempt

- GIVEN the BCV scraper fails validation (partial extraction)
- WHEN `ScrapeAndPersistRates` completes
- THEN the attempt MUST have status `failure`
- AND stage MUST be `validate`

#### Scenario: Persist failure records persist-stage attempt

- GIVEN the BCV scraper returns valid rates
- BUT the database persistence fails
- WHEN `ScrapeAndPersistRates` completes
- THEN the attempt MUST have status `failure`
- AND stage MUST be `persist`

### Requirement: Scrape pipeline MUST return attempt ID and result

`ScrapeAndPersistRates` MUST return an object with `attemptId`,
`status`, and optional `result` (scraper result on success) or
`failureStage` and `failureReason` on failure.

#### Scenario: Success returns attempt ID and data

- GIVEN the pipeline completes successfully
- WHEN checking the return value
- THEN `attemptId` MUST be a non-empty string
- AND `status` MUST be `"success"`
- AND `result` MUST contain the scraped rates

#### Scenario: Locked skip returns attempt ID and skipped status

- GIVEN a concurrent scrape holds the lock
- WHEN `ScrapeAndPersistRates` returns
- THEN `status` MUST be `"skipped_locked"`
- AND `attemptId` MUST be present

### Requirement: Scrape pipeline MUST persist successful rates

When the BCV scraper returns valid rates, `ScrapeAndPersistRates`
MUST call `ExchangeRateDatabase.storeExchangeRate()` with the
scraped data before recording the attempt.

#### Scenario: Successful rates are stored in database

- GIVEN the BCV scraper returns USD 151.52 and EUR 172.42
- WHEN `ScrapeAndPersistRates` runs
- THEN `storeExchangeRate` MUST be called with matching USD and EUR
- AND the attempt MUST be recorded as `success`
