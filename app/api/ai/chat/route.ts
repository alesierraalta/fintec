import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent, ChatMessage } from '@/lib/ai/chat/chat-handler';
import { buildWalletContext } from '@/lib/ai/context-builder';
import { canUseAI } from '@/lib/subscriptions/feature-gate';
import { incrementUsage } from '@/lib/paddle/subscriptions';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { validateChatRequest, validatePayloadSize, logSafeError, AI_SECURITY_CONFIG } from '@/lib/ai/security';
import { AI_CLIENT_TIMEOUT_MS } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';

/**
 * Convierte un AsyncGenerator a ReadableStream con formato Server-Sent Events (SSE)
 */
function createSSEStream(
  generator: AsyncGenerator<{ type: 'content' | 'done'; text?: string }, void, unknown>
): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          const data = JSON.stringify(chunk);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.close();
      } catch (error: any) {
        logger.error('[createSSEStream] Error in stream:', error);
        const errorData = JSON.stringify({ type: 'error', message: error.message || 'Error en el stream' });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });
}

/**
 * Detecta si el cliente solicita streaming
 */
function shouldStream(request: NextRequest): boolean {
  // Verificar query param
  const url = new URL(request.url);
  if (url.searchParams.get('stream') === 'true') {
    return true;
  }
  
  // Verificar header Accept
  const acceptHeader = request.headers.get('accept');
  if (acceptHeader && acceptHeader.includes('text/event-stream')) {
    return true;
  }
  
  return false;
}

/**
 * POST /api/ai/chat
 * 
 * Endpoint para conversaciones interactivas con el asistente IA.
 * 
 * Incluye:
 * - Rate limiting (10 requests/minuto)
 * - Validación de payload (máx 100KB)
 * - CORS configurable
 * - Timeout global (10s)
 * - Suscripción premium requerida
 * - Logging seguro (sin datos sensibles)
 * - Streaming de respuestas (opcional, con ?stream=true o Accept: text/event-stream)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. VALIDACIÓN CORS
    const origin = request.headers.get('origin');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const allowedOrigins = [appUrl, 'http://localhost:3000', 'http://localhost:5173'].filter(Boolean);
    
    if (origin && !allowedOrigins.includes(origin)) {
      logger.warn(`CORS rejected: ${origin}`);
      return NextResponse.json(
        { error: 'CORS policy violation' },
        { status: 403 }
      );
    }

    // 2. PARSEAR BODY CON VALIDACIÓN INICIAL
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // 3. VALIDACIÓN DE PAYLOAD SIZE
    const sizeValidation = validatePayloadSize(body);
    if (!sizeValidation.valid) {
      logger.warn(`Payload too large: ${sizeValidation.sizeKB.toFixed(2)}KB`);
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 413 }
      );
    }

    // 4. VALIDACIÓN COMPLETA DE SOLICITUD
    const validation = validateChatRequest(body);
    if (!validation.valid) {
      logger.warn(`Invalid chat request: ${validation.errors.join(', ')}`);
      return NextResponse.json(
        { error: 'Invalid request: ' + validation.errors[0] },
        { status: 400 }
      );
    }

    const { userId, messages, sessionId: providedSessionId, disableTools = false } = body;
    const validMessages = messages as ChatMessage[];
    
    // Asegurar que siempre haya un sessionId para mantener contexto de conversación
    const sessionId = providedSessionId || `session-${userId}-${Date.now()}`;
    
    // Detectar si se solicita streaming
    const useStreaming = shouldStream(request);

    // 5. RATE LIMITING
    const rateLimitCheck = await checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimitCheck.resetAt - Date.now()) / 1000);
      logger.info(`Rate limit hit for user ${userId}, retry after ${retryAfterSeconds}s`);
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: retryAfterSeconds,
          resetAt: rateLimitCheck.resetAt,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
            'X-RateLimit-Reset': String(rateLimitCheck.resetAt),
          },
        }
      );
    }

    // 6. VERIFICACIÓN DE SUSCRIPCIÓN PREMIUM
    const check = await canUseAI(userId);
    if (!check.allowed) {
      return NextResponse.json(
        { 
          error: check.reason,
          upgradeRequired: check.upgradeRequired 
        },
        { status: 403 }
      );
    }

    // 7. TIMEOUT GLOBAL DE 10 SEGUNDOS
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), AI_CLIENT_TIMEOUT_MS)
    );

    // 8. PROCESAMIENTO CON TIMEOUT
    // Nota: Streaming no está implementado aún en la nueva arquitectura agéntica
    // Por ahora, solo soportamos respuestas no-streaming
    if (useStreaming) {
      logger.warn('[POST /api/ai/chat] Streaming requested but not yet implemented in agentic architecture');
      // Retornar error o implementar streaming básico
      return NextResponse.json(
        { error: 'Streaming not yet implemented in agentic architecture' },
        { status: 501 }
      );
    }
    
    // Comportamiento normal sin streaming
    const processingPromise = (async () => {
      // Usar el nuevo chat handler agéntico
      const response = await chatWithAgent(userId, validMessages, sessionId, disableTools);

      // Incrementar usage tracking (solo después de éxito)
      await incrementUsage(userId, 'aiRequests');

      // Estructurar respuesta para compatibilidad con frontend
      const result: any = {
        message: response.message,
        ...(response.debugLogs ? { debugLogs: response.debugLogs } : {}),
      };

      // Si hay acción pendiente de confirmación, incluirla en el formato esperado
      if (response.requiresConfirmation && response.action) {
        result.action = response.action;
      }

      return result;
    })();

    const result = await Promise.race([processingPromise, timeoutPromise]);

    // 9. RESPUESTA EXITOSA CON HEADERS DE SEGURIDAD
    const response = NextResponse.json(result);
    
    // Headers de seguridad
    response.headers.set('X-RateLimit-Remaining', String(rateLimitCheck.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimitCheck.resetAt));
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    const duration = Date.now() - startTime;
    logger.info(`AI Chat: Request completed in ${duration}ms for user ${userId}`);

    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Logging seguro sin datos sensibles
    logSafeError(`AI Chat: Error after ${duration}ms`, error);

    // Determinar status code apropiado
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error?.message === 'Request timeout') {
      statusCode = 504;
      errorMessage = 'Request timeout - please try again';
    } else if (error?.message?.includes('Rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded';
    } else if (error?.message?.includes('upgrade')) {
      statusCode = 403;
      errorMessage = 'Premium subscription required';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
