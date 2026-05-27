# Apply Progress: Rate Scraper Pipeline and Attempt Model

## Status

All 15 tasks implemented. 16/16 new tests pass. Type-check clean.

## Files Created

| File                                                   | Description                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `lib/rates/scrape-types.ts`                            | `ScrapeStage` enum, `ScrapeAttempt` type, `ScrapePipelineResult`          |
| `lib/rates/simple-lock.ts`                             | `Lock` interface + `InMemoryLock` with TTL                                |
| `lib/rates/scrape-pipeline.ts`                         | `ScrapeAndPersistRates` use case                                          |
| `repositories/contracts/scrape-attempts-repository.ts` | `ScrapeAttemptsRepository` interface + `InMemoryScrapeAttemptsRepository` |
| `tests/node/rates/scrape-pipeline.test.ts`             | 16 tests (5 lock, 6 pipeline, 5 stage mapping)                            |

## Files Modified

| File                              | Change                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- |
| `lib/scrapers/types.ts`           | Added `errorCategory` to `ScraperResult`                                    |
| `lib/scrapers/base-scraper.ts`    | Populate `errorCategory` on error results; removed dead code after refactor |
| `repositories/contracts/index.ts` | Re-export `scrape-attempts-repository`                                      |

## Verification

```bash
npx jest --selectProjects node --runTestsByPath tests/node/rates/scrape-pipeline.test.ts --runInBand
# PASS — 1 suite, 16 tests
npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts tests/node/scrapers/bcv-parser.test.ts --runInBand
# PASS — 3 suites, 12 tests (existing tests unbroken)
npx jest --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts --runInBand
# PASS — 3 suites, 9 tests (freshness domain unbroken)
npm run type-check
# PASS — exit 0
```

## Deviations

- Added `errorCategory` to `ScraperResult` interface to enable stage mapping without error-text inference. Backward compatible (optional field).
- Fixed dead code in `BaseScraper.scrape()` catch block (unreachable `return` + `logger.error` after first return).

## Remaining Tasks

None. Ready for verify.
