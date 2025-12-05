/**
 * Reasoner - Motor de Razonamiento del Agente
 * 
 * Integra Sequential Thinking MCP para razonamiento paso a paso.
 * Analiza la intención del usuario y genera hipótesis sobre qué herramientas usar.
 */

import { logger } from '@/lib/utils/logger';
import { ReasoningResult, AgentConfig } from './types';
import { WalletContext } from '../../context-builder';

/**
 * Analiza el mensaje del usuario y genera razonamiento sobre la intención
 * Usa Sequential Thinking MCP para razonamiento estructurado
 */
export async function reasonAboutIntent(
  userMessage: string,
  context: WalletContext,
  config: AgentConfig
): Promise<ReasoningResult> {
  logger.info(`[reasoner] Starting reasoning for message: "${userMessage.substring(0, 50)}..."`);

  try {
    // Si Sequential Thinking está habilitado, usarlo para razonamiento estructurado
    if (config.useSequentialThinking) {
      return await reasonWithSequentialThinking(userMessage, context);
    }

    // Fallback a razonamiento simple si Sequential Thinking no está disponible
    return await reasonSimple(userMessage, context);
  } catch (error: any) {
    logger.error('[reasoner] Error during reasoning:', error);
    // Fallback a razonamiento simple en caso de error
    return await reasonSimple(userMessage, context);
  }
}

/**
 * Razonamiento usando Sequential Thinking MCP
 * TODO: Integrar con LLM classification para mejor robustez
 */
async function reasonWithSequentialThinking(
  userMessage: string,
  context: WalletContext
): Promise<ReasoningResult> {
  // Construir contexto para el razonamiento
  const contextSummary = buildContextSummary(context);

  try {
    // Por ahora, usar razonamiento mejorado con regex
    // En el futuro, integrar con OpenAI para clasificación más robusta
    return await reasonEnhanced(userMessage, context);
  } catch (error: any) {
    logger.warn('[reasoner] Sequential Thinking failed, falling back to simple reasoning');
    return await reasonSimple(userMessage, context);
  }
}

/**
 * Razonamiento mejorado (con más lógica que el simple)
 */
async function reasonEnhanced(
  userMessage: string,
  context: WalletContext
): Promise<ReasoningResult> {
  const lowerMessage = userMessage.toLowerCase();

  // Detectar intención con más precisión
  let intention = 'UNKNOWN';
  let confidence = 0.5;
  const suggestedTools: string[] = [];
  let requiresPlanning = false;

  // Detectar consultas sobre promedios (caso específico del problema original)
  if (/promedio|average|media|mean/i.test(lowerMessage)) {
    if (/gasto|expense|spending/i.test(lowerMessage) && /mensual|monthly/i.test(lowerMessage)) {
      intention = 'CALCULATE_AVERAGE_MONTHLY_EXPENSES';
      confidence = 0.95;
      suggestedTools.push('get_spending_trends');
      requiresPlanning = false;
    } else if (/gasto|expense|spending/i.test(lowerMessage)) {
      intention = 'CALCULATE_AVERAGE_EXPENSES';
      confidence = 0.9;
      suggestedTools.push('get_spending_trends');
      requiresPlanning = false;
    }
  }
  // Detectar consultas de análisis
  else if (/analizar|analyze|análisis|analysis|estadística|statistics/i.test(lowerMessage)) {
    intention = 'ANALYZE_FINANCES';
    confidence = 0.85;
    if (/categoría|category/i.test(lowerMessage)) {
      suggestedTools.push('analyze_by_category');
    } else if (/porcentaje|percentage/i.test(lowerMessage)) {
      suggestedTools.push('calculate_percentages');
    } else {
      suggestedTools.push('analyze_spending');
    }
    requiresPlanning = false;
  }
  // Detectar consultas de comparación
  else if (/comparar|compare|comparación|comparison|vs|versus/i.test(lowerMessage)) {
    intention = 'COMPARE_PERIODS';
    confidence = 0.9;
    suggestedTools.push('compare_periods');
    requiresPlanning = false;
  }
  // Detectar consultas de resumen
  else if (/resumen|summary|resumir|summarize/i.test(lowerMessage)) {
    intention = 'GET_SUMMARY';
    confidence = 0.85;
    suggestedTools.push('get_financial_summary');
    requiresPlanning = false;
  }
  // Detectar consultas de transacciones
  else if (/transacciones?|transactions?|gastos?|expenses?|ingresos?|income/i.test(lowerMessage)) {
    intention = 'QUERY_TRANSACTIONS';
    confidence = 0.8;
    suggestedTools.push('get_category_spending');
    requiresPlanning = false;
  }
  // Detectar acciones de creación
  else if (/crear|create|agregar|add|nuevo|new|registrar|register/i.test(lowerMessage)) {
    if (/transacci|transaction|gasto|expense|ingreso|income/i.test(lowerMessage)) {
      intention = 'CREATE_TRANSACTION';
      confidence = 0.9;
      suggestedTools.push('create_transaction');
      requiresPlanning = false;
    } else if (/presupuesto|budget/i.test(lowerMessage)) {
      intention = 'CREATE_BUDGET';
      confidence = 0.9;
      suggestedTools.push('create_budget');
      requiresPlanning = false;
    } else if (/meta|goal|objetivo|target/i.test(lowerMessage)) {
      intention = 'CREATE_GOAL';
      confidence = 0.9;
      suggestedTools.push('create_goal');
      requiresPlanning = false;
    } else if (/cuenta|account/i.test(lowerMessage)) {
      intention = 'CREATE_ACCOUNT';
      confidence = 0.9;
      suggestedTools.push('create_account');
      requiresPlanning = false;
    }
  }
  // Detectar consultas de saldo
  else if (/saldo|balance|dinero|money|cuánto|cuanto|tengo/i.test(lowerMessage)) {
    intention = 'QUERY_BALANCE';
    confidence = 0.85;
    suggestedTools.push('get_account_balance');
    requiresPlanning = false;
  }

  const reasoning = `Intención detectada: ${intention} con confianza ${confidence}. 
Herramientas sugeridas: ${suggestedTools.join(', ')}.
${requiresPlanning ? 'Requiere planificación de múltiples pasos.' : 'Puede ejecutarse directamente.'}`;

  return {
    intention,
    confidence,
    reasoning,
    suggestedTools,
    requiresPlanning,
  };
}

