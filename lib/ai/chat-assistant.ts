/**
 * Chat Assistant for AI Financial Advisor with Resilience & Caching
 * 
 * Maneja conversaciones interactivas con el asistente IA, incluyendo:
 * - Contexto de la billetera del usuario
 * - Retry automático con backoff exponencial
 * - Timeout configurable
 * - Fallback extractivo
 * - Caché de contexto y conversaciones
 * - Function calling para acciones
 * - Procesamiento de confirmaciones
 */

import { openai, getChatModel, AI_CHAT_MODEL_NANO, AI_CHAT_MODEL_MINI, AI_TEMPERATURE, AI_LLM_TIMEOUT_MS, AI_MAX_RETRIES } from './config';
import type OpenAI from 'openai';
import { WalletContext } from './context-builder';
import { withRetry } from './retry-handler';
import { getFallbackResponse } from './fallback-responses';
import { getCachedContext, setCachedContext, getCachedConversation, setCachedConversation, getCachedPendingAction, setCachedPendingAction, invalidatePendingActionCache, getLastCachedQuery, setCachedQueryHistory, QueryHistoryEntry } from './cache-manager';
import { AI_ACTION_TOOLS } from './action-tools';
import { generateProactivePrompt } from './proactive-advisor';
import { detectIntention, ActionType, detectCorrection, extractCurrency, extractDateRange, extractCategory, extractLimit, extractQueryParameters } from './intention-detector';
import { executeAction } from './action-executor';
import { requiresConfirmation, validateActionParameters, generateMissingParametersMessage, isConfirmationResponse, isRejectionResponse } from './action-confirmer';
import { handleQueryBalance, handleQueryTransactions, handleQueryBudgets, handleQueryGoals, handleQueryAccounts, handleQueryRates, handleQueryCategories, handleQueryRecurring } from './query-handlers';
import { PromptManager } from './prompts/manager';
import { logger } from '@/lib/utils/logger';
import { retrieveMemoryContext, formatContextForPrompt } from './memory/memory-retriever';
import { storeMessage, storeMessages, createOrUpdateSession } from './memory/episodic-memory';
import { extractAndStoreMemories } from './memory/memory-extractor';
import { storeShortTermConversation } from './memory/short-term-memory';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  action?: {
    type: ActionType;
    parameters: Record<string, any>;
    requiresConfirmation: boolean;
    confirmationMessage?: string;
  };
  suggestions?: string[];
  debugLogs?: Array<{ level: 'debug' | 'info' | 'warn' | 'error'; message: string; timestamp: number }>;
}

/**
 * Extrae el contexto principal de una conversación
 * Identifica el tema principal y el tipo de última consulta
 */
function extractConversationContext(messages: ChatMessage[]): {
  mainTopic: string | null;
  lastQueryType: string | null;
} {
  if (messages.length < 2) {
    return { mainTopic: null, lastQueryType: null };
  }

  // Analizar últimos mensajes para identificar el tema principal
  const recentMessages = messages.slice(-6); // Últimos 6 mensajes
  const allText = recentMessages.map(m => m.content).join(' ').toLowerCase();

  // Detectar temas principales
  if (/gastos?|expenses?|transacciones?\s+de\s+gastos?/i.test(allText)) {
    return { mainTopic: 'gastos', lastQueryType: 'QUERY_TRANSACTIONS' };
  }
  if (/ingresos?|income|transacciones?\s+de\s+ingresos?/i.test(allText)) {
    return { mainTopic: 'ingresos', lastQueryType: 'QUERY_TRANSACTIONS' };
  }
  if (/transacciones?|transactions?/i.test(allText)) {
    return { mainTopic: 'transacciones', lastQueryType: 'QUERY_TRANSACTIONS' };
  }
  if (/cuentas?|accounts?/i.test(allText)) {
    return { mainTopic: 'cuentas', lastQueryType: 'QUERY_ACCOUNTS' };
  }
  if (/presupuestos?|budgets?/i.test(allText)) {
    return { mainTopic: 'presupuestos', lastQueryType: 'QUERY_BUDGETS' };
  }
  if (/metas?|goals?|objetivos?/i.test(allText)) {
    return { mainTopic: 'metas', lastQueryType: 'QUERY_GOALS' };
  }
  if (/tasa|tasas|cambio|exchange/i.test(allText)) {
    return { mainTopic: 'tasas de cambio', lastQueryType: 'QUERY_RATES' };
  }

  return { mainTopic: null, lastQueryType: null };
}

/**
 * Verifica si un mensaje tiene keywords explícitos de tema
 */
function hasExplicitTopicKeywords(message: string): boolean {
  const topicKeywords = [
    /gastos?|expenses?/i,
    /ingresos?|income/i,
    /transacciones?|transactions?/i,
    /cuentas?|accounts?/i,
    /presupuestos?|budgets?/i,
    /metas?|goals?|objetivos?/i,
    /tasa|tasas|cambio|exchange/i,
    /categorías?|categorias?|categories?/i,
  ];
  
  return topicKeywords.some(regex => regex.test(message));
}

/**
 * Convierte un stream de OpenAI a AsyncGenerator de chunks de texto
 * Extrae el contenido incremental de cada chunk del stream
 */
