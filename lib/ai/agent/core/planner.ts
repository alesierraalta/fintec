/**
 * Planner - Planificador de Tareas del Agente
 * 
 * Descompone tareas complejas en pasos ejecutables.
 * Crea planes optimizados y valida su viabilidad.
 */

import { logger } from '@/lib/utils/logger';
import { TaskPlan, Task, ReasoningResult, AgentConfig } from './types';
import { AI_ACTION_TOOLS, FUNCTION_ACTION_MAP } from '../../action-tools';

/**
 * Genera un plan de tareas basado en el razonamiento
 */
export async function createPlan(
  reasoning: ReasoningResult,
  context: any,
  config: AgentConfig
): Promise<TaskPlan> {
  logger.info(`[planner] Creating plan for intention: ${reasoning.intention}`);

  // Si no requiere planificación, crear plan simple de un solo paso
  if (!reasoning.requiresPlanning && reasoning.suggestedTools.length === 1) {
    return createSimplePlan(reasoning);
  }

  // Si requiere planificación, crear plan multi-paso
  if (reasoning.requiresPlanning || reasoning.suggestedTools.length > 1) {
    return createMultiStepPlan(reasoning, config);
  }

  // Fallback: plan simple
  return createSimplePlan(reasoning);
}

/**
 * Crea un plan simple de un solo paso
 */
function createSimplePlan(reasoning: ReasoningResult): TaskPlan {
  const toolName = reasoning.suggestedTools[0] || 'UNKNOWN';
  const actionType = FUNCTION_ACTION_MAP[toolName] || 'UNKNOWN';

  const task: Task = {
    id: `task-${Date.now()}`,
    type: actionType as any,
    toolName,
    parameters: {},
    description: `Ejecutar ${toolName} para ${reasoning.intention}`,
    status: 'pending',
  };

  return {
    id: `plan-${Date.now()}`,
    tasks: [task],
    estimatedSteps: 1,
    requiresConfirmation: false,
  };
}

/**
 * Crea un plan multi-paso
 */
function createMultiStepPlan(
  reasoning: ReasoningResult,
  config: AgentConfig
): TaskPlan {
  const tasks: Task[] = [];
  let taskIdCounter = 0;

  // Crear tarea para cada herramienta sugerida
  for (const toolName of reasoning.suggestedTools) {
    const actionType = FUNCTION_ACTION_MAP[toolName] || 'UNKNOWN';
    
    const task: Task = {
      id: `task-${taskIdCounter++}`,
      type: actionType as any,
      toolName,
      parameters: {},
      description: `Ejecutar ${toolName}`,
      status: 'pending',
      // Las tareas de análisis pueden ejecutarse en paralelo
      dependsOn: toolName.startsWith('analyze_') || toolName.startsWith('get_') 
        ? undefined 
        : tasks.length > 0 ? [tasks[tasks.length - 1].id] : undefined,
    };

    tasks.push(task);
  }

  // Determinar si requiere confirmación
  const requiresConfirmation = tasks.some(t => 
    config.requireConfirmationFor.includes(t.type)
  );

  return {
    id: `plan-${Date.now()}`,
    tasks,
    estimatedSteps: tasks.length,
    requiresConfirmation,
  };
}

/**
 * Valida si un plan es ejecutable
 */
export function validatePlan(plan: TaskPlan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (plan.tasks.length === 0) {
    errors.push('El plan no tiene tareas');
  }

  // Validar que todas las herramientas existen
  for (const task of plan.tasks) {
    const tool = AI_ACTION_TOOLS.find(t => 
      'function' in t && t.function.name === task.toolName
    );
    if (!tool) {
      errors.push(`Herramienta ${task.toolName} no existe`);
    }
  }

  // Validar dependencias
  const taskIds = new Set(plan.tasks.map(t => t.id));
  for (const task of plan.tasks) {
    if (task.dependsOn) {
      for (const depId of task.dependsOn) {
        if (!taskIds.has(depId)) {
          errors.push(`Tarea ${task.id} depende de ${depId} que no existe`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Optimiza el orden de ejecución de las tareas
 */
export function optimizeTaskOrder(plan: TaskPlan): TaskPlan {
  // Ordenar tareas por dependencias (topological sort simple)
  const sorted: Task[] = [];
  const remaining = [...plan.tasks];
  const completed = new Set<string>();

  while (remaining.length > 0) {
    let progress = false;

    for (let i = remaining.length - 1; i >= 0; i--) {
      const task = remaining[i];
      
      // Si no tiene dependencias o todas sus dependencias están completadas
      if (!task.dependsOn || task.dependsOn.every(depId => completed.has(depId))) {
        sorted.push(task);
        completed.add(task.id);
        remaining.splice(i, 1);
        progress = true;
      }
    }

    // Si no hay progreso, hay un ciclo de dependencias
    if (!progress) {
      logger.warn('[planner] Circular dependency detected, adding remaining tasks');
      sorted.push(...remaining);
      break;
    }
  }

  return {
    ...plan,
    tasks: sorted,
  };
}

