# Apply Progress: Fix Rates Scraper Fallback

## Status
Implemented with TDD evidence.

## RED
Command:
```bash
npx jest --selectProjects node tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts --runInBand 2>&1
```

Evidence:
- `tests/node/scrapers/bcv-scraper-fallback.test.ts` failed because `hasCompleteBCVRates` did not exist.
- `tests/node/api/bcv-rates-route.test.ts` failed because DB-empty path returned `success: true` with `BCV (fallback - static-default)` instead of live scrape / 503 behavior.

## GREEN
Changes:
- Added `hasCompleteBCVRates` type guard and required complete USD+EUR BCV extraction before success.
- Removed successful mixed live/static BCV transform path.
- Added DB-empty live scrape recovery to `/api/bcv-rates`.
- Changed DB/live failure path to HTTP 503 with explicit fallback metadata.

Focused verification:
```bash
npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts --runInBand 2>&1
```
Result: PASS — 2 suites, 6 tests.

Type-check:
```bash
npm run type-check 2>&1
```
Result: PASS.

Live scraper verification:
```bash
RUN_LIVE_SCRAPER_TESTS=1 npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper.node.test.ts --runInBand 2>&1
```
Result: PASS — 1 suite, 7 tests.

## Notes
- Broad node-suite failures are unrelated and pre-existing.
