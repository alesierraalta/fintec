# Design: Deudas en transacciones de entrada/salida

## Technical Approach

Se mantiene el modelo actual centrado en `transactions` y se agrega metadata de deuda en el mismo registro para no crear una entidad separada en esta fase. El `type` (`INCOME`/`EXPENSE`) sigue siendo la unica fuente de verdad para cashflow y balance de cuenta; la nueva metadata (`isDebt`, `debtDirection`, `debtStatus`, etc.) solo agrega clasificacion para UX y reportes de deuda.

La implementacion se divide en 3 capas:

1. **Dominio + persistencia**: ampliar tipos de dominio, tipos Supabase y schema local Dexie con campos de deuda.
2. **Repositorios + agregaciones**: extender contratos y adaptadores Supabase/local para consultas de lista y resumen de deudas sin duplicar logica.
3. **UI + reportes**: actualizar formularios (web y mobile), crear `/debts`, ajustar navegacion y establecer fronteras de reporte para evitar doble conteo.

## Architecture Decisions

### Decision: Deuda como metadata de transaccion

**Choice**: Agregar campos de deuda en `Transaction` y en `transactions` (no crear tabla `debts` ahora).
**Alternatives considered**: Crear agregado separado `debts`; inferir deuda por categorias/tags.
**Rationale**: Minimiza friccion con el repositorio actual, mantiene RLS y evita migracion arquitectonica grande. Cumple alcance del cambio y deja una ruta de evolucion futura.

### Decision: Semantica dual explicita (`type` vs `debtDirection`)

**Choice**: `type` controla cashflow/balance; `debtDirection` controla clasificacion de deuda (`OWE` o `OWED_TO_ME`).
**Alternatives considered**: Reusar `type` para inferir direccion; crear nuevos `TransactionType` para deuda.
**Rationale**: Se evita romper calculos existentes y se elimina ambiguedad funcional entre ingreso/gasto y relacion de deuda.

### Decision: Agregacion de deudas en repositorio (no en componentes)

**Choice**: Introducir metodos de repositorio para resumen/listado de deuda y reutilizarlos en `/debts`, transacciones y reportes.
**Alternatives considered**: Calcular todo en cada componente de UI.
**Rationale**: Evita drift de reglas, reduce riesgo de doble conteo y conserva paridad entre Supabase y local.

### Decision: Reportes financieros por defecto excluyen deuda operativa

**Choice**: Definir frontera explicita: metricas de cashflow operativo excluyen `isDebt=true` por defecto; vista de deudas usa su propio agregado.
**Alternatives considered**: Incluir deuda siempre en ingresos/gastos; mezclar indicadores en una sola tarjeta.
**Rationale**: Evita inflar ingresos/gastos clasicos y elimina doble lectura de un mismo movimiento (cashflow + cartera de deuda).

### Decision: Migracion DB backward-compatible con RPC actualizado

**Choice**: Columnas nuevas con defaults seguros, indice parcial para deuda, y actualizacion de RPC `create_transaction_and_adjust_balance` con parametros opcionales.
**Alternatives considered**: Cambiar a inserts directos sin RPC; migracion no compatible.
**Rationale**: Reduce riesgo de downtime y conserva la logica atomica actual de insercion + ajuste de balance.

## Data Flow

Flujo de alta de transaccion con deuda:

    TransactionForm/MobileAddTransaction
              |
              v
      use-transaction-form
              |
              v

repository.transactions.create(dto)
|
+-------+--------+
| |
v v
Supabase repo Local repo
(RPC + mapper) (Dexie)
| |
+-------+--------+
|
v
transactions persisted
(type + debt metadata)

Flujo de resumen/listado de deudas:

    app/debts/page.tsx (Server) -> debts-page-client.tsx (Client)
                         |
                         v
                repository.transactions
                  .getDebtSummary()
                  .findDebts(...)
                         |
              +----------+-----------+
              |                      |
              v                      v
        Supabase query         Dexie query
        + reducer parity       + reducer parity

