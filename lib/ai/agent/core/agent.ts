/**
 * Agent Core - Núcleo del Agente Agéntico
 * 
 * Orquesta razonamiento, planificación y ejecución.
 * Mantiene estado de la conversación y gestiona contexto.
 * 
 * MEJORAS IMPLEMENTADAS:
 * - Replanificación automática (hasta 2 intentos)
 * - Sistema de confianza gradual (3 niveles)
 * - Manejo de consultas conversacionales
 */

import { logger } from '@/lib/utils/logger';
import { WalletContext } from '../../context-builder';
import { AgentState, AgentConfig } from './types';
import { reasonAboutIntent } from './reasoner';
import { createPlan, validatePlan, optimizeTaskOrder } from './planner';
import { executePlan, shouldReplan } from './executor';
import { generateStreamingResponse } from './response-generator';

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
   * Genera respuesta conversacional para consultas generales
   */
  private generateConversationalResponse(intention: string): string {
    const responses: Record<string, string> = {
      CONVERSATIONAL: `¡Hola! Soy tu asistente financiero personal. Mi propósito es ayudarte a gestionar tus finanzas de manera inteligente.

Puedo ayudarte con:
• 📊 Analizar tus gastos e ingresos
• 💰 Consultar saldos y transacciones
• 📈 Ver tendencias y estadísticas
• 🎯 Gestionar presupuestos y metas
• 💸 Crear y categorizar transacciones

¿En qué puedo ayudarte hoy?`,
    };

    return responses[intention] || '¿En qué puedo ayudarte?';
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

      // Sistema de confianza gradual (3 niveles)
      // Nivel 1: Muy baja confianza (<0.3) - Pedir clarificación
      if (reasoning.confidence < 0.3) {
        return {
          message: `No estoy seguro de entender tu solicitud. ¿Podrías reformularla o darme más detalles?`,
        };
      }

      // Nivel 2: Confianza baja-media (0.3-0.6) - Pedir confirmación antes de ejecutar
      const requiresConfirmationDueToLowConfidence = reasoning.confidence < 0.6;

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
      let optimizedPlan = optimizeTaskOrder(plan);
      this.state.currentPlan = optimizedPlan;

      logger.info(`[agent] Plan created: ${optimizedPlan.tasks.length} task(s)`);

      // Si no hay tareas, es una consulta conversacional
      if (optimizedPlan.tasks.length === 0) {
        logger.info(`[agent] Conversational query, generating direct response`);
        return {
          message: this.generateConversationalResponse(reasoning.intention),
        };
      }

      // Si requiere confirmación (por plan o por baja confianza), retornar sin ejecutar
      if ((optimizedPlan.requiresConfirmation || requiresConfirmationDueToLowConfidence) && !this.config.enableAutoExecution) {
        const confidenceNote = requiresConfirmationDueToLowConfidence
          ? `\n\n(Nota: Tengo ${Math.round(reasoning.confidence * 100)}% de confianza en esta interpretación)`
          : '';

        return {
          message: `Para completar tu solicitud, necesito ejecutar las siguientes acciones:\n${optimizedPlan.tasks.map(t => `- ${t.description}`).join('\n')}\n¿Deseas continuar?${confidenceNote}`,
          requiresConfirmation: true,
        };
      }

      // Paso 3: Ejecución con replanificación automática
      let executionResult = await executePlan(
        optimizedPlan,
        userId,
        this.state.context,
        this.config
      );

      // Actualizar estado con tareas completadas
      this.state.completedTasks.push(...optimizedPlan.tasks.filter(t => t.status === 'completed'));

      // Si debe replanificar, intentar hasta 2 veces
      let replanAttempts = 0;
      const MAX_REPLAN_ATTEMPTS = 2;

      while (shouldReplan(optimizedPlan, executionResult.results) && replanAttempts < MAX_REPLAN_ATTEMPTS) {
        replanAttempts++;
        logger.info(`[agent] Replanning attempt ${replanAttempts}/${MAX_REPLAN_ATTEMPTS} due to failures`);

        // Analizar qué falló y por qué
        const failedTasks = optimizedPlan.tasks.filter(t => t.status === 'failed');
        const failureReasons = failedTasks.map(t => t.error || 'Unknown error').join('; ');

        // Crear un nuevo razonamiento considerando los errores
        const replanReasoning = await reasonAboutIntent(
          `${userMessage} (anterior intento falló: ${failureReasons})`,
          this.state.context,
          this.config
        );

        // Crear nuevo plan
        const newPlan = await createPlan(replanReasoning, this.state.context, this.config, userMessage);
        const newValidation = validatePlan(newPlan);

        if (!newValidation.valid) {
          logger.error(`[agent] Replan validation failed:`, newValidation.errors);
          break; // No podemos crear un plan válido, salir del loop
        }

        // Optimizar y ejecutar nuevo plan
        const newOptimizedPlan = optimizeTaskOrder(newPlan);
        executionResult = await executePlan(
          newOptimizedPlan,
          userId,
          this.state.context,
          this.config
        );

        // Actualizar estado con nuevas tareas completadas
        this.state.completedTasks.push(...newOptimizedPlan.tasks.filter(t => t.status === 'completed'));
        optimizedPlan = newOptimizedPlan; // Actualizar referencia para siguiente iteración
      }

      this.state.currentPlan = undefined;

      // Agregar información sobre replanificación al mensaje si ocurrió
      let finalMessage = executionResult.finalMessage;
      if (replanAttempts > 0) {
        if (executionResult.success) {
          finalMessage = `✓ Completado después de ${replanAttempts} reintento(s). ${finalMessage}`;
        } else {
          finalMessage = `⚠ Intenté ${replanAttempts} reintento(s) pero no pude completar la tarea. ${finalMessage}`;
        }
      }

      return {
        message: finalMessage,
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
   * Procesa un mensaje del usuario y genera una respuesta con streaming
   */
  async *processMessageStream(
    userMessage: string,
    userId: string
  ): AsyncGenerator<{ type: 'content' | 'done'; text?: string; requiresConfirmation?: boolean }> {
    logger.info(`[agent] Processing message with streaming: "${userMessage.substring(0, 50)}..."`);

    try {
      // Paso 1: Razonamiento
      const reasoning = await reasonAboutIntent(
        userMessage,
        this.state.context,
        this.config
      );

      this.state.reasoningHistory.push(reasoning);
      logger.info(`[agent] Reasoning completed: ${reasoning.intention} (confidence: ${reasoning.confidence})`);

      // Sistema de confianza gradual
      if (reasoning.confidence < 0.3) {
        yield {
          type: 'content',
          text: `No estoy seguro de entender tu solicitud. ¿Podrías reformularla o darme más detalles?`,
        };
        yield { type: 'done' };
        return;
      }

      const requiresConfirmationDueToLowConfidence = reasoning.confidence < 0.6;

      // Paso 2: Planificación
      const plan = await createPlan(reasoning, this.state.context, this.config, userMessage);
      const validation = validatePlan(plan);

      if (!validation.valid) {
        logger.error(`[agent] Plan validation failed:`, validation.errors);
        yield {
          type: 'content',
          text: `No pude crear un plan válido para tu solicitud. ${validation.errors.join(', ')}`,
        };
        yield { type: 'done' };
        return;
      }

      // Optimizar orden de tareas
      const optimizedPlan = optimizeTaskOrder(plan);
      this.state.currentPlan = optimizedPlan;

      logger.info(`[agent] Plan created: ${optimizedPlan.tasks.length} task(s)`);

      // Si no hay tareas, es una consulta conversacional
      if (optimizedPlan.tasks.length === 0) {
        yield {
          type: 'content',
          text: this.generateConversationalResponse(reasoning.intention),
        };
        yield { type: 'done' };
        return;
      }

      // Si requiere confirmación, retornar sin ejecutar
      if ((optimizedPlan.requiresConfirmation || requiresConfirmationDueToLowConfidence) && !this.config.enableAutoExecution) {
        const confidenceNote = requiresConfirmationDueToLowConfidence
          ? `\n\n(Nota: Tengo ${Math.round(reasoning.confidence * 100)}% de confianza en esta interpretación)`
          : '';

        yield {
          type: 'content',
          text: `Para completar tu solicitud, necesito ejecutar las siguientes acciones:\n${optimizedPlan.tasks.map(t => `- ${t.description}`).join('\n')}\n¿Deseas continuar?${confidenceNote}`,
        };
        yield {
          type: 'done',
          requiresConfirmation: true,
        };
        return;
      }

      // Paso 3: Ejecución
      const executionResult = await executePlan(
        optimizedPlan,
        userId,
        this.state.context,
        this.config
      );

      // Actualizar estado
      this.state.completedTasks.push(...optimizedPlan.tasks.filter(t => t.status === 'completed'));
      this.state.currentPlan = undefined;

      // Si debe replanificar (en streaming no replanificamos automáticamente por ahora)
      if (shouldReplan(optimizedPlan, executionResult.results)) {
        logger.info('[agent] Replanning needed but skipped in streaming mode');
      }

      // Paso 4: Generar respuesta streaming usando OpenAI
      const streamingGenerator = generateStreamingResponse(
        userMessage,
        executionResult.results,
        this.state.context
      );

      // Yield chunks del stream
      for await (const chunk of streamingGenerator) {
        yield chunk;
      }
    } catch (error: any) {
      logger.error('[agent] Error processing message with streaming:', error);
      yield {
        type: 'content',
        text: `Lo siento, ocurrió un error al procesar tu mensaje: ${error.message}`,
      };
      yield { type: 'done' };
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
