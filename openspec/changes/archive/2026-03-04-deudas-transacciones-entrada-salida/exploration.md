## Exploration: deudas-transacciones-entrada-salida

### Current State

El sistema maneja transacciones con `type` (`INCOME`, `EXPENSE`, `TRANSFER_OUT`, `TRANSFER_IN`) y no existe un concepto de deuda como entidad o atributo estructurado. Tanto la captura como los reportes dependen de separar por `INCOME`/`EXPENSE` (por ejemplo en `hooks/use-transaction-form.ts`, `app/transactions/transactions-page-client.tsx`, `components/reports/mobile-reports.tsx` y `components/reports/desktop-reports.tsx`), por lo que hoy no se puede distinguir entre: (a) ingreso normal, (b) dinero que me prestan, (c) gasto normal, (d) dinero que presto a alguien. Tampoco hay una seccion dedicada a deudas en navegacion (`components/layout/sidebar.tsx`, `components/layout/mobile-nav.tsx`) ni totales de "debo" vs "me deben".

### Affected Areas

- `types/domain.ts` — ampliar modelo de transaccion para clasificar deuda y direccion (yo debo vs me deben).
- `repositories/supabase/types.ts` — reflejar nuevas columnas/campos para persistencia y tipado de `transactions`.
- `repositories/supabase/mappers.ts` — mapear campos deuda dominio <-> supabase.
- `repositories/supabase/transactions-repository-impl.ts` — crear/actualizar lecturas, filtros y agregaciones considerando deuda sin romper ajuste de balance.
- `repositories/local/transactions-repository-impl.ts` — mantener paridad con supabase para modo local y pruebas.
- `hooks/use-transaction-form.ts` — agregar inputs/estado de deuda y validaciones de captura.
- `components/forms/transaction-form.tsx` — UI modal de transaccion con seleccion de deuda y direccion.
- `components/transactions/mobile-add-transaction.tsx` — flujo movil de alta de transaccion con deuda entrada/salida.
- `app/transactions/transactions-page-client.tsx` — filtros/listado y resumen para visibilizar deuda en transacciones.
- `components/reports/mobile-reports.tsx` — evitar mezclar deuda con ingreso/gasto cuando se pidan totales financieros clasicos.
- `components/reports/desktop-reports.tsx` — idem reportes desktop; potencial bloque de "deudas".
- `components/layout/sidebar.tsx` — entrada de navegacion para nueva seccion de deudas.
- `components/layout/mobile-nav.tsx` — evaluar acceso movil a deuda (tab o acceso secundario).
- `app/debts/page.tsx` (nuevo) — pantalla dedicada para "Cuanto debo" y "Cuanto me deben".

### Approaches

1. **Extender `transactions` con metadata de deuda** — agregar campos de deuda en la misma transaccion (`is_debt`, `debt_direction`, `counterparty`, `debt_status`, opcional `settled_at`).
   - Pros: Reusa toda la infraestructura actual (captura, listados, RLS, filtros, cache, reportes), menor friccion UX para el usuario.
   - Cons: Requiere tocar multiples ramas de logica donde hoy solo existe INCOME/EXPENSE; riesgo de doble conteo si no se define semantica exacta.
   - Effort: Medium

2. **Crear entidad separada `debts` enlazada a transacciones** — deuda como agregado propio y transaccion solo como movimiento monetario asociado.
   - Pros: Modelo mas limpio para estados de deuda (abierta/parcial/pagada), historial y reconciliacion.
   - Cons: Mayor complejidad inicial (nueva tabla, repositorio, sincronizacion entre deuda y transaccion, UX mas larga).
   - Effort: High

3. **Resolver solo con categorias/tags (sin cambios de modelo)** — usar categorias tipo "Prestamos" y/o tags para inferir deuda.
   - Pros: Muy rapido de implementar.
   - Cons: Fragil, ambiguo, imposible garantizar totals "debo vs me deben" de forma confiable, alto riesgo de errores funcionales.
   - Effort: Low

### Recommendation

Adoptar **Approach 1**: extender `transactions` con metadata explicita de deuda y mantener la direccion economica en el `type` existente (`INCOME` para "me deben" y `EXPENSE` para "yo debo"). Esto minimiza impacto arquitectonico y permite entregar rapido la funcionalidad pedida (marcar deuda de entrada/salida y ver resumen dedicado), siempre que se definan reglas claras para reportes: (1) reportes financieros generales pueden incluir o excluir deudas segun filtro, y (2) la seccion Deudas debe calcular sus propios totales por estado y direccion.

### Risks

- Ambiguedad funcional si no se fija una taxonomia unica (deuda de entrada/salida vs type INCOME/EXPENSE) desde el inicio.
- Riesgo de inconsistencia entre reportes (transacciones, dashboard, reportes, nueva seccion deuda) por logica duplicada de agregacion.
- Migraciones SQL base no visibles en `supabase/migrations`, por lo que puede haber drift entre esquema real y tipos locales.
- Si se agrega estado de pago parcial, la deuda puede requerir eventos adicionales o reconciliacion con varias transacciones.

### Ready for Proposal

Yes — avanzar a propuesta con alcance acotado a: metadata de deuda en transacciones, formularios web/movil para deuda entrada/salida, nueva vista `/debts` con totales "debo" y "me deben", y criterios de inclusion/exclusion en reportes existentes.