## File Changes

| File                                                                    | Action | Description                                                                                                                                 |
| ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/domain.ts`                                                       | Modify | Agregar enums y campos de deuda en `Transaction`, `CreateTransactionDTO`, `UpdateTransactionDTO`, `TransactionFilters`, y tipos de resumen. |
| `repositories/contracts/transactions-repository.ts`                     | Modify | Agregar contratos para `findDebts(...)` y `getDebtSummary(...)` con criterios de filtro compartidos.                                        |
| `repositories/supabase/types.ts`                                        | Modify | Incluir campos `is_debt`, `debt_direction`, `debt_status`, `counterparty_name`, `settled_at` en `SupabaseTransaction` y `Database.Enums`.   |
| `repositories/supabase/mappers.ts`                                      | Modify | Mapear dominio <-> Supabase para metadata de deuda (sin tocar semantica de `type`).                                                         |
| `repositories/supabase/transactions-repository-impl.ts`                 | Modify | Persistir campos de deuda en create/update/find, agregar agregaciones de deuda, y filtros de reporte sin doble conteo.                      |
| `repositories/local/db.ts`                                              | Modify | Subir Dexie a `version(2)` con nuevos indices para deuda y migracion de registros existentes.                                               |
| `repositories/local/transactions-repository-impl.ts`                    | Modify | Paridad local para campos/filtros/agregaciones de deuda.                                                                                    |
| `hooks/use-transaction-form.ts`                                         | Modify | Estado y validaciones para `isDebt`, `debtDirection`, `counterpartyName`, `debtStatus`; conversion monetaria sigue en minor units.          |
| `components/forms/transaction-form.tsx`                                 | Modify | Controles de deuda para modal desktop/web, visibles solo en `INCOME`/`EXPENSE`.                                                             |
| `components/transactions/mobile-add-transaction.tsx`                    | Modify | Controles equivalentes en flujo mobile.                                                                                                     |
| `components/transactions/desktop-add-transaction.tsx`                   | Modify | Mantener paridad del formulario desktop actual.                                                                                             |
| `app/transactions/transactions-page-client.tsx`                         | Modify | Mostrar badge/indicadores de deuda y filtros para distinguir deuda vs flujo operativo.                                                      |
| `components/reports/mobile-reports.tsx`                                 | Modify | Aplicar fronteras de reporte: cashflow operativo sin deuda por defecto; seccion de deuda separada.                                          |
| `components/reports/desktop-reports.tsx`                                | Modify | Misma frontera y reglas que mobile reports.                                                                                                 |
| `components/layout/sidebar.tsx`                                         | Modify | Agregar entrada de navegacion a `/debts`.                                                                                                   |
| `components/layout/mobile-nav.tsx`                                      | Modify | Agregar acceso mobile a `/debts` (ajustando slots existentes).                                                                              |
| `app/debts/page.tsx`                                                    | Create | Pagina server-side con `requireAuthenticatedUser()` y render del cliente de deudas.                                                         |
| `app/debts/debts-page-client.tsx`                                       | Create | Vista client con tarjetas de totales (`debo`, `me deben`) y listado filtrable.                                                              |
| `supabase/migrations/<timestamp>_add_debt_metadata_to_transactions.sql` | Create | DDL: enum(s), columnas, default/backfill, indice parcial, update de RPC de create/delete si aplica.                                         |
| `tests/node/api/transactions-route.test.ts`                             | Modify | Casos para crear/leer transacciones con metadata de deuda en API.                                                                           |
| `tests/components/reports-category-calculations.test.ts`                | Modify | Asegurar exclusion/inclusion correcta de deuda segun modo de reporte.                                                                       |
| `tests/e2e/04-transactions-detailed.spec.ts`                            | Modify | Flujo E2E para crear deuda entrada/salida y validar visualizacion.                                                                          |
| `tests/e2e/21-reports-period-selector.spec.ts`                          | Modify | Verificar fronteras de reporte en periodos y que no haya doble conteo.                                                                      |

## Interfaces / Contracts

```ts
// types/domain.ts
export enum DebtDirection {
  OWE = 'OWE',
  OWED_TO_ME = 'OWED_TO_ME',
}

