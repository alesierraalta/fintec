# ADR-001: Arquitectura modular por dominios + BFF como punto de acceso

- Estado: Aprobado
- Fecha: 2026-02-18
- Decisores: Equipo FinTec
- Tags: arquitectura, modularidad, bff, boundaries

## Contexto

El producto crecio sobre un monolito de Next.js y la logica de negocio quedo distribuida entre UI, utilidades y servicios. Esto dificulta:

- trabajo en paralelo sin conflictos,
- ownership claro por dominio,
- pruebas aisladas por capa,
- evolucion segura de contratos entre frontend y backend.

Ademas, se requiere un punto unico para control de autenticacion, autorizacion, trazabilidad y proteccion de endpoints.

## Decision

Adoptamos una arquitectura modular por dominios dentro del monolito, con capas internas (`domain`, `application`, `infrastructure`, `bff`) y con el BFF como unico punto de entrada para clientes.

Reglas de la decision:

1. Cada dominio expone API publica y oculta internals.
2. Dependencias siempre apuntan hacia capas internas (nunca al reves).
3. El frontend consume solo endpoints BFF.
4. Los adapters concretos (Supabase, Dexie, APIs externas) implementan puertos de aplicacion.
5. Todo cambio breaking en contratos requiere versionado y plan de migracion.

## Alternativas evaluadas

1. Mantener estructura actual con mejoras puntuales.
   - Rechazada: mantiene acoplamiento y deuda de boundaries.
2. Migrar a microservicios de inmediato.
   - Rechazada: costo operativo alto para etapa actual del producto.
3. Modular monolith + BFF (decision tomada).
   - Aceptada: balancea velocidad, control y escalabilidad evolutiva.

## Consecuencias

### Positivas

- Mayor autonomia por modulo y menor conflicto entre equipos.
- Mejor testabilidad de casos de uso y reglas de negocio.
- Seguridad y observabilidad centralizadas en BFF.
- Base clara para futura extraccion de servicios si se necesita.

### Costos y trade-offs

- Refactor inicial para mover logica fuera de UI.
- Mayor disciplina de equipo para respetar boundaries.
- Necesidad de controles automatizados (lint/arq tests) para evitar regresiones.

## Plan de adopcion

Fase 1:

- Definir modulos base (`accounts`, `transactions`, `reports`) y APIs publicas.
- Encapsular reglas de dinero/fechas en `shared-kernel`.
- Mover endpoints criticos al BFF con contratos estables.

Fase 2:

- Migrar servicios existentes a casos de uso por dominio.
- Reemplazar imports cruzados por puertos + adapters.
- Agregar pruebas de contrato de boundaries.

Fase 3:

- Activar guardrails automaticos de arquitectura.
- Ajustar ownership y metricas por modulo.

## Criterios de cumplimiento de esta ADR

- Nuevos features se desarrollan dentro de modulo de dominio.
- No se introduce acceso directo UI -> data source.
- PRs con cambios estructurales referencian esta ADR o una ADR derivada.
