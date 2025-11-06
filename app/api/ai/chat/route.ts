import { NextRequest, NextResponse } from 'next/server';
import { chatWithAssistant } from '@/lib/ai/chat-assistant';
import { buildWalletContext } from '@/lib/ai/context-builder';
import { canUseAI } from '@/lib/subscriptions/feature-gate';
import { incrementUsage } from '@/lib/paddle/subscriptions';
import { ChatMessage } from '@/lib/ai/chat-assistant';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { validateChatRequest, validatePayloadSize, logSafeError, AI_SECURITY_CONFIG } from '@/lib/ai/security';
import { AI_CLIENT_TIMEOUT_MS } from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';

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

    const { userId, messages, sessionId } = body;
    const validMessages = messages as ChatMessage[];

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
    const processingPromise = (async () => {
      // Obtener contexto usando RAG (sistema único)
      const lastMessage = validMessages[validMessages.length - 1];
      const lastMessageContent = lastMessage?.content || '';
      
      // Construir contexto usando RAG basado en la query del usuario
      const context = await buildWalletContext(userId, lastMessageContent);

      // Generar respuesta del asistente (con retry, fallback, etc internos)
      const response = await chatWithAssistant(userId, validMessages, context, sessionId);

      // Incrementar usage tracking (solo después de éxito)
      await incrementUsage(userId, 'aiRequests');

      return {
        message: response.message,
        action: response.action,
        suggestions: response.suggestions,
        context: {
          hasAccounts: context.accounts.total > 0,
          hasTransactions: context.transactions.recent.length > 0,
          hasBudgets: context.budgets.active.length > 0,
          hasGoals: context.goals.active.length > 0,
        },
        ...(response.debugLogs ? { debugLogs: response.debugLogs } : {}),
      };
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
