/**
 * Executor - Ejecutor de Planes del Agente
 * 
 * Ejecuta planes paso a paso, maneja errores y retries.
 * Valida resultados y decide si continuar o replanificar.
 */

import { logger } from '@/lib/utils/logger';
import { TaskPlan, Task, ToolResult, AgentConfig } from './types';
import { WalletContext } from '../../context-builder';
import { executeAction } from '../../action-executor';

/**
 * Ejecuta un plan completo
 */
export async function executePlan(
  plan: TaskPlan,
  userId: string,
  context: WalletContext,
  config: AgentConfig
): Promise<{ success: boolean; results: ToolResult[]; finalMessage: string }> {
  logger.info(`[executor] Executing plan ${plan.id} with ${plan.tasks.length} tasks`);

  const results: ToolResult[] = [];
  const executedTasks: Task[] = [];

  try {
    // Ejecutar cada tarea en orden
    for (const task of plan.tasks) {
      // Verificar dependencias
      if (task.dependsOn && task.dependsOn.length > 0) {
        const allDepsCompleted = task.dependsOn.every(depId => {
          const depTask = executedTasks.find(t => t.id === depId);
          return depTask && depTask.status === 'completed';
        });

        if (!allDepsCompleted) {
          logger.warn(`[executor] Task ${task.id} has unmet dependencies, skipping`);
          task.status = 'failed';
          task.error = 'Unmet dependencies';
          continue;
        }
      }

      // Marcar tarea como en progreso
      task.status = 'in_progress';
      logger.info(`[executor] Executing task ${task.id}: ${task.toolName}`);

      // Ejecutar la acción
      const result = await executeAction(
        userId,
        task.type,
        task.parameters,
        context
      );

      // Actualizar estado de la tarea
      if (result.success) {
        task.status = 'completed';
        task.result = result.data;
      } else {
        task.status = 'failed';
        task.error = result.error || result.message;
      }

      // Guardar resultado
      results.push({
        success: result.success,
        data: result.data,
        message: result.message,
        error: result.error,
      });

      executedTasks.push(task);

      // Si la tarea falló y es crítica, detener ejecución
      if (!result.success && isCriticalTask(task)) {
        logger.error(`[executor] Critical task ${task.id} failed, stopping execution`);
        break;
      }
    }

    // Generar mensaje final
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    const finalMessage = generateFinalMessage(
      plan,
      results,
      successCount,
      failureCount
    );

    return {
      success: failureCount === 0,
      results,
      finalMessage,
    };
  } catch (error: any) {
    logger.error('[executor] Error executing plan:', error);
    return {
      success: false,
      results,
      finalMessage: `Error al ejecutar el plan: ${error.message}`,
    };
  }
}

/**
 * Determina si una tarea es crítica (debe completarse para continuar)
 */
function isCriticalTask(task: Task): boolean {
  // Las tareas de creación son críticas
  return task.type.startsWith('CREATE_');
}

/**
 * Genera mensaje final basado en los resultados
 */
function generateFinalMessage(
  plan: TaskPlan,
  results: ToolResult[],
  successCount: number,
  failureCount: number
): string {
  if (failureCount === 0) {
    return `✓ Plan ejecutado exitosamente. ${successCount} tarea(s) completada(s).`;
  }

  if (successCount === 0) {
    return `✗ Plan falló. Todas las tareas fallaron.`;
  }

  return `⚠ Plan ejecutado parcialmente. ${successCount} exitosa(s), ${failureCount} fallida(s).`;
}

/**
 * Decide si se debe replanificar basado en los resultados
 */
export function shouldReplan(
  plan: TaskPlan,
  results: ToolResult[]
): boolean {
  // Si todas las tareas fallaron, replanificar
  if (results.every(r => !r.success)) {
    return true;
  }

  // Si más de la mitad de las tareas fallaron, replanificar
  const failureRate = results.filter(r => !r.success).length / results.length;
  if (failureRate > 0.5) {
    return true;
  }

  return false;
}