export enum DebtStatus {
  OPEN = 'OPEN',
  SETTLED = 'SETTLED',
}

export interface Transaction {
  // ...existing fields
  isDebt?: boolean;
  debtDirection?: DebtDirection;
  debtStatus?: DebtStatus;
  counterpartyName?: string;
  settledAt?: string;
}

export interface TransactionFilters {
  // ...existing filters
  debtMode?: 'ALL' | 'ONLY_DEBT' | 'EXCLUDE_DEBT';
  debtDirection?: DebtDirection;
  debtStatus?: DebtStatus;
}

export interface DebtSummary {
  totalOweBaseMinor: number;
  totalOwedToMeBaseMinor: number;
  netDebtBaseMinor: number; // owed_to_me - owe
  openCount: number;
}
```

```ts
// repositories/contracts/transactions-repository.ts
export interface TransactionsRepository {
  // ...existing methods
  findDebts(
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      debtDirection?: DebtDirection;
      debtStatus?: DebtStatus;
      accountIds?: string[];
    },
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Transaction>>;

  getDebtSummary(filters?: {
    dateFrom?: string;
    dateTo?: string;
    accountIds?: string[];
  }): Promise<DebtSummary>;
}
```

```sql
-- supabase migration (conceptual)
create type debt_direction as enum ('OWE', 'OWED_TO_ME');
create type debt_status as enum ('OPEN', 'SETTLED');

alter table public.transactions
  add column is_debt boolean not null default false,
  add column debt_direction debt_direction,
  add column debt_status debt_status,
  add column counterparty_name text,
  add column settled_at timestamptz;

update public.transactions
set is_debt = false
where is_debt is null;

create index idx_transactions_debt_open
  on public.transactions (account_id, debt_direction, date desc)
  where is_debt = true and coalesce(debt_status, 'OPEN') = 'OPEN';
