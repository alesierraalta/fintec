/**
 * Anomaly Detection Template
 * 
 * Template para detección de anomalías y fraudes en transacciones.
 */

import { PromptTemplate } from '../types';

/**
 * Crea el template para detectar anomalías en transacciones
 */
export function createAnomalyDetectionTemplate(
  recentData: any[],
  historicalStats: any[]
): PromptTemplate {
  const promptContent = `Eres un detector de fraudes y anomalías financieras. Analiza estas transacciones recientes y detecta cualquier actividad inusual:

Transacciones recientes (últimos 30 días):
${JSON.stringify(recentData, null, 2)}

Estadísticas históricas:
${JSON.stringify(historicalStats, null, 2)}

Identifica transacciones anómalas (montos inusuales, patrones extraños, etc.). Responde ÚNICAMENTE en formato JSON:
{
  "anomalies": [
    {
      "transactionId": "id",
      "type": "unusual_amount" | "unusual_merchant" | "unusual_category" | "unusual_frequency",
      "severity": "high" | "medium" | "low",
      "explanation": "por qué es inusual",
      "recommendation": "qué hacer al respecto"
    }
  ]
}`;

  return {
    name: 'system',
    version: '1.0.0',
    content: promptContent,
    priority: 8,
    optional: false,
    requiredVariables: ['recentData', 'historicalStats'],
  };
}

/**
 * System prompt para detección de anomalías
 */
export const anomalyDetectionSystemPrompt = 'Eres un experto en detección de anomalías financieras y prevención de fraudes.';

