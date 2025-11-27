/**
 * Analysis Handlers for AI Assistant
 * 
 * Handlers especializados para análisis financiero avanzado:
 * - Cálculo de porcentajes de gasto, ahorro, ratios
 * - Análisis por categoría con porcentajes
 * - Comparación de períodos y tendencias
 * - Resúmenes financieros completos
 * 
 * Usa funciones existentes de lib/dates/period-comparison.ts para cálculos
 */

import { WalletContext } from './context-builder';
import { logger } from '@/lib/utils/logger';
import { calculateMetricsForPeriod, calculateTrend, filterTransactionsByPeriod, getPreviousPeriod, TrendData } from '@/lib/dates/period-comparison';
import { TimePeriod, getTimePeriods } from '@/lib/dates/periods';
import { percentage } from '@/lib/utils';

/**
 * Resultado de un análisis financiero
 */
export interface AnalysisResult {
  success: boolean;
  data: any;
  message?: string;
  error?: string;
}

/**
 * Análisis de gastos por período con porcentajes y estadísticas
 */
export function analyzeSpending(
  context: WalletContext,
  params?: {
    period?: 'today' | 'week' | 'month' | 'year' | 'custom';
    dateFrom?: string;
    dateTo?: string;
    currency?: string;
  }
): AnalysisResult {
  try {
    if (context.transactions.recent.length === 0) {
      return {
        success: false,
        data: null,
        message: 'No tienes transacciones registradas para analizar.',
      };
    }

    // Determinar período
    let period: TimePeriod;
    const periods = getTimePeriods();
    
    if (params?.period === 'custom' && params.dateFrom && params.dateTo) {
      period = {
        id: 'custom',
        label: 'Período personalizado',
        startDate: new Date(params.dateFrom),
        endDate: new Date(params.dateTo),
      };
    } else {
      const periodMap: Record<string, string> = {
        'today': 'today',
        'week': 'thisWeek',
        'month': 'thisMonth',
        'year': 'thisYear',
      };
      const periodId = periodMap[params?.period || 'month'];
      period = periods.find(p => p.id === periodId) || periods.find(p => p.id === 'thisMonth')!;
    }

    // Filtrar transacciones por período
    let transactions = context.transactions.recent.map(tx => ({
      ...tx,
      amountBaseMinor: Math.abs(tx.amount) * 100, // Convertir a minor units
      type: tx.type,
      categoryId: tx.category || 'uncategorized',
    }));

    // Filtrar por período
    transactions = filterTransactionsByPeriod(transactions, period);

    // Filtrar por moneda si se especifica
    if (params?.currency) {
      const currencyUpper = params.currency.toUpperCase();
      transactions = transactions.filter(tx => 
        (tx.currencyCode || 'USD').toUpperCase() === currencyUpper
      );
    }

    if (transactions.length === 0) {
      return {
        success: false,
        data: null,
        message: `No hay transacciones en el período seleccionado${params?.currency ? ` en ${params.currency}` : ''}.`,
      };
    }

    // Calcular métricas usando función existente
    const metrics = calculateMetricsForPeriod(transactions);

    // Calcular porcentaje de gasto mensual (expense ratio)
    const expensePercentage = metrics.income > 0 
      ? (metrics.expenses / metrics.income) * 100 
      : 0;

    // Análisis por categoría
    const categoryAnalysis: Array<{
      category: string;
      amount: number;
      percentage: number;
      transactionCount: number;
    }> = [];

    const categorySpending: Record<string, { amount: number; count: number }> = {};
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const cat = t.category || 'Sin categoría';
        if (!categorySpending[cat]) {
          categorySpending[cat] = { amount: 0, count: 0 };
        }
        categorySpending[cat].amount += Math.abs(t.amount);
        categorySpending[cat].count += 1;
      });

    Object.entries(categorySpending)
      .sort(([,a], [,b]) => b.amount - a.amount)
      .forEach(([category, data]) => {
        categoryAnalysis.push({
          category,
          amount: data.amount,
          percentage: metrics.expenses > 0 ? (data.amount / metrics.expenses) * 100 : 0,
          transactionCount: data.count,
        });
      });

    const result = {
      period: {
        label: period.label,
        startDate: period.startDate.toISOString().split('T')[0],
        endDate: period.endDate.toISOString().split('T')[0],
      },
      metrics: {
        income: metrics.income,
        expenses: metrics.expenses,
        savings: metrics.savings,
        netCashFlow: metrics.netCashFlow,
        expenseRatio: expensePercentage,
        savingsRate: metrics.savingsRate,
        totalTransactions: metrics.totalTransactions,
        avgDailyExpenses: metrics.avgDailyExpenses,
        avgDailyIncome: metrics.avgDailyIncome,
      },
      categoryBreakdown: categoryAnalysis,
      topSpendingCategory: categoryAnalysis[0] || null,
    };

    logger.info('[analyzeSpending] Analysis completed', { period: period.label, transactions: transactions.length });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    logger.error('[analyzeSpending] Error:', error);
    return {
      success: false,
      data: null,
      error: error.message || 'Error al analizar gastos',
    };
  }
}

