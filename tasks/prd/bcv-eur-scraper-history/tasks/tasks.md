# Tasks - BCV/EUR Scraper + History Hardening

## Referencias
- PRD: `tasks/prd/bcv-eur-scraper-history/prd.md`

## Reglas de ejecucion (OBLIGATORIO)
- MCP-first:
  - Exploracion/edicion de codigo: Serena MCP (`get_symbols_overview` -> `find_symbol`/`find_referencing_symbols`).
  - Evitar leer archivos completos salvo que sea imprescindible.
- Sequential thinking:
  - Minimo 20 checkpoints usando `mcp__serena__think_about_*`.
- Bank memory:
  - Al cerrar cada fase, registrar hallazgos/decisiones con `mcp__serena__write_memory`.
- Navegador (best practices/optimizacion):
  - Context7: `mcp__context7__resolve-library-id` + `mcp__context7__get-library-docs`.
  - Docfork: `mcp__docfork__docfork_search_docs` + `mcp__docfork__docfork_read_url`.

---

## Task 001 - Recon & Baseline
- [x] Mapear el flujo scrape -> API -> UI -> history.
- [x] Identificar puntos de falla (runtime/TLS/parser/locale numbers).
- [x] Registrar memoria `bcv_history_recon_baseline`.

---

## Task 002 - Hardening del Fetch BCV
- [x] Forzar `runtime='nodejs'` en `app/api/bcv-rates/route.ts`.
- [x] Timeouts reales (destroy/abort) y redirects defensivos.
- [x] Hacer timeouts realmente retryables en `lib/ai/retry-handler.ts`.
- [x] Registrar memoria `bcv_fetch_hardening_decisions`.

---

## Task 003 - Hardening del Parser BCV (fixtures + locale numbers)
- [x] Anadir fixtures en `tests/fixtures/bcv/`.
- [x] Implementar `parseLocaleNumber()` en `lib/scrapers/parsers/number.ts`.
- [x] Exportar `parseBCVRatesFromHtml()` en `lib/scrapers/bcv-scraper.ts` y usarlo en `_parseData`.
- [x] Ajustar rangos para tolerar valores reales actuales (`USD_MAX/EUR_MAX`).
- [x] Anadir tests deterministas: `tests/scrapers/bcv-parser.fixtures.test.ts`.
- [x] Hacer tests live opcionales: `RUN_LIVE_SCRAPER_TESTS=1` en `tests/scrapers/bcv-scraper.test.ts`.
- [x] Registrar memoria `bcv_parser_strategy_and_fixtures`.

---

## Task 004 - Unificacion de Fallback (coherencia + staleness)
- [x] Inventariar hardcodes/fallbacks BCV (scraper/API/service).
- [x] Centralizar fallback en `lib/services/rates-fallback.ts`.
- [x] Evitar persistir historial con datos fallback (solo guardar cuando no es fallback).
- [x] Exponer flags consistentes en API (`fallback`, `fallbackReason`, `dataAge` cuando aplica).
- [x] Registrar memoria `bcv_fallback_unification`.

---

## Task 005 - Historial (timezone Caracas + anti-overwrite + retencion)
- [x] Crear helper `formatCaracasDayKey()` en `lib/utils/date-key.ts`.
- [x] Usar day-key Caracas en:
  - [x] `lib/services/bcv-history-service.ts`
  - [x] `lib/services/binance-history-service.ts`
- [x] Anti-overwrite: no reemplazar \"good\" con `fallback` en `BCVHistoryService/saveRates`.
- [x] Retencion: `BCVHistoryService/saveRates` ejecuta `cleanOldRecords(365)`.
- [x] Agregar `BCVHistoryService.getLatestRate()` para fallback desde historial.
- [x] Test minimo de day-key: `tests/lib/date-key.test.ts`.
- [x] Registrar memoria `bcv_history_timezone_and_antioverwrite`.
- [ ] Tests adicionales (opcional): anti-overwrite con Dexie (fake IndexedDB).

---

## Task 006 - UI + Observabilidad
- [x] Mostrar badges de `fallback`/`stale`/`cache` en `components/currency/bcv-rates.tsx`.
- [x] Endpoint health de scrapers: `app/api/scrapers/health/route.ts` (incluye `scraperCount` y `runtime='nodejs'`).