/**
 * Razonamiento simple (fallback)
 */
async function reasonSimple(
  userMessage: string,
  context: WalletContext
): Promise<ReasoningResult> {
  const lowerMessage = userMessage.toLowerCase();

  // Detectar intención básica
  let intention = 'UNKNOWN';
  let confidence = 0.5;
  const suggestedTools: string[] = [];
  let requiresPlanning = false;

  // Detectar consultas sobre promedios
  if (/promedio|average|media|mean/i.test(lowerMessage) && /gasto|expense|spending|mensual|monthly/i.test(lowerMessage)) {
    intention = 'CALCULATE_AVERAGE_MONTHLY_EXPENSES';
    confidence = 0.9;
    suggestedTools.push('get_spending_trends');
    requiresPlanning = false;
  }
  // Detectar consultas de análisis
  else if (/analizar|analyze|análisis|analysis|estadística|statistics/i.test(lowerMessage)) {
    intention = 'ANALYZE_FINANCES';
    confidence = 0.85;
    if (/categoría|category/i.test(lowerMessage)) {
      suggestedTools.push('analyze_by_category');
    } else if (/porcentaje|percentage/i.test(lowerMessage)) {
      suggestedTools.push('calculate_percentages');
    } else {
      suggestedTools.push('analyze_spending');
    }
    requiresPlanning = false;
  }
  // Detectar consultas de comparación
  else if (/comparar|compare|comparación|comparison|vs|versus/i.test(lowerMessage)) {
    intention = 'COMPARE_PERIODS';
    confidence = 0.9;
    suggestedTools.push('compare_periods');
    requiresPlanning = false;
  }
  // Detectar consultas de resumen
  else if (/resumen|summary|resumir|summarize/i.test(lowerMessage)) {
    intention = 'GET_SUMMARY';
    confidence = 0.85;
    suggestedTools.push('get_financial_summary');
    requiresPlanning = false;
  }
  // Detectar consultas de transacciones
  else if (/transacciones?|transactions?|gastos?|expenses?|ingresos?|income/i.test(lowerMessage)) {
    intention = 'QUERY_TRANSACTIONS';
    confidence = 0.8;
    suggestedTools.push('get_category_spending');
    requiresPlanning = false;
  }
  // Detectar acciones de creación
  else if (/crear|create|agregar|add|nuevo|new|registrar|register/i.test(lowerMessage)) {
    if (/transacci|transaction|gasto|expense|ingreso|income/i.test(lowerMessage)) {
      intention = 'CREATE_TRANSACTION';
      confidence = 0.9;
      suggestedTools.push('create_transaction');
      requiresPlanning = false;
    } else if (/presupuesto|budget/i.test(lowerMessage)) {
      intention = 'CREATE_BUDGET';
      confidence = 0.9;
      suggestedTools.push('create_budget');
      requiresPlanning = false;
    } else if (/meta|goal|objetivo|target/i.test(lowerMessage)) {
      intention = 'CREATE_GOAL';
      confidence = 0.9;
      suggestedTools.push('create_goal');
      requiresPlanning = false;
    } else if (/cuenta|account/i.test(lowerMessage)) {
      intention = 'CREATE_ACCOUNT';
      confidence = 0.9;
      suggestedTools.push('create_account');
      requiresPlanning = false;
    }
  }
  // Detectar consultas de saldo
  else if (/saldo|balance|dinero|money|cuánto|cuanto|tengo/i.test(lowerMessage)) {
    intention = 'QUERY_BALANCE';
    confidence = 0.85;
    suggestedTools.push('get_account_balance');
    requiresPlanning = false;
  }

  const reasoning = `Intención detectada: ${intention} con confianza ${confidence}. 
Herramientas sugeridas: ${suggestedTools.join(', ')}.
${requiresPlanning ? 'Requiere planificación de múltiples pasos.' : 'Puede ejecutarse directamente.'}`;

  return {
    intention,
    confidence,
    reasoning,
    suggestedTools,
    requiresPlanning,
  };
}

/**
 * Construye un resumen del contexto para el razonamiento
 */
function buildContextSummary(context: WalletContext): string {
  return `
- Cuentas: ${context.accounts.total} cuentas activas
- Transacciones recientes: ${context.transactions.recent.length} transacciones
- Ingresos del mes: $${context.transactions.summary.incomeThisMonth.toFixed(2)}
- Gastos del mes: $${context.transactions.summary.expensesThisMonth.toFixed(2)}
- Presupuestos activos: ${context.budgets.active.length}
- Metas activas: ${context.goals.active.length}
`;
}
