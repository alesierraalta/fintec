# PRD - Hardening del Scraper BCV/EUR y Sistema de Historial de Tasas

## Contexto
FinTec muestra tasas BCV (USD/EUR -> VES) y tasas de mercado (Binance P2P) y ademas mantiene un historial para graficas/tendencias. Actualmente, el scraper BCV/EUR falla intermitentemente y el historial era fragil/inconsistente.

Este PRD define el trabajo para:
- Aumentar resiliencia del scraper BCV/EUR ante cambios del HTML, timeouts y variaciones de runtime (Node/Edge).
- Unificar el comportamiento de fallback (coherencia + staleness).
- Mejorar el sistema de historial (persistencia, timezone, calidad del dato, retencion).
- Aumentar observabilidad (health/metrics) para detectar fallas temprano.

## Objetivo (Outcome)
Garantizar que la app:
1) Obtenga y muestre USD/EUR BCV con alta disponibilidad y sin saltos irreales.
2) Mantenga un historial confiable para BCV y Binance con correctitud de fechas y proteccion contra sobrescritura por fallback/stale data.
3) Permita diagnosticar fallas (parser, red, rate limiting, etc.) con senales claras (flags/health).

## Estado actual (Hallazgos relevantes del codigo)
### Scraper BCV
- `lib/scrapers/bcv-scraper.ts`:
  - `_fetchData()` combina `https` (Node) con fallback a `fetch` (Edge/Browser).
  - Parser combina heuristicas Cheerio + regex.
  - La validacion por rangos era una causa real de fallas cuando las tasas suben.
- `app/api/bcv-rates/route.ts`:
  - Cache en memoria de modulo (`lastSuccessfulData`) no es durable en serverless y puede resetearse.
  - El API devolvia fallbacks hardcode distintos segun el error path.

### Historial
- BCV y Binance:
  - Guardaban day-key con UTC (`toISOString()`), riesgo off-by-one vs `America/Caracas`.
  - Riesgo de sobrescritura por fallback si no se distingue calidad del dato.

## Alcance
### Incluye
- Parser/fetch de BCV (USD/EUR) y su endpoint API.
- Normalizacion y unificacion del fallback.
- Historial (Dexie) para BCV y Binance (timezone, calidad, retencion).
- Tests deterministas (fixtures) para el parser.

### No incluye (por defecto)
- Redisenio completo de UI (solo cambios minimos si se requiere mostrar flags de stale/fallback).
- Reemplazo total del scraping por un proveedor distinto (solo si se aprueba explicitamente).
- Migracion total a Supabase como unica persistencia (opcional).

## Requisitos funcionales
1) BCV API:
   - Retornar estructura estable.
   - Incluir senalizacion cuando se sirva cache/fallback (ej. `cached`, `fallback`, `fallbackReason`, `dataAge`).
2) Parser BCV:
   - Soportar variaciones comunes del HTML sin romper (multi-estrategia + heuristica).
   - Soportar formatos numericos con coma/punto y separadores de miles.
3) Historial:
   - No mover fechas por timezone (Venezuela).
   - No sobrescribir un dato bueno con fallback.
   - Retencion clara (p.ej. 90/365 dias segun fuente).

## Criterios de aceptacion (DoD)
- Fixtures + tests deterministas validan extraccion USD/EUR con HTML real/sintetico.
- Tests live no bloquean CI (quedan como opcionales).
- Fallback unificado (no hay multiples conjuntos de numeros hardcode).
- Historial usa day-key `America/Caracas` y protege contra sobrescritura por fallback.

## Plan de ejecucion (Tasks)
Ver `tasks/prd/bcv-eur-scraper-history/tasks/tasks.md`.
