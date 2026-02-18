# Arquitectura objetivo del equipo

Este documento define la arquitectura de referencia para trabajar en paralelo sin romper integridad de negocio.

## 1. Principios no negociables

- Dominio primero: reglas de negocio viven fuera de framework y de infraestructura.
- Dependencias hacia adentro: UI e infraestructura dependen de aplicacion y dominio, nunca al reves.
- Un punto de entrada al backend: el cliente solo consume BFF (no acceso directo a DB desde UI).
- Modulos por dominio: cada dominio tiene ownership, contratos y pruebas.
- Cambios arquitectonicos por ADR: toda decision estructural se registra antes del merge.

## 2. Mapa de modulos por dominio

Dominios propuestos para el monolito modular:

- `accounts`: cuentas, saldos, tipos de cuenta, conciliacion.
- `transactions`: ingresos, gastos, transferencias, adjuntos, reglas de validacion.
- `budgets`: presupuestos periodicos, limites, alertas.
- `goals`: metas de ahorro y progreso.
- `reports`: agregaciones, KPIs, comparativas por periodo.
- `rates`: tipos de cambio y conversion monetaria.
- `auth-access`: autenticacion, autorizacion, sesiones, permisos.
- `ai-assistant`: casos de uso de IA y politicas de seguridad.
- `shared-kernel`: value objects compartidos (dinero, fechas, ids) y errores comunes.

Regla: ningun modulo puede importar internals de otro modulo. Solo se consume API publica del modulo destino.

## 3. Capas por modulo

Cada modulo mantiene estas carpetas internas:

- `domain/`: entidades, value objects, invariantes y eventos de dominio.
- `application/`: casos de uso, puertos (interfaces), DTOs de entrada/salida.
- `infrastructure/`: adapters concretos (Supabase, Dexie, APIs externas, cache).
- `bff/`: handlers HTTP del modulo expuestos por el BFF.
- `tests/`: pruebas unitarias, integracion del modulo y contratos.

Regla de imports:

- `domain` no importa nada de `application`, `infrastructure` o `bff`.
- `application` puede importar `domain` y puertos, nunca adapters concretos.
- `infrastructure` implementa puertos definidos en `application`.
- `bff` solo orquesta casos de uso de `application`.

## 4. BFF como boundary de acceso

El BFF (Backend for Frontend) vive en rutas API de Next.js y es el unico punto de acceso del cliente.

Responsabilidades del BFF:

- Validar entrada/salida y mapear errores tecnicos a errores de negocio.
- Resolver autenticacion/autorizacion por request.
- Orquestar casos de uso y devolver DTOs estables para frontend.
- Aplicar rate-limit, auditoria y trazabilidad por endpoint critico.

No permitido:

- Consultas directas de UI a tablas de negocio.
- Logica de negocio en route handlers o componentes React.
- Saltar puertos de aplicacion para llamar adapters directos.

## 5. Boundaries tecnicos y ownership

- Cada modulo define `README` interno con: alcance, entidades clave, API publica, owners.
- Cada modulo define contratos de puertos en `application/ports`.
- Cualquier cambio breaking en contrato requiere:
  - nueva version de contrato,
  - plan de migracion,
  - ADR o mini-ADR segun impacto.

## 6. Estrategia de migracion incremental

Fase 1 (base):

- Crear estructura por modulo para `transactions`, `accounts`, `reports`.
- Encapsular `lib/money.ts` y utilidades de dominio en `shared-kernel`.
- Exponer primeros endpoints BFF orientados a casos de uso.

Fase 2 (consolidacion):

- Mover logica de servicios actuales a `application` y `domain`.
- Reemplazar imports cruzados por puertos + adapters.
- Agregar pruebas de contrato por modulo.

Fase 3 (endurecimiento):

- Activar verificacion automatica de boundaries (lint/arq tests).
- Endurecer politicas de PR (bloquear merge sin tests ni ADR cuando aplique).
- Medir lead time y defectos por modulo para ajustar ownership.

## 7. Criterios de aceptacion arquitectonica

Una tarea cumple arquitectura cuando:

- implementa caso de uso en `application` con reglas en `domain`,
- expone consumo via BFF (si hay interfaz cliente),
- evita dependencias prohibidas entre modulos/capas,
- incluye pruebas del caso de uso y de boundary,
- documenta decisiones relevantes en ADR cuando cambia estructura.
