# Arquitectura del Sistema de Gestión de Prompts

## Visión General

El sistema de gestión de prompts está diseñado para optimizar el uso de tokens, mejorar la mantenibilidad y permitir optimización continua mediante composición dinámica, caché y versionado.

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Chat Assistant API                        │
│                  (chat-assistant.ts)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Prompt Manager                            │
│                  (manager.ts)                                │
│  - Composición dinámica                                      │
│  - Resolución de dependencias                                │
│  - Optimización de tokens                                    │
└──────┬───────────────────────────────────────────────────────┘
       │
       ├──────────────────┬──────────────────┬───────────────┐
       ▼                   ▼                  ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Templates   │  │  Templates   │  │  Templates   │  │  Templates   │
│  (identity)  │  │(capabilities) │  │(instructions)│  │  (context)   │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
       │                   │                  │               │
       └───────────────────┴──────────────────┴───────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Prompt Cache                               │
│                    (cache.ts)                                 │
│  - Redis (obligatorio)                                        │
│  - TTL diferenciado por tipo                                  │
│  - Invalidación inteligente                                   │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Composición de Prompts

### 1. Solicitud de Prompt

```
Usuario → chat-assistant.ts
  ↓
PromptManager.generateChatSystemPrompt(context, suggestions, userId)
  ↓
PromptManager.composePrompt(config, context, suggestions, userId)
```

### 2. Verificación de Caché

```
composePrompt()
  ↓
¿Hay userId y context?
  ↓ SÍ
getCachedPrompt(userId, components, context)
  ↓
¿Existe en Redis?
  ↓ SÍ
Retornar prompt cacheado
  ↓ NO
Continuar con composición
```

### 3. Composición Dinámica

```
composePrompt()
  ↓
resolveComponents(components, userContext, walletContext)
  ↓
  Para cada componente:
    - Resolver dependencias recursivamente
    - Obtener template del registro
    - Ordenar por prioridad
  ↓
Construir contenido:
  - Unir componentes por prioridad
  - Eliminar duplicados (si está habilitado)
  - Estimar tokens
  ↓
setCachedPrompt(userId, composed, context)
  ↓
Retornar prompt compuesto
```

## Componentes Modulares

### 1. Identity Template
- **Propósito**: Define la identidad y rol del asistente
- **Prioridad**: 10 (siempre incluido)
- **Dependencias**: Ninguna
- **Ejemplo**: "Eres un asistente financiero personal experto..."

### 2. Capabilities Template
- **Propósito**: Lista capacidades del asistente
- **Prioridad**: 9
- **Dependencias**: identity
- **Ejemplo**: "CAPACIDADES: RESPONDER, CREAR, ANALIZAR..."

### 3. Instructions Template
- **Propósito**: Instrucciones críticas y reglas
- **Prioridad**: 8
- **Dependencias**: identity, capabilities
- **Personalización**: Según contexto del usuario (hasAccounts, hasTransactions, etc.)

### 4. Context Template
- **Propósito**: Contexto dinámico de la billetera
- **Prioridad**: 7
- **Dependencias**: identity
- **Contenido Dinámico**: Cuentas, transacciones, presupuestos, metas

### 5. Examples Template
- **Propósito**: Few-shot examples
- **Prioridad**: 5
- **Dependencias**: instructions
- **Opcional**: Solo si `includeExamples: true`

## Sistema de Caché

### Estrategia de Caché

1. **Prompts Estáticos** (identity, capabilities, instructions):
   - TTL: 1 hora (3600 segundos)
   - Raramente cambian

2. **Prompts con Contexto Dinámico** (incluye context):
   - TTL: 5 minutos (300 segundos)
   - El contexto cambia frecuentemente

### Clave de Caché

```
cache:prompt:{userId}:{components}:{contextHash}
```

- `userId`: ID del usuario
- `components`: Lista de componentes ordenados alfabéticamente
- `contextHash`: Hash simple del contexto (cuentas, transacciones, etc.)

### Invalidación

- Automática: Por TTL en Redis
- Manual: `invalidatePromptCache(userId)`

## Optimizaciones

### 1. Reducción de Tokens

- **Composición Dinámica**: Solo incluye componentes necesarios
- **Eliminación de Duplicados**: Remueve líneas duplicadas si está habilitado
- **Selección Inteligente**: Incluye solo instrucciones relevantes al contexto

### 2. Caché Eficiente

- **Reutilización**: Prompts compuestos se reutilizan mientras el contexto no cambie significativamente
- **TTL Diferenciado**: Prompts estáticos se cachean más tiempo

### 3. Mantenibilidad

- **Separación de Responsabilidades**: Cada template tiene una responsabilidad clara
- **Fácil Actualización**: Actualizar un template no afecta otros
- **Versionado**: Sistema preparado para versionado de prompts

## Integración con Otros Módulos

### Chat Assistant
- Usa `PromptManager.generateChatSystemPrompt()` para generar el system prompt
- El prompt se cachea automáticamente en Redis

### Otros Módulos (advisor, categorization, etc.)
- Cada módulo tiene su propio template en `templates/`
- Templates reutilizables y consistentes
- Fácil de mantener y actualizar

## Escalabilidad

### Futuras Mejoras

1. **Sistema de Versionado**: Tracking de versiones de prompts
2. **A/B Testing**: Probar diferentes variantes de prompts
3. **Few-Shot Selector Dinámico**: Seleccionar ejemplos relevantes según contexto
4. **Métricas Avanzadas**: Tracking de efectividad de prompts

## Dependencias

- **Redis**: Obligatorio para caché de prompts
- **WalletContext**: Contexto de la billetera del usuario
- **Logger**: Para debugging y métricas

