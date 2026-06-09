# Design: Fix Binance Scraper (fix-binance-scraper)

## Technical Approach

We will optimize the Binance P2P scraper by removing deprecated BUSD queries and mapping BUSD rates directly 1:1 to USDT rates. In addition, we will update the hardcoded fallback rates to realistic market values (~770.0) to prevent drastic rate drops when the scraper fails.

The strategy resolves the performance and rate-limiting issues by reducing the required network requests per execution from 4 to 2, while maintaining full schema backward compatibility.

## Architecture Decisions

### Decision: Direct mapping of BUSD to USDT
**Choice**: Map BUSD rate 1:1 to USDT rate internally.
**Alternatives considered**:
- Completely removing BUSD properties from database and return models (rejected due to database schema breaking changes and backward compatibility requirements).
- Mocking empty/zero rates for BUSD (rejected because dependent services expect valid numbers and could crash or show incorrect data).
**Rationale**: Binance has phased out BUSD, so its market price is effectively equivalent to USD/USDT stablecoins. Mapping it 1:1 avoids unnecessary API queries while preserving schema compatibility.

### Decision: Network request minimization
**Choice**: Only perform P2P requests for USDT Sell and Buy.
**Alternatives considered**: Keep requesting BUSD but handle errors (rejected as it still wastes resources, causes latency, and risks rate-limiting).
**Rationale**: Eliminating these requests improves scraper execution speed and reliability.

## Data Flow

```
+------------------+         +----------------------------+
|  scrapeBinance   |  ---->  | fetchOffers (USDT Sell/Buy)|
+------------------+         +----------------------------+
         |                                 |
         | (derive BUSD from USDT)         | (Network call P2P API)
         v                                 v
+------------------+         +----------------------------+
|  transformData   |  <----  |     USDT Price Data        |
+------------------+         +----------------------------+
         |
         v
+------------------+
|   BinanceData    | (usdt_ves and busd_ves both mapped to USDT avg)
+------------------+
```

## File Changes

| File | Action | Description |
| ---- | ------ | ----------- |
| `lib/scrapers/binance-scraper.ts` | Modify | Remove BUSD network fetches in `_fetchData`, return empty/stub arrays or map USDT stats directly to BUSD in `_transformData`. |
| `lib/services/rates-fallback.ts` | Modify | Update `STATIC_BINANCE_FALLBACK_RATES` to realistically mirror ~770.0 real market rate. |
| `tests/node/scrapers/binance-scraper.fallback.test.ts` | Modify | Update test mocks and assertions to verify that no BUSD fetch is made and BUSD rates map 1:1 to USDT. |

## Interfaces / Contracts

No new interfaces or API contract changes are required. The scraper result structure `BinanceData` is preserved to guarantee backward compatibility:

```typescript
interface BinanceData {
  usd_ves: number;
  usdt_ves: number;
  busd_ves: number;
  sell_rate: number;
  buy_rate: number;
  // ... rest of existing schema
}
```

## Testing Strategy

| Layer | What to Test | Approach |
| ----- | ------------ | -------- |
| Unit | Scraper outputs & mocks | Run `binance-scraper.test.ts` to ensure structure matches and execution finishes quickly. |
| Integration | Fallback resolution | Run `binance-scraper.fallback.test.ts` with mocked global fetch. Ensure it asserts that no BUSD requests are triggered, and `busd_ves` matches `usdt_ves` 1:1. |
| Performance | Execution time | Verify execution time is significantly lower with only 2 requests compared to 4. |

## Migration / Rollout

No database migrations or feature flags are required. The rollout is a standard code deployment.

## Open Questions

None.
