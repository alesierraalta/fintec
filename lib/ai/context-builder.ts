/**
 * Context Builder for AI Chat Assistant
 * 
 * Construye contexto optimizado de la billetera del usuario para el asistente IA.
 * Minimiza tokens incluyendo solo datos esenciales de los últimos 30 días.
 */

import { supabase } from '@/repositories/supabase/client';
import { fromMinorUnits } from '@/lib/money';
import { logger } from '@/lib/utils/logger';

export interface WalletContext {
  accounts: {
    total: number;
    summary: Array<{
      name: string;
      type: string;
      balance: number;
      currency: string;
    }>;
    totalBalance: Record<string, number>; // Balance por moneda
  };
  transactions: {
    recent: Array<{
      date: string;
      type: string;
      amount: number;
      category?: string;
      description?: string;
    }>;
    summary: {
      incomeThisMonth: number;
      expensesThisMonth: number;
      netThisMonth: number;
      topCategories: Array<{ category: string; amount: number; count: number }>;
    };
  };
  budgets: {
    active: Array<{
      category: string;
      budget: number;
      spent: number;
      remaining: number;
      percentage: number;
    }>;
  };
  goals: {
    active: Array<{
      name: string;
      target: number;
      current: number;
      progress: number;
      targetDate?: string;
    }>;
  };
}

/**
 * Construye contexto completo de la billetera del usuario
 * Optimizado para minimizar tokens: solo datos esenciales de últimos 30 días
 */
export async function buildWalletContext(userId: string): Promise<WalletContext> {
  try {
    // Calcular fechas para últimos 30 días y mes actual
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Obtener cuentas activas
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, type, balance, currency_code')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    // Obtener transacciones de últimos 30 días (filtrar por usuario a través de accounts)
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id,
        type,
        amount_base_minor,
        date,
        description,
        categories(name),
        accounts!inner(user_id)
      `)
      .eq('accounts.user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(100); // Limitar para optimizar tokens

    // Obtener presupuestos del mes actual
    const { data: budgets } = await supabase
      .from('budgets')
      .select(`
        amount_base_minor,
        spent_base_minor,
        categories(name)
      `)
      .eq('month_year', currentMonthYear)
      .eq('active', true);

    // Obtener metas activas
    const { data: goals } = await supabase
      .from('goals')
      .select('name, target_base_minor, current_base_minor, target_date, active')
      .eq('active', true)
      .eq('user_id', userId);

    // Procesar cuentas
    const accountsData = (accounts || []).map((acc: any) => ({
      name: acc.name,
      type: acc.type,
      balance: fromMinorUnits(acc.balance, acc.currency_code),
      currency: acc.currency_code,
    }));

    // Calcular totales por moneda
    const totalBalanceByCurrency: Record<string, number> = {};
    accountsData.forEach((acc) => {
      totalBalanceByCurrency[acc.currency] = (totalBalanceByCurrency[acc.currency] || 0) + acc.balance;
    });

    // Procesar transacciones recientes (últimas 20 para contexto)
    const recentTxs = (transactions || [])
      .slice(0, 20)
      .map((tx: any) => ({
        date: tx.date,
        type: tx.type,
        amount: fromMinorUnits(tx.amount_base_minor, 'USD'), // Usando base currency
        category: tx.categories?.name || 'Sin categoría',
        description: tx.description ? tx.description.substring(0, 50) : undefined, // Truncar descripciones largas
      }));

    // Calcular estadísticas del mes actual
    const currentMonthTxs = (transactions || []).filter((tx: any) => 
      new Date(tx.date) >= currentMonthStart
    );

    const incomeThisMonth = currentMonthTxs
      .filter((tx: any) => tx.type === 'INCOME')
      .reduce((sum: number, tx: any) => sum + fromMinorUnits(tx.amount_base_minor, 'USD'), 0);

    const expensesThisMonth = currentMonthTxs
      .filter((tx: any) => tx.type === 'EXPENSE')
      .reduce((sum: number, tx: any) => sum + fromMinorUnits(tx.amount_base_minor, 'USD'), 0);

    // Top categorías de gastos del mes
    const categoryMap = new Map<string, { amount: number; count: number }>();
    currentMonthTxs
      .filter((tx: any) => tx.type === 'EXPENSE')
      .forEach((tx: any) => {
        const catName = tx.categories?.name || 'Sin categoría';
        const existing = categoryMap.get(catName) || { amount: 0, count: 0 };
        categoryMap.set(catName, {
          amount: existing.amount + fromMinorUnits(tx.amount_base_minor, 'USD'),
          count: existing.count + 1,
        });
      });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5 categorías

    // Procesar presupuestos
    const budgetsData = (budgets || []).map((budget: any) => {
      const budgetAmount = fromMinorUnits(budget.amount_base_minor || 0, 'USD');
      const spentAmount = fromMinorUnits(budget.spent_base_minor || 0, 'USD');
      const remaining = budgetAmount - spentAmount;
      const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

      return {
        category: budget.categories?.name || 'Sin categoría',
        budget: budgetAmount,
        spent: spentAmount,
        remaining,
        percentage: Math.round(percentage),
      };
    });

    // Procesar metas
    const goalsData = (goals || []).map((goal: any) => {
      const target = fromMinorUnits(goal.target_base_minor || 0, 'USD');
      const current = fromMinorUnits(goal.current_base_minor || 0, 'USD');
      const progress = target > 0 ? (current / target) * 100 : 0;

      return {
        name: goal.name,
        target,
        current,
        progress: Math.round(progress),
        targetDate: goal.target_date || undefined,
      };
    });

    return {
      accounts: {
        total: accountsData.length,
        summary: accountsData,
        totalBalance: totalBalanceByCurrency,
      },
      transactions: {
        recent: recentTxs,
        summary: {
          incomeThisMonth: Math.round(incomeThisMonth * 100) / 100,
          expensesThisMonth: Math.round(expensesThisMonth * 100) / 100,
          netThisMonth: Math.round((incomeThisMonth - expensesThisMonth) * 100) / 100,
          topCategories,
        },
      },
      budgets: {
        active: budgetsData,
      },
      goals: {
        active: goalsData,
      },
    };
  } catch (error) {
    // En caso de error, retornar contexto vacío en lugar de fallar
    logger.error('Error building wallet context:', error);
    return {
      accounts: { total: 0, summary: [], totalBalance: {} },
      transactions: { recent: [], summary: { incomeThisMonth: 0, expensesThisMonth: 0, netThisMonth: 0, topCategories: [] } },
      budgets: { active: [] },
      goals: { active: [] },
    };
  }
}

