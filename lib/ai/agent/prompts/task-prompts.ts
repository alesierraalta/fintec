/**
 * Task Prompts - Prompts Específicos por Tipo de Tarea
 * 
 * Prompts específicos para diferentes tipos de tareas que el agente puede realizar.
 */

/**
 * Prompt para tareas de análisis
 */
export function getAnalysisTaskPrompt(taskDescription: string, context: string): string {
  return `Tarea: ${taskDescription}

Contexto disponible:
${context}

Instrucciones:
- Analiza los datos proporcionados
- Calcula métricas relevantes (promedios, porcentajes, tendencias)
- Proporciona insights accionables
- Responde en español de forma clara y profesional`;
}

/**
 * Prompt para tareas de consulta
 */
export function getQueryTaskPrompt(query: string, context: string): string {
  return `Consulta: ${query}

Contexto disponible:
${context}

Instrucciones:
- Responde directamente con la información solicitada
- Si la información no está disponible, indícalo amablemente
- Proporciona detalles relevantes cuando sea útil
- Responde en español de forma clara y concisa`;
}

/**
 * Prompt para tareas de creación
 */
export function getCreateTaskPrompt(action: string, parameters: Record<string, any>): string {
  return `Acción: ${action}

Parámetros:
${JSON.stringify(parameters, null, 2)}

Instrucciones:
- Ejecuta la acción con los parámetros proporcionados
- Valida que todos los parámetros requeridos estén presentes
- Si falta información, pregunta específicamente por lo que falta
- Confirma la acción cuando se complete exitosamente`;
}

/**
 * Prompt para razonamiento con Sequential Thinking
 */
export function getReasoningPrompt(userMessage: string, context: string): string {
  return `Analiza la siguiente consulta del usuario usando razonamiento paso a paso:

Consulta: "${userMessage}"

Contexto disponible:
${context}

Proceso de razonamiento:
1. ¿Cuál es la intención principal del usuario?
2. ¿Qué información necesitas para responder?
3. ¿Qué herramientas debes usar?
4. ¿Requiere planificación de múltiples pasos?
5. ¿Cuál es la mejor forma de responder?

Responde con tu razonamiento estructurado.`;
}

