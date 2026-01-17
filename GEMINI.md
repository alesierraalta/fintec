# GEMINI.MD - Directrices para el Agente de IA en FinTec

Este documento define las reglas críticas, convenciones técnicas y la infraestructura de IA para el proyecto FinTec, con un enfoque estricto en la eficiencia y optimización de recursos.

## Perfil del Proyecto
FinTec es una plataforma inteligente de gestión de finanzas personales.
- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS.
- **Persistencia**: Capa híbrida (Dexie para local, Supabase para nube).
- **IA Core**: Infraestructura "Priority 1" (Recuperación, Verificación, HITL).

## Prioridad Operacional: Eficiencia y Tokens
Es obligatorio minimizar el consumo de tokens y maximizar la precisión mediante el uso de los siguientes Model Context Protocols (MCP):

### 1. Serena MCP (Gestión de Flujo)
- **Propósito**: Optimizar el flujo de trabajo sistemático y monitorear el consumo de tokens.
- **Sequential Thinking**: Estructurar todo pensamiento de manera lógica y secuencial, eliminando redundancias.
- **Bank Memory**: Almacenar solo información esencial y recuperarla solo cuando sea estrictamente necesario.
- **DockFork**: Acceso preciso a documentación técnica sin procesamiento excesivo.

### 2. Integración con Supabase
- Especificar y justificar la herramienta de Supabase a utilizar (Auth, Storage, RPC, Queries).
- Optimizar consultas para minimizar el uso de recursos y latencia.

## Reglas de Oro Técnicas
1. **Manejo de Dinero**: SIEMPRE usar unidades menores (centavos) en números enteros. Consultar `lib/money.ts`.
2. **Patrón Repositorio**: No acceder directamente a la DB. Usar los contratos definidos en `repositories/contracts/`.
3. **Tipado Estricto**: No usar `any`. Toda interfaz de dominio debe estar en `types/domain.ts`.

## Infraestructura de IA (Priority 1)

Cualquier funcionalidad que involucre agentes de IA debe adherirse a los siguientes componentes en `lib/ai/`:

### 1. Recuperación y Resiliencia (`recovery/`)
- **Circuit Breaker**: Envolver llamadas externas con `CircuitBreaker.execute()`. IDs: `google_api`, `openai_api`, `anthropic_api`.
- **Retry Logic**: Usar `retryWithBackoff` con retroceso exponencial.

### 2. Verificación Multi-Capa (`verification/`)
- Respuestas críticas deben pasar por `self-check`, `llm-eval` y `cross-agent review`.

### 3. Human-in-the-Loop (`hitl/`)
- Acciones de alto riesgo (Transacciones > $10k, borrado de cuentas, metas) requieren aprobación manual vía `requestApproval()`.

### 4. Gestión de Estado
- Guardar checkpoints en la tabla `agent_checkpoints` usando `SupabaseCheckpointer` para garantizar ejecuciones durables.

## Estándares de Calidad
- **Validación**: `npm run type-check` y `npm run lint` antes de commits.
- **Tests**: Ubicados en `lib/ai/*.test.ts` y Playwright en `tests/`.

---
Este archivo es la fuente de verdad para la operación del agente de IA en este repositorio.

