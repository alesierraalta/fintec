/**
 * Reasoner - Motor de Razonamiento del Agente
 * 
 * Analiza la intencion del usuario y genera hipotesis sobre que herramientas usar.
 * 
 * MEJORA: Detecta consultas conversacionales (saludos, ayuda, proposito)
 */

import { logger } from '@/lib/utils/logger';
import { ReasoningResult, AgentConfig } from './types';
import { WalletContext } from '../../context-builder';

/**
 * Analiza el mensaje del usuario y genera razonamiento sobre la intencion
 */
export async function reasonAboutIntent(
    userMessage: string,
    context: WalletContext,
    config: AgentConfig
): Promise<ReasoningResult> {
    logger.info(`[reasoner] Starting reasoning for message: "${userMessage.substring(0, 50)}..."`);

    try {
        // Si Sequential Thinking esta habilitado, usarlo para razonamiento estructurado
        if (config.useSequentialThinking) {
            return await reasonWithSequentialThinking(userMessage, context);
        }

        // Fallback a razonamiento simple si Sequential Thinking no esta disponible
        return await reasonSimple(userMessage, context);
    } catch (error: any) {
        logger.error('[reasoner] Error during reasoning:', error);
        // Fallback a razonamiento simple en caso de error
        return await reasonSimple(userMessage, context);
    }
}

/**
 * Razonamiento usando Sequential Thinking MCP
 */
async function reasonWithSequentialThinking(
    userMessage: string,
    context: WalletContext
): Promise<ReasoningResult> {
    try {
        // Por ahora, usar razonamiento mejorado con regex
        return await reasonEnhanced(userMessage, context);
    } catch (error: any) {
        logger.warn('[reasoner] Sequential Thinking failed, falling back to simple reasoning');
        return await reasonSimple(userMessage, context);
    }
}

/**
 * Razonamiento mejorado (con mas logica que el simple)
 */
