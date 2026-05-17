# Change: Fix rates scraper fallback

## Why
The rates endpoints can report static fallback data instead of current exchange rates. This hides scraper/background failures and leaves users with stale financial data.

## What Changes
- Make BCV scraper validation fail unless both USD and EUR are extracted from the live source.
- Make `/api/bcv-rates` attempt a bounded live BCV scrape when the database has no current snapshot.
- Stop returning static fallback as a successful response when the database or live scrape cannot provide current rates.
- Preserve explicit fallback metadata only for failed responses so consumers can detect stale/static data.

## Impact
- Affected API: `GET/POST /api/bcv-rates`.
- Affected scraper: `lib/scrapers/bcv-scraper.ts`.
- Affected tests: node Jest tests for scraper parsing and API fallback behavior.
- Supabase: no schema/RLS changes.
- Playwright lane: no-auth not required for this backend-only change.

## Rollback
Revert this change to restore previous static fallback behavior. No migrations or data changes are involved.