/**
 * Calcula porcentajes financieros específicos
 */
export function calculatePercentages(
  context: WalletContext,
  params?: {
    period?: 'today' | 'week' | 'month' | 'year';
    metric?: 'expense' | 'savings' | 'category' | 'all';
    category?: string;
  }
): AnalysisResult {
  try {
    if (context.transactions.recent.length === 0) {
      return {
        success: false,
        data: null,
        message: 'No tienes transacciones para calcular porcentajes.',
      };
    }

    const periods = getTimePeriods();
    const periodId = params?.period === 'month' ? 'thisMonth' : 
                     params?.period === 'week' ? 'thisWeek' :
                     params?.period === 'year' ? 'thisYear' : 'thisMonth';
    const period = periods.find(p => p.id === periodId) || periods.find(p => p.id === 'thisMonth')!;

    let transactions = context.transactions.recent.map(tx => ({
      ...tx,
      amountBaseMinor: Math.abs(tx.amount) * 100,
      type: tx.type,
      categoryId: tx.category || 'uncategorized',
    }));

    transactions = filterTransactionsByPeriod(transactions, period);
    const metrics = calculateMetricsForPeriod(transactions);

    const result: any = {};

    // Porcentaje de gasto (expense ratio)
    if (!params?.metric || params.metric === 'expense' || params.metric === 'all') {
      result.expensePercentage = metrics.income > 0 
        ? (metrics.expenses / metrics.income) * 100 
        : 0;
    }

    // Porcentaje de ahorro (savings rate)
    if (!params?.metric || params.metric === 'savings' || params.metric === 'all') {
      result.savingsPercentage = metrics.income > 0 
        ? (metrics.savings / metrics.income) * 100 
        : 0;
    }

    // Porcentajes por categoría
    if (!params?.metric || params.metric === 'category' || params.metric === 'all') {
      const categoryPercentages: Record<string, number> = {};
      const categorySpending: Record<string, number> = {};

      transactions
        .filter(t => t.type === 'EXPENSE')
        .forEach(t => {
          const cat = params?.category || t.category || 'Sin categoría';
          if (params?.category && t.category !== params.category) return;
          
          categorySpending[cat] = (categorySpending[cat] || 0) + Math.abs(t.amount);
        });

      const totalExpenses = metrics.expenses;
      Object.entries(categorySpending).forEach(([category, amount]) => {
        categoryPercentages[category] = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
      });

      result.categoryPercentages = categoryPercentages;
    }

    logger.info('[calculatePercentages] Percentages calculated', { metric: params?.metric || 'all' });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    logger.error('[calculatePercentages] Error:', error);
    return {
      success: false,
      data: null,
      error: error.message || 'Error al calcular porcentajes',
    };
  }
}

/**
 * Obtiene resumen financiero completo con métricas clave
 */
