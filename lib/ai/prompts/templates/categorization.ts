/**
 * Categorization Template
 * 
 * Template para categorización automática de transacciones.
 */

import { PromptTemplate } from '../types';

/**
 * Crea el template para categorizar una transacción
 */
export function createCategorizationTemplate(
  description: string,
  amount: number,
  merchantInfo: string | undefined,
  categoriesList: string,
  transactionExamples: string
): PromptTemplate {
  const promptContent = `Eres un asistente financiero experto. Categoriza la siguiente transacción:

Descripción: ${description}
Monto: $${(amount / 100).toFixed(2)}
${merchantInfo ? `Comerciante: ${merchantInfo}` : ''}

Categorías disponibles: ${categoriesList}

Ejemplos de transacciones previas del usuario:
${transactionExamples || 'No hay ejemplos previos'}

Analiza la transacción y sugiere la categoría más apropiada. Responde ÚNICAMENTE en formato JSON:
{
  "categoryName": "nombre de la categoría",
  "confidence": 0.0-1.0,
  "reason": "breve explicación"
}`;

  return {
    name: 'system',
    version: '1.0.0',
    content: promptContent,
    priority: 8,
    optional: false,
    requiredVariables: ['description', 'amount', 'categoriesList'],
  };
}

/**
 * System prompt para categorización
 */
export const categorizationSystemPrompt = 'Eres un experto en finanzas personales que categoriza transacciones de manera precisa.';

