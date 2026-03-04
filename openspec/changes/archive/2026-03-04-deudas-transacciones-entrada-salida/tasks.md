# Tasks: Deudas en transacciones de entrada/salida

## Phase 1: Schema + Supabase Baseline

- [x] 1.1 Crear migracion `supabase/migrations/<timestamp>_add_debt_metadata_to_transactions.sql` con enums `debt_direction`/`debt_status`, columnas (`is_debt`, `debt_direction`, `debt_status`, `counterparty_name`, `settled_at`), defaults/backfill e indice parcial para deudas abiertas.
- [x] 1.2 Actualizar en la misma migracion la RPC `create_transaction_and_adjust_balance` (y funciones relacionadas si existen) para aceptar metadata de deuda con parametros opcionales backward-compatible.
- [x] 1.3 Verificar en SQL que registros historicos sin metadata siguen interpretandose como no deuda (`is_debt=false`) y documentar checks de smoke query en el cuerpo de la migracion.
- [x] 1.4 Agregar/ajustar test de capa DB/API en `tests/node/api/transactions-route.test.ts` para cubrir payload con deuda (OPEN y SETTLED) y rechazo cuando `isDebt=true` sin `debtDirection`.

## Phase 2: Domain Types + Contracts

- [x] 2.1 Extender `types/domain.ts` con `DebtDirection`, `DebtStatus`, campos de deuda en `Transaction`/DTOs, filtros (`debtMode`, `debtDirection`, `debtStatus`) y `DebtSummary` en minor units.
- [x] 2.2 Extender `repositories/contracts/transactions-repository.ts` con `findDebts(...)` y `getDebtSummary(...)`, incluyendo filtros de fecha/cuenta/direccion/estado.
- [x] 2.3 Implementar o ajustar util compartida de fronteras de reporte en `lib/reports/transaction-reporting-boundaries.ts` para declarar `EXCLUDE_DEBT` (operativo) y `ONLY_DEBT` (cartera de deuda).
- [x] 2.4 Agregar pruebas unitarias de dominio/reporting boundaries (nuevo archivo en `tests/components/` o `tests/node/`) para validar inclusion/exclusion por `debtMode` y no-regresion de transacciones legacy.

## Phase 3: Repository Implementations (Supabase + Local Parity)

- [x] 3.1 Actualizar `repositories/supabase/types.ts` y `repositories/supabase/mappers.ts` para mapear todos los campos de deuda dominio <-> DB sin alterar semantica cashflow por `type`.
- [x] 3.2 Implementar en `repositories/supabase/transactions-repository-impl.ts` soporte de deuda en create/update/find, `findDebts(...)` y `getDebtSummary(...)` (totales OWE/OWED_TO_ME, OPEN por defecto).
- [x] 3.3 Actualizar `repositories/local/db.ts` (versionado Dexie + indices deuda) y `repositories/local/transactions-repository-impl.ts` para replicar exactamente filtros/agregaciones de Supabase.
- [x] 3.4 Agregar pruebas de integracion de paridad repo (Supabase/local) para `findDebts/getDebtSummary`, incluyendo `OPEN` vs `SETTLED` y dataset mixto deuda/no deuda.

## Phase 4: Transaction Capture UI (Web + Desktop + Mobile)

- [x] 4.1 Extender `hooks/use-transaction-form.ts` con estado/validaciones de deuda: requerir `debtDirection` cuando `isDebt=true`, `SETTLED` requiere `settledAt`, y mantener conversion a minor units.
- [x] 4.2 Actualizar `components/forms/transaction-form.tsx` para mostrar toggle `Es deuda` solo en `INCOME`/`EXPENSE` y controles de direccion/estado/contraparte cuando aplique.
- [x] 4.3 Mantener paridad de captura en `components/transactions/desktop-add-transaction.tsx` y `components/transactions/mobile-add-transaction.tsx` reutilizando la misma semantica/validaciones.
- [x] 4.4 Actualizar `app/transactions/transactions-page-client.tsx` para badge/filtros de deuda (ALL/ONLY_DEBT/EXCLUDE_DEBT) sin romper listado historico.
- [x] 4.5 Agregar pruebas de UI/formulario para escenarios de spec: deuda de entrada, deuda de salida y error de validacion por deuda sin direccion.

## Phase 5: Debts Section + Navigation + Reports

- [x] 5.1 Crear `app/debts/page.tsx` con guard de autenticacion y wiring al repositorio de transacciones para resumen/listado de deuda.
- [x] 5.2 Crear `app/debts/debts-page-client.tsx` con tarjetas `Cuanto debo` (`OWE` OPEN), `Cuanto me deben` (`OWED_TO_ME` OPEN), neto y lista filtrable por direccion/estado/fecha.
- [x] 5.3 Agregar acceso a `/debts` en `components/layout/sidebar.tsx` y `components/layout/mobile-nav.tsx` manteniendo consistencia de navegacion existente.
- [x] 5.4 Aplicar fronteras de reporte en `components/reports/mobile-reports.tsx` y `components/reports/desktop-reports.tsx`: KPI operativo con `EXCLUDE_DEBT` por defecto y vista deuda con `ONLY_DEBT`.
- [x] 5.5 Ajustar tests de reportes en `tests/components/reports-category-calculations.test.ts` para demostrar ausencia de doble conteo y paridad mobile/desktop.

## Phase 6: E2E + Verification Gate

- [x] 6.1 Extender `tests/e2e/04-transactions-detailed.spec.ts` para crear deuda de entrada/salida, validar badges/listado y persistencia de direccion/estado.
- [x] 6.2 Extender `tests/e2e/21-reports-period-selector.spec.ts` para validar fronteras de reporte por periodo (operativo excluye deuda, deudas muestra cartera).
- [x] 6.3 Agregar flujo E2E de navegacion a `/debts` con verificacion de totales cero y dataset mixto (`OPEN`/`SETTLED`) en el mismo spec o en uno nuevo bajo `tests/e2e/`.
- [x] 6.4 Ejecutar gate final de verificacion: corrida de suites node/components/e2e relevantes + checklist de acceptance criteria en `proposal.md` y escenarios de `specs/transactions/spec.md`; registrar resultado en PR/nota de cambio antes de cerrar implementacion.

Notas de verificacion (2026-03-04):

- Se ejecuto gate no-login con Jest para suites node/components relacionadas con deuda y fronteras de reporte.
- Suites E2E (`tests/e2e/04-transactions-detailed.spec.ts`, `tests/e2e/21-reports-period-selector.spec.ts`, `tests/e2e/22-debts-navigation.spec.ts`) se omiten intencionalmente por restriccion explicita del usuario de no correr pruebas que dependan de login/auth/sesion.
