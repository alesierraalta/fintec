/**
 * Financial Tools - Herramientas Financieras para el Agente
 * 
 * Wrapper de query-handlers y analysis-handlers.
 * Expone como herramientas agénticas con formato consistente.
 */

import { logger } from '@/lib/utils/logger';
import { WalletContext } from '../../context-builder';
import { ToolResult } from '../core/types';
import {
  handleQueryBalance,
  handleQueryTransactions,
  handleQueryBudgets,
  handleQueryGoals,
  handleQueryAccounts,
  handleQueryRates,
  handleQueryCategories,
  handleQueryRecurring,
} from '../../query-handlers';
import {
  analyzeSpending,
  calculatePercentages,
  getFinancialSummary,
  comparePeriods,
  analyzeByCategory,
  getSpendingTrends,
} from '../../analysis-handlers';

/**
 * Wrapper para query-handlers que retorna ToolResult
 */
function wrapQueryHandler(
  handler: (context: WalletContext, params?: Record<string, any>, ...args: any[]) => { message: string; canHandle: boolean } | Promise<{ message: string; canHandle: boolean }>
): (params: Record<string, any>, context: WalletContext, userId?: string) => Promise<ToolResult> {
  return async (params: Record<string, any>, context: WalletContext, userId?: string) => {
    try {
      // Si el handler requiere userId, pasarlo
      let result;
      if (handler.length > 2 && userId) {
        result = await (handler as any)(context, userId, params);
      } else {
        result = await Promise.resolve(handler(context, params));
      }
      return {
        success: result.canHandle,
        message: result.message,
        data: result,
      };
    } catch (error: any) {
      logger.error('[financial-tools] Error in query handler:', error);
      return {
        success: false,
        error: error.message || 'Error al ejecutar consulta',
      };
    }
  };
}

/**
 * Wrapper para analysis-handlers que retorna ToolResult
 */
function wrapAnalysisHandler(
  handler: (context: WalletContext, params?: Record<string, any>) => { success: boolean; data?: any; message?: string; error?: string }
): (params: Record<string, any>, context: WalletContext) => Promise<ToolResult> {
  return async (params: Record<string, any>, context: WalletContext) => {
    try {
      const result = handler(context, params);
      return {
        success: result.success,
        data: result.data,
        message: result.message,
        error: result.error,
      };
    } catch (error: any) {
      logger.error('[financial-tools] Error in analysis handler:', error);
      return {
        success: false,
        error: error.message || 'Error al ejecutar análisis',
      };
    }
  };
}

/**
 * Herramientas financieras disponibles
 */
export const financialTools = {
  // Query tools (note: some require userId which will be passed by executor)
  get_account_balance: wrapQueryHandler(handleQueryBalance),
  get_category_spending: wrapQueryHandler(handleQueryTransactions),
  query_transactions: wrapQueryHandler(handleQueryTransactions),
  query_budgets: wrapQueryHandler(handleQueryBudgets),
  query_goals: wrapQueryHandler(handleQueryGoals),
  query_accounts: wrapQueryHandler(handleQueryAccounts),
  query_rates: wrapQueryHandler(handleQueryRates as any),
  query_categories: wrapQueryHandler(handleQueryCategories as any),
  query_recurring: wrapQueryHandler(handleQueryRecurring as any),

  // Analysis tools
  analyze_spending: wrapAnalysisHandler(analyzeSpending),
  calculate_percentages: wrapAnalysisHandler(calculatePercentages),
  get_financial_summary: wrapAnalysisHandler(getFinancialSummary),
  compare_periods: wrapAnalysisHandler(comparePeriods),
  analyze_by_category: wrapAnalysisHandler(analyzeByCategory),
  get_spending_trends: wrapAnalysisHandler(getSpendingTrends),
};

/**
 * Registra todas las herramientas financieras en el registro
 */
export function registerFinancialTools(registry: any): void {
  // Las herramientas se ejecutan directamente usando executeAction
  // Este módulo solo proporciona wrappers para formato consistente
  logger.info('[financial-tools] Financial tools module loaded');
}

