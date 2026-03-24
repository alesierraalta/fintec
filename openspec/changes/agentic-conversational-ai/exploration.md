## Exploration: agentic-conversational-ai

### Current State

La app ya tiene una base inicial para IA conversacional: una UI protegida en `app/chat/page.tsx`, un endpoint `app/api/chat/route.ts` con streaming, herramientas limitadas (`getAccountBalance`, `getTransactions`, `createTransaction`, `createGoal`), circuit breaker, retry, checkpoints en Supabase y flujo HITL para acciones de escritura. Tambien existen tablas y repositorios de infraestructura AI/HITL en `supabase/migrations/202601112247_priority1_ai_infrastructure.sql` y `repositories/supabase/*`.

Sin embargo, la implementacion actual aun no soporta bien una experiencia verdaderamente agentica: el cliente no persiste ni reenvia `threadId`, por lo que los checkpoints no permiten reanudar conversaciones reales; el HITL bloquea el request con polling dentro del route handler y choca con `maxDuration = 60`; la verificacion usada en chat es solo `self_check`; el feature gate/usage de IA existe en la capa de suscripciones pero `app/api/chat/route.ts` no lo aplica y `incrementUsage()` sigue stubbed; y parte del producto todavia opera con repos locales Dexie, mientras la infraestructura AI solo funciona con `DB_PROVIDER=supabase`.

### Affected Areas

- `app/api/chat/route.ts` - punto principal de orquestacion; hoy mezcla chat, herramientas, HITL, checkpointing y fallback en un request sin asincronia durable.
- `components/ai/chat-interface.tsx` - UI actual de chat; no persiste `threadId`, ni modela estados de aprobacion, plan o reanudacion.
- `lib/ai/tools/resolvers.ts` - define el boundary actual de herramientas; hoy es pequeno y varios filtros declarados en schemas no se usan realmente.
- `lib/ai/hitl/approval.ts` - usa polling bloqueante para esperar aprobacion; no escala para acciones largas o multi-step.
- `components/ai/approval/approval-listener.tsx` - ya ofrece una base Realtime para HITL que conviene reutilizar en un flujo asincrono.
- `lib/ai/state/checkpointer.ts` - persiste checkpoints en Supabase, pero sin un identificador de conversacion estable en cliente su valor operativo es bajo.
- `lib/ai/verification/self-check.ts`, `lib/ai/verification/llm-eval.ts`, `lib/ai/verification/cross-agent-review.ts` - la infraestructura existe, pero el chat no ejecuta la cadena completa.
- `lib/subscriptions/feature-gate.ts` y `lib/supabase/subscriptions.ts` - ya modelan gating/usage de IA premium, pero falta enforcement real en el endpoint.
- `repositories/factory.ts` y `providers/repository-provider.tsx` - revelan una arquitectura dual Supabase/Dexie; esto limita la confiabilidad del asistente si el usuario tiene datos solo locales u offline.
- `supabase/migrations/202601112247_priority1_ai_infrastructure.sql` - base de datos ya preparada para approvals, verification y checkpoints; es el mejor punto de apoyo para una version agentica controlada.

### Approaches

1. **Copiloto conversacional acotado sobre el BFF actual** - mantener un solo agente financiero especializado, con herramientas de dominio limitadas y orquestacion server-side por casos de uso.
   - Pros: encaja con la arquitectura BFF/modular existente; reutiliza `app/api/chat/route.ts`, HITL, checkpoints y tablas Supabase; menor riesgo regulatorio y de producto; mejor fit para finanzas personales.
   - Cons: menos flexible que un agente general; requiere endurecer bastante la implementacion actual antes de exponer escrituras complejas.
   - Effort: Medium.

2. **Agente asincrono por trabajos/aprobaciones** - mover acciones agenticas a un runtime por estados (`plan -> verify -> request_approval -> execute -> confirm`) persistido en Supabase y retomable desde la UI.
   - Pros: resuelve durable execution, timeouts, HITL real, auditoria y reanudacion; habilita herramientas multi-step con control fino.
   - Cons: agrega complejidad de producto y plataforma; necesita nuevos estados/eventos y UX de tareas en progreso.
   - Effort: High.

