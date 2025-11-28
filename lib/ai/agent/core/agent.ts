/**
 * Agent Core - Núcleo del Agente Agéntico
 * 
 * Orquesta razonamiento, planificación y ejecución.
 * Usa Sequential Thinking MCP para razonamiento paso a paso.
 * Mantiene estado de la conversación y gestiona contexto.
 */

import { logger } from '@/lib/utils/logger';
import { WalletContext } from '../../context-builder';
import { AgentState, AgentConfig, ReasoningResult, TaskPlan } from './types';
import { reasonAboutIntent } from './reasoner';
import { createPlan, validatePlan, optimizeTaskOrder } from './planner';
import { executePlan, shouldReplan } from './executor';

/**
 * Configuración por defecto del agente
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  useSequentialThinking: true,
  maxPlanningDepth: 5,
  enableAutoExecution: true,
  requireConfirmationFor: ['CREATE_TRANSFER'],
};

/**
 * Clase principal del Agente
 */
export class Agent {
  private state: AgentState;
  private config: AgentConfig;

  constructor(context: WalletContext, config?: Partial<AgentConfig>) {
    this.state = {
      completedTasks: [],
      context,
      reasoningHistory: [],
    };
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
  }

  /**
   * Procesa un mensaje del usuario y genera una respuesta
   */
  async processMessage(
    userMessage: string,
    userId: string
  ): Promise<{ message: string; requiresConfirmation?: boolean }> {
    logger.info(`[agent] Processing message: "${userMessage.substring(0, 50)}..."`);

    try {
      // Paso 1: Razonamiento
      const reasoning = await reasonAboutIntent(
        userMessage,
        this.state.context,
        this.config
      );

      this.state.reasoningHistory.push(reasoning);
      logger.info(`[agent] Reasoning completed: ${reasoning.intention} (confidence: ${reasoning.confidence})`);

      // Si la confianza es muy baja, preguntar al usuario
      if (reasoning.confidence < 0.5) {
        return {
          message: `No estoy seguro de entender tu solicitud. ¿Podrías ser más específico?`,
        };
      }

      // Paso 2: Planificación
      const plan = await createPlan(reasoning, this.state.context, this.config);
      const validation = validatePlan(plan);

      if (!validation.valid) {
        logger.error(`[agent] Plan validation failed:`, validation.errors);
        return {
          message: `No pude crear un plan válido para tu solicitud. ${validation.errors.join(', ')}`,
        };
      }

      // Optimizar orden de tareas
      const optimizedPlan = optimizeTaskOrder(plan);
      this.state.currentPlan = optimizedPlan;

      logger.info(`[agent] Plan created: ${optimizedPlan.tasks.length} task(s)`);

      // Si requiere confirmación, retornar sin ejecutar
      if (optimizedPlan.requiresConfirmation && !this.config.enableAutoExecution) {
        return {
          message: `Para completar tu solicitud, necesito ejecutar las siguientes acciones:\n${optimizedPlan.tasks.map(t => `- ${t.description}`).join('\n')}\n¿Deseas continuar?`,
          requiresConfirmation: true,
        };
      }

      // Paso 3: Ejecución
      const executionResult = await executePlan(
        optimizedPlan,
        userId,
        this.state.context,
        this.config
      );

      // Actualizar estado
      this.state.completedTasks.push(...optimizedPlan.tasks);
      this.state.currentPlan = undefined;

      // Si debe replanificar
      if (shouldReplan(optimizedPlan, executionResult.results)) {
        logger.info('[agent] Replanning due to failures');
        // Por ahora, retornar el mensaje de error
        // En el futuro, podríamos intentar replanificar automáticamente
      }

      return {
        message: executionResult.finalMessage,
        requiresConfirmation: false,
      };
    } catch (error: any) {
      logger.error('[agent] Error processing message:', error);
      return {
        message: `Lo siento, ocurrió un error al procesar tu mensaje: ${error.message}`,
      };
    }
  }

  /**
   * Actualiza el contexto del agente
   */
  updateContext(context: WalletContext): void {
    this.state.context = context;
  }

  /**
   * Obtiene el estado actual del agente
   */
  getState(): AgentState {
    return { ...this.state };
  }
}