export function getFinancialSummary(
  context: WalletContext,
  params?: {
    period?: 'month' | 'year';
    includeTrends?: boolean;
  }
): AnalysisResult {
  try {
    const periods = getTimePeriods();
    const periodId = params?.period === 'year' ? 'thisYear' : 'thisMonth';
    const currentPeriod = periods.find(p => p.id === periodId) || periods.find(p => p.id === 'thisMonth')!;
    const previousPeriod = getPreviousPeriod(currentPeriod);

    let currentTransactions = context.transactions.recent.map(tx => ({
      ...tx,
      amountBaseMinor: Math.abs(tx.amount) * 100,
      type: tx.type,
      categoryId: tx.category || 'uncategorized',
    }));

    currentTransactions = filterTransactionsByPeriod(currentTransactions, currentPeriod);
    const currentMetrics = calculateMetricsForPeriod(currentTransactions);

    let trends: Record<string, TrendData> | null = null;
    if (params?.includeTrends) {
      let previousTransactions = context.transactions.recent.map(tx => ({
        ...tx,
        amountBaseMinor: Math.abs(tx.amount) * 100,
        type: tx.type,
        categoryId: tx.category || 'uncategorized',
      }));
      previousTransactions = filterTransactionsByPeriod(previousTransactions, previousPeriod);
      const previousMetrics = calculateMetricsForPeriod(previousTransactions);

      trends = {
        income: calculateTrend(currentMetrics.income, previousMetrics.income),
        expenses: calculateTrend(currentMetrics.expenses, previousMetrics.expenses),
        savings: calculateTrend(currentMetrics.savings, previousMetrics.savings),
      };
    }

    const result = {
      period: {
        current: {
          label: currentPeriod.label,
          startDate: currentPeriod.startDate.toISOString().split('T')[0],
          endDate: currentPeriod.endDate.toISOString().split('T')[0],
        },
      },
      accounts: {
        total: context.accounts.total,
        totalBalance: context.accounts.totalBalance,
      },
      transactions: {
        income: currentMetrics.income,
        expenses: currentMetrics.expenses,
        savings: currentMetrics.savings,
        netCashFlow: currentMetrics.netCashFlow,
        expenseRatio: currentMetrics.income > 0 ? (currentMetrics.expenses / currentMetrics.income) * 100 : 0,
        savingsRate: currentMetrics.savingsRate,
        totalCount: currentMetrics.totalTransactions,
      },
      budgets: {
        active: context.budgets.active.length,
        summary: context.budgets.active.map(b => ({
          category: b.category,
          budget: b.budget,
          spent: b.spent,
          remaining: b.remaining,
          percentage: b.percentage,
        })),
      },
      goals: {
        active: context.goals.active.length,
        summary: context.goals.active.map(g => ({
          name: g.name,
          target: g.target,
          current: g.current,
          progress: g.progress,
        })),
      },
      ...(trends && { trends }),
    };

    logger.info('[getFinancialSummary] Summary generated', { period: currentPeriod.label });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    logger.error('[getFinancialSummary] Error:', error);
    return {
      success: false,
      data: null,
      error: error.message || 'Error al generar resumen financiero',
    };
  }
}

/**
 * Compara dos períodos para detectar tendencias
 */
