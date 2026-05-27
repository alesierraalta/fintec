# PR1 / Phase 1 domain contract context — rates scraper recovery

Read-only context build. Project/source files untouched; only this artifact written.

## 1. Existing scraper/API/test file map

### Source docs

- `docs/architecture/rates-scraper-tasks.md` — delivery order and Phase 1 checklist. Lines 9-22 require small slices and put contract/domain first. Lines 43-68 define exact PR1 scope: shared freshness types, `FreshnessPolicy`, `RateUsabilityPolicy`, threshold config parsing, boundary tests, no Next/Supabase imports, deterministic injected clock.
- `docs/architecture/rates-scraper-architecture.md` — target architecture. Lines 5-7: hexagonal scraper architecture; no stale/fallback rate can look fresh/authoritative. Lines 16-23: dependency inward, explicit degraded state, financial safety. Lines 46-83: domain/use-case/ports/adapters split; domain contains `RateSnapshot`, `RateFreshness`, `ScrapeAttempt`, `FreshnessPolicy`, `RateUsabilityPolicy`.
- `docs/prd-rates-scraper-recovery.md` — product contract. R1 requires `success`, `fallback`, `stale`, `source`, `timestamp`, `ageMinutes`, `fallbackReason`, `fromLiveScrape`; R2 defaults: fresh <=24h, stale warning >24h, incident >48h, hard failure >7d.

### Existing scraper/domain-ish code

- `lib/scrapers/bcv-scraper.ts` — BCV parser/scraper adapter. Lines 30-37 export `ParsedBCVRates`; lines 39-43 require both USD and EUR for completeness; lines 45-128 parse from selectors/DOM/regex; lines 440-450 reject incomplete USD/EUR with `VALIDATION_ERROR`; lines 470-475 transform successful parsed data to `{ usd, eur, lastUpdated, source: 'BCV' }`; error path returns fallback data, success false.
- `lib/scrapers/config.ts` — scraper adapter config. Lines 22-25 define BCV selectors; lines 62-74 define BCV scraper timeout/retry/circuit breaker. Do not put freshness policy here if keeping domain independent; env parsing can live under `lib/rates/*` or another domain-safe config module.
- `lib/scrapers/types.ts` — scraper adapter result/error/circuit breaker types. Includes `ScraperResult<T>`, `ScraperErrorCategory`, `CircuitBreakerState`, `ScraperConfig`. Useful reference only; PR1 domain should not couple to scraper adapter unless deliberately shared.
- `lib/services/rates-fallback.ts` — static fallback data. Lines 18-24 centralize static BCV fallback `{ usd: 60.15, eur: 64.2 }`; lines 38-47 build fallback data with source `BCV (fallback - reason)`; `isFallbackSource()` detects `/fallback/i`. PR1 policy must encode: static fallback never authoritative.
- `types/rates.ts` — existing UI/service BCV interface. `BCVRates` has `usd`, `eur`, `lastUpdated`, optional `source`, `cached`, `cacheAge`, `fallback`, `fallbackReason`, `dataAge`. Candidate to compose with new metadata, but avoid overloading UI type if domain contract should be clean.
- `lib/rates.ts` — frontend hook for selected active rate source, imports React hooks/services. Not domain-safe location for Phase 1 pure code despite name.

### Existing API/read path

- `app/api/bcv-rates/route.ts` — current API. Lines 1-8 import Next, DB, fallback, scraper, logger. Lines 22-37 return DB latest as `success: true`, `cached: true`, `fallback: false`, but no freshness classification and EUR missing from unified snapshot. Lines 40-56 attempt live scrape when DB empty and return `fromLiveScrape: true`. Lines 59-68 return 503 with fallback metadata when DB/live scrape fail. PR1 should not rewrite API yet; it should provide reusable metadata/policies for later API PR.
- `lib/services/bcv-rates-service.ts` — client/service fetch fallback cascade. Lines 63-88 parse API result and mark fallback. Lines 116-156 fetch `/api/bcv-rates`. Lines 157-190 fallback to memory cache, IndexedDB history, then static fallback. Current UI may still consume fallback data; PR1 should define policy, not refactor all consumers.
- `hooks/use-bcv-rates.ts` — UI hook. Lines 8-12 hardcode default rates with current timestamp; lines 47-52 drop fallback/freshness metadata and keep only usd/eur/lastUpdated. Later UI PR must preserve metadata; PR1 can note type compatibility risk.

### Persistence/scheduler/health surfaces