```

## Query/Aggregation Strategy

Reglas canonicas:

1. **Saldo de cuenta**: se mantiene exactamente por `type` (`INCOME` suma, `EXPENSE` resta).
2. **Vista de deudas**: usa solo `isDebt=true` y, por defecto, `debtStatus=OPEN`.
3. **Reportes de cashflow**: por defecto usan `debtMode=EXCLUDE_DEBT`.
4. **Reportes de deuda**: usan `debtMode=ONLY_DEBT` y no se mezclan con tarjetas de ingreso/gasto operativo.

Implementacion sugerida:

- Reusar `findByFilters` con extensiones de `debtMode` y `debtDirection`.
- Implementar `getDebtSummary` en repositorio con pipeline compartido:
  - filtro de ownership (join `accounts.user_id` en Supabase / cuenta local en Dexie);
  - filtro `isDebt=true`;
  - filtro temporal opcional;
  - reduccion por direccion con `amount_base_minor` (minor units).
- Mantener la regla en una funcion utilitaria unica para reportes, por ejemplo `lib/reports/transaction-reporting-boundaries.ts`, consumida por `mobile-reports.tsx` y `desktop-reports.tsx`.

## UI Flow Updates

Formulario de transaccion (web + mobile + desktop add):

1. Usuario selecciona `type` (`INCOME`/`EXPENSE`/`TRANSFER_OUT`).
2. Si `type` es `TRANSFER_*`, ocultar controles de deuda.
3. Si `type` es `INCOME` o `EXPENSE`, mostrar toggle `Es deuda`.
4. Si `Es deuda = true`, mostrar:
   - selector de direccion (`Debo` -> `OWE`, `Me deben` -> `OWED_TO_ME`),
   - `counterpartyName` opcional,
   - estado inicial `OPEN` por defecto.
5. Validar consistencia:
   - no permitir `isDebt=true` sin `debtDirection`;
   - montos siempre en minor units (sin floats persistidos);
   - `debtStatus=SETTLED` requiere `settledAt`.

Seccion `/debts`:

- Server page (`app/debts/page.tsx`) valida sesion.
- Client page (`app/debts/debts-page-client.tsx`) muestra:
  - tarjeta `Cuanto debo` (suma `OWE`, OPEN),
  - tarjeta `Cuanto me deben` (suma `OWED_TO_ME`, OPEN),
  - neto de deuda,
  - listado de transacciones de deuda con filtros (direccion, estado, rango de fecha).

Navegacion:

- Agregar item `Deudas` en `components/layout/sidebar.tsx`.
- Agregar item equivalente en `components/layout/mobile-nav.tsx`.

## Reporting Boundaries (No Double Counting)

Matriz de inclusion:

| Contexto                          | `isDebt=false` | `isDebt=true`                      |
| --------------------------------- | -------------- | ---------------------------------- |
| Resumen transacciones (operativo) | Incluir        | Excluir por defecto                |
| Reportes ingreso/gasto clasicos   | Incluir        | Excluir por defecto                |
| Reporte/vista de deudas           | Excluir        | Incluir                            |
| Balance de cuentas (ledger)       | Incluir        | Incluir (porque depende de `type`) |

Regla operacional:

- Un mismo registro puede afectar **balance ledger** y **cartera de deuda**, pero no debe inflar simultaneamente el KPI de gasto/ingreso operativo.
- Para evitar drift, toda tarjeta/serie de reportes debe declarar explicitamente `debtMode` al consultar datos.

## Testing Strategy

| Layer       | What to Test                                                                                                                                   | Approach                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Unit        | Mapping dominio/Supabase de campos de deuda; validaciones de formulario de deuda; util de fronteras de reporte                                 | Jest (dom + node), tests dirigidos a `mappers.ts`, `use-transaction-form`, y utilitario de reglas de reporte |
| Integration | Paridad de `findDebts/getDebtSummary` entre `repositories/supabase` y `repositories/local`; API `GET/POST /api/transactions` con payload deuda | Jest node con mocks de Supabase client + pruebas sobre repo local Dexie                                      |
| E2E         | Alta de deuda de entrada/salida, navegacion a `/debts`, consistencia entre transacciones/deudas/reportes                                       | Playwright en desktop y mobile projects existentes                                                           |

Casos criticos adicionales:

- `isDebt=true` + `debtDirection` faltante => error de validacion.
- Transacciones no deuda deben continuar comportandose igual que antes.
- Reportes deben demostrar explicitamente que deuda no se suma en KPI operativo por defecto.
- Precision monetaria: asserts en minor units (sin comparaciones float para persistencia).

## Migration / Rollout

Plan de migracion:

1. Crear migracion SQL nueva en `supabase/migrations/` con enums, columnas, defaults y indice parcial.
2. Actualizar funciones RPC relacionadas (`create_transaction_and_adjust_balance`, y cualquier otra que inserte/actualice transacciones) para aceptar nuevos campos con valores por defecto backward-compatible.
3. Desplegar backend/repositorios primero.
4. Desplegar UI (forms, `/debts`, reportes, navegacion).
5. Ejecutar smoke tests de creacion/edicion/eliminacion de transacciones y validacion de reportes.

Rollback notes:

- **Rollback de aplicacion**: revertir cambios de UI y repositorios; mantener columnas nuevas sin uso para minimizar riesgo.
- **Rollback DB parcial**: si se requiere, retirar indice y dejar columnas (soft rollback) para no perder datos ya escritos.
- **Rollback DB completo (destructivo)**: solo con backup validado; eliminar columnas/enums implica perdida de metadata de deuda.

## Open Questions

- [ ] Confirmar si `debtStatus` y `settledAt` entran en este cambio o solo se deja `OPEN` fijo en esta fase.
- [ ] Definir si mobile nav agrega un sexto item o reemplaza uno existente para mantener densidad visual.
