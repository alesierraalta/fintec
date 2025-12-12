# Memoria (Episódica) para Asistente IA

Este módulo mantiene **memoria episódica**: sesiones y mensajes históricos para el asistente IA.

## Arquitectura

### Memoria episódica (`episodic-memory.ts`)

- Persistencia en base de datos (tablas `ai_conversation_sessions` y `ai_conversation_messages`).
- Búsqueda de conversaciones por contenido/fechas/sesión.
- Metadata e importancia por mensaje para priorizar resultados.

## Uso

### Crear/actualizar sesión

```typescript
import { createOrUpdateSession } from '@/lib/ai/memory/episodic-memory';

await createOrUpdateSession(sessionId, userId, 'Título de sesión');
```

### Almacenar mensajes

```typescript
import { storeMessage } from '@/lib/ai/memory/episodic-memory';

await storeMessage(userId, sessionId, { role: 'user', content: '¿Cuánto gasté este mes?' }, 0.7);
```

### Buscar conversaciones

```typescript
import { searchConversations } from '@/lib/ai/memory/episodic-memory';

const results = await searchConversations(userId, 'gastos este mes', { limit: 20 });
```

## Integración actual

- `contexts/ai-chat-context.tsx` (tipos/estado del sidebar)
- `components/ai/chat-sidebar.tsx` (lista de sesiones)
- `app/api/ai/chat/sessions/route.ts` y `app/api/ai/chat/messages/route.ts` (API)
