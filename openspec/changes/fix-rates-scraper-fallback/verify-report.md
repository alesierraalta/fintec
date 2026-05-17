# Verify Report: Fix Rates Scraper Fallback

## Status
PASS WITH WARNING

## Executive Summary
The BCV rates fallback bug is fixed for the targeted scope. The endpoint no longer returns static fallback data as a successful fresh response when the database is empty. It now attempts one live BCV scrape and returns either live data or HTTP 503 with explicit fallback metadata. The scraper also rejects incomplete USD/EUR extraction instead of mixing live and static rates.

## Spec Coverage
- Database contains latest rates: covered by `tests/node/api/bcv-rates-route.test.ts`.
- Database empty + live scrape succeeds: covered by `tests/node/api/bcv-rates-route.test.ts`.
- Database empty + live scrape fails: covered by `tests/node/api/bcv-rates-route.test.ts`.
- Parser extracts USD/EUR containers: covered by `tests/node/scrapers/bcv-scraper-fallback.test.ts`.
- Partial extraction is not complete: covered by `tests/node/scrapers/bcv-scraper-fallback.test.ts`.

## Verification Evidence
- PASS: `npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts --runInBand 2>&1` — 2 suites, 6 tests.
- PASS: `npm run type-check 2>&1`.
- PASS: `RUN_LIVE_SCRAPER_TESTS=1 npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper.node.test.ts --runInBand 2>&1` — live BCV scrape returns valid current-structure rates.

## Warning
A broad accidental node-suite run exposed unrelated pre-existing failures in financial integration/order/db-trigger areas. They are outside this change and were not modified.

## Artifacts
- `openspec/changes/fix-rates-scraper-fallback/proposal.md`
- `openspec/changes/fix-rates-scraper-fallback/specs/rates/spec.md`
- `openspec/changes/fix-rates-scraper-fallback/design.md`
- `openspec/changes/fix-rates-scraper-fallback/tasks.md`
- `openspec/changes/fix-rates-scraper-fallback/apply-progress.md`