async function reasonEnhanced(
    userMessage: string,
    context: WalletContext
): Promise<ReasoningResult> {
    const lowerMessage = userMessage.toLowerCase();

    let intention = 'UNKNOWN';
    let confidence = 0.5;
    const suggestedTools: string[] = [];
    let requiresPlanning = false;

    // Detectar consultas sobre promedios
    if (/promedio|average|media|mean/i.test(lowerMessage)) {
        if (/ingreso|income/i.test(lowerMessage) && /mensual|monthly/i.test(lowerMessage)) {
            intention = 'CALCULATE_AVERAGE_MONTHLY_INCOME';
            confidence = 0.95;
            suggestedTools.push('query_financial_data');
            requiresPlanning = false;
        } else if (/gasto|expense|spending/i.test(lowerMessage) && /mensual|monthly/i.test(lowerMessage)) {
            intention = 'CALCULATE_AVERAGE_MONTHLY_EXPENSES';
            confidence = 0.95;
            suggestedTools.push('query_financial_data');
            requiresPlanning = false;
        } else if (/gasto|expense|spending/i.test(lowerMessage)) {
            intention = 'CALCULATE_AVERAGE_EXPENSES';
            confidence = 0.9;
            suggestedTools.push('query_financial_data');
            requiresPlanning = false;
        } else {
            // Promedio general
            intention = 'CALCULATE_AVERAGE';
            confidence = 0.85;
            suggestedTools.push('query_financial_data');
            requiresPlanning = false;
        }
    }
    // Detectar consultas de analisis
    else if (/analizar|analyze|analisis|analysis|estadistica|statistics/i.test(lowerMessage)) {
        intention = 'ANALYZE_FINANCES';
        confidence = 0.85;
        if (/categoria|category/i.test(lowerMessage)) {
            suggestedTools.push('analyze_by_category');
        } else if (/porcentaje|percentage/i.test(lowerMessage)) {
            suggestedTools.push('calculate_percentages');
        } else {
            suggestedTools.push('analyze_spending');
        }
        requiresPlanning = false;
    }
    // Detectar consultas de comparacion
    else if (/comparar|compare|comparacion|comparison|vs|versus/i.test(lowerMessage)) {
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
        // Detectar si menciona "hoy" o "today"
        const hasToday = /hoy|today/i.test(lowerMessage);
        const hasCategory = /categoria|category/i.test(lowerMessage);
        
        if (hasToday && !hasCategory) {
            // Para "gastos de hoy" sin categoría específica, usar query_financial_data
            intention = 'QUERY_TODAY_TRANSACTIONS';
            confidence = 0.95;
            suggestedTools.push('query_financial_data');
            requiresPlanning = false;
        } else if (hasCategory) {
            // Si hay categoría específica, usar get_category_spending
            intention = 'QUERY_CATEGORY_SPENDING';
            confidence = 0.9;
            suggestedTools.push('get_category_spending');
            requiresPlanning = false;
        } else {
            // Consulta general de transacciones
        intention = 'QUERY_TRANSACTIONS';
        confidence = 0.8;
            suggestedTools.push('query_financial_data');
        requiresPlanning = false;
        }
    }
    // Detectar acciones de creacion
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
    else if (/saldo|balance|dinero|money|cuanto|tengo/i.test(lowerMessage)) {
        intention = 'QUERY_BALANCE';
        confidence = 0.85;
        suggestedTools.push('get_account_balance');
        requiresPlanning = false;
    }
    // Detectar consultas conversacionales (saludos, ayuda, proposito)
    else if (/^(hola|hi|hello|hey|buenos dias|buenas tardes|buenas noches)/i.test(lowerMessage) ||
        /proposito|purpose|que haces|para que sirves|ayuda|help/i.test(lowerMessage)) {
        intention = 'CONVERSATIONAL';
        confidence = 0.9;
        // No sugiere herramientas, sera manejado como respuesta conversacional
        requiresPlanning = false;
    }

    const reasoning = `Intencion detectada: ${intention} con confianza ${confidence}. 
Herramientas sugeridas: ${suggestedTools.join(', ')}.
${requiresPlanning ? 'Requiere planificacion de multiples pasos.' : 'Puede ejecutarse directamente.'}`;

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
    // Detectar consultas de analisis
    else if (/analizar|analyze|analisis|analysis|estadistica|statistics/i.test(lowerMessage)) {
        intention = 'ANALYZE_FINANCES';
        confidence = 0.85;
        if (/categoria|category/i.test(lowerMessage)) {
            suggestedTools.push('analyze_by_category');
        } else if (/porcentaje|percentage/i.test(lowerMessage)) {
            suggestedTools.push('calculate_percentages');
        } else {
            suggestedTools.push('analyze_spending');
        }
        requiresPlanning = false;
    }
    // Detectar consultas de comparacion
    else if (/comparar|compare|comparacion|comparison|vs|versus/i.test(lowerMessage)) {
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
        // Detectar si menciona "hoy" o "today"
        const hasToday = /hoy|today/i.test(lowerMessage);
        const hasCategory = /categoria|category/i.test(lowerMessage);
        
        if (hasToday && !hasCategory) {
            // Para "gastos de hoy" sin categoría específica, usar query_financial_data
            intention = 'QUERY_TODAY_TRANSACTIONS';
            confidence = 0.95;
            suggestedTools.push('query_financial_data');
            requiresPlanning = false;
        } else if (hasCategory) {
            // Si hay categoría específica, usar get_category_spending
            intention = 'QUERY_CATEGORY_SPENDING';
            confidence = 0.9;
            suggestedTools.push('get_category_spending');
            requiresPlanning = false;
        } else {
            // Consulta general de transacciones
        intention = 'QUERY_TRANSACTIONS';
        confidence = 0.8;
            suggestedTools.push('query_financial_data');
        requiresPlanning = false;
        }
    }
    // Detectar acciones de creacion
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
    else if (/saldo|balance|dinero|money|cuanto|tengo/i.test(lowerMessage)) {
        intention = 'QUERY_BALANCE';
        confidence = 0.85;
        suggestedTools.push('get_account_balance');
        requiresPlanning = false;
    }
    // Detectar consultas conversacionales (saludos, ayuda, proposito)
    else if (/^(hola|hi|hello|hey|buenos dias|buenas tardes|buenas noches)/i.test(lowerMessage) ||
        /proposito|purpose|que haces|para que sirves|ayuda|help/i.test(lowerMessage)) {
        intention = 'CONVERSATIONAL';
        confidence = 0.9;
        requiresPlanning = false;
    }

    const reasoning = `Intencion detectada: ${intention} con confianza ${confidence}. 
Herramientas sugeridas: ${suggestedTools.join(', ')}.
${requiresPlanning ? 'Requiere planificacion de multiples pasos.' : 'Puede ejecutarse directamente.'}`;

    return {
        intention,
        confidence,
        reasoning,
        suggestedTools,
        requiresPlanning,
    };
}
