# Plan de endurecimiento de calidad

Plan operativo para pasar de checks asesoros a checks bloqueantes en CI sin frenar al equipo.

## Objetivo

- Convertir `lint` y `test` en requeridos de merge en una ventana corta y controlada.
- Reducir deuda tecnica por lotes pequenos y medibles.

## Estado inicial (baseline)

- `npm run type-check`: OK.
- `npm run build`: OK.
- `npm run lint`: falla por reglas de hooks/purity y dependencias de hooks.
- `npm test -- --runInBand`: falla por expectativas de negocio y algunas pruebas de integracion/UI.

## Estado actual

- `npm run type-check`: OK.
- `npm run lint`: OK (sin errores, con warnings no bloqueantes).
- `npm test -- --runInBand`: OK.
- `npm run build`: OK.
- Hooks locales activos: `pre-commit`, `commit-msg`, `pre-push` via Husky.

## Lote 1 (prioridad alta)

- Corregir errores de lint que hoy son `error` (no warnings):
  - `react-hooks/set-state-in-effect`
  - `react-hooks/purity`
- Archivos foco inicial:
  - `app/auth/login/page.tsx`
  - `app/auth/reset-password/page.tsx`
  - `components/reports/reports-content.tsx`
  - `hooks/use-media-query.ts`

## Lote 2 (prioridad alta)

- Estabilizar pruebas de negocio de moneda/tasas:
  - `tests/services/currency-service.property.test.ts`
  - `tests/services/currency-service.methods.test.ts`
  - `tests/services/bcv-rates-service.test.ts`
  - `tests/services/currency-formatter.test.ts`
- Acordar contrato esperado entre tests y comportamiento actual (fuentes/fallbacks/precision).

## Lote 3 (prioridad media)

- Arreglar pruebas de integracion y API:
  - `tests/integration/priority1.test.ts`
  - `tests/api/waitlist.test.ts`
  - `tests/transaction-filters.test.tsx`
- Aislar dependencias de contexto Next/Supabase en tests para evitar side-effects.

## Criterio para volver bloqueante

- Fase A: bloquear `lint` cuando errores = 0 (warnings permitidos temporalmente).
- Fase B: bloquear `test` cuando suites fallidas = 0 en rama principal.
- Fase C: exigir ambos (`lint` y `test`) como required checks.

Estado: Fases A/B/C completadas para baseline actual.

## Regla de operacion

- Cada PR debe reducir o mantener deuda; no introducir nuevas fallas de calidad.
- Si un PR toca un area con deuda, incluir al menos una correccion de esa deuda dentro del mismo PR o issue asociado.
