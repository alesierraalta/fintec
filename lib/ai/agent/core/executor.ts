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
 * Ejecuta un plan completo con soporte para ejecución paralela
 * Las tareas sin dependencias se ejecutan en paralelo para mejorar performance
 */
export async function executePlan(
  plan: TaskPlan,
  userId: string,
  context: WalletContext,
  config: AgentConfig
): Promise<{ success: boolean; results: ToolResult[]; finalMessage: string }> {
  logger.info(`[executor] Executing plan ${plan.id} with ${plan.tasks.length} tasks`);

  const taskResultsMap = new Map<string, ToolResult>();
  const executedTasks = new Map<string, Task>();
  let shouldStop = false;

  try {
    // Agrupar tareas en "waves" (niveles de ejecución paralela)
    const waves = groupTasksIntoWaves(plan.tasks);
    logger.info(`[executor] Grouped tasks into ${waves.length} execution wave(s)`);

    // Ejecutar cada wave en paralelo
    for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
      const wave = waves[waveIndex];

      if (shouldStop) {
        logger.info(`[executor] Stopping execution due to critical task failure`);
        break;
      }

      logger.info(`[executor] Executing wave ${waveIndex + 1}/${waves.length} with ${wave.length} task(s)`);

      // Ejecutar todas las tareas de esta wave en paralelo
      const wavePromises = wave.map(async (task) => {
        // Verificar dependencias (deberían estar completadas por waves anteriores)
        if (task.dependsOn && task.dependsOn.length > 0) {
          const allDepsCompleted = task.dependsOn.every(depId => {
            const depTask = executedTasks.get(depId);
            return depTask && depTask.status === 'completed';
          });

          if (!allDepsCompleted) {
            logger.warn(`[executor] Task ${task.id} has unmet dependencies, skipping`);
            task.status = 'failed';
            task.error = 'Unmet dependencies';
            return { task, result: null };
          }
        }

        // Marcar tarea como en progreso
        task.status = 'in_progress';
        logger.info(`[executor] Executing task ${task.id}: ${task.toolName}`);

        try {
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

          return { task, result };
        } catch (error: any) {
          logger.error(`[executor] Error executing task ${task.id}:`, error);
          task.status = 'failed';
          task.error = error.message;
          return {
            task,
            result: {
              success: false,
              message: `Error: ${error.message}`,
              error: error.message,
              data: undefined,
            },
          };
        }
      });

      // Esperar a que todas las tareas de la wave terminen
      const waveResults = await Promise.all(wavePromises);

      // Procesar resultados de la wave
      for (const { task, result } of waveResults) {
        executedTasks.set(task.id, task);

        if (result) {
          const toolResult: ToolResult = {
            success: result.success,
            data: result.data ?? undefined,
            message: result.message,
            error: result.error,
          };
          taskResultsMap.set(task.id, toolResult);

          // Si la tarea falló y es crítica, marcar para detener ejecución
          if (!result.success && isCriticalTask(task)) {
            logger.error(`[executor] Critical task ${task.id} failed, will stop after this wave`);
            shouldStop = true;
          }
        }
      }
    }

    // Convertir resultados a array en el orden original de las tareas
    const results: ToolResult[] = plan.tasks
      .map(task => taskResultsMap.get(task.id))
      .filter((r): r is ToolResult => r !== undefined);

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

    // Convertir resultados parciales
    const results: ToolResult[] = plan.tasks
      .map(task => taskResultsMap.get(task.id))
      .filter((r): r is ToolResult => r !== undefined);

    return {
      success: false,
      results,
      finalMessage: `Error al ejecutar el plan: ${error.message}`,
    };
  }
}

/**
 * Agrupa tareas en "waves" para ejecución paralela
 * Cada wave contiene tareas que pueden ejecutarse en paralelo (sin dependencias entre ellas)
 */
function groupTasksIntoWaves(tasks: Task[]): Task[][] {
  const waves: Task[][] = [];
  const remaining = [...tasks];
  const completed = new Set<string>();

  while (remaining.length > 0) {
    // Encontrar todas las tareas que pueden ejecutarse ahora
    // (sin dependencias o con todas las dependencias completadas)
    const currentWave: Task[] = [];

    for (let i = remaining.length - 1; i >= 0; i--) {
      const task = remaining[i];

      if (!task.dependsOn || task.dependsOn.length === 0) {
        // Sin dependencias, puede ejecutarse
        currentWave.push(task);
        remaining.splice(i, 1);
      } else if (task.dependsOn.every(depId => completed.has(depId))) {
        // Todas las dependencias completadas
        currentWave.push(task);
        remaining.splice(i, 1);
      }
    }

    if (currentWave.length === 0) {
      // No hay progreso, hay dependencias circulares o no resueltas
      logger.warn('[executor] Circular dependencies detected or unresolved dependencies, adding remaining tasks to final wave');
      waves.push(remaining);
      break;
    }

    // Marcar tareas de esta wave como completadas para la siguiente iteración
    currentWave.forEach(task => completed.add(task.id));
    waves.push(currentWave);
  }

  return waves;
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

