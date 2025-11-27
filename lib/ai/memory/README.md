# Sistema de Memoria para Asistente IA

Este módulo implementa un sistema completo de memoria multi-capa para el asistente IA, permitiendo que el modelo recuerde conversaciones históricas, aprenda preferencias del usuario y personalice interacciones.

## Arquitectura

### Capas de Memoria

1. **Memoria a Corto Plazo** (`short-term-memory.ts`)
   - Almacenamiento en Redis con TTL de 30 minutos
   - Compresión automática de mensajes antiguos
   - Cache de búsquedas semánticas
   - Soporta hasta 50 mensajes por sesión

2. **Memoria Episódica** (`episodic-memory.ts`)
   - Almacenamiento persistente en PostgreSQL
   - Todas las conversaciones históricas
   - Búsqueda por contenido, fecha, sesión
   - Scoring de importancia para priorizar recuperación

3. **Memoria Semántica** (`semantic-memory.ts`)
   - Almacenamiento en Supabase con pgvector
   - Búsqueda vectorial por similitud semántica
   - Tipos: preference, fact, pattern, rule
   - Scoring de importancia y frecuencia de acceso

4. **Memoria Procedimental** (`procedural-memory.ts`)
   - Perfil estructurado del usuario
   - Estilo de comunicación aprendido
   - Preferencias financieras
   - Reglas de interacción personalizadas

### Componentes de Procesamiento

- **Memory Extractor** (`memory-extractor.ts`): Extrae automáticamente información importante de conversaciones
- **Memory Retriever** (`memory-retriever.ts`): Recupera contexto relevante para inyección en prompts
- **Memory Consolidator** (`memory-consolidator.ts`): Consolida memorias similares para evitar duplicados

## Uso

### Almacenar Conversación

```typescript
import { storeMessage, createOrUpdateSession } from '@/lib/ai/memory';

// Crear sesión
await createOrUpdateSession(sessionId, userId, 'Título de sesión');

// Almacenar mensaje
await storeMessage(userId, sessionId, {
  role: 'user',
  content: '¿Cuánto gasté este mes?'
}, 0.7); // importancia
```

### Recuperar Memoria

```typescript
import { retrieveMemoryContext } from '@/lib/ai/memory';

const context = await retrieveMemoryContext(userId, query, {
  maxSemanticMemories: 5,
  maxConversations: 10,
  lookbackMonths: 3,
});
```

### Extraer Memorias Automáticamente

```typescript
import { extractAndStoreMemories } from '@/lib/ai/memory';

// Se ejecuta automáticamente después de cada conversación
await extractAndStoreMemories(userId, messages);
```

## Base de Datos

Las tablas se crean mediante la migración:
- `scripts/migrations/002_add_ai_memory_schema.sql`

Ejecutar en Supabase SQL Editor o usando Supabase CLI.

## Optimizaciones

- **Caché inteligente**: Memorias frecuentemente accedidas se cachean en Redis
- **Lazy loading**: Las memorias se cargan solo cuando son necesarias
- **Batch processing**: La extracción de memoria se procesa en background
- **Compresión**: Conversaciones antiguas se comprimen automáticamente
- **Consolidación**: Memorias similares se consolidan periódicamente

## Integración

El sistema está integrado automáticamente en:
- `lib/ai/chat-assistant.ts`: Recupera memoria y almacena conversaciones
- `lib/ai/prompts/manager.ts`: Inyecta contexto de memoria en prompts
- `lib/ai/context-builder.ts`: Puede incluir memoria semántica en contexto

