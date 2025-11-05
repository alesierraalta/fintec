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

import { openai, getChatModel, AI_CHAT_MODEL_FALLBACK, AI_CHAT_MODEL_MINI, AI_CHAT_MODEL_NANO, AI_TEMPERATURE, AI_LLM_TIMEOUT_MS, AI_MAX_RETRIES } from './config';
import { WalletContext } from './context-builder';
import { withRetry } from './retry-handler';
import { getFallbackResponse } from './fallback-responses';
import { getCachedContext, setCachedContext, getCachedConversation, setCachedConversation, getCachedPendingAction, setCachedPendingAction, invalidatePendingActionCache, getLastCachedQuery, setCachedQueryHistory, QueryHistoryEntry } from './cache-manager';
import { AI_ACTION_TOOLS } from './action-tools';
import { generateProactivePrompt } from './proactive-advisor';
import { detectIntention, ActionType, detectCorrection } from './intention-detector';
import { executeAction } from './action-executor';
import { requiresConfirmation, validateActionParameters, generateMissingParametersMessage, isConfirmationResponse, isRejectionResponse } from './action-confirmer';
import { handleQueryBalance, handleQueryTransactions, handleQueryBudgets, handleQueryGoals, handleQueryAccounts, handleQueryRates, handleQueryCategories, handleQueryRecurring } from './query-handlers';
import { PromptManager } from './prompts/manager';
import { logger } from '@/lib/utils/logger';

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
 * Genera respuesta del asistente IA con contexto de billetera
 * Incluye retry automático, timeout, fallback extractivo, function calling y procesamiento de confirmaciones
 */
