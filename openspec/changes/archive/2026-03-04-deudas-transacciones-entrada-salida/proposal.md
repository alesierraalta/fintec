# Proposal: Deudas en transacciones de entrada/salida

## Intent

Hoy el flujo de transacciones no distingue deuda de ingreso/gasto normal, por lo que el usuario no puede registrar de forma clara si "debo" o "me deben" ni consultar totales confiables de deuda. Este cambio introduce semantica explicita de deuda dentro de transacciones existentes para habilitar captura correcta en entrada/salida y una vista dedicada de deudas, sin romper el comportamiento actual de cashflow basado en `INCOME` y `EXPENSE`.

## Scope

### In Scope

- Permitir marcar una transaccion como deuda en ambos contextos de captura: entrada (`INCOME`) y salida (`EXPENSE`).
- Agregar semantica de direccion de deuda (`debo` vs `me deben`) desacoplada del tipo de cashflow para evitar ambiguedad funcional.
- Persistir metadata de deuda en `transactions` y mapearla en repositorios Supabase/local.
- Adaptar formulario web y flujo movil de alta para capturar deuda y su direccion.
- Crear seccion `/debts` con totales agregados de "cuanto debo" y "cuanto me deben".
- Ajustar reportes/listados para que las deudas no distorsionen los totales financieros clasicos cuando corresponda.

### Out of Scope

- Crear una entidad/tabla `debts` separada con lifecycle completo (parcialidades, intereses, cronograma).
- Implementar conciliacion avanzada de una deuda contra multiples transacciones de pago.
- Automatizaciones de recordatorios/notificaciones de cobro o pago.
- Rediseno completo del dashboard financiero fuera de los bloques tocados por este cambio.

## Functional Requirements Summary

1. El usuario puede registrar deuda tanto desde flujo de entrada como de salida.
2. Cada transaccion marcada como deuda tiene direccion explicita: `OWE` (debo) o `OWED_TO_ME` (me deben).
3. La logica de balance/cashflow mantiene semantica actual por `type` (`INCOME` suma, `EXPENSE` resta), independientemente de si es deuda.
4. La nueva seccion de deudas muestra al menos dos totales: monto total que debo y monto total que me deben.
5. Reportes existentes soportan criterio consistente para incluir/excluir deudas en indicadores de ingreso/gasto.
6. La implementacion respeta manejo monetario en unidades menores enteras (sin floats) y formato monetario existente.

## Approach

Se adopta un enfoque incremental sobre la tabla/modelo actual de `transactions`:

- Extender `types/domain.ts` para incluir metadata de deuda (flag y direccion) manteniendo `type` como fuente de verdad de cashflow.
- Reflejar nuevos campos en `repositories/supabase/types.ts` y `repositories/supabase/mappers.ts` para persistencia consistente dominio <-> DB.
- Ajustar `transactions-repository-impl` (Supabase/local) para lectura/escritura/filtros de deuda y agregaciones para seccion dedicada.
- Extender UI de captura (`components/forms/transaction-form.tsx`, `hooks/use-transaction-form.ts`, `components/transactions/mobile-add-transaction.tsx`) con controles de deuda y validaciones.
- Incorporar pagina `app/debts/page.tsx` y acceso de navegacion (`components/layout/sidebar.tsx`, `components/layout/mobile-nav.tsx`).
- Actualizar reportes (`components/reports/mobile-reports.tsx`, `components/reports/desktop-reports.tsx`) para evitar doble conteo o mezcla no deseada entre deuda y flujo clasico.

## Affected Areas

| Area                                                    | Impact   | Description                                         |
| ------------------------------------------------------- | -------- | --------------------------------------------------- |
| `types/domain.ts`                                       | Modified | Nuevos campos/enum para deuda y direccion.          |
| `repositories/supabase/types.ts`                        | Modified | Tipos de persistencia para metadata de deuda.       |
| `repositories/supabase/mappers.ts`                      | Modified | Mapeo dominio-db de campos de deuda.                |
| `repositories/supabase/transactions-repository-impl.ts` | Modified | Escritura, consulta y agregaciones con deuda.       |
| `repositories/local/transactions-repository-impl.ts`    | Modified | Paridad funcional en almacenamiento local.          |
| `hooks/use-transaction-form.ts`                         | Modified | Estado/validaciones para marcar deuda y direccion.  |
| `components/forms/transaction-form.tsx`                 | Modified | Controles UI para deuda en entrada/salida.          |
| `components/transactions/mobile-add-transaction.tsx`    | Modified | Captura movil compatible con deuda.                 |
| `app/transactions/transactions-page-client.tsx`         | Modified | Listado/filtros/etiquetas de deuda.                 |
| `components/reports/mobile-reports.tsx`                 | Modified | Reglas de inclusion/exclusion de deuda en reportes. |
| `components/reports/desktop-reports.tsx`                | Modified | Reglas equivalentes en desktop.                     |
| `components/layout/sidebar.tsx`                         | Modified | Entrada navegacion a Deudas.                        |
| `components/layout/mobile-nav.tsx`                      | Modified | Acceso movil a Deudas.                              |
| `app/debts/page.tsx`                                    | New      | Vista de totales "debo" y "me deben".               |

## Risks

| Risk                                        | Likelihood | Mitigation                                                                                                                                  |
| ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Confusion entre `type` y direccion de deuda | Medium     | Definir contrato explicito: `type` controla cashflow; direccion controla clasificacion de deuda; cubrir con pruebas de dominio/repositorio. |
| Doble conteo en reportes                    | Medium     | Centralizar criterios de agregacion/filtros y validar casos de deuda en reportes mobile/desktop.                                            |
| Drift de esquema/tipos al agregar campos    | Medium     | Introducir migracion controlada y actualizar tipos Supabase/mappers en el mismo cambio.                                                     |
| Regresion en captura movil/web              | Low-Medium | Reusar componentes existentes con validaciones compartidas y pruebas de formulario.                                                         |

## Rollback Plan

1. Revertir despliegue de UI (formulario, navegacion y pagina `/debts`) para ocultar funcionalidad.
2. Revertir cambios de repositorio/mappers/tipos a estado previo.
3. Si hay migracion de columnas de deuda, aplicar migracion inversa o deshabilitar su uso en codigo hasta completar saneamiento.
4. Validar post-rollback que alta de `INCOME`/`EXPENSE`, reportes y balance vuelven a comportarse como antes.

## Dependencies

- Migracion de base de datos para nuevos campos de deuda en `transactions` (si no existen).
- Tipado sincronizado de Supabase y repositorios locales.
- Utilidades monetarias existentes (`lib/money`) para mantener montos en unidades menores.

## Success Criteria

- [ ] Se puede crear/editar transaccion de entrada o salida marcandola como deuda y asignando direccion correcta.
- [ ] El balance y cashflow historico mantienen comportamiento actual para `INCOME`/`EXPENSE` sin regresiones.
- [ ] La pagina `/debts` muestra totales consistentes de "debo" y "me deben" para el usuario actual.
- [ ] Reportes mobile/desktop aplican criterio consistente de deuda (sin doble conteo no intencional).
- [ ] Persistencia Supabase y local mantienen paridad funcional para campos de deuda.
- [ ] Pruebas/validaciones relevantes cubren semantica de deuda y reglas de agregacion.
