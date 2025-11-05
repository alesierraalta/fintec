/**
 * Predictions Template
 * 
 * Template para predicciones de gastos futuros.
 */

import { PromptTemplate } from '../types';

/**
 * Crea el template para predecir gastos futuros
 */
export function createPredictionsTemplate(monthlyDataStr: string): PromptTemplate {
  const promptContent = `Eres un analista financiero experto. Analiza los siguientes datos de gastos mensuales y predice el gasto para el próximo mes:

Datos históricos (últimos 6 meses, montos en centavos):
${monthlyDataStr}

Proporciona una predicción detallada. Responde ÚNICAMENTE en formato JSON:
{
  "nextMonthTotal": número,
  "categoryPredictions": [
    {
      "categoryName": "nombre",
      "predicted": número,
      "trend": "up" | "down" | "stable"
    }
  ],
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recomendación 1", "recomendación 2"]
}`;

  return {
    name: 'system',
    version: '1.0.0',
    content: promptContent,
    priority: 8,
    optional: false,
    requiredVariables: ['monthlyDataStr'],
  };
}

/**
 * System prompt para predicciones
 */
export const predictionsSystemPrompt = 'Eres un analista financiero que predice gastos futuros basándose en patrones históricos.';

