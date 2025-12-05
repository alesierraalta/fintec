/**
 * Query Financial Data Handler
 * 
 * Handler genérico para consultar datos financieros históricos.
 * Retorna datos estructurados para que el Agent pueda razonar y calcular promedios/estadísticas.
 */

import { logger } from '@/lib/utils/logger';
import { WalletContext } from '../context-builder';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { fromMinorUnits } from '@/lib/money';

export interface QueryFinancialDataParams {
  type: 'income' | 'expense' | 'both';
  period?: 'month' | 'year' | 'custom' | 'all';
  months?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  currency?: string;
  aggregation?: 'sum' | 'average' | 'count' | 'min' | 'max' | 'raw';
  groupBy?: 'month' | 'category' | 'account' | 'none';
}

export interface QueryFinancialDataResult {
  data: Array<{
    period: string;
    income?: number;
    expense?: number;
    total?: number;
    count?: number;
    category?: string;
    account?: string;
  }>;
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalTransactions: number;
    period: string;
    currency?: string;
  };
  metadata: {
    monthsAnalyzed?: number;
    dateRange?: { start: string; end: string };
  };
}

/**
 * Consulta datos financieros históricos de manera flexible
 * Retorna datos estructurados para que el Agent pueda razonar y calcular
 */
export async function handleQueryFinancialData(
  userId: string,
  params: QueryFinancialDataParams,
  context: WalletContext
): Promise<{ success: boolean; data?: QueryFinancialDataResult; message: string; error?: string }> {
  try {
    logger.info(`[handleQueryFinancialData] Querying financial data for user ${userId}`, params);

    const appRepository = new SupabaseAppRepository();
    const repository = appRepository.transactions;
    const categoriesRepository = appRepository.categories;
    let categoryMap = new Map<string, string>();

    try {
      const categories = await categoriesRepository.findAll();
      categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
    } catch (err) {
      logger.warn('[handleQueryFinancialData] Could not load categories, falling back to defaults', err);
    }

    const getCategoryName = (categoryId?: string | null) => {
      if (!categoryId) {
        return 'Sin categoría';
      }
      return categoryMap.get(categoryId) || 'Sin categoría';
    };
    const { type, period = 'month', months = 6, startDate, endDate, category, currency, aggregation = 'raw', groupBy = 'none' } = params;

    // Determinar rango de fechas
    let dateFrom: string;
    let dateTo: string;
    const now = new Date();
    
    if (period === 'custom' && startDate && endDate) {
      dateFrom = startDate;
      dateTo = endDate;
    } else if (period === 'all') {
      // Obtener fecha de la primera transacción
      const allTransactions = await repository.findByDateRange(
        '2000-01-01',
        now.toISOString().split('T')[0],
        { page: 1, limit: 1, sortBy: 'date', sortOrder: 'asc' }
      );
      dateFrom = allTransactions.data.length > 0 
        ? allTransactions.data[allTransactions.data.length - 1].date 
        : new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
      dateTo = now.toISOString().split('T')[0];
    } else if (period === 'year') {
      dateFrom = `${now.getFullYear()}-01-01`;
      dateTo = now.toISOString().split('T')[0];
    } else {
      // month o basado en months
      const monthsAgo = new Date(now.getFullYear(), now.getMonth() - months, 1);
      dateFrom = monthsAgo.toISOString().split('T')[0];
      dateTo = now.toISOString().split('T')[0];
    }

    // Obtener transacciones del rango
    const transactionsResult = await repository.findByDateRange(dateFrom, dateTo);
    let transactions = transactionsResult.data;

    // Aplicar filtros
    if (type === 'income') {
      transactions = transactions.filter(t => t.type === 'INCOME');
    } else if (type === 'expense') {
      transactions = transactions.filter(t => t.type === 'EXPENSE');
    }

    if (category) {
      const targetCategory = category.toLowerCase();
      if (categoryMap.size === 0) {
        logger.warn('[handleQueryFinancialData] Category filter requested but category map is empty; skipping filter');
      } else {
        transactions = transactions.filter(t => 
          getCategoryName(t.categoryId).toLowerCase().includes(targetCategory)
        );
      }
    }

    if (currency) {
      transactions = transactions.filter(t => 
        (t.currencyCode || 'USD').toUpperCase() === currency.toUpperCase()
      );
    }

    if (transactions.length === 0) {
      return {
        success: false,
        message: 'No se encontraron transacciones que coincidan con los criterios especificados.',
        error: 'NO_DATA',
      };
    }

    // Procesar datos según groupBy
    const resultData: QueryFinancialDataResult['data'] = [];
    
    if (groupBy === 'month') {
      // Agrupar por mes
      const byMonth = new Map<string, { income: number[]; expense: number[] }>();
      
      transactions.forEach(txn => {
        const monthKey = txn.date.slice(0, 7); // YYYY-MM
        if (!byMonth.has(monthKey)) {
          byMonth.set(monthKey, { income: [], expense: [] });
        }
        const monthData = byMonth.get(monthKey)!;
        const amount = fromMinorUnits(txn.amountBaseMinor, txn.currencyCode || 'USD');
        
        if (txn.type === 'INCOME') {
          monthData.income.push(amount);
        } else {
          monthData.expense.push(Math.abs(amount));
        }
      });

      byMonth.forEach((values, monthKey) => {
        const income = values.income.reduce((sum, a) => sum + a, 0);
        const expense = values.expense.reduce((sum, a) => sum + a, 0);
        const count = values.income.length + values.expense.length;
        
        resultData.push({
          period: monthKey,
          income: income > 0 ? income : undefined,
          expense: expense > 0 ? expense : undefined,
          total: income + expense,
          count,
        });
      });

      // Ordenar por período
      resultData.sort((a, b) => (a.period || '').localeCompare(b.period || ''));
    } else if (groupBy === 'category') {
      // Agrupar por categoría
      const byCategory = new Map<string, { income: number[]; expense: number[] }>();
      
      transactions.forEach(txn => {
        const catKey = getCategoryName(txn.categoryId);
        if (!byCategory.has(catKey)) {
          byCategory.set(catKey, { income: [], expense: [] });
        }
        const catData = byCategory.get(catKey)!;
        const amount = fromMinorUnits(txn.amountBaseMinor, txn.currencyCode || 'USD');
        
        if (txn.type === 'INCOME') {
          catData.income.push(amount);
        } else {
          catData.expense.push(Math.abs(amount));
        }
      });

      byCategory.forEach((values, catKey) => {
        const income = values.income.reduce((sum, a) => sum + a, 0);
        const expense = values.expense.reduce((sum, a) => sum + a, 0);
        const count = values.income.length + values.expense.length;
        
        resultData.push({
          period: catKey,
          category: catKey,
          income: income > 0 ? income : undefined,
          expense: expense > 0 ? expense : undefined,
          total: income + expense,
          count,
        });
      });
    } else {
      // Sin agrupación - datos crudos o agregados
      if (aggregation === 'raw') {
        // Retornar datos individuales (limitado para no sobrecargar)
        transactions.slice(0, 100).forEach(txn => {
          const amount = fromMinorUnits(txn.amountBaseMinor, txn.currencyCode || 'USD');
          resultData.push({
            period: txn.date,
            income: txn.type === 'INCOME' ? amount : undefined,
            expense: txn.type === 'EXPENSE' ? Math.abs(amount) : undefined,
            category: getCategoryName(txn.categoryId),
            count: 1,
          });
        });
      } else {
        // Agregación simple
        const income = transactions
          .filter(t => t.type === 'INCOME')
          .reduce((sum, t) => sum + fromMinorUnits(t.amountBaseMinor, t.currencyCode || 'USD'), 0);
        const expense = transactions
          .filter(t => t.type === 'EXPENSE')
          .reduce((sum, t) => sum + Math.abs(fromMinorUnits(t.amountBaseMinor, t.currencyCode || 'USD')), 0);
        
        if (aggregation === 'sum') {
          resultData.push({
            period: `${dateFrom} to ${dateTo}`,
            income: income > 0 ? income : undefined,
            expense: expense > 0 ? expense : undefined,
            total: income + expense,
            count: transactions.length,
          });
        } else if (aggregation === 'average') {
          const monthsCount = months || 1;
          resultData.push({
            period: `${dateFrom} to ${dateTo}`,
            income: income > 0 ? income / monthsCount : undefined,
            expense: expense > 0 ? expense / monthsCount : undefined,
            total: (income + expense) / monthsCount,
            count: transactions.length,
          });
        }
      }
    }

    // Calcular resumen
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + fromMinorUnits(t.amountBaseMinor, t.currencyCode || 'USD'), 0);
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Math.abs(fromMinorUnits(t.amountBaseMinor, t.currencyCode || 'USD')), 0);

    const result: QueryFinancialDataResult = {
      data: resultData,
      summary: {
        totalIncome,
        totalExpense,
        totalTransactions: transactions.length,
        period: `${dateFrom} to ${dateTo}`,
        currency: currency || 'USD',
      },
      metadata: {
        monthsAnalyzed: period === 'month' ? months : undefined,
        dateRange: { start: dateFrom, end: dateTo },
      },
    };

    return {
      success: true,
      data: result,
      message: `Datos consultados: ${transactions.length} transacciones encontradas`,
    };
  } catch (error: any) {
    logger.error('[handleQueryFinancialData] Error:', error);
    return {
      success: false,
      message: `Error al consultar datos: ${error.message}`,
      error: error.message,
    };
  }
}
