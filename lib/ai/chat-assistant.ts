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
    const systemPrompt = `Eres un asistente financiero personal experto e integrado en una aplicación de billetera.
Tu función es ayudar al usuario a entender y gestionar sus finanzas personales de manera clara y práctica.

CONTEXTO ACTUAL DE LA BILLETERA DEL USUARIO:
${JSON.stringify(cachedContext, null, 2)}

INSTRUCCIONES:
- Responde de forma natural, amigable y profesional en español
- Usa el contexto de la billetera para dar respuestas precisas y personalizadas
- Si el usuario pregunta sobre datos que no están en el contexto, indícale amablemente que no tienes esa información
- Proporciona consejos prácticos y accionables
- Mantén respuestas concisas pero informativas
- Si el usuario hace preguntas sobre balances, transacciones, presupuestos o metas, usa los datos del contexto
- No inventes datos que no estén en el contexto proporcionado`;

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
