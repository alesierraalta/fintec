# Proposal: Fix Binance Scraper (fix-binance-scraper)

## Intent

The current Binance P2P scraper suffers from latency, rate-limiting risks, and redundant queries due to deprecated BUSD fetching (which Binance has phased out). Additionally, the hardcoded fallback rates are extremely stale (61.5 vs. ~770.0 real market rate), causing massive, disruptive rate drops in the system when the live scraper fails or is rate-limited.

This change aims to optimize the scraper performance, eliminate BUSD API calls, map BUSD rates directly to USDT rates, and update fallback rates to realistic market levels.

## Scope

### In Scope

- **API Request Elimination**: Remove BUSD Sell/Buy API queries from the scraper implementation, reducing total P2P requests per execution from 4 to 2.
- **USDT-to-BUSD Rate Derivation**: Map BUSD rates 1:1 to USDT rates internally, ensuring backward compatibility with existing data structures without making external calls.
- **Fallback Rates Update**: Update `STATIC_BINANCE_FALLBACK_RATES` to a realistic baseline (around ~770.0) to prevent drastic rate drops during scraper failures.
- **Test Alignment**: Update the scraper fallback tests to align with the removed BUSD calls and mock structure.

### Out of Scope

- Modifying other scrapers (e.g. BCV) or altering the core database storage schema.
- Implementing dynamic fallback caching or external fallback APIs.

## Approach

1. **Modify scraper** (`lib/scrapers/binance-scraper.ts`):
   - Refactor `_fetchData` to only request USDT sell and buy offers concurrently.
   - Adjust `_transformData` to map `busd_ves` and BUSD stats 1:1 to `usdt_ves` / USDT statistics.
2. **Update Fallbacks** (`lib/services/rates-fallback.ts`):
   - Change `STATIC_BINANCE_FALLBACK_RATES` values to reflect current market rates (~770.0).
3. **Adjust Tests** (`tests/node/scrapers/binance-scraper.fallback.test.ts`):
   - Remove/update tests that verify distinct BUSD fetching, adapting them to assert correct 1:1 fallback mapping from USDT.

## Affected Areas

| Area | Impact | Description |
| ---- | ------ | ----------- |
| `lib/scrapers/binance-scraper.ts` | Modified | Eliminate BUSD API fetches and derive BUSD rate from USDT. |
| `lib/services/rates-fallback.ts` | Modified | Update stale static fallback rates to real-world values (~770.0). |
| `tests/node/scrapers/binance-scraper.fallback.test.ts` | Modified | Align mocks and expectations with the simplified network behavior. |

## Risks

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| Fallback rate drift over time | Medium | Fallback rates are static, so we will keep them centralized and easy to update during routine upgrades. |
| Test failures due to mocked requests | Low | Refactor the test suite's mocks carefully to ensure only USDT requests are mocked and verified. |

## Rollback Plan

To revert the changes, discard the modifications in git:
```bash
git checkout HEAD -- lib/scrapers/binance-scraper.ts lib/services/rates-fallback.ts tests/node/scrapers/binance-scraper.fallback.test.ts
```

## Dependencies

- None.

## Success Criteria

- [ ] Scraper execution performs only 2 P2P requests (USDT SELL and BUY) instead of 4.
- [ ] Fallback rates resolve to realistic rates around ~770.0 instead of 61.5.
- [ ] Fallback and general unit tests for the scraper pass successfully.
