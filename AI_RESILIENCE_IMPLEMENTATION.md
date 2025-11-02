# AI Assistant Resilience & Security Implementation

## Overview

Implementación completa de resiliencia, escalabilidad y seguridad para el asistente IA en Fintec. El sistema incluye manejo robusto de errores, rate limiting, caching, timeouts, retries automáticos y fallback extractivo.

## Archivos Creados/Modificados

### Nuevos módulos

#### 1. `lib/redis/client.ts` - Redis Client Configuration
- **Propósito**: Gestiona conexión singleton a Redis con soporte para Upstash (serverless)
- **Características**:
  - Singleton pattern para reutilización de conexión
  - Soporte completo para Upstash Redis (TLS, serverless)
  - Fallback graceful si Redis no está disponible
  - Connection pooling optimizado
  - Event listeners (connect, error, close)
  - Graceful shutdown on SIGTERM/SIGINT
- **Uso**: `getRedisClient()`, `isRedisConnected()`, `closeRedisConnection()`

#### 2. `lib/ai/rate-limiter.ts` - Rate Limiting
- **Propósito**: Implementa rate limiting con sliding window algorithm
- **Características**:
  - Límite: 10 requests/minuto por usuario
  - Usa Redis para distributed rate limiting
  - Fallback a in-memory Map si Redis no disponible
  - Automatic cleanup de entradas expiradas
  - Retorna información de remaining requests y reset time
- **Uso**: `checkRateLimit(userId)`, `resetRateLimit(userId)`

#### 3. `lib/ai/retry-handler.ts` - Retry Handler
- **Propósito**: Manejo automático de retries con backoff exponencial
- **Características**:
  - Máximo 2 intentos para errores retryables (429, 5xx)
  - Backoff exponencial: delay = baseDelay * (2 ^ attempt) con jitter
  - Detección de errores retryables vs no-retryables
  - Timeout configurable por intento
  - Timeout total configurable
- **Uso**: `withRetry(fn, options)`

#### 4. `lib/ai/fallback-responses.ts` - Fallback Responses
- **Propósito**: Respuestas predefinidas cuando la IA falla
- **Características**:
  - Detección de intención por palabras clave (greeting, balance, expenses, etc)
  - Respuestas predefinidas que usan datos reales del contexto
  - Fallback para 9 categorías de intención
  - Logging de fallback activado
- **Uso**: `getFallbackResponse(userMessage, context)`, `detectMessageIntention(userMessage)`

#### 5. `lib/ai/cache-manager.ts` - Cache Manager
- **Propósito**: Caching de contexto y conversaciones
- **Características**:
  - Caché de contexto: TTL 5 minutos (Redis/in-memory)
  - Caché de conversaciones: TTL 30 minutos, máximo 10 mensajes
  - Fallback completo a in-memory si Redis no disponible
  - Invalidación manual de caché
  - Automatic cleanup de entradas expiradas
- **Uso**: `getCachedContext(userId)`, `setCachedContext(userId, context)`, `invalidateContextCache(userId)`

#### 6. `lib/ai/security.ts` - Security Utilities
- **Propósito**: Validación y sanitización para seguridad
- **Características**:
  - Sanitización de datos sensibles para logging (remueve balances, mensajes, etc)
  - Validación de tamaño de payload (máx 100KB)
  - Validación de estructura de mensajes
  - Validación completa de solicitud
  - Logging seguro sin exponer datos
- **Uso**: `validateChatRequest(body)`, `sanitizeForLogging(data)`, `validatePayloadSize(payload)`

### Archivos modificados

#### 7. `lib/ai/config.ts` - Configuration
- **Cambios**:
  - Agregadas constantes de timeout:
    - `AI_CLIENT_TIMEOUT_MS = 10000` (timeout total del cliente)
    - `AI_LLM_TIMEOUT_MS = 8000` (timeout para OpenAI)
  - Configuración de rate limit: `AI_RATE_LIMIT_PER_MINUTE = 10`
  - Configuración de retries: `AI_MAX_RETRIES = 2`
  - Límite de payload: `AI_MAX_PAYLOAD_SIZE_KB = 100`
  - Configuración de Redis: `REDIS_CONFIG`

#### 8. `lib/ai/chat-assistant.ts` - Chat Assistant
- **Cambios principales**:
  - Integración de retry handler con backoff exponencial
  - Timeout de 8 segundos para llamadas LLM
  - Fallback extractivo automático si todos los retries fallan
  - Caché de contexto (reutiliza contexto cacheado)
  - Caché de conversaciones
  - Mejor logging (sin datos sensibles)
  - Manejo de errores específicos por tipo

#### 9. `app/api/ai/chat/route.ts` - API Route
- **Cambios principales**:
  - **Validación CORS**: Verifica origen contra lista permitida
  - **Validación de payload**: Maxsize 100KB, estructura válida
  - **Rate limiting**: Chequea límite de 10 req/min antes de procesamiento
  - **Timeout global**: 10 segundos para toda la solicitud
  - **Sanitización de logs**: No expone datos sensibles en errores
  - **Headers de seguridad**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
  - **Rate limit info en headers**: X-RateLimit-Remaining, X-RateLimit-Reset
  - **Retry-After header**: En respuestas 429

