/**
 * Response Generator - Generador de Respuestas con Streaming
 * 
 * Genera respuestas conversacionales usando OpenAI streaming.
 * Formatea resultados de herramientas y genera respuestas en tiempo real.
 */

import { logger } from '@/lib/utils/logger';
import { openai, AI_MODEL, getTemperatureConfig, AI_MAX_COMPLETION_TOKENS } from '../../config';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';
import { WalletContext } from '../../context-builder';
import { ToolResult } from './types';

/**
 * Formatea resultados de herramientas para incluir en el prompt
 */
export function formatToolResultsForPrompt(
  toolResults: ToolResult[],
  planDescription?: string
): string {
  if (toolResults.length === 0) {
    return 'No se ejecutaron herramientas.';
  }

  const formattedResults: string[] = [];
  
  for (const result of toolResults) {
    if (result.success) {
      // Formatear resultado exitoso
      let resultText = '✓ Ejecutado exitosamente';
      
      if (result.message) {
        resultText += `: ${result.message}`;
      }
      
      // Incluir datos relevantes si están disponibles
      if (result.data) {
        // Para análisis, incluir métricas clave
        if (result.data.expenses !== undefined || result.data.income !== undefined) {
          resultText += `\n  - Ingresos: $${(result.data.income || 0).toFixed(2)}`;
          resultText += `\n  - Gastos: $${(result.data.expenses || 0).toFixed(2)}`;
          resultText += `\n  - Ahorros: $${((result.data.income || 0) - (result.data.expenses || 0)).toFixed(2)}`;
        }
        
        // Para promedios mensuales
        if (result.data.averageMonthlyExpenses !== undefined) {
          resultText += `\n  - Promedio mensual de gastos: $${result.data.averageMonthlyExpenses.toFixed(2)}`;
        }
        if (result.data.averageMonthlyIncome !== undefined) {
          resultText += `\n  - Promedio mensual de ingresos: $${result.data.averageMonthlyIncome.toFixed(2)}`;
        }
        
        // Para query_financial_data - datos estructurados
        if (result.data.summary && result.data.data) {
          const summary = result.data.summary;
          resultText += `\n  - Período: ${summary.period}`;
          resultText += `\n  - Total ingresos: $${summary.totalIncome.toFixed(2)}`;
          resultText += `\n  - Total gastos: $${summary.totalExpense.toFixed(2)}`;
          resultText += `\n  - Transacciones: ${summary.totalTransactions}`;
          
          // Si hay datos agrupados, incluir resumen
          if (result.data.data.length > 0 && result.data.data.length <= 12) {
            resultText += `\n  - Datos por período:`;
            result.data.data.slice(0, 6).forEach((item: any) => {
              if (item.income !== undefined || item.expense !== undefined) {
                const period = item.period || item.category || 'N/A';
                const income = item.income ? ` Ingresos: $${item.income.toFixed(2)}` : '';
                const expense = item.expense ? ` Gastos: $${item.expense.toFixed(2)}` : '';
                resultText += `\n    ${period}:${income}${expense}`;
              }
            });
          }
        }
      }
      
      formattedResults.push(resultText);
    } else {
      // Formatear error
      formattedResults.push(`✗ Error: ${result.error || result.message || 'Error desconocido'}`);
    }
  }

  return formattedResults.join('\n\n');
}

/**
 * Genera respuesta streaming usando OpenAI
 * Retorna un AsyncGenerator que yield chunks en formato SSE
 */
export async function* generateStreamingResponse(
  userMessage: string,
  toolResults: ToolResult[],
  context: WalletContext,
  systemPrompt?: string
): AsyncGenerator<{ type: 'content' | 'done'; text?: string }> {
  try {
    // Formatear resultados de herramientas
    const toolResultsText = formatToolResultsForPrompt(toolResults);
    
    // Construir mensajes para OpenAI
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt || SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `Consulta del usuario: "${userMessage}"

Resultados de herramientas ejecutadas:
${toolResultsText}

Contexto financiero disponible:
- Cuentas: ${context.accounts.total} cuentas activas
- Ingresos del mes: $${context.transactions.summary.incomeThisMonth.toFixed(2)}
- Gastos del mes: $${context.transactions.summary.expensesThisMonth.toFixed(2)}
- Presupuestos activos: ${context.budgets.active.length}
- Metas activas: ${context.goals.active.length}

Genera una respuesta conversacional, natural y útil en español basada en los resultados de las herramientas. Explica los datos de forma clara y proporciona insights prácticos cuando sea relevante.`,
      },
    ];

    logger.info('[response-generator] Starting OpenAI streaming');

    // Crear stream de OpenAI
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: messages as any,
      ...getTemperatureConfig(),
      max_completion_tokens: AI_MAX_COMPLETION_TOKENS,
      stream: true,
    });

    // Iterar sobre chunks y yield en formato SSE
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield {
          type: 'content',
          text: content,
        };
      }
    }

    // Yield done al finalizar
    yield {
      type: 'done',
    };

    logger.info('[response-generator] OpenAI streaming completed');
  } catch (error: any) {
    logger.error('[response-generator] Error in streaming:', error);
    
    // En caso de error, yield mensaje de error
    const errorMessage = `Lo siento, ocurrió un error al generar la respuesta: ${error.message}`;
    yield {
      type: 'content',
      text: errorMessage,
    };
    yield {
      type: 'done',
    };
  }
}

