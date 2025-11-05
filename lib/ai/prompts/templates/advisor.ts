/**
 * Advisor Template
 * 
 * Template para generar consejos financieros personalizados.
 */

import { PromptTemplate } from '../types';

/**
 * Crea el template para análisis financiero y consejos
 */
export function createAdvisorTemplate(financialData: any): PromptTemplate {
  const promptContent = `Eres un asesor financiero personal experto. Analiza la siguiente información financiera y proporciona consejos personalizados y accionables:

${JSON.stringify(financialData, null, 2)}

Proporciona un análisis completo. Responde ÚNICAMENTE en formato JSON:
{
  "summary": "resumen general de la situación financiera",
  "advice": [
    {
      "category": "categoría o área",
      "suggestion": "consejo específico",
      "priority": "high" | "medium" | "low",
      "potentialSavings": número opcional
    }
  ],
  "strengths": ["fortaleza 1", "fortaleza 2"],
  "areasForImprovement": ["área 1", "área 2"]
}`;

  return {
    name: 'system',
    version: '1.0.0',
    content: promptContent,
    priority: 8,
    optional: false,
    requiredVariables: ['financialData'],
  };
}

/**
 * System prompt para el asesor financiero
 */
export const advisorSystemPrompt = 'Eres un asesor financiero certificado que brinda consejos prácticos y personalizados.';