3. **Agente autonomo amplio estilo general-purpose** - permitir planeacion abierta, muchas herramientas y mayor autonomia dentro del producto.
   - Pros: experiencia mas potente y llamativa.
   - Cons: mala relacion riesgo/valor para esta app; aumenta alucinaciones, acciones incorrectas, costo, necesidad de supervision y superficie de seguridad.
   - Effort: High.

### Recommendation

La mejor opcion para FinTec es una combinacion secuencial de **Approach 1 ahora** y una evolucion selectiva hacia **Approach 2** solo para acciones con impacto real. En producto, el mejor fit no es un agente general sino un **copiloto financiero conversacional con capacidades agenticas acotadas**: entender contexto, consultar datos, proponer planes, preparar acciones y ejecutar solo dentro de boundaries explicitos.

Recomendacion concreta:

- Fase 1: consolidar un asistente premium enfocado en lectura/analisis y acciones sugeridas, usando solo herramientas de dominio bien tipadas y con enforcement de suscripcion/usage.
- Fase 2: convertir las escrituras en un flujo asincrono con `threadId` estable, `planned_action` persistida, verificacion previa y aprobacion humana fuera del request principal.
- Fase 3: habilitar pequenas secuencias agenticas (por ejemplo: analizar gasto -> proponer ajuste de presupuesto -> pedir aprobacion -> ejecutar) sin abrir autonomia irrestricta.

Patrones clave a respetar por la guia `priority1-ai` y por el contexto financiero del producto:

- **Tool boundaries estrictos**: herramientas pequenas, idempotentes, tipadas y siempre ligadas al usuario autenticado; no exponer SQL libre ni acceso abierto a repositorios.
- **HITL fail-closed**: toda accion que cree/modifique datos financieros, metas o configuraciones debe pasar por aprobacion explicita del usuario; nunca esperar aprobacion bloqueando el route handler.
- **Verificacion multinivel**: usar `self_check` + `llm_eval` para respuestas importantes y `cross_agent_review` o equivalente para planes/acciones de mayor riesgo.
- **Durabilidad real**: persistir `conversation_threads`, checkpoints, planes y ejecuciones de herramientas; la UI debe poder reabrir y continuar una conversacion/tarea.
- **Supabase como source of truth del agente**: mientras exista dualidad Dexie/Supabase, el asistente debe declararse soportado solo sobre datos sincronizados al backend.
- **Rollout progresivo**: empezar con lectura e insights, despues acciones sugeridas, luego ejecucion aprobada; evitar lanzar autonomia completa desde el inicio.

### Risks

- Desalineacion de datos si el usuario opera con informacion local en Dexie que aun no esta sincronizada en Supabase.
- Falsa sensacion de durabilidad: hoy hay checkpoints, pero sin `threadId` persistente ni reanudacion de cliente no existe continuidad real.
- Timeouts y mala UX si se mantiene el polling bloqueante de aprobacion dentro de `app/api/chat/route.ts`.
- Riesgo de accion incorrecta por prompts demasiado amplios o tools con defaults agresivos (por ejemplo cuentas/categorias inferidas automaticamente).
- Falta de enforcement comercial/operativo: el endpoint de chat aun no aplica `canUseAI` ni incrementa consumo de `aiRequests`.
- Verificacion insuficiente si se depende solo del `self_check` heuristico actual para respuestas o planes de alto impacto.
- Riesgos de seguridad/abuso si el rate limit sigue fail-open cuando falta Upstash o si se agregan tools sin boundaries de dominio.

### Ready for Proposal

Yes - proceed with a proposal for a bounded premium financial copilot that hardens the current chat foundation, adds persistent conversation/job state in Supabase, moves write actions to async HITL-approved workflows, enforces subscription/usage gates, and rolls out capabilities in stages (read-only -> suggested actions -> approved execution).
