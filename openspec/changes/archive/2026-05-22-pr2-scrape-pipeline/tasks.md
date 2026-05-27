# Tasks: Rate Scraper Pipeline and Attempt Model

## Phase 1: Types and Interfaces

- [x] 1.1 Create `lib/rates/scrape-types.ts` with `ScrapeStage` enum and `ScrapeAttempt` type
- [x] 1.2 Create `lib/rates/simple-lock.ts` with `Lock` interface and `InMemoryLock` class (TTL, acquire, release)
- [x] 1.3 Create `repositories/contracts/scrape-attempts-repository.ts` with `ScrapeAttemptsRepository` interface (recordAttempt, getLatestAttempts)
- [x] 1.4 Update `repositories/contracts/index.ts` to re-export new contract

## Phase 2: Scrape Pipeline Use Case

- [x] 2.1 Create `lib/rates/scrape-pipeline.ts` with `ScrapeAndPersistRates` class
- [x] 2.2 Implement lock acquisition: acquire lock, return `skipped_locked` on failure
- [x] 2.3 Integrate with `scrapeBCVRates()`, map failure categories to `ScrapeStage`
- [x] 2.4 Integrate with `ExchangeRateDatabase.storeExchangeRate()` on success
- [x] 2.5 Record attempt via `ScrapeAttemptsRepository` for all outcomes

## Phase 3: Testing

- [x] 3.1 Write tests for `InMemoryLock`: acquire, release, TTL expiry, concurrent acquire
- [x] 3.2 Write tests for `ScrapeAndPersistRates`: success path with DB persist
- [x] 3.3 Write tests for lock skip: concurrent call returns `skipped_locked`
- [x] 3.4 Write tests for failure stage mapping: each error category → correct stage
- [x] 3.5 Write tests for persist failure: scrape succeeds but DB fails → stage `persist`
- [x] 3.6 Run focused tests and type-check
