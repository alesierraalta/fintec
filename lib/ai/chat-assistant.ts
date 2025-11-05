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

    if (pendingAction) {
      if (isConfirmationResponse(lastMessage.content)) {
        await invalidatePendingActionCache(userId);
        try {
          const result = await executeAction(userId, pendingAction.type as ActionType, pendingAction.parameters, cachedContext);
          return {
            message: result.message,
            action: result.success ? {
              type: pendingAction.type as ActionType,
              parameters: pendingAction.parameters,
              requiresConfirmation: false,
            } : undefined,
          };
        } catch (error: any) {
          logger.error('[chatWithAssistant] Error executing pending action:', error);
          return {
            message: `Error al ejecutar la acción pendiente: ${error.message}. Por favor intenta de nuevo.`,
          };
        }
      } else if (isRejectionResponse(lastMessage.content)) {
        await invalidatePendingActionCache(userId);
        return {
          message: 'Acción cancelada. ¿Hay algo más en lo que pueda ayudarte?',
        };
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
          return { message: queryResult.message };
        }
      } else {
        logger.warn(`[chatWithAssistant] Correction detected but no previous query found in Redis for user ${userId}`);
      }
    }

    // Detectar intención del último mensaje
    const intention = detectIntention(lastMessage?.content || '');
    logger.debug(`[chatWithAssistant] Detected intention: type=${intention.type}, actionType=${intention.actionType}, confidence=${intention.confidence} for user ${userId}`);

    // Detectar si hay múltiples consultas en el mismo mensaje (ej: "lista de cuentas y tasa")
    const messageContent = lastMessage?.content || '';
    const hasMultipleQueries = /y\s+(?:me\s+)?(?:indicas|muestras|dame|muestra|show|give)\s+(?:la\s+)?(?:tasa|tasas|rates)/i.test(messageContent) ||
                               /(?:tasa|tasas|rates).*?y.*?(?:cuentas|accounts|transacciones|transactions)/i.test(messageContent);

    // Handle all QUERY types directly with context data (no LLM needed)
    if (intention.type === 'QUERY' && intention.actionType && intention.actionType !== 'UNKNOWN') {
      // Si hay múltiples consultas, manejar ambas
      if (hasMultipleQueries) {
        const hasRatesQuery = /tasa|tasas|cambio|exchange|bcv|binance|dólar|dolar|bolívar|bolivar|tipo de cambio/i.test(messageContent);
        const hasAccountsQuery = /cuentas?|accounts?/i.test(messageContent);
        
        let combinedMessage = '';
        const queriesExecuted: string[] = [];
        
        // Ejecutar consulta de cuentas si está presente
        if (hasAccountsQuery && intention.actionType === 'QUERY_ACCOUNTS') {
          const accountsResult = handleQueryAccounts(cachedContext, intention.parameters);
          if (accountsResult.canHandle && accountsResult.message) {
            combinedMessage += accountsResult.message + '\n\n';
            queriesExecuted.push('QUERY_ACCOUNTS');
          }
        }
        
        // Ejecutar consulta de tasas si está presente
        if (hasRatesQuery) {
          const ratesResult = await handleQueryRates(cachedContext, intention.parameters);
          if (ratesResult.canHandle && ratesResult.message) {
            combinedMessage += ratesResult.message;
            queriesExecuted.push('QUERY_RATES');
          }
        }
        
        if (combinedMessage.trim()) {
          // Guardar ambas consultas en el historial
          for (const queryType of queriesExecuted) {
            const historyEntry: QueryHistoryEntry = {
              actionType: queryType,
              parameters: intention.parameters || {},
              timestamp: Date.now(),
              message: lastMessage?.content || '',
            };
            await setCachedQueryHistory(userId, historyEntry);
          }
          
          logger.info(`[chatWithAssistant] Multiple queries handled: ${queriesExecuted.join(', ')} for user ${userId}`);
          return { message: combinedMessage.trim() };
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
          queryResult = await handleQueryRates(cachedContext, intention.parameters);
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
        return { message: queryResult.message };
      }
    }

    // Si es una acción y tiene parámetros suficientes, ejecutarla directamente
    if (intention.type === 'ACTION' && intention.actionType && intention.actionType !== 'UNKNOWN') {
      const validation = validateActionParameters(intention.actionType, intention.parameters);
      
      if (!validation.valid) {
        // Parámetros faltantes o inválidos
        const missingParamsMsg = generateMissingParametersMessage(intention.actionType, intention.missingParameters);
        return {
          message: `${missingParamsMsg}\n\n${validation.errors.join('\n')}`,
        };
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
        
        return {
          message: confirmation.confirmationMessage || '¿Confirmas esta acción?',
          action: {
            type: intention.actionType,
            parameters: intention.parameters,
            requiresConfirmation: true,
            confirmationMessage: confirmation.confirmationMessage,
          },
        };
      }

      // Ejecutar acción directamente
      try {
        const result = await executeAction(userId, intention.actionType, intention.parameters, cachedContext);
        return {
          message: result.message,
          action: result.success ? {
            type: intention.actionType,
            parameters: intention.parameters,
            requiresConfirmation: false,
          } : undefined,
        };
      } catch (error: any) {
        logger.error('[chatWithAssistant] Error executing action:', error);
        return {
          message: `Error al ejecutar la acción: ${error.message}. Por favor intenta de nuevo.`,
        };
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
              
              return {
                message: confirmation.confirmationMessage || '¿Confirmas esta acción?',
                action: {
                  type: actionType,
                  parameters: functionArgs,
                  requiresConfirmation: true,
                  confirmationMessage: confirmation.confirmationMessage,
                },
              };
            }

            // Ejecutar acción
            const result = await executeAction(userId, actionType, functionArgs, cachedContext);
            return {
              message: result.message,
              action: result.success ? {
                type: actionType,
                parameters: functionArgs,
                requiresConfirmation: false,
              } : undefined,
            };
          }
        }

        // Respuesta normal de texto
        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        return { message: content };
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
    return {
      message: 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.',
    };
  }
}