export function comparePeriods(
  context: WalletContext,
  params?: {
    currentPeriod?: 'month' | 'year';
    previousPeriod?: 'month' | 'year';
  }
): AnalysisResult {
  try {
    if (context.transactions.recent.length === 0) {
      return {
        success: false,
        data: null,
        message: 'No hay suficientes transacciones para comparar períodos.',
      };
    }

    const periods = getTimePeriods();
    const currentPeriodId = params?.currentPeriod === 'year' ? 'thisYear' : 'thisMonth';
    const currentPeriod = periods.find(p => p.id === currentPeriodId) || periods.find(p => p.id === 'thisMonth')!;
    const previousPeriod = getPreviousPeriod(currentPeriod);

    let currentTransactions = context.transactions.recent.map(tx => ({
      ...tx,
      amountBaseMinor: Math.abs(tx.amount) * 100,
      type: tx.type,
      categoryId: tx.category || 'uncategorized',
    }));

    let previousTransactions = [...currentTransactions];

    currentTransactions = filterTransactionsByPeriod(currentTransactions, currentPeriod);
    previousTransactions = filterTransactionsByPeriod(previousTransactions, previousPeriod);

    const currentMetrics = calculateMetricsForPeriod(currentTransactions);
    const previousMetrics = calculateMetricsForPeriod(previousTransactions);

    const comparison = {
      periods: {
        current: {
          label: currentPeriod.label,
          startDate: currentPeriod.startDate.toISOString().split('T')[0],
          endDate: currentPeriod.endDate.toISOString().split('T')[0],
        },
        previous: {
          label: previousPeriod.label,
          startDate: previousPeriod.startDate.toISOString().split('T')[0],
          endDate: previousPeriod.endDate.toISOString().split('T')[0],
        },
      },
      trends: {
        income: calculateTrend(currentMetrics.income, previousMetrics.income),
        expenses: calculateTrend(currentMetrics.expenses, previousMetrics.expenses),
        savings: calculateTrend(currentMetrics.savings, previousMetrics.savings),
        expenseRatio: calculateTrend(
          currentMetrics.income > 0 ? (currentMetrics.expenses / currentMetrics.income) * 100 : 0,
          previousMetrics.income > 0 ? (previousMetrics.expenses / previousMetrics.income) * 100 : 0
        ),
      },
      metrics: {
        current: {
          income: currentMetrics.income,
          expenses: currentMetrics.expenses,
          savings: currentMetrics.savings,
          expenseRatio: currentMetrics.income > 0 ? (currentMetrics.expenses / currentMetrics.income) * 100 : 0,
        },
        previous: {
          income: previousMetrics.income,
          expenses: previousMetrics.expenses,
          savings: previousMetrics.savings,
          expenseRatio: previousMetrics.income > 0 ? (previousMetrics.expenses / previousMetrics.income) * 100 : 0,
        },
      },
    };

    logger.info('[comparePeriods] Comparison completed', { 
      current: currentPeriod.label, 
      previous: previousPeriod.label 
    });

    return {
      success: true,
      data: comparison,
    };
  } catch (error: any) {
    logger.error('[comparePeriods] Error:', error);
    return {
      success: false,
      data: null,
      error: error.message || 'Error al comparar períodos',
    };
  }
}

/**
 * Análisis de gastos por categoría con porcentajes
 */