- `repositories/contracts/rates-history-repository.ts` — current persistence port. Lines 1-7 `BCVRateHistoryEntry` stores date/usd/eur/source/timestamp. Lines 16-23 unified snapshot lacks EUR; lines 25-35 expose latest snapshot/latest BCV rate/history methods.
- `repositories/supabase/rates-history-repository-impl.ts` — Supabase adapter. `upsertBCVRate()` persists `bcv_rate_history`; `insertExchangeRateSnapshot()` persists unified snapshot; read path has stale cache fallback logic. Not PR1.
- `lib/services/exchange-rate-db.ts` — DB service wrapper. `storeExchangeRate()` catches errors and returns boolean; `getLatestExchangeRate()` returns snapshot or reconstructs latest from history. Not PR1, but important later risk: silent false/null behavior.
- `lib/services/background-scraper.ts` — loop runs Binance and BCV scrapers in parallel every 60s.
- `lib/services/background-scraper-manager.ts` — lines 81-160 merges scraper results, writes unified snapshot and history. Lines 93-100 set `lastUpdated` to response time, not source timestamp; lines 132-141 writes BCV history with current `now`. Later PR must address. Not PR1.
- `app/api/scrapers/health/route.ts` — current health endpoint serializes in-memory `healthMonitor`; no freshness/last persisted success/scheduler heartbeat yet.

### Existing tests

- `tests/node/scrapers/bcv-scraper-fallback.test.ts` — lines 7-18 complete USD/EUR succeeds; lines 20-30 partial extraction is incomplete.
- `tests/node/scrapers/bcv-parser.test.ts` — parser strategy tests: primary selector, secondary selector, DOM, regex, unrealistic rates.
- `tests/node/scrapers/bcv-parser.fixtures.node.test.ts` — fixture tests use `tests/fixtures/bcv/homepage-sample-1.html`, `homepage-sample-2.html`, `homepage-mutated.html`; line coverage for parser variants.
- `tests/node/scrapers/bcv-scraper.node.test.ts` — live scraper tests gated by `RUN_LIVE_SCRAPER_TESTS=1`.
- `tests/node/api/bcv-rates-route.test.ts` — lines 29-55 cached DB success; lines 57-87 live scrape when DB empty; lines 89-113 503 instead of successful static fallback; lines 115-126 POST follows GET.
- `jest.config.js` — node project runs `tests/node/**/*.test.{js,jsx,ts,tsx}` under node env; dom project excludes `tests/node`.

## 2. Current architecture patterns relevant to clean domain code

- Clean/hex dependency rule already documented: domain freshness rules must not import Next.js, Supabase, logger, or scraper implementations (`docs/architecture/rates-scraper-architecture.md:16-23`).
- Existing code mixes adapter/service concerns heavily (`app/api/bcv-rates/route.ts`, `lib/services/bcv-rates-service.ts`, `lib/services/background-scraper-manager.ts`). PR1 should add pure domain modules instead of editing these paths.
- Existing tests for scraper/parser are node Jest tests under `tests/node/...`; use same lane for pure domain tests.
- Money/financial safety skill: exchange rates are not money amounts, so rates can be numbers; but policy must prevent stale/static fallback rates from being used as authoritative conversion inputs.
- Supabase skill relevance deferred: PR1 should have zero Supabase imports and zero migrations. DB contracts matter only as future adapter consumers.

## 3. Recommended PR1 domain contract scope

Keep PR1 narrow: pure TypeScript domain contract + unit tests only. No API route, UI, scheduler, DB, health, alerting, or scraper behavior changes.

Suggested files:

- `lib/rates/freshness-types.ts`
  - `export type RateFreshness = 'fresh' | 'stale-warning' | 'incident' | 'hard-failure'`
  - `export type RateSource = 'database' | 'live-scrape' | 'fallback' | 'unavailable'`
  - `export type RateFallbackReason = 'live-scrape-failed' | 'database-error' | 'cache' | 'history' | 'static' | 'missing-rate' | 'invalid-timestamp' | 'hard-stale' | string`
  - `export interface RateResponseMetadata { source: RateSource; timestamp: string | null; ageMinutes: number | null; freshness: RateFreshness; fallback: boolean; stale: boolean; fromLiveScrape: boolean; fallbackReason?: RateFallbackReason; }`
  - Optional `RateUsageContext = 'read-display' | 'conversion'`.
