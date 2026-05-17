# Design: Fix rates scraper fallback

## Current Problem
`/api/bcv-rates` is read-only and returns `success: true` with static fallback data when the database is empty. Separately, `BCVScraper` accepts partial parsing because validation only fails when both USD and EUR are missing; transformation then fills missing values from static defaults. Both behaviors can make stale/default rates look usable.

## Approach
1. Tighten scraper correctness:
   - `BCVScraper._validateData` fails unless both USD and EUR are present.
   - `_transformData` only transforms complete live data.
   - `createErrorResult` may still include static data for compatibility, but always with `success: false` and fallback/error source.

2. Add bounded on-demand recovery to BCV API:
   - First read latest DB snapshot as today.
   - If missing, call `scrapeBCVRates()` once.
   - If scrape succeeds and its source is not fallback, return live scrape data with `fromLiveScrape: true`, `cached: false`, `fallback: false`.
   - If scrape fails, return HTTP 503 with `success: false`, `fallback: true`, and `fallbackReason`.

3. Preserve financial-data honesty:
   - Static fallback can remain in response data for UI compatibility but never as a successful fresh result.
   - Responses must expose timestamp/source/fallback status.

## TDD Plan
- RED: Add parser/API tests that currently fail because static fallback is returned as success and partial BCV extraction can pass.
- GREEN: Tighten scraper validation and API fallback semantics.
- TRIANGULATE: Cover database-present, database-empty/live-success, and database-empty/live-failure API paths.
- REFACTOR: Keep helper functions small and route behavior explicit.

## Verification
Focused:
- `npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts --runInBand`

Broader project checks where practical:
- `npm run type-check`
- `npm run test:ci`

## Risks
- Some frontend code may assume `/api/bcv-rates` always returns `success: true`; this change intentionally surfaces unavailability instead of hiding stale money data.
- Live scrape in an API request adds latency only on empty DB path, bounded by scraper timeout/retry config.
