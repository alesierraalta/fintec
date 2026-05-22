# Verify Report: Fix Rates Scraper Fallback

## Status

PASS

## Executive Summary

The BCV rates fallback fix is complete and verified. The endpoint no longer returns static fallback data as a successful fresh response when the database is empty. It attempts one live BCV scrape and returns either live data or HTTP 503 with explicit fallback metadata. The scraper rejects incomplete USD/EUR extraction instead of mixing live and static rates. The follow-up PR1 (rates freshness domain contract) was implemented and committed as `657e733` on main — this SDD change is now fully closed.

## Spec Coverage

- Database contains latest rates: covered by `tests/node/api/bcv-rates-route.test.ts`.
- Database empty + live scrape succeeds: covered by `tests/node/api/bcv-rates-route.test.ts`.
- Database empty + live scrape fails: covered by `tests/node/api/bcv-rates-route.test.ts`.
- Parser extracts USD/EUR containers: covered by `tests/node/scrapers/bcv-scraper-fallback.test.ts`.
- Partial extraction is not complete: covered by `tests/node/scrapers/bcv-scraper-fallback.test.ts`.
- Parser tiered strategy (selectors → DOM → regex): covered by `tests/node/scrapers/bcv-parser.test.ts`.

## Verification Evidence

- PASS: `npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts --runInBand 2>&1` — 2 suites, 6 tests.
- PASS: `npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-parser.test.ts --runInBand 2>&1` — 1 suite, 6 tests.
- PASS: `npm run type-check 2>&1`.
- PASS: `RUN_LIVE_SCRAPER_TESTS=1 npx jest --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper.node.test.ts --runInBand 2>&1` — live BCV scrape returns valid current-structure rates.

## Artifacts

- `openspec/changes/fix-rates-scraper-fallback/proposal.md`
- `openspec/changes/fix-rates-scraper-fallback/specs/rates/spec.md`
- `openspec/changes/fix-rates-scraper-fallback/design.md`
- `openspec/changes/fix-rates-scraper-fallback/tasks.md`
- `openspec/changes/fix-rates-scraper-fallback/apply-progress.md`