- `lib/rates/freshness-policy.ts`
  - `FreshnessThresholds` in milliseconds or minutes. Defaults: fresh 24h, incident 48h, hard failure 7d.
  - `FreshnessPolicy.evaluate(input: { timestamp: string | Date | null | undefined; now: Date; thresholds?: FreshnessThresholds }): FreshnessEvaluation`
  - Boundary behavior from tasks: exactly 24h => `fresh`; 24h + 1ms/minute => `stale-warning`; exactly 48h => `stale-warning` if condition is `24h < age <= 48h`; >48h to <=7d => `incident`; >7d or missing/invalid/future timestamp policy decision below.
  - Recommend missing/invalid timestamp => `hard-failure`, `ageMinutes: null`, reason `missing-rate` or `invalid-timestamp` because architecture says hard failure includes no usable rate.
  - Future timestamp: recommend fail loudly as invalid config/data (`hard-failure`, reason `invalid-timestamp`) or clamp? Need writer decide and test. Safer: invalid future timestamp is not fresh.
- `lib/rates/rate-usability-policy.ts`
  - Pure decision helper: `RateUsabilityPolicy.evaluate({ freshness, source, fallback, context })`.
  - Proposed contract:
    - static/any fallback source: not authoritative; `usableForConversion: false`; `usableForReadDisplay: true` only if product wants display-with-warning; `requiresWarning: true`.
    - `fresh`: read + conversion usable, no warning.
    - `stale-warning`: read usable, conversion usable with warning (or conversion warning true). This keeps PR1 policy explicit without UI behavior.
    - `incident`: read usable with strong warning, conversion usable? Product decision not fully settled. For PR1, expose both booleans and make conservative: conversion allowed with warning until hard failure unless product says block earlier.
    - `hard-failure`: read display may show last data as stale/outage if non-fallback; conversion authoritative false/block.
- `lib/rates/freshness-config.ts`
  - `parseFreshnessThresholdConfig(env: Record<string, string | undefined>): FreshnessThresholds`
  - Env names: propose `RATES_FRESH_WINDOW_HOURS`, `RATES_INCIDENT_WINDOW_HOURS`, `RATES_HARD_FAILURE_WINDOW_HOURS` or BCV-specific `BCV_RATES_*`. Choose one and document in tests. Prefer generic `RATES_*` for shared rates contract unless BCV-only desired.
  - Defaults: 24, 48, 168 hours.
  - Validate loudly: finite positive numbers; strict ordering `fresh < incident < hardFailure`; throw descriptive `Error` on invalid values.

Unit tests:

- `tests/node/rates/freshness-policy.test.ts`
  - exactly 24h => `fresh`
  - 24h + 1ms (or +1 minute per task wording) => `stale-warning`
  - exactly 48h => `stale-warning`
  - 48h + 1ms => `incident`
  - more than 7d => `hard-failure`
  - missing timestamp => `hard-failure`, null age, reason
  - deterministic injected `now`
- `tests/node/rates/rate-usability-policy.test.ts`
  - fresh DB/live scrape usable for display and conversion
  - stale-warning display usable and warning required
  - incident warning required
  - hard-failure blocks authoritative conversion
  - fallback/static never authoritative even if timestamp is current
- `tests/node/rates/freshness-config.test.ts`
  - defaults parse
  - env override parse
  - invalid non-number/negative/order throws

## 4. Proposed validation contract with exact focused RED/GREEN commands

RED sequence after adding failing tests first:

```bash
npm test -- --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts
```

Expected RED: module-not-found or assertion failures before implementation.

GREEN focused:

```bash
npm test -- --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts
```

Regression smoke for nearby scraper fallback contract:

```bash
npm test -- --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts
```

Type/lint gate:

```bash
npm run type-check
npm run lint
```

Optional live scraper remains gated and should not run in PR1 unless explicitly requested:

```bash
RUN_LIVE_SCRAPER_TESTS=1 npm test -- --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper.node.test.ts
```

## 5. Review workload forecast vs 400-line budget

Forecast: safe under 400 changed lines if PR1 stays pure domain.

Estimated diff:

- `lib/rates/freshness-types.ts`: 45-70 LOC
- `lib/rates/freshness-policy.ts`: 70-100 LOC
- `lib/rates/rate-usability-policy.ts`: 45-75 LOC
- `lib/rates/freshness-config.ts`: 45-75 LOC
- 3 node test files: 160-240 LOC total

Likely total: 365-560 LOC depending test verbosity. To keep under 400, combine policy/config tests carefully and avoid broad API/UI edits. If writer finds scope exceeding 400 changed lines, split config parsing or usability policy into PR1b, or ask parent before widening.

Recommended PR1 cap: source + tests only, no docs update except maybe tiny mention if required by SDD artifact. No API/DB/UI changes.

## 6. PR1 blockers/open decisions only

