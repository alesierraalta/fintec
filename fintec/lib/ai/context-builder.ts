/**
 * Context Builder for AI Chat Assistant
 * 
 * Construye contexto optimizado de la billetera del usuario para el asistente IA.
 * Minimiza tokens incluyendo solo datos esenciales de los últimos 30 días.
 */

import { supabase, createSupabaseServiceClient } from '@/repositories/supabase/client';
import { fromMinorUnits } from '@/lib/money';
import { logger } from '@/lib/utils/logger';

// Helper to get authenticated Supabase client
// Uses service role client for server-side operations (API routes)
// This bypasses RLS policies which block anonymous client queries
function getSupabaseClient() {
  // In server-side context (API routes), use service role client to bypass RLS
  // In client-side context, use regular client with user session
  if (typeof window === 'undefined') {
    return createSupabaseServiceClient();
  }
  return supabase;
}

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
  logger.info(`[buildWalletContext] Building context for user ${userId}`);
  const startTime = Date.now();
  
  try {
    // Calcular fechas para últimos 30 días y mes actual
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Get authenticated Supabase client (service role on server, regular on client)
    const client = getSupabaseClient();

    // Obtener cuentas activas (usando service role client para bypass RLS)
    logger.debug(`[buildWalletContext] Fetching accounts for user ${userId}`);
    const { data: accounts, error: accountsError } = await client
      .from('accounts')
      .select('id, name, type, balance, currency_code')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (accountsError) {
      logger.error(`[buildWalletContext] Error fetching accounts:`, accountsError);
    } else {
      logger.info(`[buildWalletContext] Found ${accounts?.length || 0} active accounts for user ${userId}`);
    }

    // Obtener transacciones de últimos 30 días (filtrar por usuario a través de accounts)
    logger.debug(`[buildWalletContext] Fetching transactions for user ${userId}`);
    const { data: transactions, error: transactionsError } = await client
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

    if (transactionsError) {
      logger.error(`[buildWalletContext] Error fetching transactions:`, transactionsError);
    } else {
      logger.debug(`[buildWalletContext] Found ${transactions?.length || 0} transactions`);
    }

    // Obtener presupuestos del mes actual
    logger.debug(`[buildWalletContext] Fetching budgets for month ${currentMonthYear}`);
    const { data: budgets, error: budgetsError } = await client
      .from('budgets')
      .select(`
        amount_base_minor,
        spent_base_minor,
        categories(name)
      `)
      .eq('month_year', currentMonthYear)
      .eq('active', true);

    if (budgetsError) {
      logger.error(`[buildWalletContext] Error fetching budgets:`, budgetsError);
    }

    // Obtener metas activas
    logger.debug(`[buildWalletContext] Fetching goals for user ${userId}`);
    const { data: goals, error: goalsError } = await client
      .from('goals')
      .select('name, target_base_minor, current_base_minor, target_date, active')
      .eq('active', true)
      .eq('user_id', userId);

    if (goalsError) {
      logger.error(`[buildWalletContext] Error fetching goals:`, goalsError);
    }

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

    // Log account summary for debugging
    logger.info(`[buildWalletContext] Account summary: ${accountsData.length} accounts, totals:`, totalBalanceByCurrency);

    // Defensive check: warn if we expected accounts but got none
    if (accounts && accounts.length > 0 && accountsData.length === 0) {
      logger.warn(`[buildWalletContext] WARNING: Found ${accounts.length} accounts in DB but processed 0. Check balance conversion.`);
    }

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

    const context = {
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

    const duration = Date.now() - startTime;
    logger.info(`[buildWalletContext] Context built successfully in ${duration}ms for user ${userId}:`, {
      accountsCount: context.accounts.total,
      transactionsCount: context.transactions.recent.length,
      budgetsCount: context.budgets.active.length,
      goalsCount: context.goals.active.length,
      totalBalance: context.accounts.totalBalance,
    });

    return context;
  } catch (error) {
    // En caso de error, retornar contexto vacío en lugar de fallar
    const duration = Date.now() - startTime;
    logger.error(`[buildWalletContext] Error building wallet context after ${duration}ms for user ${userId}:`, error);
    return {
      accounts: { total: 0, summary: [], totalBalance: {} },
      transactions: { recent: [], summary: { incomeThisMonth: 0, expensesThisMonth: 0, netThisMonth: 0, topCategories: [] } },
      budgets: { active: [] },
      goals: { active: [] },
    };
  }
}

