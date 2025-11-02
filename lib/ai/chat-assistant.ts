/**
 * Chat Assistant for AI Financial Advisor with Resilience & Caching
 * 
 * Maneja conversaciones interactivas con el asistente IA, incluyendo:
 * - Contexto de la billetera del usuario
 * - Retry automático con backoff exponencial
 * - Timeout configurable
 * - Fallback extractivo
 * - Caché de contexto y conversaciones
 */

import { openai, getChatModel, AI_CHAT_MODEL_FALLBACK, AI_TEMPERATURE, AI_LLM_TIMEOUT_MS, AI_MAX_RETRIES } from './config';
import { WalletContext } from './context-builder';
import { withRetry } from './retry-handler';
import { getFallbackResponse } from './fallback-responses';
import { getCachedContext, setCachedContext, getCachedConversation, setCachedConversation } from './cache-manager';
import { logger } from '@/lib/utils/logger';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Genera respuesta del asistente IA con contexto de billetera
 * Incluye retry automático, timeout y fallback extractivo
 */
export async function chatWithAssistant(
  userId: string,
  messages: ChatMessage[],
  context: WalletContext,
  sessionId?: string
): Promise<string> {
  try {
    // Intentar obtener contexto cacheado
    let cachedContext = await getCachedContext(userId);
    if (!cachedContext) {
      cachedContext = context;
      // Guardar en caché para futuros requests
      await setCachedContext(userId, context);
    }

    // Construir prompt del sistema con contexto financiero
    // Mejorado para guiar explícitamente al modelo a analizar los datos disponibles
    const accountsSummary = cachedContext.accounts.summary.length > 0
      ? `\nEl usuario tiene ${cachedContext.accounts.total} cuenta(s) activa(s):\n${cachedContext.accounts.summary.map(acc => `- ${acc.name} (${acc.type}): ${acc.balance.toFixed(2)} ${acc.currency}`).join('\n')}\n\nTotal por moneda:\n${Object.entries(cachedContext.accounts.totalBalance).map(([currency, total]) => `- ${currency}: ${total.toFixed(2)}`).join('\n')}`
      : '\nEl usuario no tiene cuentas registradas aún.';

    const systemPrompt = `Eres un asistente financiero personal experto e integrado en una aplicación de billetera.
Tu función es ayudar al usuario a entender y gestionar sus finanzas personales de manera clara y práctica.

CONTEXTO ACTUAL DE LA BILLETERA DEL USUARIO:
${accountsSummary}

TRANSACCIONES:
- Transacciones recientes (últimas 20): ${cachedContext.transactions.recent.length > 0 ? JSON.stringify(cachedContext.transactions.recent.slice(0, 5), null, 2) : 'No hay transacciones recientes'}
- Resumen del mes: Ingresos: ${cachedContext.transactions.summary.incomeThisMonth.toFixed(2)}, Gastos: ${cachedContext.transactions.summary.expensesThisMonth.toFixed(2)}, Neto: ${cachedContext.transactions.summary.netThisMonth.toFixed(2)}

PRESUPUESTOS:
${cachedContext.budgets.active.length > 0 ? cachedContext.budgets.active.map(b => `- ${b.category}: Presupuesto ${b.budget.toFixed(2)}, Gastado ${b.spent.toFixed(2)}, Restante ${b.remaining.toFixed(2)} (${b.percentage}%)`).join('\n') : 'No hay presupuestos activos'}

METAS:
${cachedContext.goals.active.length > 0 ? cachedContext.goals.active.map(g => `- ${g.name}: ${g.current.toFixed(2)} / ${g.target.toFixed(2)} (${g.progress}%)${g.targetDate ? ` - Fecha objetivo: ${g.targetDate}` : ''}`).join('\n') : 'No hay metas activas'}

DATOS COMPLETOS (JSON):
${JSON.stringify(cachedContext, null, 2)}

INSTRUCCIONES CRÍTICAS:
1. SIEMPRE analiza primero el campo "accounts.total" y "accounts.summary" antes de responder sobre cuentas
2. Si accounts.total > 0, el usuario TIENE cuentas registradas. NUNCA digas "no tienes cuentas" si accounts.total > 0
3. Para calcular el total de dinero:
   - Suma todos los balances en accounts.summary
   - Si hay múltiples monedas, menciona el total por cada moneda desde accounts.totalBalance
   - Para conversiones, menciona que son aproximadas basadas en tasas disponibles
4. Responde de forma natural, amigable y profesional en español
5. Usa el contexto de la billetera para dar respuestas precisas y personalizadas
6. Si el usuario pregunta sobre datos que no están en el contexto, indícale amablemente que no tienes esa información específica
7. Proporciona consejos prácticos y accionables
8. Mantén respuestas concisas pero informativas
9. Si el usuario hace preguntas sobre balances, transacciones, presupuestos o metas, usa los datos del contexto
10. NUNCA inventes datos que no estén en el contexto proporcionado
11. SIEMPRE verifica accounts.total antes de decir que no hay cuentas`;

    logger.debug(`[chatWithAssistant] System prompt constructed with ${cachedContext.accounts.total} accounts for user ${userId}`);

    // Construir mensajes para OpenAI (incluir system prompt + historial + mensaje actual)
    const openAIMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Agregar historial de conversación (excluir system messages del historial)
    const conversationHistory = messages.filter(m => m.role !== 'system');
    openAIMessages.push(...conversationHistory);

    // Determinar qué modelo usar (preferimos mini para todas las conversaciones en MVP)
    const modelToUse = getChatModel(true); // preferMini = true

    // Función interna para llamar a OpenAI con retry automático
    const callOpenAI = async (model: string): Promise<string> => {
      try {
        const response = await openai.chat.completions.create({
          model,
          messages: openAIMessages as any,
          temperature: AI_TEMPERATURE,
          max_tokens: 800, // Límite razonable para respuestas de chat
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        return content;
      } catch (error: any) {
        // Si el modelo no existe, intentar con fallback
        if (error?.message?.includes('model') || error?.code === 'model_not_found') {
          if (model !== AI_CHAT_MODEL_FALLBACK) {
            logger.warn(`Model ${model} not available, using fallback ${AI_CHAT_MODEL_FALLBACK}`);
            return callOpenAI(AI_CHAT_MODEL_FALLBACK);
          }
        }
        throw error;
      }
    };

    // Ejecutar con retry automático y timeout
    let response: string;
    try {
      response = await withRetry(
        () => callOpenAI(modelToUse),
        {
          maxRetries: AI_MAX_RETRIES,
          baseDelay: 1000,
          maxDelay: 8000,
          timeoutMs: AI_LLM_TIMEOUT_MS,
        }
      );

      logger.info(`AI Chat: Successful response generated for user ${userId}`);
    } catch (retryError: any) {
      logger.warn(`AI Chat: OpenAI failed after retries, using fallback extractive response for user ${userId}`);
      // Usar fallback extractivo si todo falla
      response = getFallbackResponse(messages[messages.length - 1]?.content || '', cachedContext);
    }

    // Guardar conversación en caché
    if (sessionId) {
      const updatedMessages: ChatMessage[] = [...messages, { role: 'assistant' as const, content: response }];
      await setCachedConversation(userId, sessionId, updatedMessages);
    }

    return response;
  } catch (error: any) {
    logger.error('Unexpected error in chatWithAssistant', error);
    // En caso de error absoluto, retornar un mensaje genérico
    return 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.';
  }
}