- Hard-stale conversion behavior is listed as Phase 0 open decision (`docs/architecture/rates-scraper-tasks.md:34-36`). For PR1, avoid product UI decision by returning explicit booleans/reasons. Conservative default: `hard-failure` blocks authoritative conversion; stale/incident require warnings.
- Scheduler owner, alert recipients, production cron choice do not block PR1 domain contract.
- Env key naming must be chosen. No existing freshness env keys found in current scraper config. Recommend generic `RATES_FRESH_WINDOW_HOURS`, `RATES_INCIDENT_WINDOW_HOURS`, `RATES_HARD_FAILURE_WINDOW_HOURS` unless parent wants BCV-specific.
- Missing/invalid timestamp behavior should be explicit. Recommend `hard-failure` because architecture says no usable rate => hard failure, and domain must fail safe.
- Engram save requested for important discoveries, but no Engram/memory tool is exposed in this subagent toolset. Discovery should be saved by parent if memory tools available.

## 7. Compact implementation-ready meta-prompt

Goal: Implement PR1/Phase 1 rates freshness domain contract with strict TDD. Add pure domain modules and node unit tests only. Do not touch API routes, UI, scheduler, DB repositories, migrations, or scraper behavior.

Context/evidence:

- Tasks require Phase 1 first: `docs/architecture/rates-scraper-tasks.md:43-68` — shared types, `FreshnessPolicy`, `RateUsabilityPolicy`, config parsing, boundary tests, no Next/Supabase imports, injected clock.
- Architecture requires hexagonal domain: `docs/architecture/rates-scraper-architecture.md:16-23`, `46-83` — domain rules independent from adapters; fallback never authoritative.
- Existing API currently lacks freshness classification: `app/api/bcv-rates/route.ts:22-37` DB success has `success/fallback/cacheAge` only; `40-68` live scrape/503 fallback path exists.
- Existing parser already requires USD+EUR: `lib/scrapers/bcv-scraper.ts:39-43`, `440-450`; static fallback centralized in `lib/services/rates-fallback.ts:18-24`, `38-47`.
- Existing tests use Jest node project under `tests/node`. Package commands: `package.json:14-16` type-check/test.

Success criteria:

- New pure TypeScript rate domain files under `lib/rates/` (or equally pure location) export `RateFreshness`, `RateSource`, `RateFallbackReason`, `RateResponseMetadata`, `FreshnessPolicy`, `RateUsabilityPolicy`, and threshold config parser.
- Boundary tests pass for exactly 24h, 24h+, exactly 48h, 48h+, >7d, missing timestamp, and invalid config.
- No new domain file imports `next/*`, `@supabase/*`, app routes, React hooks/components, logger, or scraper implementations.
- Fallback/static source can never be authoritative for conversion.
- Deterministic tests use injected `now`, not ambient clock except config parsing where irrelevant.
- Diff remains near/under 400 changed lines; if forecast exceeds 400, stop and ask parent to split.

Hard constraints:

- Preserve dirty worktree; inspect before editing if needed.
- Single writer only. No subagents from worker.
- Strict TDD: write/adjust focused tests first, capture RED; implement minimal GREEN; refactor only after green.
- No API/UI/DB/scheduler changes in PR1.

Suggested approach:

1. Add tests under `tests/node/rates/` for freshness policy, usability policy, config parsing.
2. Run RED command:
   `npm test -- --selectProjects node --runTestsByPath tests/node/rates/freshness-policy.test.ts tests/node/rates/rate-usability-policy.test.ts tests/node/rates/freshness-config.test.ts`
3. Implement `lib/rates/freshness-types.ts`, `freshness-policy.ts`, `rate-usability-policy.ts`, `freshness-config.ts` with tiny pure functions/classes.
4. Run focused GREEN, nearby regression, type-check, lint.

Validation:

- Focused domain tests command above.
- Nearby regression: `npm test -- --selectProjects node --runTestsByPath tests/node/scrapers/bcv-scraper-fallback.test.ts tests/node/api/bcv-rates-route.test.ts`
- Full static gates: `npm run type-check`; `npm run lint`.

Stop/escalation rules:

- Stop if needing product decision beyond explicit conservative defaults for hard-failure conversion.
- Stop if adding API/UI/DB/scheduler changes seems necessary; that belongs to later phases.
- Stop if changed lines likely exceed 400; ask parent to split.
- Stop if tests reveal existing unrelated failures; report exact command/output and do not broaden scope.

Resolved assumptions:

- Defaults: fresh <=24h, stale-warning >24h and <=48h, incident >48h and <=7d, hard-failure >7d or no usable/valid timestamp.
- Static/any fallback is never authoritative.
- PR1 is contract/domain only; integration into `/api/bcv-rates` begins Phase 7/read API or a later slice.