async function* streamOpenAIResponse(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
): AsyncGenerator<string, void, unknown> {
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

/**
 * Genera respuesta del asistente IA con contexto de billetera
 * Incluye retry automático, timeout, fallback extractivo, function calling y procesamiento de confirmaciones
 */
export async function chatWithAssistant(
  userId: string,
  messages: ChatMessage[],
  context: WalletContext,
  sessionId?: string
): Promise<ChatResponse> {
  // Recopilar logs para enviar al navegador (siempre, no solo en desarrollo)
  const isDev = process.env.NODE_ENV === 'development';
  const debugLogs: Array<{ level: 'debug' | 'info' | 'warn' | 'error'; message: string; timestamp: number }> = [];
  
  // Logger wrapper que recopila logs y también los muestra en servidor
  const collectLog = (level: 'debug' | 'info' | 'warn' | 'error', message: string) => {
    // Siempre recopilar logs para el navegador (no solo en desarrollo)
    debugLogs.push({ level, message, timestamp: Date.now() });
    
    // Solo mostrar en servidor si estamos en desarrollo
    if (isDev) {
      switch (level) {
        case 'debug':
          logger.debug(message);
          break;
        case 'info':
          logger.info(message);
          break;
        case 'warn':
          logger.warn(message);
          break;
        case 'error':
          logger.error(message);
          break;
      }
    }
  };
  
  // Helper para incluir debugLogs en respuestas
  const withDebugLogs = <T extends { message: string }>(response: T): T & { debugLogs?: typeof debugLogs } => {
    // Siempre incluir logs si hay alguno (no solo en desarrollo)
    if (debugLogs.length > 0) {
      return { ...response, debugLogs };
    }
    return response;
  };
  
  /**
   * Helper function to build API parameters with correct token limit parameter
   * gpt-5-nano: no acepta temperature personalizado (solo default 1), usa max_completion_tokens
   * gpt-5-mini: NO acepta temperature personalizado (solo default 1), usa max_completion_tokens
   */
  function getModelParams(model: string, defaultTokens: number, additionalParams: Record<string, any> = {}): Record<string, any> {
    const baseParams: Record<string, any> = {
      model,
      ...additionalParams,
    };
    
    // gpt-5-nano y gpt-5-mini: no aceptan temperature personalizado, solo default (1)
    if (model === AI_CHAT_MODEL_NANO || model === AI_CHAT_MODEL_MINI) {
      baseParams.max_completion_tokens = defaultTokens;
      // NO incluir temperature - dejar que use el default (1)
    } else {
      // Fallback para otros modelos (si existen)
      baseParams.temperature = AI_TEMPERATURE;
      baseParams.max_tokens = defaultTokens;
    }
    
    return baseParams;
  }
  
  try {
    // Intentar obtener contexto cacheado
    let cachedContext = await getCachedContext(userId);
    if (!cachedContext) {
      cachedContext = context;
      // Guardar en caché para futuros requests
      await setCachedContext(userId, context);
    }

    // Recuperar historial de conversación de Redis si existe sessionId
    // Guardar cachedConversation por separado para usarlo en el filtrado de mensajes nuevos
    let cachedConversation: ChatMessage[] = [];
    let fullConversationHistory: ChatMessage[] = [...messages];
    if (sessionId) {
      cachedConversation = await getCachedConversation(userId, sessionId) || [];
      if (cachedConversation.length > 0) {
        collectLog('info', `[chatWithAssistant] Retrieved ${cachedConversation.length} messages from Redis cache`);
        // Combinar historial de Redis con mensajes actuales
        // Evitar duplicados: si el último mensaje del historial es igual al primero de los mensajes actuales, no duplicar
        const lastCachedMessage = cachedConversation[cachedConversation.length - 1];
        const firstCurrentMessage = messages[0];
        
        if (lastCachedMessage?.content === firstCurrentMessage?.content && 
            lastCachedMessage?.role === firstCurrentMessage?.role) {
          // Ya está en el historial, usar historial completo + mensajes nuevos
          fullConversationHistory = [...cachedConversation, ...messages.slice(1)];
        } else {
          // Combinar historial completo
          fullConversationHistory = [...cachedConversation, ...messages];
        }
        collectLog('debug', `[chatWithAssistant] Combined conversation: ${cachedConversation.length} cached + ${messages.length} current = ${fullConversationHistory.length} total`);
      }
    }

    // Procesar confirmaciones/rechazos de acciones pendientes
    const lastMessage = fullConversationHistory[fullConversationHistory.length - 1];
    const lastMessageContent = lastMessage?.content || '';
    const pendingAction = await getCachedPendingAction(userId);
    
    collectLog('info', `[chatWithAssistant] Starting chat processing for user ${userId}, message: "${lastMessageContent.substring(0, 100)}${lastMessageContent.length > 100 ? '...' : ''}"`);
    collectLog('debug', `[chatWithAssistant] Processing message for user ${userId}, sessionId: ${sessionId || 'none'}`);

    if (pendingAction) {
      if (isConfirmationResponse(lastMessage.content)) {
        await invalidatePendingActionCache(userId);
        try {
          const result = await executeAction(userId, pendingAction.type as ActionType, pendingAction.parameters, cachedContext);
          return withDebugLogs({
            message: result.message,
            action: result.success ? {
              type: pendingAction.type as ActionType,
              parameters: pendingAction.parameters,
              requiresConfirmation: false,
            } : undefined,
          });
        } catch (error: any) {
          logger.error('[chatWithAssistant] Error executing pending action:', error);
          return withDebugLogs({
            message: `Error al ejecutar la acción pendiente: ${error.message}. Por favor intenta de nuevo.`,
          });
        }
      } else if (isRejectionResponse(lastMessage.content)) {
        await invalidatePendingActionCache(userId);
        return withDebugLogs({
          message: 'Acción cancelada. ¿Hay algo más en lo que pueda ayudarte?',
        });
      }
    }

    // Generar sugerencias proactivas
    const proactiveSuggestions = generateProactivePrompt(cachedContext);

    // Recuperar contexto de memoria (memoria semántica, episódica y procedimental)
    let memoryContext = '';
    try {
      const retrievedContext = await retrieveMemoryContext(userId, lastMessageContent, {
        maxSemanticMemories: 5,
        maxConversations: 10,
        lookbackMonths: 3,
        minSimilarity: 0.7,
      });
      memoryContext = formatContextForPrompt(retrievedContext);
      if (memoryContext) {
        collectLog('info', `[chatWithAssistant] Retrieved memory context: ${retrievedContext.semanticMemories.length} memories, ${retrievedContext.relevantConversations.length} conversations`);
      }
    } catch (error) {
      logger.warn('[chatWithAssistant] Failed to retrieve memory context:', error);
      // Continuar sin memoria si hay error
    }

    // Analizar contexto de conversación antes de generar el prompt
    const conversationContext = extractConversationContext(fullConversationHistory);
    
    // Enriquecer el system prompt con contexto de conversación si existe
    let contextNoteForPrompt = '';
    if (conversationContext.mainTopic) {
      contextNoteForPrompt = `\n\nCONTEXTO DE LA CONVERSACIÓN ACTUAL:\nEl usuario está preguntando sobre ${conversationContext.mainTopic}. Si una consulta es ambigua o no menciona explícitamente el tema, refiérete al contexto de la conversación anterior. Por ejemplo, si el usuario pregunta "cual fue el mayor?" después de hablar de gastos, se refiere al mayor gasto.`;
    }

    // Generar system prompt usando PromptManager (con caché y memoria)
    const systemPrompt = await PromptManager.generateChatSystemPrompt(
      cachedContext, 
      proactiveSuggestions, 
      userId,
      memoryContext
    ) + contextNoteForPrompt;

    logger.debug(`[chatWithAssistant] System prompt generated using PromptManager with ${cachedContext.accounts.total} accounts for user ${userId}`);

    // Detectar si es una corrección antes de procesar la intención normal
    const correction = detectCorrection(lastMessage?.content || '');
    
    // Si es una corrección, intentar re-ejecutar la consulta anterior con parámetros corregidos
    if (correction.isCorrection && correction.correctedParameter && correction.correctedValue !== undefined) {
      logger.info(`[chatWithAssistant] Detected correction: ${correction.correctedParameter} = ${correction.correctedValue} for user ${userId}`);
      
      // Obtener la última consulta desde Redis (obligatorio)
      const lastQuery = await getLastCachedQuery(userId);
      
      if (lastQuery && lastQuery.actionType && lastQuery.actionType.startsWith('QUERY_')) {
        // Re-ejecutar la consulta anterior con el parámetro corregido
        const correctedParams = { ...lastQuery.parameters };
        correctedParams[correction.correctedParameter] = correction.correctedValue;
        
        logger.info(`[chatWithAssistant] Re-executing query ${lastQuery.actionType} with corrected params:`, correctedParams);
        
        let queryResult;
        switch (lastQuery.actionType as ActionType) {
          case 'QUERY_ACCOUNTS':
            queryResult = handleQueryAccounts(cachedContext, correctedParams);
            break;
          case 'QUERY_BALANCE':
            queryResult = handleQueryBalance(cachedContext, correctedParams);
            break;
          case 'QUERY_TRANSACTIONS':
            queryResult = handleQueryTransactions(cachedContext, correctedParams);
            break;
          case 'QUERY_BUDGETS':
            queryResult = handleQueryBudgets(cachedContext, correctedParams);
            break;
          case 'QUERY_GOALS':
            queryResult = handleQueryGoals(cachedContext, correctedParams);
            break;
          case 'QUERY_RATES':
            queryResult = await handleQueryRates(cachedContext, correctedParams);
            break;
          case 'QUERY_CATEGORIES':
            queryResult = await handleQueryCategories(cachedContext, userId, correctedParams);
            break;
          case 'QUERY_RECURRING':
            queryResult = await handleQueryRecurring(cachedContext, userId, correctedParams);
            break;
          default:
            queryResult = { message: '', canHandle: false };
        }
        
        if (queryResult.canHandle && queryResult.message) {
          // Guardar la consulta corregida en el historial
          const historyEntry: QueryHistoryEntry = {
            actionType: lastQuery.actionType,
            parameters: correctedParams,
            timestamp: Date.now(),
            message: lastMessage?.content || '',
          };
          await setCachedQueryHistory(userId, historyEntry);
          
          logger.info(`[chatWithAssistant] Correction handled successfully for user ${userId}`);
          return withDebugLogs({ message: queryResult.message });
        }
      } else {
        logger.warn(`[chatWithAssistant] Correction detected but no previous query found in Redis for user ${userId}`);
      }
    }

    // Detectar si es una pregunta de seguimiento o consulta relacionada con contexto anterior
    // Incluye: "y", "también", "además", "y de", "y cual", "y cuál", "y qué", "y que", "en", etc.
    const isFollowUpQuestion = /^(por\s+que|por\s+qué|why|por\s+que\??|por\s+qué\??|why\??)$/i.test(lastMessageContent.trim());
    // Funciones de detección de follow-ups por tipo de filtro
    /**
     * Detecta follow-ups de fecha: "y las de este mes", "y las de la semana pasada", etc.
     */
    function isDateFollowUp(message: string): boolean {
      const trimmed = message.trim();
      return /^(?:y|también|además)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:transacciones?|gastos?|ingresos?)?\s*(?:de|del|de la)\s+(?:este|el)\s+(?:mes|semana|año)/i.test(trimmed) ||
        /^(?:y|también|además)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:transacciones?|gastos?|ingresos?)?\s*(?:de|del|de la)\s+(?:mes|semana|año)\s+(?:pasado|pasada|anterior|anteriores)/i.test(trimmed) ||
        /^(?:y|también|además)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:transacciones?|gastos?|ingresos?)?\s*(?:de|del|de la)\s+(?:últimos?|ultimos?|last)\s+\d+\s+(?:días?|days?|semanas?|weeks?|meses?|months?)/i.test(trimmed) ||
        /^(?:y|también|además)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:transacciones?|gastos?|ingresos?)?\s*(?:de|del|de la)\s+(?:hoy|today|ayer|yesterday|mañana|tomorrow)/i.test(trimmed);
    }

    /**
     * Detecta follow-ups de categoría: "y solo comida", "y las de transporte", etc.
     */
    function isCategoryFollowUp(message: string): boolean {
      const trimmed = message.trim();
      return /^(?:y|también|además)\s+(?:solo|only|just)\s+(?:comida|food|transporte|transport|compras|shopping|entretenimiento|entertainment|salud|health|hogar|home|educación|education|salario|salary)/i.test(trimmed) ||
        /^(?:y|también|además)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:transacciones?|gastos?|ingresos?)?\s*(?:de|del|de la)\s+(?:comida|food|transporte|transport|compras|shopping|entretenimiento|entertainment|salud|health|hogar|home|educación|education|salario|salary)/i.test(trimmed);
    }

    /**
     * Detecta follow-ups de tipo: "y solo gastos", "y solo ingresos", etc.
     */
    function isTypeFollowUp(message: string): boolean {
      const trimmed = message.trim();
      return /^(?:y|también|además)\s+(?:solo|only|just)\s+(?:gastos?|expenses?|ingresos?|income)/i.test(trimmed) ||
        /^(?:y|también|además)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:solo|only|just)?\s*(?:gastos?|expenses?|ingresos?|income)/i.test(trimmed);
    }

    /**
     * Detecta follow-ups de límite: "y solo las 5", "y dame 10", etc.
     */
    function isLimitFollowUp(message: string): boolean {
      const trimmed = message.trim();
      return /^(?:y|también|además)\s+(?:solo|only|just)\s+(?:las|los|la|el)?\s*\d+/i.test(trimmed) ||
        /^(?:y|también|además)\s+(?:dame|muestra|muéstrame|give|show)\s+\d+/i.test(trimmed) ||
        /^(?:y|también|además)\s+(?:las|los|la|el)?\s*(?:primeras?|primeros?|últimas?|ultimas?|first|last)\s+\d+/i.test(trimmed);
    }

    /**
     * Detecta follow-ups de rango de montos: "y las mayores a 100", etc.
     */
    function isAmountRangeFollowUp(message: string): boolean {
      const trimmed = message.trim();
      return /^(?:y|también|además)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:transacciones?|gastos?|ingresos?)?\s*(?:mayores?|menores?|más|menos)\s+(?:a|de|que)\s+\d+/i.test(trimmed) ||
        /^(?:y|también|además)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:transacciones?|gastos?|ingresos?)?\s*(?:entre)\s+\d+\s+y\s+\d+/i.test(trimmed);
    }

    // Detectar follow-ups contextuales incluyendo consultas de moneda y ordenamiento
    // Expandido para incluir más variaciones de lenguaje natural
    const isBasicFollowUp = /^(y|también|además|también|y\s+(de|cual|cuál|qué|que|cuáles|cuantos|cuántos|cuantas|cuántas|el|la|los|las|un|una|unos|unas|solo|only|just|las|los|la|el|mis|tus|sus|dame|muestra|muéstrame|give|show|listar|lista|listado)|de\s+(meses|mes|años|año|días|día)\s+anteriores?|en\s+(dolares|dólares|usd|ves|bolivares|bolívares)|y\s+las\s+de|y\s+los\s+de|y\s+las|y\s+los)/i.test(lastMessageContent.trim());
    const isCurrencyFollowUp = /^(?:y\s+)?(?:solo|only|just)\s+(?:usd|dolares?|dólares?|ves|bolivares?|bolívares?|eur|euros?|gbp|libras?|jpy|yenes?|cad|aud|mxn|brl|reales?)\??$/i.test(lastMessageContent.trim());
    const isSortingFollowUp = /^(?:ordena|ordenar|order|sort)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:transacciones?|gastos?|ingresos?)/i.test(lastMessageContent.trim());
    const isDateFollowUpResult = isDateFollowUp(lastMessageContent);
    const isCategoryFollowUpResult = isCategoryFollowUp(lastMessageContent);
    const isTypeFollowUpResult = isTypeFollowUp(lastMessageContent);
    const isLimitFollowUpResult = isLimitFollowUp(lastMessageContent);
    const isAmountRangeFollowUpResult = isAmountRangeFollowUp(lastMessageContent);
    const isContextualFollowUp = isBasicFollowUp || isCurrencyFollowUp || isSortingFollowUp || isDateFollowUpResult || isCategoryFollowUpResult || isTypeFollowUpResult || isLimitFollowUpResult || isAmountRangeFollowUpResult;
    
    // Si es una consulta de seguimiento contextual, el historial ya está en fullConversationHistory
    if (isContextualFollowUp) {
      collectLog('info', `[chatWithAssistant] Detected contextual follow-up: "${lastMessageContent}" - using full conversation history (${fullConversationHistory.length} messages)`);
    }
    
    if (isFollowUpQuestion) {
      collectLog('debug', `[chatWithAssistant] Detected follow-up question: "${lastMessageContent}"`);
      const lastQuery = await getLastCachedQuery(userId);
      if (lastQuery && lastQuery.actionType === 'QUERY_RATES') {
        // Si la última consulta fue sobre tasas, intentar obtener las tasas con más detalle
        collectLog('info', `[chatWithAssistant] Re-executing QUERY_RATES due to follow-up question`);
        const ratesLogFn = (level: 'debug' | 'info' | 'warn' | 'error', message: string) => {
          collectLog(level, message);
        };
        try {
          const ratesResult = await handleQueryRates(context, lastQuery.parameters, ratesLogFn);
          if (ratesResult.canHandle && ratesResult.message) {
            return withDebugLogs({
              message: ratesResult.message + '\n\n💡 Si aún no ves las tasas, puede ser que las APIs externas no estén disponibles en este momento. Las APIs retornan datos de fallback cuando las fuentes principales no responden.',
            });
          }
        } catch (error: any) {
          collectLog('error', `[chatWithAssistant] Error re-executing QUERY_RATES: ${error.message}`);
        }
      }
      // Si no es sobre tasas o no hay última consulta, continuar con detección normal
    }

    // conversationContext ya fue calculado arriba antes de generar el system prompt
    // Reutilizarlo aquí para enriquecer la query si es ambigua
    if (conversationContext.mainTopic) {
      collectLog('info', `[chatWithAssistant] Conversation context: mainTopic=${conversationContext.mainTopic}, lastQueryType=${conversationContext.lastQueryType || 'none'}`);
    }

    // Detectar si la consulta es sobre monedas de transacciones
    // Patrones largos: "cuales son en/usd", "que son dolares", etc.
    const isLongCurrencyQuery = /(?:cuales?|cuáles?|cuál|cuál|que|qué|which|what)\s+(?:son|están|estan)\s+(?:en|de)\s+(?:bolivares?|bolívares?|dolares?|dólares?|usd|ves|moneda|monedas?)/i.test(lastMessageContent) ||
      /(?:debes?|debe|deberías?|deberias)\s+(?:decirme|decir|mostrarme|mostrar|indicarme|indicar)\s+(?:cuales?|cuáles?|cuál|que|qué)\s+(?:son|están|estan)\s+(?:en|de)\s+(?:bolivares?|bolívares?|dolares?|dólares?|usd|ves)/i.test(lastMessageContent);
    
    // Patrones cortos para follow-ups: "y solo usd?", "solo usd", "y usd", "solo dolares", "y dolares", etc.
    const isShortCurrencyFollowUp = /^(?:y\s+)?(?:solo|only|just)\s+(?:usd|dolares?|dólares?|ves|bolivares?|bolívares?|eur|euros?|gbp|libras?|jpy|yenes?|cad|aud|mxn|brl|reales?)\??$/i.test(lastMessageContent.trim()) ||
      /^y\s+(?:usd|dolares?|dólares?|ves|bolivares?|bolívares?|eur|euros?|gbp|libras?|jpy|yenes?|cad|aud|mxn|brl|reales?)\??$/i.test(lastMessageContent.trim());
    
    const isCurrencyQuery = isLongCurrencyQuery || isShortCurrencyFollowUp;
    
    // Si es una consulta sobre monedas y hay contexto de transacciones, ejecutar QUERY_TRANSACTIONS con la última consulta
    if (isCurrencyQuery && conversationContext.lastQueryType === 'QUERY_TRANSACTIONS') {
      collectLog('info', `[chatWithAssistant] Detected currency query after transactions: "${lastMessageContent}" - re-executing QUERY_TRANSACTIONS with currency info`);
      const lastQuery = await getLastCachedQuery(userId);
      if (lastQuery && lastQuery.actionType === 'QUERY_TRANSACTIONS') {
        // Extraer moneda del mensaje actual
        const currency = extractCurrency(lastMessageContent);
        const paramsWithCurrency = currency 
          ? { ...lastQuery.parameters, currency }
          : lastQuery.parameters;
        
        collectLog('debug', `[chatWithAssistant] Currency query params: ${JSON.stringify(paramsWithCurrency)}`);
        const transactionsResult = handleQueryTransactions(cachedContext, paramsWithCurrency);
        if (transactionsResult.canHandle && transactionsResult.message) {
          return withDebugLogs({ message: transactionsResult.message });
        }
      }
    }
    
    if (isCurrencyQuery) {
      collectLog('info', `[chatWithAssistant] Detected currency query: "${lastMessageContent}"`);
    }

    // Re-ejecutar query con filtros de fecha si se detecta follow-up de fecha
    if (isDateFollowUpResult && conversationContext.lastQueryType === 'QUERY_TRANSACTIONS') {
      collectLog('info', `[chatWithAssistant] Detected date follow-up after transactions: "${lastMessageContent}" - re-executing QUERY_TRANSACTIONS with date info`);
      const lastQuery = await getLastCachedQuery(userId);
      if (lastQuery && lastQuery.actionType === 'QUERY_TRANSACTIONS') {
        const dateRange = extractDateRange(lastMessageContent);
        const paramsWithDate = dateRange
          ? { ...lastQuery.parameters, dateFrom: dateRange.from, dateTo: dateRange.to }
          : lastQuery.parameters;
        
        collectLog('debug', `[chatWithAssistant] Date follow-up params: ${JSON.stringify(paramsWithDate)}`);
        const transactionsResult = handleQueryTransactions(cachedContext, paramsWithDate);
        if (transactionsResult.canHandle && transactionsResult.message) {
          return withDebugLogs({ message: transactionsResult.message });
        }
      }
    }

    // Re-ejecutar query con filtros de categoría si se detecta follow-up de categoría
    if (isCategoryFollowUpResult && conversationContext.lastQueryType === 'QUERY_TRANSACTIONS') {
      collectLog('info', `[chatWithAssistant] Detected category follow-up after transactions: "${lastMessageContent}" - re-executing QUERY_TRANSACTIONS with category info`);
      const lastQuery = await getLastCachedQuery(userId);
      if (lastQuery && lastQuery.actionType === 'QUERY_TRANSACTIONS') {
        const category = extractCategory(lastMessageContent, ['expense', 'income']);
        const paramsWithCategory = category
          ? { ...lastQuery.parameters, category }
          : lastQuery.parameters;
        
        collectLog('debug', `[chatWithAssistant] Category follow-up params: ${JSON.stringify(paramsWithCategory)}`);
        const transactionsResult = handleQueryTransactions(cachedContext, paramsWithCategory);
        if (transactionsResult.canHandle && transactionsResult.message) {
          return withDebugLogs({ message: transactionsResult.message });
        }
      }
    }

    // Re-ejecutar query con filtros de tipo si se detecta follow-up de tipo
    if (isTypeFollowUpResult && conversationContext.lastQueryType === 'QUERY_TRANSACTIONS') {
      collectLog('info', `[chatWithAssistant] Detected type follow-up after transactions: "${lastMessageContent}" - re-executing QUERY_TRANSACTIONS with type info`);
      const lastQuery = await getLastCachedQuery(userId);
      if (lastQuery && lastQuery.actionType === 'QUERY_TRANSACTIONS') {
        let transactionType: 'INCOME' | 'EXPENSE' | undefined;
        if (/(?:gastos?|expenses?)/i.test(lastMessageContent)) {
          transactionType = 'EXPENSE';
        } else if (/(?:ingresos?|income)/i.test(lastMessageContent)) {
          transactionType = 'INCOME';
        }
        const paramsWithType = transactionType
          ? { ...lastQuery.parameters, transactionType }
          : lastQuery.parameters;
        
        collectLog('debug', `[chatWithAssistant] Type follow-up params: ${JSON.stringify(paramsWithType)}`);
        const transactionsResult = handleQueryTransactions(cachedContext, paramsWithType);
        if (transactionsResult.canHandle && transactionsResult.message) {
          return withDebugLogs({ message: transactionsResult.message });
        }
      }
    }

    // Re-ejecutar query con filtros de ordenamiento si se detecta follow-up de ordenamiento
    if (isSortingFollowUp && conversationContext.lastQueryType === 'QUERY_TRANSACTIONS') {
      collectLog('info', `[chatWithAssistant] Detected sorting follow-up after transactions: "${lastMessageContent}" - re-executing QUERY_TRANSACTIONS with sorting info`);
      const lastQuery = await getLastCachedQuery(userId);
      if (lastQuery && lastQuery.actionType === 'QUERY_TRANSACTIONS') {
        // Extraer parámetros de ordenamiento del mensaje
        const queryParams = extractQueryParameters(lastMessageContent);
        const paramsWithSorting = queryParams.sortBy
          ? { ...lastQuery.parameters, sortBy: queryParams.sortBy, sortOrder: queryParams.sortOrder || 'desc' }
          : lastQuery.parameters;
        
        collectLog('debug', `[chatWithAssistant] Sorting follow-up params: ${JSON.stringify(paramsWithSorting)}`);
        const transactionsResult = handleQueryTransactions(cachedContext, paramsWithSorting);
        if (transactionsResult.canHandle && transactionsResult.message) {
          return withDebugLogs({ message: transactionsResult.message });
        }
      }
    }

    // Re-ejecutar query con filtros de límite si se detecta follow-up de límite
    if (isLimitFollowUpResult && conversationContext.lastQueryType === 'QUERY_TRANSACTIONS') {
      collectLog('info', `[chatWithAssistant] Detected limit follow-up after transactions: "${lastMessageContent}" - re-executing QUERY_TRANSACTIONS with limit info`);
      const lastQuery = await getLastCachedQuery(userId);
      if (lastQuery && lastQuery.actionType === 'QUERY_TRANSACTIONS') {
        const limit = extractLimit(lastMessageContent);
        const paramsWithLimit = limit
          ? { ...lastQuery.parameters, limit }
          : lastQuery.parameters;
        
        collectLog('debug', `[chatWithAssistant] Limit follow-up params: ${JSON.stringify(paramsWithLimit)}`);
        const transactionsResult = handleQueryTransactions(cachedContext, paramsWithLimit);
        if (transactionsResult.canHandle && transactionsResult.message) {
          return withDebugLogs({ message: transactionsResult.message });
        }
      }
    }

    // Manejar combinaciones de filtros en un solo follow-up
    if ((isDateFollowUpResult || isCategoryFollowUpResult || isTypeFollowUpResult || isLimitFollowUpResult || isAmountRangeFollowUpResult) && 
        conversationContext.lastQueryType === 'QUERY_TRANSACTIONS') {
      // Contar cuántos filtros se detectaron
      const filtersDetected = [
        isDateFollowUpResult,
        isCategoryFollowUpResult,
        isTypeFollowUpResult,
        isLimitFollowUpResult,
        isAmountRangeFollowUpResult
      ].filter(Boolean).length;
      
      // Si hay múltiples filtros, extraer todos y combinar
      if (filtersDetected > 1) {
        collectLog('info', `[chatWithAssistant] Detected ${filtersDetected} filters in follow-up: "${lastMessageContent}" - re-executing QUERY_TRANSACTIONS with combined filters`);
        const lastQuery = await getLastCachedQuery(userId);
        if (lastQuery && lastQuery.actionType === 'QUERY_TRANSACTIONS') {
          const queryParams = extractQueryParameters(lastMessageContent);
          const paramsWithFilters = { ...lastQuery.parameters, ...queryParams };
          
          collectLog('debug', `[chatWithAssistant] Combined filters params: ${JSON.stringify(paramsWithFilters)}`);
          const transactionsResult = handleQueryTransactions(cachedContext, paramsWithFilters);
          if (transactionsResult.canHandle && transactionsResult.message) {
            return withDebugLogs({ message: transactionsResult.message });
          }
        }
      }
    }

    // Detectar intención del último mensaje, pero enriquecer con contexto si la query es ambigua
    let enrichedQuery = lastMessageContent;
    if (conversationContext.mainTopic && !hasExplicitTopicKeywords(lastMessageContent)) {
      // Si la query no tiene keywords explícitos pero hay contexto, enriquecer la query
      enrichedQuery = `${conversationContext.mainTopic}: ${lastMessageContent}`;
      collectLog('debug', `[chatWithAssistant] Enriched query with context: "${enrichedQuery}"`);
    }
    
    const intention = detectIntention(enrichedQuery);
    collectLog('info', `[chatWithAssistant] Detected intention: type=${intention.type}, actionType=${intention.actionType || 'UNKNOWN'}, confidence=${intention.confidence} for user ${userId}`);

    // Determinar si es una query simple o compleja
    // Queries simples: listas directas, consultas estructuradas con keywords claros, queries comparativas con parámetros claros
    // Queries complejas: preguntas abiertas, análisis, comparaciones sin contexto claro, explicaciones
    const hasDateFilter = /(?:de|del|de la|de este|del mes|de la semana|de los últimos|últimos|ultimos|hace|este mes|mes pasado|esta semana|semana pasada|hoy|ayer)/i.test(lastMessageContent);
    const hasCategoryFilter = /(?:de|del|de la)\s+(?:comida|food|transporte|transport|compras|shopping|entretenimiento|entertainment|salud|health|hogar|home|educación|education|salario|salary)/i.test(lastMessageContent);
    const hasTypeFilter = /(?:solo|only|just)\s+(?:gastos?|expenses?|ingresos?|income)/i.test(lastMessageContent);
    const hasLimitFilter = /(?:dame|muestra|muéstrame|give|show|solo|only|just)\s+\d+|(?:las|los|la|el)?\s*(?:primeras?|primeros?|últimas?|ultimas?|first|last)\s+\d+/i.test(lastMessageContent);
    
    const isSimpleQuery = (intention.type === 'QUERY' && 
      intention.actionType && 
      intention.actionType !== 'UNKNOWN' &&
      (intention.actionType.startsWith('QUERY_') && 
       ['QUERY_ACCOUNTS', 'QUERY_TRANSACTIONS', 'QUERY_BUDGETS', 'QUERY_GOALS', 
        'QUERY_CATEGORIES', 'QUERY_RECURRING', 'QUERY_RATES', 'QUERY_BALANCE'].includes(intention.actionType) &&
       // Keywords de lista/claridad O queries comparativas con parámetros claros O filtros específicos O alta confianza
       (/listado|listar|lista|muéstrame|mostrar|muestra|dame|show|display|give me|hazme|haz la|cuales?|cuáles?|qué|que|which|what|ordena|ordenar|order|sort/i.test(lastMessageContent) ||
        /(?:ordena|ordenar|order|sort)\s+(?:las|los|la|el|mis|tus|sus)?\s*(?:transacciones?|gastos?|ingresos?|cuentas?)/i.test(lastMessageContent) ||
        /(?:transacciones?|gastos?|ingresos?|cuentas?)\s+(?:de|del|de la)\s+(?:mayor|menor|más|menos)/i.test(lastMessageContent) ||
        /(?:más|mas|mayor|mayores|grande|grandes|menor|menores|top|mejor|mejores|peor|peores)\s+(?:transacciones?|gastos?|ingresos?|cuentas?)/i.test(lastMessageContent) ||
        hasDateFilter ||
        hasCategoryFilter ||
        hasTypeFilter ||
        hasLimitFilter ||
        intention.confidence >= 0.9)));
    
    // Handle simple QUERY types - use gpt-5-nano with context data
    if (isSimpleQuery) {
      const messageContent = lastMessage?.content || '';
      
      // Detectar keywords en el mensaje actual Y en el contexto de la conversación
      // Si hay contexto previo, usar ese contexto para inferir la intención
      const contextAwareMessage = conversationContext.mainTopic && !hasExplicitTopicKeywords(messageContent)
        ? `${conversationContext.mainTopic} ${messageContent}`
        : messageContent;
      
      // Siempre detectar keywords presentes en el mensaje (independientemente de hasMultipleQueries)
      // Esto asegura que ejecutemos todas las consultas detectadas, no solo intention.actionType
      const hasRatesQuery = /tasa|tasas|cambio|exchange|bcv|binance|dólar|dolar|bolívar|bolivar|bolivares|tipo de cambio|tasa\s+de\s+la\s+moneda|tasa\s+de\s+moneda/i.test(contextAwareMessage);
      const hasAccountsQuery = /cuentas?|accounts?/i.test(contextAwareMessage);
      const hasTransactionsQuery = /transacciones?|transactions?|gastos?|expenses?|ingresos?|income|pago|pagos|payments?|cobro|cobros/i.test(contextAwareMessage);
      const hasBudgetsQuery = /presupuestos?|budgets?/i.test(contextAwareMessage);
      const hasGoalsQuery = /metas?|goals?|objetivos?|targets?/i.test(contextAwareMessage);
      const hasCategoriesQuery = /categorías?|categorias?|categories?/i.test(contextAwareMessage);
      const hasRecurringQuery = /recurrentes?|recurring|automáticas?|automaticas?|periódicas?|periodicas?|programadas?/i.test(contextAwareMessage);
      const hasBalanceQuery = /saldo|balance|dinero|money|cuánto|cuanto|tengo/i.test(contextAwareMessage);
      
      // Contar cuántas consultas se detectaron
      const detectedQueries = [
        hasAccountsQuery,
        hasRatesQuery,
        hasTransactionsQuery,
        hasBudgetsQuery,
        hasGoalsQuery,
        hasCategoriesQuery,
        hasRecurringQuery,
        hasBalanceQuery,
      ].filter(Boolean).length;
      
      const isMultipleQueries = detectedQueries > 1;
      
      // Logging detallado para diagnóstico
      collectLog('debug', `[chatWithAssistant] Query detection - accounts: ${hasAccountsQuery}, rates: ${hasRatesQuery}, transactions: ${hasTransactionsQuery}, budgets: ${hasBudgetsQuery}, goals: ${hasGoalsQuery}, categories: ${hasCategoriesQuery}, recurring: ${hasRecurringQuery}, balance: ${hasBalanceQuery}, multiple: ${isMultipleQueries} for user ${userId}`);
      
      // Si hay múltiples consultas detectadas, ejecutar todas y luego usar gpt-5-nano para formatear
      if (isMultipleQueries) {
        collectLog('info', `[chatWithAssistant] Handling multiple simple queries - detected ${detectedQueries} queries, will use gpt-5-nano to format response for user ${userId}`);
        let combinedMessage = '';
        const queriesExecuted: string[] = [];
        
        // Ejecutar todas las consultas detectadas
        if (hasAccountsQuery) {
          const accountsResult = handleQueryAccounts(cachedContext, intention.parameters);
          if (accountsResult.canHandle && accountsResult.message) {
            combinedMessage += accountsResult.message + '\n\n';
            queriesExecuted.push('QUERY_ACCOUNTS');
          } else {
            logger.warn(`[chatWithAssistant] handleQueryAccounts returned canHandle=${accountsResult.canHandle} for user ${userId}`);
          }
        }
        
        if (hasRatesQuery) {
          // Crear wrapper de collectLog para handleQueryRates
          const ratesLogFn = (level: 'debug' | 'info' | 'warn' | 'error', msg: string) => {
            collectLog(level, `[handleQueryRates] ${msg}`);
          };
          
          try {
            const ratesResult = await handleQueryRates(cachedContext, intention.parameters, ratesLogFn);
            
            // SIEMPRE agregar el mensaje si existe, incluso si es un mensaje de error
            // Esto asegura que el usuario vea que se intentó obtener las tasas
            if (ratesResult.canHandle && ratesResult.message) {
              combinedMessage += ratesResult.message + '\n\n';
              queriesExecuted.push('QUERY_RATES');
              
              // Log diferente si es mensaje de error vs éxito
              const isErrorMessage = ratesResult.message.includes('No pude obtener');
              if (isErrorMessage) {
                collectLog('warn', `[chatWithAssistant] Rates query returned error message, but added to response for user ${userId}`);
              } else {
                collectLog('info', `[chatWithAssistant] Rates query successful, added to combined message for user ${userId}`);
              }
            } else {
              collectLog('error', `[chatWithAssistant] handleQueryRates failed: canHandle=${ratesResult.canHandle}, hasMessage=${!!ratesResult.message} for user ${userId}`);
              logger.error(`[chatWithAssistant] handleQueryRates failed: canHandle=${ratesResult.canHandle}, hasMessage=${!!ratesResult.message} for user ${userId}`);
            }
          } catch (error: any) {
            collectLog('error', `[chatWithAssistant] Exception in handleQueryRates: ${error.message || error} for user ${userId}`);
            logger.error(`[chatWithAssistant] Exception in handleQueryRates:`, error);
            // Agregar mensaje de error al combinedMessage para que el usuario lo vea
            combinedMessage += 'No pude obtener las tasas de cambio en este momento. Por favor intenta más tarde.\n\n';
          }
        }
        
        if (hasTransactionsQuery) {
          const transactionsResult = handleQueryTransactions(cachedContext, intention.parameters);
          if (transactionsResult.canHandle && transactionsResult.message) {
            combinedMessage += transactionsResult.message + '\n\n';
            queriesExecuted.push('QUERY_TRANSACTIONS');
          } else {
            logger.warn(`[chatWithAssistant] handleQueryTransactions returned canHandle=${transactionsResult.canHandle} for user ${userId}`);
          }
        }
        
        if (hasBudgetsQuery) {
          const budgetsResult = handleQueryBudgets(cachedContext, intention.parameters);
          if (budgetsResult.canHandle && budgetsResult.message) {
            combinedMessage += budgetsResult.message + '\n\n';
            queriesExecuted.push('QUERY_BUDGETS');
          } else {
            logger.warn(`[chatWithAssistant] handleQueryBudgets returned canHandle=${budgetsResult.canHandle} for user ${userId}`);
          }
        }
        
        if (hasGoalsQuery) {
          const goalsResult = handleQueryGoals(cachedContext, intention.parameters);
          if (goalsResult.canHandle && goalsResult.message) {
            combinedMessage += goalsResult.message + '\n\n';
            queriesExecuted.push('QUERY_GOALS');
          } else {
            logger.warn(`[chatWithAssistant] handleQueryGoals returned canHandle=${goalsResult.canHandle} for user ${userId}`);
          }
        }
        
        if (hasCategoriesQuery) {
          const categoriesResult = await handleQueryCategories(cachedContext, userId, intention.parameters);
          if (categoriesResult.canHandle && categoriesResult.message) {
            combinedMessage += categoriesResult.message + '\n\n';
            queriesExecuted.push('QUERY_CATEGORIES');
          } else {
            logger.warn(`[chatWithAssistant] handleQueryCategories returned canHandle=${categoriesResult.canHandle} for user ${userId}`);
          }
        }
        
        if (hasRecurringQuery) {
          const recurringResult = await handleQueryRecurring(cachedContext, userId, intention.parameters);
          if (recurringResult.canHandle && recurringResult.message) {
            combinedMessage += recurringResult.message + '\n\n';
            queriesExecuted.push('QUERY_RECURRING');
          } else {
            logger.warn(`[chatWithAssistant] handleQueryRecurring returned canHandle=${recurringResult.canHandle} for user ${userId}`);
          }
        }
        
        if (hasBalanceQuery) {
          const balanceResult = handleQueryBalance(cachedContext, intention.parameters);
          if (balanceResult.canHandle && balanceResult.message) {
            combinedMessage += balanceResult.message + '\n\n';
            queriesExecuted.push('QUERY_BALANCE');
          } else {
            logger.warn(`[chatWithAssistant] handleQueryBalance returned canHandle=${balanceResult.canHandle} for user ${userId}`);
          }
        }
        
        if (combinedMessage.trim()) {
          // Usar gpt-5-nano para formatear la respuesta combinada
          const systemPromptForSimple = `Eres un asistente financiero. El usuario ha hecho múltiples consultas simples y ya tienes todos los datos. 
Presenta la información de forma clara, concisa y amigable. Organiza los datos de manera que sea fácil de leer.
No agregues información que no esté en los datos proporcionados. Solo reformatea y presenta los datos de manera profesional.`;

          const openAIMessagesSimple: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
            {
              role: 'system',
              content: systemPromptForSimple,
            },
            {
              role: 'user',
              content: `Consulta: ${lastMessage?.content || ''}\n\nDatos obtenidos:\n${combinedMessage.trim()}\n\nPresenta esta información de forma clara y profesional, organizada por secciones.`,
            },
          ];

          const modelForSimple = getChatModel(false); // gpt-5-nano
          collectLog('info', `[chatWithAssistant] Using ${modelForSimple} for multiple simple queries formatting for user ${userId}`);
          
          try {
            const response = await openai.chat.completions.create({
              ...getModelParams(modelForSimple, 600, {
                messages: openAIMessagesSimple as any,
              }),
            } as any);
            
            if (response.usage) {
              collectLog('info', `[chatWithAssistant] ${modelForSimple} usage: prompt_tokens=${response.usage.prompt_tokens}, completion_tokens=${response.usage.completion_tokens}, total_tokens=${response.usage.total_tokens}`);
            }
            
            const formattedMessage = response.choices[0]?.message?.content || combinedMessage.trim();
            
            // Guardar todas las consultas ejecutadas en el historial
            for (const queryType of queriesExecuted) {
              const historyEntry: QueryHistoryEntry = {
                actionType: queryType,
                parameters: intention.parameters || {},
                timestamp: Date.now(),
                message: lastMessage?.content || '',
              };
              await setCachedQueryHistory(userId, historyEntry);
            }
            
            logger.info(`[chatWithAssistant] Multiple queries executed with ${modelForSimple}: ${queriesExecuted.join(', ')} for user ${userId}`);
            return withDebugLogs({ message: formattedMessage });
          } catch (error: any) {
            // Si gpt-5-nano falla, usar los datos directos
            collectLog('warn', `[chatWithAssistant] ${modelForSimple} failed, using direct data: ${error.message}`);
            for (const queryType of queriesExecuted) {
              const historyEntry: QueryHistoryEntry = {
                actionType: queryType,
                parameters: intention.parameters || {},
                timestamp: Date.now(),
                message: lastMessage?.content || '',
              };
              await setCachedQueryHistory(userId, historyEntry);
            }
            return withDebugLogs({ message: combinedMessage.trim() });
          }
        } else {
          logger.warn(`[chatWithAssistant] Multiple queries detected but no messages were generated for user ${userId}`);
        }
      }
      
      // Consulta única normal
      let queryResult;

      switch (intention.actionType) {
        case 'QUERY_ACCOUNTS':
          queryResult = handleQueryAccounts(cachedContext, intention.parameters);
          break;
        case 'QUERY_BALANCE':
          queryResult = handleQueryBalance(cachedContext, intention.parameters);
          break;
        case 'QUERY_TRANSACTIONS':
          collectLog('info', `[chatWithAssistant] Executing QUERY_TRANSACTIONS for user ${userId}, message: "${messageContent}"`);
          collectLog('debug', `[chatWithAssistant] Query parameters: ${JSON.stringify(intention.parameters || {})}`);
          queryResult = handleQueryTransactions(cachedContext, intention.parameters);
          collectLog('info', `[chatWithAssistant] handleQueryTransactions completed: canHandle=${queryResult.canHandle}, hasMessage=${!!queryResult.message}, messageLength=${queryResult.message?.length || 0} for user ${userId}`);
          if (!queryResult.canHandle || !queryResult.message) {
            collectLog('warn', `[chatWithAssistant] handleQueryTransactions failed: canHandle=${queryResult.canHandle}, hasMessage=${!!queryResult.message} for user ${userId}`);
          } else {
            collectLog('debug', `[chatWithAssistant] handleQueryTransactions success, message preview: ${queryResult.message.substring(0, 100)}...`);
          }
          break;
        case 'QUERY_BUDGETS':
          queryResult = handleQueryBudgets(cachedContext, intention.parameters);
          break;
        case 'QUERY_GOALS':
          queryResult = handleQueryGoals(cachedContext, intention.parameters);
          break;
        case 'QUERY_RATES':
          collectLog('info', `[chatWithAssistant] Executing QUERY_RATES for user ${userId}, message: "${messageContent}"`);
          collectLog('debug', `[chatWithAssistant] Query parameters: ${JSON.stringify(intention.parameters || {})}`);
          
          // Crear wrapper de collectLog para handleQueryRates
          const singleRatesLogFn = (level: 'debug' | 'info' | 'warn' | 'error', msg: string) => {
            collectLog(level, `[handleQueryRates] ${msg}`);
          };
          
          queryResult = await handleQueryRates(cachedContext, intention.parameters, singleRatesLogFn);
          collectLog('info', `[chatWithAssistant] handleQueryRates completed: canHandle=${queryResult.canHandle}, hasMessage=${!!queryResult.message}, messageLength=${queryResult.message?.length || 0} for user ${userId}`);
          if (!queryResult.canHandle || !queryResult.message) {
            collectLog('warn', `[chatWithAssistant] handleQueryRates failed: canHandle=${queryResult.canHandle}, hasMessage=${!!queryResult.message} for user ${userId}`);
          } else {
            collectLog('debug', `[chatWithAssistant] handleQueryRates success, message preview: ${queryResult.message.substring(0, 100)}...`);
          }
          break;
        case 'QUERY_CATEGORIES':
          queryResult = await handleQueryCategories(cachedContext, userId, intention.parameters);
          break;
        case 'QUERY_RECURRING':
          queryResult = await handleQueryRecurring(cachedContext, userId, intention.parameters);
          break;
        default:
          queryResult = { message: '', canHandle: false };
      }

      // If handler can handle it, use gpt-5-nano to format the response
      if (queryResult.canHandle && queryResult.message) {
        // Para queries simples, ejecutar handlers y luego usar gpt-5-nano para formatear/resumir
        collectLog('info', `[chatWithAssistant] Simple query detected: ${intention.actionType}, will use gpt-5-nano to format response for user ${userId}`);
        
        // Construir mensaje con los datos obtenidos
        const dataMessage = queryResult.message;
        
        // Usar gpt-5-nano para formatear/mejorar la respuesta
        // Incluir contexto de conversación si existe
        const contextNote = conversationContext.mainTopic 
          ? `\n\nNota: El usuario está preguntando sobre ${conversationContext.mainTopic}. Si la consulta es ambigua, refiérete al contexto de la conversación anterior.`
          : '';
        
        const systemPromptForSimple = `Eres un asistente financiero. El usuario ha hecho una consulta simple y ya tienes los datos. 
Presenta la información de forma clara, concisa y amigable. No agregues información que no esté en los datos proporcionados.
Solo reformatea y presenta los datos de manera profesional.${contextNote}`;

        // Incluir historial relevante en el prompt para que el LLM tenga contexto
        const conversationContextForPrompt = fullConversationHistory
          .filter(m => m.role !== 'system')
          .slice(-4) // Últimos 4 mensajes para contexto
          .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
          .join('\n');
        
        const contextSection = conversationContextForPrompt 
          ? `\n\nContexto de la conversación:\n${conversationContextForPrompt}`
          : '';

        const openAIMessagesSimple: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
          {
            role: 'system',
            content: systemPromptForSimple,
          },
          {
            role: 'user',
            content: `Consulta: ${lastMessage?.content || ''}${contextSection}\n\nDatos obtenidos:\n${dataMessage}\n\nPresenta esta información de forma clara y profesional.`,
          },
        ];

        const modelForSimple = getChatModel(false); // gpt-5-nano
        collectLog('info', `[chatWithAssistant] Using ${modelForSimple} for simple query formatting for user ${userId}`);
        
        try {
          const response = await openai.chat.completions.create({
            ...getModelParams(modelForSimple, 400, {
              messages: openAIMessagesSimple as any,
            }),
          } as any);
          
          if (response.usage) {
            collectLog('info', `[chatWithAssistant] ${modelForSimple} usage: prompt_tokens=${response.usage.prompt_tokens}, completion_tokens=${response.usage.completion_tokens}, total_tokens=${response.usage.total_tokens}`);
          }
          
          const formattedMessage = response.choices[0]?.message?.content || dataMessage;
          
          // Guardar la consulta en el historial
          const historyEntry: QueryHistoryEntry = {
            actionType: intention.actionType || 'UNKNOWN',
            parameters: intention.parameters || {},
            timestamp: Date.now(),
            message: lastMessage?.content || '',
          };
          await setCachedQueryHistory(userId, historyEntry);
          
          return withDebugLogs({ message: formattedMessage });
        } catch (error: any) {
          // Si gpt-5-nano falla, intentar con fallback pero usar los datos directos
          collectLog('warn', `[chatWithAssistant] ${modelForSimple} failed, using direct data: ${error.message}`);
          const historyEntry: QueryHistoryEntry = {
            actionType: intention.actionType || 'UNKNOWN',
            parameters: intention.parameters || {},
            timestamp: Date.now(),
            message: lastMessage?.content || '',
          };
          await setCachedQueryHistory(userId, historyEntry);
          return withDebugLogs({ message: dataMessage });
        }
      }
    }

    // Si es una acción y tiene parámetros suficientes, ejecutarla directamente
    if (intention.type === 'ACTION' && intention.actionType && intention.actionType !== 'UNKNOWN') {
      const validation = validateActionParameters(intention.actionType, intention.parameters);
      
      if (!validation.valid) {
        // Parámetros faltantes o inválidos
        const missingParamsMsg = generateMissingParametersMessage(intention.actionType, intention.missingParameters);
        return withDebugLogs({
          message: `${missingParamsMsg}\n\n${validation.errors.join('\n')}`,
        });
      }

      // Si requiere confirmación, retornar mensaje de confirmación y guardar en caché
      const confirmation = requiresConfirmation(intention.actionType, intention.parameters);
      if (confirmation.required) {
        await setCachedPendingAction(userId, {
          type: intention.actionType,
          parameters: intention.parameters,
          requiresConfirmation: true,
          confirmationMessage: confirmation.confirmationMessage,
        });
        
        return withDebugLogs({
          message: confirmation.confirmationMessage || '¿Confirmas esta acción?',
          action: {
            type: intention.actionType,
            parameters: intention.parameters,
            requiresConfirmation: true,
            confirmationMessage: confirmation.confirmationMessage,
          },
        });
      }

      // Ejecutar acción directamente
      try {
        const result = await executeAction(userId, intention.actionType, intention.parameters, cachedContext);
        return withDebugLogs({
          message: result.message,
          action: result.success ? {
            type: intention.actionType,
            parameters: intention.parameters,
            requiresConfirmation: false,
          } : undefined,
        });
      } catch (error: any) {
        logger.error('[chatWithAssistant] Error executing action:', error);
        return withDebugLogs({
          message: `Error al ejecutar la acción: ${error.message}. Por favor intenta de nuevo.`,
        });
      }
    }

    // Construir mensajes para OpenAI (incluir system prompt + historial + mensaje actual)
    // Para queries/acciones complejas o UNKNOWN, usar gpt-5-mini
    // Si llegamos aquí, es una query/acción que no se manejó directamente
    // SIEMPRE usar LLM (gpt-5-mini para complejas o UNKNOWN)
    collectLog('info', `[chatWithAssistant] Complex query/action detected, calling OpenAI API with gpt-5-mini for user ${userId}`);
    collectLog('debug', `[chatWithAssistant] Intention type: ${intention.type}, actionType: ${intention.actionType || 'UNKNOWN'}, will use LLM for response generation`);
    
    const openAIMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Agregar historial de conversación completo (excluir system messages del historial)
    // Usar fullConversationHistory que incluye el historial de Redis
    const conversationHistory = fullConversationHistory.filter(m => m.role !== 'system');
    openAIMessages.push(...conversationHistory);
    collectLog('debug', `[chatWithAssistant] Added ${conversationHistory.length} messages to OpenAI request (from full conversation history)`);

    // Determinar qué modelo usar - complejo = gpt-5-mini
    const modelToUse = getChatModel(true); // gpt-5-mini para queries complejas
    collectLog('info', `[chatWithAssistant] Using model: ${modelToUse} for complex query/action for user ${userId}`);
    collectLog('debug', `[chatWithAssistant] Model configuration: nano=${AI_CHAT_MODEL_NANO}, mini=${AI_CHAT_MODEL_MINI}, selected=${modelToUse}`);
    collectLog('debug', `[chatWithAssistant] OpenAI API call will be made with ${openAIMessages.length} messages (system prompt + ${conversationHistory.length} conversation messages)`);

    // Función interna para llamar a OpenAI con retry automático y function calling
    const callOpenAI = async (model: string, stream: boolean = false): Promise<ChatResponse | AsyncGenerator<{ type: 'content' | 'done'; text?: string }, void, unknown>> => {
      try {
        collectLog('info', `[chatWithAssistant] Making OpenAI API call with model: ${model}, stream: ${stream}`);
        const tokenParam = 'max_completion_tokens'; // Ambos modelos gpt-5 usan max_completion_tokens
        const tempInfo = (model === AI_CHAT_MODEL_NANO || model === AI_CHAT_MODEL_MINI) ? 'temperature=default(1)' : `temperature=${AI_TEMPERATURE}`;
        collectLog('debug', `[chatWithAssistant] API request: model=${model}, messages=${openAIMessages.length}, ${tempInfo}, ${tokenParam}=800, tools=${AI_ACTION_TOOLS.length}, stream=${stream}`);
        logger.debug(`[chatWithAssistant] Calling OpenAI API with model: ${model}, stream: ${stream}`);
        
        const response = await openai.chat.completions.create({
          ...getModelParams(model, 800, {
            messages: openAIMessages as any,
            tools: AI_ACTION_TOOLS,
            tool_choice: 'auto', // Dejar que el modelo decida cuándo usar herramientas
            ...(stream ? { stream: false } : {}), // No hacer streaming en la primera llamada (tool calls primero)
          }),
        } as any);
        
        // Log usage information
        if (response.usage) {
          collectLog('info', `[chatWithAssistant] OpenAI API usage: prompt_tokens=${response.usage.prompt_tokens}, completion_tokens=${response.usage.completion_tokens}, total_tokens=${response.usage.total_tokens}`);
        }

        const message = response.choices[0]?.message;
        const content = message?.content;
        const toolCalls = message?.tool_calls;

        // Si el modelo quiere llamar funciones, procesar múltiples tool calls en secuencia
        if (toolCalls && toolCalls.length > 0) {
          // Mapear nombre de función a ActionType (incluye nuevas herramientas de análisis)
          const actionTypeMap: Record<string, ActionType> = {
            'create_transaction': 'CREATE_TRANSACTION',
            'create_budget': 'CREATE_BUDGET',
            'create_goal': 'CREATE_GOAL',
            'create_account': 'CREATE_ACCOUNT',
            'create_transfer': 'CREATE_TRANSFER',
            'get_account_balance': 'QUERY_BALANCE',
            'get_category_spending': 'QUERY_TRANSACTIONS',
            'analyze_spending': 'ANALYZE_SPENDING',
            'calculate_percentages': 'CALCULATE_PERCENTAGES',
            'get_financial_summary': 'GET_FINANCIAL_SUMMARY',
            'compare_periods': 'COMPARE_PERIODS',
            'analyze_by_category': 'ANALYZE_BY_CATEGORY',
            'get_spending_trends': 'GET_SPENDING_TRENDS',
          };

          // Procesar múltiples tool calls en secuencia
          // Implementar loop de tool calls hasta que el modelo tenga toda la información (max 5 rounds)
          const MAX_TOOL_CALL_ROUNDS = 5;
          let currentRound = 0;
          let conversationMessages = [...openAIMessages];
          let lastToolResults: Array<{ toolCallId: string; result: any }> = [];

          while (currentRound < MAX_TOOL_CALL_ROUNDS) {
            currentRound++;
            collectLog('info', `[chatWithAssistant] Processing tool calls round ${currentRound}/${MAX_TOOL_CALL_ROUNDS}, ${toolCalls?.length || 0} tool calls`);

            // Ejecutar todos los tool calls de esta ronda
            const toolResults: Array<{ toolCallId: string; role: 'tool'; content: string; name?: string }> = [];
            
            if (!toolCalls || toolCalls.length === 0) {
              break;
            }
            
            for (const toolCall of toolCalls) {
              if (!('function' in toolCall)) {
                collectLog('warn', `[chatWithAssistant] Tool call does not have function property, skipping`);
                continue;
              }

              const functionName = toolCall.function.name;
              const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
              const toolCallId = toolCall.id;

              collectLog('info', `[chatWithAssistant] Executing tool call: ${functionName} with args: ${JSON.stringify(functionArgs)}`);

              try {
                const actionType = actionTypeMap[functionName];
                
                if (!actionType) {
                  collectLog('warn', `[chatWithAssistant] Unknown function: ${functionName}`);
                  toolResults.push({
                    toolCallId,
                    role: 'tool',
                    content: JSON.stringify({ error: `Función desconocida: ${functionName}` }),
                    name: functionName,
                  });
                  continue;
                }

                // Verificar si requiere confirmación (solo para acciones de creación críticas)
                if (actionType.startsWith('CREATE_')) {
                  const confirmation = requiresConfirmation(actionType, functionArgs);
                  if (confirmation.required) {
                    await setCachedPendingAction(userId, {
                      type: actionType,
                      parameters: functionArgs,
                      requiresConfirmation: true,
                      confirmationMessage: confirmation.confirmationMessage,
                    });
                    
                    return withDebugLogs({
                      message: confirmation.confirmationMessage || '¿Confirmas esta acción?',
                      action: {
                        type: actionType,
                        parameters: functionArgs,
                        requiresConfirmation: true,
                        confirmationMessage: confirmation.confirmationMessage,
                      },
                    });
                  }

                  // Ejecutar acción de creación
                  const result = await executeAction(userId, actionType, functionArgs, cachedContext);
                  toolResults.push({
                    toolCallId,
                    role: 'tool',
                    content: JSON.stringify({ 
                      success: result.success, 
                      message: result.message,
                      data: result.data 
                    }),
                    name: functionName,
                  });
                  
                  if (!result.success) {
                    collectLog('warn', `[chatWithAssistant] Action ${actionType} failed: ${result.message}`);
                  }
                } else {
                  // Es una acción de análisis o query (no requiere confirmación)
                  const result = await executeAction(userId, actionType, functionArgs, cachedContext);
                  toolResults.push({
                    toolCallId,
                    role: 'tool',
                    content: JSON.stringify({ 
                      success: result.success, 
                      message: result.message,
                      data: result.data 
                    }),
                    name: functionName,
                  });
                  
                  if (!result.success) {
                    collectLog('warn', `[chatWithAssistant] Analysis/Query ${actionType} failed: ${result.message}`);
                  }
                }
              } catch (error: any) {
                collectLog('error', `[chatWithAssistant] Error executing tool call ${functionName}: ${error.message}`);
                toolResults.push({
                  toolCallId,
                  role: 'tool',
                  content: JSON.stringify({ error: error.message || 'Error al ejecutar la herramienta' }),
                  name: functionName,
                });
              }
            }

            // Agregar resultados de tool calls a la conversación
            // Incluir el mensaje del asistente con tool_calls estructurado correctamente
            const assistantMessageWithToolCalls: any = {
              role: 'assistant',
              content: message?.content || null,
              tool_calls: toolCalls.map(tc => {
                if (!('function' in tc)) {
                  return null;
                }
                return {
                  id: tc.id,
                  type: 'function',
                  function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments || '{}',
                  },
                };
              }).filter(Boolean), // Remover nulls
            };
            
            conversationMessages.push(
              assistantMessageWithToolCalls,
              ...toolResults as any
            );

            // Llamar nuevamente a OpenAI con los resultados de los tool calls
            collectLog('info', `[chatWithAssistant] Calling OpenAI again with ${toolResults.length} tool results`);
            const nextResponse = await openai.chat.completions.create({
              ...getModelParams(model, 800, {
                messages: conversationMessages as any,
                tools: AI_ACTION_TOOLS,
                tool_choice: 'auto',
              }),
            } as any);

            const nextMessage = nextResponse.choices[0]?.message;
            const nextContent = nextMessage?.content;
            const nextToolCalls = nextMessage?.tool_calls;

            // Si no hay más tool calls, retornar la respuesta final
            if (!nextToolCalls || nextToolCalls.length === 0) {
              if (nextContent) {
                collectLog('info', `[chatWithAssistant] Tool call loop completed after ${currentRound} rounds, returning final response`);
                
                // Si streaming está habilitado, hacer streaming del texto final
                if (stream) {
                  return (async function* () {
                    // Hacer streaming del texto final
                    const finalMessages = [
                      ...conversationMessages,
                      { role: 'assistant', content: '' },
                      ...toolResults as any,
                    ];
                    
                    const streamResponse = await openai.chat.completions.create({
                      ...getModelParams(model, 800, {
                        messages: finalMessages as any,
                        stream: true,
                      }),
                    } as any);
                    
                    // Usar streamOpenAIResponse para convertir el stream
                    for await (const textChunk of streamOpenAIResponse(streamResponse as any)) {
                      yield { type: 'content' as const, text: textChunk };
                    }
                    
                    yield { type: 'done' as const };
                  })();
                }
                
                return withDebugLogs({ message: nextContent });
              } else {
                // Si no hay contenido ni tool calls, usar el último resultado de tool
                const lastResult = toolResults[toolResults.length - 1];
                if (lastResult) {
                  const parsed = JSON.parse(lastResult.content);
                  const message = parsed.message || 'Operación completada';
                  
                  // Si streaming está habilitado, hacer streaming del mensaje
                  if (stream) {
                    return (async function* () {
                      // Simular streaming del mensaje palabra por palabra
                      const words = message.split(' ');
                      for (let i = 0; i < words.length; i++) {
                        yield { type: 'content' as const, text: (i > 0 ? ' ' : '') + words[i] };
                        // Pequeño delay para simular streaming real
                        await new Promise(resolve => setTimeout(resolve, 20));
                      }
                      yield { type: 'done' as const };
                    })();
                  }
                  
                  return withDebugLogs({ message });
                }
              }
            }

            // Continuar con la siguiente ronda de tool calls
            toolCalls = nextToolCalls;
            lastToolResults = toolResults.map(tr => ({ toolCallId: tr.toolCallId, result: JSON.parse(tr.content) }));
          }

          // Si llegamos al límite de rounds, usar el último resultado o mensaje
          collectLog('warn', `[chatWithAssistant] Reached max tool call rounds (${MAX_TOOL_CALL_ROUNDS}), using last result`);
          if (lastToolResults.length > 0) {
            const lastResult = lastToolResults[lastToolResults.length - 1];
            return withDebugLogs({ 
              message: lastResult.result.message || 'Análisis completado. Si necesitas más información, por favor pregunta de forma más específica.' 
            });
          }
        }

        // Respuesta normal de texto
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        // Si streaming está habilitado, hacer streaming del texto
        if (stream) {
          return (async function* () {
            // Hacer streaming del texto final
            const streamResponse = await openai.chat.completions.create({
              ...getModelParams(model, 800, {
                messages: openAIMessages as any,
                stream: true,
              }),
            } as any);
            
            for await (const chunk of streamResponse) {
              const chunkContent = chunk.choices[0]?.delta?.content;
              if (chunkContent) {
                yield { type: 'content' as const, text: chunkContent };
              }
            }
            
            yield { type: 'done' as const };
          })();
        }

        return withDebugLogs({ message: content });
      } catch (error: any) {
        // Si el modelo no existe o falla, no usar fallback LLM
        // El error será manejado por el retry handler o el catch exterior
        throw error;
      }
    };

    // Ejecutar con retry automático y timeout
    let response: ChatResponse;
    try {
      response = await withRetry(
        () => callOpenAI(modelToUse, false) as Promise<ChatResponse>,
        {
          maxRetries: AI_MAX_RETRIES,
          baseDelay: 1000,
          maxDelay: 8000,
          timeoutMs: AI_LLM_TIMEOUT_MS,
        }
      );

      collectLog('info', `[chatWithAssistant] OpenAI API call successful for user ${userId}`);
      logger.info(`AI Chat: Successful response generated for user ${userId}`);
    } catch (retryError: any) {
      collectLog('error', `[chatWithAssistant] OpenAI API call failed after retries: ${retryError.message || retryError} for user ${userId}`);
      logger.warn(`AI Chat: OpenAI failed after retries, using fallback extractive response for user ${userId}`);
      
      // Usar respuesta extractiva sin LLM (no intentar otro modelo)
      const fallbackMessage = getFallbackResponse(messages[messages.length - 1]?.content || '', cachedContext);
      response = withDebugLogs({ message: fallbackMessage });
    }

    // Guardar conversación en caché (siempre, incluso si sessionId fue generado)
    // Usar fullConversationHistory + respuesta del asistente
    // Limitar a últimos 20 mensajes para evitar payloads muy grandes
    const updatedMessages: ChatMessage[] = [...fullConversationHistory, { role: 'assistant' as const, content: response.message }];
    const messagesToCache = updatedMessages.slice(-20); // Últimos 20 mensajes
    if (sessionId) {
      await setCachedConversation(userId, sessionId, messagesToCache);
      collectLog('debug', `[chatWithAssistant] Saved ${messagesToCache.length} messages to Redis cache`);
      
      // Almacenar en memoria a corto plazo mejorada
      try {
        await storeShortTermConversation(userId, sessionId, updatedMessages);
      } catch (error) {
        logger.warn('[chatWithAssistant] Failed to store in short-term memory:', error);
      }
      
      // Almacenar en memoria episódica (histórica)
      try {
        // Crear o actualizar sesión
        await createOrUpdateSession(sessionId, userId);
        
        // Almacenar mensajes nuevos (solo los que no están ya almacenados en cachedConversation)
        // Filtrar contra cachedConversation, no fullConversationHistory, porque fullConversationHistory
        // ya contiene todos los mensajes de messages, lo que resultaría en una lista vacía
        const newMessages = messages.filter(msg => 
          !cachedConversation.some(existing => 
            existing.content === msg.content && existing.role === msg.role
          )
        );
        
        if (newMessages.length > 0) {
          // Calcular importancia basada en si hay acciones o información importante
          const importanceScores = newMessages.map(msg => {
            // Mensajes del usuario con acciones o preguntas importantes tienen mayor importancia
            if (msg.role === 'user') {
              const hasAction = /crear|crea|agregar|agrega|transferir|transfiere/i.test(msg.content);
              const hasImportantQuery = /cuánto|cuanto|cuál|cuál|qué|que|cuántos|cuantos/i.test(msg.content);
              return hasAction ? 0.8 : hasImportantQuery ? 0.7 : 0.5;
            }
            // Respuestas del asistente con información útil tienen mayor importancia
            return /importante|recomendación|sugerencia|deberías|deberias/i.test(msg.content) ? 0.7 : 0.5;
          });
          
          await storeMessages(userId, sessionId, newMessages, importanceScores);
          collectLog('debug', `[chatWithAssistant] Stored ${newMessages.length} messages in episodic memory`);
        }
        
        // Almacenar respuesta del asistente
        await storeMessage(
          userId,
          sessionId,
          { role: 'assistant', content: response.message },
          0.6, // Respuestas del asistente tienen importancia media-alta
          { hasAction: !!response.action }
        );
      } catch (error) {
        logger.warn('[chatWithAssistant] Failed to store in episodic memory:', error);
      }
      
      // Extraer y almacenar memorias automáticamente (en background, no bloquea respuesta)
      extractAndStoreMemories(userId, updatedMessages).catch(err => {
        logger.warn('[chatWithAssistant] Failed to extract memories:', err);
      });
    }

    // Asegurar que siempre se incluyan logs
    return withDebugLogs(response);
  } catch (error: any) {
    logger.error('Unexpected error in chatWithAssistant', error);
    // En caso de error absoluto, retornar un mensaje genérico
    return withDebugLogs({
      message: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.',
    });
  }
}

/**
 * Genera respuesta del asistente IA con streaming
 * Similar a chatWithAssistant pero retorna AsyncGenerator para streaming del texto final
 * Ejecuta tool calls normalmente (sin streaming) y luego hace streaming del texto final
 */
export async function* chatWithAssistantStream(
  userId: string,
  messages: ChatMessage[],
  context: WalletContext,
  sessionId?: string
): AsyncGenerator<{ type: 'content' | 'done'; text?: string }, void, unknown> {
  // Usar la misma lógica que chatWithAssistant pero con streaming habilitado
  // La función callOpenAI ya maneja el streaming cuando stream: true
  
  // Por ahora, llamar a chatWithAssistant y luego hacer streaming del resultado
  // Esto es una implementación simplificada - en el futuro se puede optimizar
  const response = await chatWithAssistant(userId, messages, context, sessionId);
  
  // Hacer streaming del mensaje palabra por palabra como fallback
  // En una implementación completa, esto se haría directamente en callOpenAI
  const words = response.message.split(' ');
  for (let i = 0; i < words.length; i++) {
    yield { type: 'content', text: (i > 0 ? ' ' : '') + words[i] };
    // Pequeño delay para simular streaming real
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  yield { type: 'done' };
}
