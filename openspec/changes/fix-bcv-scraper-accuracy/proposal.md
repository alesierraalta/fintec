# Proposal: Fix BCV Scraper Accuracy

## Intent

The BCV scraper has 3 critical issues causing stale/fallback rates to be served to users:

1. **CSS selectors may be outdated** — `#dolar`, `#USD`, `#euro`, `#EUR` may not match current BCV HTML structure, causing silent fallback to lower-confidence DOM/regex strategies
2. **Precision loss** — `Math.round(parsed.usd * 100) / 100` rounds 8 decimals to 2, losing financial accuracy (e.g., 633.48198705 → 633.48)
3. **Static fallback rates are ancient** — USD 60.15, EUR 64.2 (from 2026-04-23) are 9x lower than real rates (USD ~544.58, EUR ~633.48)

Real rates: USD 544.57940000, EUR 633.48198705. App shows: USD 489.55, EUR 574.19 (stale DB values).

## Scope

### In Scope

- Update static fallback rates to reasonable current values (~540/630)
- Remove rounding in `_transformData()` to preserve full precision
- Expand CSS selectors with attribute/class fallbacks
- Add selector failure logging for monitoring
- TDD tests for precision, selectors, and fallback ranges

### Out of Scope

- Replacing scraper with API (BCV has no public API)
- Multi-source fallback architecture
- Database migration for precision (verify schema first)
- Frontend display changes for 8-decimal display

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `rates`: Modify BCV scraper precision requirement — rates MUST preserve full decimal precision from source (not round to 2)

## Approach

Incremental fixes (low risk, high value):

| Fix                | File                                   | Change                                                 |
| ------------------ | -------------------------------------- | ------------------------------------------------------ |
| Fallback update    | `lib/services/rates-fallback.ts:21-24` | Update `STATIC_BCV_FALLBACK_RATES` to ~540/630         |
| Precision fix      | `lib/scrapers/bcv-scraper.ts:471-472`  | Remove `Math.round()` — return `parsed.usd` directly   |
| Selector expansion | `lib/scrapers/config.ts:22-25`         | Add `[data-currency="USD"]`, `.currency-usd` fallbacks |
| Monitoring         | `lib/scrapers/bcv-scraper.ts:81`       | Log when selectors fail, before DOM fallback           |

**Tradeoffs**: Removing rounding means 8 decimals propagate to DB and API. Verify `rates_history` table supports NUMERIC precision. Frontend may need display formatting.

## Affected Areas

| Area                              | Impact   | Description                          |
| --------------------------------- | -------- | ------------------------------------ |
| `lib/services/rates-fallback.ts`  | Modified | Update static fallback values        |
| `lib/scrapers/bcv-scraper.ts`     | Modified | Remove rounding, add logging         |
| `lib/scrapers/config.ts`          | Modified | Expand CSS selectors                 |
| `lib/rates/bcv-rate-db-writer.ts` | Verified | Confirm schema supports precision    |
| `app/api/bcv-rates/route.ts`      | Verified | Confirm API passes precision through |

## Risks

| Risk                                | Likelihood | Mitigation                                  |
| ----------------------------------- | ---------- | ------------------------------------------- |
| BCV HTML structure changed          | High       | Expand selectors + keep DOM/regex fallback  |
| DB schema truncates precision       | Medium     | Check `usdVes` column type before deploying |
| Frontend displays too many decimals | Low        | Add `toFixed()` at display layer only       |

## Rollback Plan

- Revert `lib/services/rates-fallback.ts` to previous static values
- Revert `lib/scrapers/bcv-scraper.ts` rounding lines
- Revert `lib/scrapers/config.ts` selectors
- All changes are in `lib/` — no migrations to rollback

## Dependencies

- Verify database column type for `usdVes` (NUMERIC vs FLOAT)

## Success Criteria

- [ ] Parser preserves 8 decimal places (test: `544.57940000` → `544.57940000`)
- [ ] Static fallback rates are within 20% of real rates
- [ ] CSS selectors match current BCV HTML (manual verification)
- [ ] Selector failures produce warning logs
- [ ] All existing tests pass