#### 10. `package.json`
- **Cambios**: Agregada dependencia `ioredis: ^5.3.2`

## Configuración requerida

### Variables de entorno

```env
# Redis (Upstash para serverless)
REDIS_URL=

# OpenAI (ya existe)
OPENAI_API_KEY=sk-xxxxx

# CORS
NEXT_PUBLIC_APP_URL=https://your-app.com

# (Opcional) Node ENV
NODE_ENV=production
```

## Flujo de Ejecución Mejorado

```
POST /api/ai/chat
│
├─ 1. Validar CORS
├─ 2. Parsear JSON
├─ 3. Validar tamaño payload (< 100KB)
├─ 4. Validar estructura (userId, messages)
├─ 5. Verificar Rate Limit (10 req/min)
│  └─ Si excedido → 429 con Retry-After
├─ 6. Verificar suscripción premium
├─ 7. Timeout global (10s)
│  ├─ Obtener contexto (desde caché si existe)
│  └─ Llamar chatWithAssistant()
│     ├─ Intentar OpenAI con retry (máx 2)
│     │  ├─ Llamada 1: timeout 8s
│     │  ├─ Si falla retryable: wait + Llamada 2
│     │  └─ Si falla no-retryable: fallback extractivo
│     ├─ Si todos fallan: Fallback extractivo
│     └─ Guardar en caché (contexto + conversación)
├─ 8. Incrementar uso
└─ 9. Retornar respuesta con headers de seguridad
```

## Estrategia de Fallback

```
1. Redis no disponible → Usar in-memory (rate limit, caché)
2. OpenAI timeout → Retry con backoff (máx 8s por intento)
3. OpenAI 429/5xx → Retry con backoff exponencial (máx 2 intentos)
4. OpenAI error no-retryable → Fallback extractivo inmediato
5. Todos fallan → Fallback extractivo + respuesta genérica
```

## Respuestas Fallback Disponibles

- **greeting**: Saludo personalizado según si hay datos en billetera
- **balance**: Muestra saldos totales por currency
- **expenses**: Muestra gastos del mes con categorías top
- **income**: Muestra ingresos del mes
- **budget**: Muestra estado de presupuestos (excedidos/advertencia/ok)
- **goals**: Muestra progreso de metas de ahorro
- **spending_patterns**: Analiza categoría principal de gasto
- **help**: Muestra opciones disponibles del asistente
- **error**: Mensaje genérico de error
- **default**: Respuesta por defecto para intenciones desconocidas

## Seguridad implementada

✅ **API Key obligatoria**: Validada en openAI client  
✅ **Rate limiting**: 10 req/minuto por usuario  
✅ **Payload size limit**: Máximo 100KB  
✅ **CORS configurable**: Solo orígenes permitidos  
✅ **Message validation**: Estructura y contenido verificados  
✅ **Sanitización de logs**: No expone datos sensibles (balances, mensajes, transacciones, etc)  
✅ **Timeouts**: Cliente 10s, LLM 8s  
✅ **Security headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection  

## Performance & Escalabilidad

- **Caché de contexto**: Reduce queries a Supabase (~80% hit rate esperado)
- **Caché de conversaciones**: Reduce tokens enviados a OpenAI
- **Connection pooling Redis**: Eficiente en serverless (Vercel)
- **In-memory fallback**: Garantiza funcionamiento sin Redis
- **Timeout agresivo**: Libera recursos rápido en caso de fallos
- **Rate limiting distribuido**: Previene abuso y carga excesiva

## Testing recomendado

```bash
# 1. Rate limit
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","messages":[{"role":"user","content":"Hola"}]}' \
  # Llamar 11 veces, la 11a debe retornar 429

# 2. Payload size
# Enviar payload > 100KB, debe retornar 413

# 3. Invalid request
# Omitir userId, debe retornar 400

# 4. CORS
# Llamar desde origin no permitido, debe retornar 403

# 5. Timeout
# Simular timeout interno, debe retornar 504 después de 10s
```

## Logs esperados (desarrollo)

```
[INFO] Redis: Successfully connected
[INFO] Cache HIT: Context for user xxx
[DEBUG] Cache WRITE: Context for user xxx
[INFO] Fallback response triggered. Intention: balance, Score: 0.85
[INFO] AI Chat: Successful response generated for user xxx
[INFO] AI Chat: Request completed in 250ms for user xxx
[WARN] Rate limit exceeded for user: xxx
[WARN] Retry handler: Attempt 1 failed, retrying in 1500ms
```

## Monitoring & Observabilidad

El sistema registra en logs:
- Rate limits alcanzados
- Fallbacks activados
- Retries realizados
- Timeouts
- Errores de Redis
- Tiempo de respuesta
- Status de validaciones

Todos los logs sanitizados (sin exponer datos sensibles).

## Próximos pasos opcionales

1. **Métricas**: Integrar con observabilidad (Datadog, New Relic, etc)
2. **Circuit Breaker**: Para OpenAI si hay demasiados fallos
3. **Batching**: Agrupar requests a Redis/OpenAI en picos
4. **ML para fallback**: Mejorar respuestas fallback con histórico
5. **Admin dashboard**: Monitorear rate limits y fallos en tiempo real