export async function chatWithAssistant(
  userId: string,
  messages: ChatMessage[],
  context: WalletContext,
  sessionId?: string
): Promise<ChatResponse> {
  // Recopilar logs para enviar al navegador (solo en desarrollo)
  const isDev = process.env.NODE_ENV === 'development';
  const debugLogs: Array<{ level: 'debug' | 'info' | 'warn' | 'error'; message: string; timestamp: number }> = [];
  
  // Logger wrapper que recopila logs y también los muestra en servidor
  const collectLog = (level: 'debug' | 'info' | 'warn' | 'error', message: string) => {
    if (isDev) {
      debugLogs.push({ level, message, timestamp: Date.now() });
      // También loggear en servidor
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
    if (isDev && debugLogs.length > 0) {
      return { ...response, debugLogs };
    }
    return response;
  };
  
  try {
    // Intentar obtener contexto cacheado
    let cachedContext = await getCachedContext(userId);
    if (!cachedContext) {
      cachedContext = context;
      // Guardar en caché para futuros requests
      await setCachedContext(userId, context);
    }

    // Procesar confirmaciones/rechazos de acciones pendientes
    const lastMessage = messages[messages.length - 1];
    const pendingAction = await getCachedPendingAction(userId);
    
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

    // Generar system prompt usando PromptManager (con caché)
    const systemPrompt = await PromptManager.generateChatSystemPrompt(cachedContext, proactiveSuggestions, userId);

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

    // Detectar intención del último mensaje
    const intention = detectIntention(lastMessage?.content || '');
    collectLog('debug', `[chatWithAssistant] Detected intention: type=${intention.type}, actionType=${intention.actionType}, confidence=${intention.confidence} for user ${userId}`);

    // Handle all QUERY types directly with context data (no LLM needed)
    if (intention.type === 'QUERY' && intention.actionType && intention.actionType !== 'UNKNOWN') {
      const messageContent = lastMessage?.content || '';
      
      // Siempre detectar keywords presentes en el mensaje (independientemente de hasMultipleQueries)
      // Esto asegura que ejecutemos todas las consultas detectadas, no solo intention.actionType
      const hasRatesQuery = /tasa|tasas|cambio|exchange|bcv|binance|dólar|dolar|bolívar|bolivar|tipo de cambio/i.test(messageContent);
      const hasAccountsQuery = /cuentas?|accounts?/i.test(messageContent);
      const hasTransactionsQuery = /transacciones?|transactions?|gastos?|expenses?|ingresos?|income/i.test(messageContent);
      const hasBudgetsQuery = /presupuestos?|budgets?/i.test(messageContent);
      const hasGoalsQuery = /metas?|goals?|objetivos?|targets?/i.test(messageContent);
      const hasCategoriesQuery = /categorías?|categorias?|categories?/i.test(messageContent);
      const hasRecurringQuery = /recurrentes?|recurring|automáticas?|automaticas?|periódicas?|periodicas?|programadas?/i.test(messageContent);
      const hasBalanceQuery = /saldo|balance|dinero|money|cuánto|cuanto|tengo/i.test(messageContent);
      
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
      
      // Si hay múltiples consultas detectadas, ejecutar todas
      if (isMultipleQueries) {
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
          const ratesResult = await handleQueryRates(cachedContext, intention.parameters);
          if (ratesResult.canHandle && ratesResult.message) {
            combinedMessage += ratesResult.message + '\n\n';
            queriesExecuted.push('QUERY_RATES');
          } else {
            logger.warn(`[chatWithAssistant] handleQueryRates returned canHandle=${ratesResult.canHandle} for user ${userId}`);
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
          
          logger.info(`[chatWithAssistant] Multiple queries executed: ${queriesExecuted.join(', ')} for user ${userId}`);
          return withDebugLogs({ message: combinedMessage.trim() });
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
          queryResult = handleQueryTransactions(cachedContext, intention.parameters);
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
          queryResult = await handleQueryRates(cachedContext, intention.parameters);
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

      // If handler can handle it directly, return the response
      if (queryResult.canHandle && queryResult.message) {
        // Guardar la consulta en el historial de Redis (obligatorio para contexto conversacional)
        const historyEntry: QueryHistoryEntry = {
          actionType: intention.actionType,
          parameters: intention.parameters || {},
          timestamp: Date.now(),
          message: lastMessage?.content || '',
        };
        await setCachedQueryHistory(userId, historyEntry);
        
        logger.info(`[chatWithAssistant] ${intention.actionType} handled directly from context for user ${userId}`);
        return withDebugLogs({ message: queryResult.message });
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
    const openAIMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Agregar historial de conversación (excluir system messages del historial)
    const conversationHistory = messages.filter(m => m.role !== 'system');
    openAIMessages.push(...conversationHistory);

    // Determinar qué modelo usar (priorizamos mini como especificado)
    const modelToUse = getChatModel(true); // preferMini = true, usar gpt-5-mini primero
    logger.info(`[chatWithAssistant] Using model: ${modelToUse} for user ${userId}`);

    // Función interna para llamar a OpenAI con retry automático y function calling
    const callOpenAI = async (model: string): Promise<ChatResponse> => {
      try {
        logger.debug(`[chatWithAssistant] Calling OpenAI API with model: ${model}`);
        const response = await openai.chat.completions.create({
          model,
          messages: openAIMessages as any,
          temperature: AI_TEMPERATURE,
          max_tokens: 800,
          tools: AI_ACTION_TOOLS,
          tool_choice: 'auto', // Dejar que el modelo decida cuándo usar herramientas
        });

        const message = response.choices[0]?.message;
        const content = message?.content;
        const toolCalls = message?.tool_calls;

        // Si el modelo quiere llamar una función
        if (toolCalls && toolCalls.length > 0) {
          const toolCall = toolCalls[0];
          if (!('function' in toolCall)) {
            throw new Error('Tool call does not have function property');
          }
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

          logger.info(`[chatWithAssistant] Model requested function call: ${functionName}`, functionArgs);

          // Mapear nombre de función a ActionType
          const actionTypeMap: Record<string, ActionType> = {
            'create_transaction': 'CREATE_TRANSACTION',
            'create_budget': 'CREATE_BUDGET',
            'create_goal': 'CREATE_GOAL',
            'create_account': 'CREATE_ACCOUNT',
            'create_transfer': 'CREATE_TRANSFER',
            'get_account_balance': 'QUERY_BALANCE',
            'get_category_spending': 'QUERY_TRANSACTIONS',
          };

          const actionType = actionTypeMap[functionName];
          if (actionType && actionType.startsWith('CREATE_')) {
            // Es una acción de creación
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

            // Ejecutar acción
            const result = await executeAction(userId, actionType, functionArgs, cachedContext);
            return withDebugLogs({
              message: result.message,
              action: result.success ? {
                type: actionType,
                parameters: functionArgs,
                requiresConfirmation: false,
              } : undefined,
            });
          }
        }

        // Respuesta normal de texto
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        return withDebugLogs({ message: content });
      } catch (error: any) {
        // Si el modelo no existe, intentar con fallback en cascada: mini -> nano -> fallback
        if (error?.message?.includes('model') || error?.code === 'model_not_found' || error?.status === 404) {
          if (model === AI_CHAT_MODEL_MINI) {
            // Si mini no funciona, intentar con nano
            logger.warn(`[chatWithAssistant] Model ${model} not available, trying ${AI_CHAT_MODEL_NANO}`);
            return callOpenAI(AI_CHAT_MODEL_NANO);
          } else if (model === AI_CHAT_MODEL_NANO) {
            // Si nano tampoco funciona, usar fallback
            logger.warn(`[chatWithAssistant] Model ${model} not available, using fallback ${AI_CHAT_MODEL_FALLBACK}`);
            return callOpenAI(AI_CHAT_MODEL_FALLBACK);
          } else if (model !== AI_CHAT_MODEL_FALLBACK) {
            // Cualquier otro modelo que falle, usar fallback
            logger.warn(`[chatWithAssistant] Model ${model} not available, using fallback ${AI_CHAT_MODEL_FALLBACK}`);
            return callOpenAI(AI_CHAT_MODEL_FALLBACK);
          }
        }
        throw error;
      }
    };

    // Ejecutar con retry automático y timeout
    let response: ChatResponse;
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
      const fallbackMessage = getFallbackResponse(messages[messages.length - 1]?.content || '', cachedContext);
      response = { message: fallbackMessage };
    }

    // Guardar conversación en caché
    if (sessionId) {
      const updatedMessages: ChatMessage[] = [...messages, { role: 'assistant' as const, content: response.message }];
      await setCachedConversation(userId, sessionId, updatedMessages);
    }

    return response;
  } catch (error: any) {
    logger.error('Unexpected error in chatWithAssistant', error);
    // En caso de error absoluto, retornar un mensaje genérico
    return withDebugLogs({
      message: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.',
    });
  }
}
