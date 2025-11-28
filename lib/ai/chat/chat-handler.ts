/**
 * Chat Handler - Handler Principal del Chat
 * 
 * Reemplaza chat-assistant.ts con nueva arquitectura agéntica.
 * Maneja conversaciones usando el agente agéntico.
 */

import { logger } from '@/lib/utils/logger';
import { WalletContext, buildWalletContext } from '../context-builder';
import { Agent, DEFAULT_AGENT_CONFIG } from '../agent/core/agent';
import { processMessage, ProcessedMessage } from './message-processor';
import { getCachedContext, setCachedContext } from '../cache-manager';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  requiresConfirmation?: boolean;
  action?: {
    type: string;
    parameters: Record<string, any>;
    requiresConfirmation: boolean;
    confirmationMessage?: string;
  };
  debugLogs?: Array<{ level: 'debug' | 'info' | 'warn' | 'error'; message: string; timestamp: number }>;
}

/**
 * Maneja una conversación con el agente agéntico
 */
export async function chatWithAgent(
  userId: string,
  messages: ChatMessage[],
  sessionId?: string,
  disableTools?: boolean
): Promise<ChatResponse> {
  const debugLogs: Array<{ level: 'debug' | 'info' | 'warn' | 'error'; message: string; timestamp: number }> = [];
  
  const collectLog = (level: 'debug' | 'info' | 'warn' | 'error', message: string) => {
    debugLogs.push({ level, message, timestamp: Date.now() });
    if (process.env.NODE_ENV === 'development') {
      logger[level](message);
    }
  };

  try {
    collectLog('info', `[chat-handler] Processing chat for user ${userId}`);

    // Obtener último mensaje del usuario
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return {
        message: 'No se recibió ningún mensaje del usuario.',
        debugLogs,
      };
    }

    const userMessage = lastUserMessage.content;
    collectLog('debug', `[chat-handler] User message: "${userMessage.substring(0, 50)}..."`);

    // Construir o recuperar contexto
    let context: WalletContext;
    const cachedContext = await getCachedContext(userId);
    
    if (cachedContext) {
      collectLog('debug', '[chat-handler] Using cached context');
      context = cachedContext;
    } else {
      collectLog('info', '[chat-handler] Building new context');
      context = await buildWalletContext(userId, userMessage);
      await setCachedContext(userId, context);
    }

    // Procesar mensaje
    const processedMessage = processMessage(userMessage, context);
    collectLog('debug', `[chat-handler] Processed message - intent: ${processedMessage.intent}`);

    // Crear o recuperar agente
    // Por simplicidad, creamos un nuevo agente cada vez
    // En el futuro, podríamos mantener instancias por sesión
    const agentConfig = {
      ...DEFAULT_AGENT_CONFIG,
      enableAutoExecution: !disableTools, // Si disableTools es true, deshabilitar auto-ejecución
    };
    const agent = new Agent(context, agentConfig);

    // Procesar mensaje con el agente
    collectLog('info', '[chat-handler] Agent processing message');
    const agentResponse = await agent.processMessage(userMessage, userId);

    collectLog('info', '[chat-handler] Agent response received');

    // Construir respuesta con estructura compatible con frontend
    const response: ChatResponse = {
      message: agentResponse.message,
      requiresConfirmation: agentResponse.requiresConfirmation,
      debugLogs,
    };

    // Si requiere confirmación, extraer detalles de la acción del plan actual
    if (agentResponse.requiresConfirmation) {
      const agentState = agent.getState();
      if (agentState.currentPlan && agentState.currentPlan.tasks.length > 0) {
        const firstTask = agentState.currentPlan.tasks[0];
        response.action = {
          type: firstTask.type,
          parameters: firstTask.parameters,
          requiresConfirmation: true,
          confirmationMessage: agentResponse.message,
        };
      }
    }

    return response;
  } catch (error: any) {
    collectLog('error', `[chat-handler] Error: ${error.message}`);
    logger.error('[chat-handler] Error:', error);
    
    return {
      message: `Lo siento, ocurrió un error al procesar tu mensaje: ${error.message}`,
      debugLogs,
    };
  }
}

/**
 * Maneja una conversación con el agente agéntico usando streaming
 */
export async function* chatWithAgentStream(
  userId: string,
  messages: ChatMessage[],
  sessionId?: string,
  disableTools?: boolean
): AsyncGenerator<{ type: 'content' | 'done'; text?: string }> {
  try {
    logger.info(`[chat-handler] Processing chat with streaming for user ${userId}`);

    // Obtener último mensaje del usuario
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      yield {
        type: 'content',
        text: 'No se recibió ningún mensaje del usuario.',
      };
      yield { type: 'done' };
      return;
    }

    const userMessage = lastUserMessage.content;
    logger.debug(`[chat-handler] User message: "${userMessage.substring(0, 50)}..."`);

    // Construir o recuperar contexto
    let context: WalletContext;
    const cachedContext = await getCachedContext(userId);
    
    if (cachedContext) {
      logger.debug('[chat-handler] Using cached context');
      context = cachedContext;
    } else {
      logger.info('[chat-handler] Building new context');
      context = await buildWalletContext(userId, userMessage);
      await setCachedContext(userId, context);
    }

    // Procesar mensaje
    const processedMessage = processMessage(userMessage, context);
    logger.debug(`[chat-handler] Processed message - intent: ${processedMessage.intent}`);

    // Crear agente con configuración
    const agentConfig = {
      ...DEFAULT_AGENT_CONFIG,
      enableAutoExecution: !disableTools, // Si disableTools es true, deshabilitar auto-ejecución
    };
    const agent = new Agent(context, agentConfig);

    // Procesar mensaje con streaming
    logger.info('[chat-handler] Agent processing message with streaming');
    const agentStream = agent.processMessageStream(userMessage, userId);

    // Yield chunks del agente
    for await (const chunk of agentStream) {
      // Yield el chunk (sin requiresConfirmation, ya que el frontend no lo espera en el stream)
      yield {
        type: chunk.type,
        text: chunk.text,
      };
    }

    logger.info('[chat-handler] Streaming completed');
  } catch (error: any) {
    logger.error('[chat-handler] Error in streaming:', error);
    
    // En caso de error, yield mensaje de error
    yield {
      type: 'content',
      text: `Lo siento, ocurrió un error al procesar tu mensaje: ${error.message}`,
    };
    yield { type: 'done' };
  }
}

