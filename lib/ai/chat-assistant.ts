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

    // Construir prompt del sistema con contexto financiero
    const accountsSummary = cachedContext.accounts.summary.length > 0
      ? `\nEl usuario tiene ${cachedContext.accounts.total} cuenta(s) activa(s):\n${cachedContext.accounts.summary.map(acc => `- ${acc.name} (${acc.type}): ${acc.balance.toFixed(2)} ${acc.currency}`).join('\n')}\n\nTotal por moneda:\n${Object.entries(cachedContext.accounts.totalBalance).map(([currency, total]) => `- ${currency}: ${total.toFixed(2)}`).join('\n')}`
      : '\nEl usuario no tiene cuentas registradas aún.';

    // Generar sugerencias proactivas
    const proactiveSuggestions = generateProactivePrompt(cachedContext);

    // Lista de cuentas disponibles para referencias
    const availableAccounts = cachedContext.accounts.summary.map(acc => acc.name).join(', ');

    const systemPrompt = `Eres un asistente financiero personal experto e integrado en una aplicación de billetera.
Tu función es ayudar al usuario a entender y gestionar sus finanzas personales de manera clara y práctica.

CAPACIDADES DEL ASISTENTE:
- Puedes RESPONDER preguntas sobre finanzas (saldo, gastos, ingresos, presupuestos, metas)
- Puedes CREAR transacciones, presupuestos, metas, cuentas y transferencias
- Puedes ANALIZAR patrones y ofrecer consejos proactivos

CONTEXTO ACTUAL DE LA BILLETERA DEL USUARIO:
${accountsSummary}

CUENTAS DISPONIBLES: ${availableAccounts || 'Ninguna'}

TRANSACCIONES:
- Transacciones recientes (últimas 20): ${cachedContext.transactions.recent.length > 0 ? JSON.stringify(cachedContext.transactions.recent.slice(0, 5), null, 2) : 'No hay transacciones recientes'}
- Resumen del mes: Ingresos: ${cachedContext.transactions.summary.incomeThisMonth.toFixed(2)}, Gastos: ${cachedContext.transactions.summary.expensesThisMonth.toFixed(2)}, Neto: ${cachedContext.transactions.summary.netThisMonth.toFixed(2)}

PRESUPUESTOS:
${cachedContext.budgets.active.length > 0 ? cachedContext.budgets.active.map(b => `- ${b.category}: Presupuesto ${b.budget.toFixed(2)}, Gastado ${b.spent.toFixed(2)}, Restante ${b.remaining.toFixed(2)} (${b.percentage}%)`).join('\n') : 'No hay presupuestos activos'}

METAS:
${cachedContext.goals.active.length > 0 ? cachedContext.goals.active.map(g => `- ${g.name}: ${g.current.toFixed(2)} / ${g.target.toFixed(2)} (${g.progress}%)${g.targetDate ? ` - Fecha objetivo: ${g.targetDate}` : ''}`).join('\n') : 'No hay metas activas'}
${proactiveSuggestions}

DATOS COMPLETOS (JSON):
${JSON.stringify(cachedContext, null, 2)}

INSTRUCCIONES CRÍTICAS:
1. SIEMPRE analiza primero el campo "accounts.total" y "accounts.summary" antes de responder sobre cuentas
2. Si accounts.total > 0, el usuario TIENE cuentas registradas. NUNCA digas "no tienes cuentas" si accounts.total > 0
3. Para calcular el total de dinero:
   - Suma todos los balances en accounts.summary
   - Si hay múltiples monedas, menciona el total por cada moneda desde accounts.totalBalance
   - Para conversiones, menciona que son aproximadas basadas en tasas disponibles
4. DIFERENCIA CLARA ENTRE ACCIONES Y CONSULTAS:
   - CONSULTA (responder directamente): "¿cuál es mi saldo?", "muéstrame mis cuentas", "listar mis cuentas", "qué gastos tuve?"
   - ACCIÓN (usar función): "crea una cuenta", "agrega un gasto de 50 USD", "registra una transferencia"
   - Si dice "haz un listado de cuentas", "muéstrame cuentas", "listar cuentas" → RESPONDE DIRECTAMENTE con accounts.summary
   - Si dice "crea/crearé una cuenta", "quiero crear una nueva cuenta" → USA la función create_account
5. LISTADO DE CUENTAS - RESPUESTA DIRECTA:
   - Cuando se te pida listar/mostrar cuentas (sin intención de crear), responde con:
     - Nombre de cada cuenta
     - Tipo de cuenta (BANK, CARD, CASH, SAVINGS, etc.)
     - Saldo actual con moneda
     - Total general si hay múltiples monedas
   - NUNCA pidas parámetros para "crear cuenta" si solo quieren listar
6. ACCIONES DISPONIBLES (solo si intención clara de crear):
   - create_transaction: Para crear gastos o ingresos
   - create_budget: Para crear presupuestos
   - create_goal: Para crear metas de ahorro
   - create_account: Para crear nuevas cuentas (SOLO si usuario dice "crear", "crear una cuenta nueva", etc.)
   - create_transfer: Para transferir dinero entre cuentas
7. CUANDO USAR FUNCIONES:
   - Usa funciones SOLO cuando el usuario exprese claramente una intención de acción (crear, agregar, registrar)
   - NO uses funciones para consultas simples (preguntas sobre datos existentes)
   - Si el usuario dice "agrega un gasto de X", llama a create_transaction
   - Si el usuario dice "cuánto tengo", responde directamente sin usar funciones
8. Responde de forma natural, amigable y profesional en español
9. Usa el contexto de la billetera para dar respuestas precisas y personalizadas
10. Si el usuario pregunta sobre datos que no están en el contexto, indícale amablemente que no tienes esa información específica
11. Proporciona consejos prácticos y accionables
12. Mantén respuestas concisas pero informativas
13. NUNCA inventes datos que no estén en el contexto proporcionado
14. SIEMPRE verifica accounts.total antes de decir que no hay cuentas
15. EJEMPLOS DE CONSULTAS CON PARÁMETROS:
   - "gastos de hoy" → QUERY_TRANSACTIONS con filtro de fecha (hoy)
   - "transacciones del mes pasado" → QUERY_TRANSACTIONS con rango de mes anterior
   - "gastos de comida" → QUERY_TRANSACTIONS filtrado por categoría "comida"
   - "cuánto gané este mes" → QUERY_TRANSACTIONS tipo INCOME para mes actual
   - "mis presupuestos" → QUERY_BUDGETS sin parámetros extra
   - "presupuestos de comida" → QUERY_BUDGETS filtrado por categoría
   - "mis metas" → QUERY_GOALS sin parámetros extra
   - "¿cuál es mi saldo?" → QUERY_BALANCE sin parámetros
   - "listado de categorías" → QUERY_CATEGORIES
   - "muéstrame mis categorías de gastos" → QUERY_CATEGORIES con filtro de tipo
   - "transacciones recurrentes" → QUERY_RECURRING
   - "muéstrame mis recurrentes" → QUERY_RECURRING
   - Cuando el usuario pida datos con FECHA, CATEGORÍA, TIPO o MONEDA específicos:
     * El sistema automáticamente extrae estos parámetros
     * Los handlers manejan el filtrado directo desde el contexto
     * NO necesitas preguntar por aclaraciones si los parámetros están claros
16. Responde de forma natural, amigable y profesional en español
17. Usa el contexto de la billetera para dar respuestas precisas y personalizadas
18. Si el usuario pregunta sobre datos que no están en el contexto, indícale amablemente que no tienes esa información específica
19. Proporciona consejos prácticos y accionables
20. Mantén respuestas concisas pero informativas
21. NUNCA inventes datos que no estén en el contexto proporcionado
22. SIEMPRE verifica accounts.total antes de decir que no hay cuentas
23. MANEJO DE CORRECCIONES:
   - Si el usuario corrige un parámetro (ej: "pero te pedí solo 5", "solo quiero 5 transacciones"):
     * El sistema automáticamente detecta la corrección y re-ejecuta la consulta anterior
     * NO necesitas hacer nada especial, solo reconocer que es una corrección
     * Si el sistema no puede manejar la corrección automáticamente, responde amablemente que entendiste la corrección
   - Mantén el contexto conversacional: si el usuario hace una corrección, reconoce que es una corrección de la consulta anterior
   - Ejemplos de correcciones comunes:
     * "pero te pedí solo 5" → el usuario quiere solo 5 elementos, no más
     * "solo quiero 3" → el usuario corrige el límite a 3
     * "corrige a 10" → el usuario quiere 10 elementos
24. RESPETO DE LÍMITES:
   - Si el usuario especifica un límite exacto (ej: "5 transacciones"), respeta ese límite exactamente
   - NO muestres mensajes de "y X más" cuando el usuario especificó un límite exacto
   - Solo muestra "y X más" cuando NO hay límite explícito y hay más resultados disponibles`;

    logger.debug(`[chatWithAssistant] System prompt constructed with ${cachedContext.accounts.total} accounts for user ${userId}`);

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

    // Handle all QUERY types directly with context data (no LLM needed)
    if (intention.type === 'QUERY' && intention.actionType && intention.actionType !== 'UNKNOWN') {
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