export function analyzeByCategory(
  context: WalletContext,
  params?: {
    period?: 'today' | 'week' | 'month' | 'year';
    limit?: number;
    currency?: string;
  }
): AnalysisResult {
  try {
    if (context.transactions.recent.length === 0) {
      return {
        success: false,
        data: null,
        message: 'No tienes transacciones para analizar por categoría.',
      };
    }

    const periods = getTimePeriods();
    const periodId = params?.period === 'month' ? 'thisMonth' : 
                     params?.period === 'week' ? 'thisWeek' :
                     params?.period === 'year' ? 'thisYear' : 'thisMonth';
    const period = periods.find(p => p.id === periodId) || periods.find(p => p.id === 'thisMonth')!;

    let transactions = context.transactions.recent.map(tx => ({
      ...tx,
      amountBaseMinor: Math.abs(tx.amount) * 100,
      type: tx.type,
      categoryId: tx.category || 'uncategorized',
    }));

    transactions = filterTransactionsByPeriod(transactions, period);

    // Filtrar por moneda si se especifica
    if (params?.currency) {
      const currencyUpper = params.currency.toUpperCase();
      transactions = transactions.filter(tx => 
        (tx.currencyCode || 'USD').toUpperCase() === currencyUpper
      );
    }

    const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const categoryAnalysis: Array<{
      category: string;
      amount: number;
      percentage: number;
      transactionCount: number;
      avgTransaction: number;
    }> = [];

    const categoryData: Record<string, { amount: number; count: number }> = {};

    expenseTransactions.forEach(t => {
      const cat = t.category || 'Sin categoría';
      if (!categoryData[cat]) {
        categoryData[cat] = { amount: 0, count: 0 };
      }
      categoryData[cat].amount += Math.abs(t.amount);
      categoryData[cat].count += 1;
    });

    Object.entries(categoryData)
      .sort(([,a], [,b]) => b.amount - a.amount)
      .slice(0, params?.limit || 10)
      .forEach(([category, data]) => {
        categoryAnalysis.push({
          category,
          amount: data.amount,
          percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
          transactionCount: data.count,
          avgTransaction: data.count > 0 ? data.amount / data.count : 0,
        });
      });

    const result = {
      period: {
        label: period.label,
        startDate: period.startDate.toISOString().split('T')[0],
        endDate: period.endDate.toISOString().split('T')[0],
      },
      totalExpenses,
      categoryCount: categoryAnalysis.length,
      categories: categoryAnalysis,
    };

    logger.info('[analyzeByCategory] Category analysis completed', { 
      period: period.label, 
      categories: categoryAnalysis.length 
    });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    logger.error('[analyzeByCategory] Error:', error);
    return {
      success: false,
      data: null,
      error: error.message || 'Error al analizar por categoría',
    };
  }
}

/**
 * Obtiene tendencias de gasto a lo largo del tiempo
 */
export function getSpendingTrends(
  context: WalletContext,
  params?: {
    periods?: number; // Número de períodos a analizar (ej: 3 meses)
    periodType?: 'month' | 'week';
  }
): AnalysisResult {
  try {
    if (context.transactions.recent.length === 0) {
      return {
        success: false,
        data: null,
        message: 'No hay suficientes transacciones para analizar tendencias.',
      };
    }

    const periods = getTimePeriods();
    const periodType = params?.periodType || 'month';
    const numPeriods = params?.periods || 3;

    const trends: Array<{
      period: string;
      startDate: string;
      endDate: string;
      income: number;
      expenses: number;
      savings: number;
      expenseRatio: number;
    }> = [];

    // Obtener períodos históricos
    let currentPeriod = periods.find(p => p.id === 'thisMonth')!;
    
    for (let i = 0; i < numPeriods; i++) {
      let transactions = context.transactions.recent.map(tx => ({
        ...tx,
        amountBaseMinor: Math.abs(tx.amount) * 100,
        type: tx.type,
        categoryId: tx.category || 'uncategorized',
      }));

      transactions = filterTransactionsByPeriod(transactions, currentPeriod);
      const metrics = calculateMetricsForPeriod(transactions);

      trends.unshift({
        period: currentPeriod.label,
        startDate: currentPeriod.startDate.toISOString().split('T')[0],
        endDate: currentPeriod.endDate.toISOString().split('T')[0],
        income: metrics.income,
        expenses: metrics.expenses,
        savings: metrics.savings,
        expenseRatio: metrics.income > 0 ? (metrics.expenses / metrics.income) * 100 : 0,
      });

      // Obtener período anterior
      currentPeriod = getPreviousPeriod(currentPeriod);
    }

    // Calcular tendencia general
    const latest = trends[trends.length - 1];
    const oldest = trends[0];
    const expenseTrend = calculateTrend(latest.expenses, oldest.expenses);
    const incomeTrend = calculateTrend(latest.income, oldest.income);

    const result = {
      periods: trends,
      overallTrend: {
        expenses: expenseTrend,
        income: incomeTrend,
      },
    };

    logger.info('[getSpendingTrends] Trends calculated', { periods: trends.length });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    logger.error('[getSpendingTrends] Error:', error);
    return {
      success: false,
      data: null,
      error: error.message || 'Error al calcular tendencias',
    };
  }
}

