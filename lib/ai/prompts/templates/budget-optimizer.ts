/**
 * Budget Optimizer Template
 * 
 * Template para optimización de presupuestos.
 */

import { PromptTemplate } from '../types';

/**
 * Crea el template para optimizar presupuestos
 */
export function createBudgetOptimizerTemplate(budgetData: any[]): PromptTemplate {
  const promptContent = `Eres un experto en optimización de presupuestos. Analiza los siguientes presupuestos y el gasto real, y sugiere ajustes óptimos:

${JSON.stringify(budgetData, null, 2)}

Proporciona recomendaciones para cada categoría. Responde ÚNICAMENTE en formato JSON:
{
  "optimizations": [
    {
      "categoryId": "id",
      "categoryName": "nombre",
      "suggestedBudget": número,
      "reason": "explicación del cambio",
      "potentialSavings": número (puede ser negativo si se aumenta)
    }
  ]
}`;

  return {
    name: 'system',
    version: '1.0.0',
    content: promptContent,
    priority: 8,
    optional: false,
    requiredVariables: ['budgetData'],
  };
}

/**
 * System prompt para optimización de presupuestos
 */
export const budgetOptimizerSystemPrompt = 'Eres un experto en optimización de presupuestos financieros.';

