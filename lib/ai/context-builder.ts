/**
 * Context Builder for AI Chat Assistant
 * 
 * Construye contexto usando RAG (Retrieval-Augmented Generation).
 * Solo recupera documentos relevantes según la query del usuario, reduciendo tokens significativamente.
 */

import { supabase, createSupabaseServiceClient } from '@/repositories/supabase/client';
import { fromMinorUnits } from '@/lib/money';
import { logger } from '@/lib/utils/logger';
import { retrieveRelevantDocuments } from './rag/retriever';

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
 * Construye contexto usando RAG (solo documentos relevantes)
 * Reduce tokens significativamente al recuperar solo documentos relevantes según la query
 * 
 * Patrón: RAG (Retrieval-Augmented Generation)
 * Principio SOLID: Single Responsibility (S)
 */
export async function buildWalletContext(
  userId: string,
  userQuery: string
): Promise<WalletContext> {
  logger.info(`[buildWalletContext] Building RAG context for user ${userId}, query: "${userQuery.substring(0, 50)}..."`);
  const startTime = Date.now();
  
  try {
    // Recuperar documentos relevantes usando RAG
    const relevantDocs = await retrieveRelevantDocuments(
      userId,
      userQuery,
      ['transaction', 'account', 'budget', 'goal'],
      15 // top-k documentos
    );

    // Si no hay documentos relevantes, obtener TODOS los datos del usuario directamente
    // Esto asegura que siempre haya contexto disponible, incluso si RAG no está indexado aún
    if (relevantDocs.length === 0) {
      logger.warn(`[buildWalletContext] No relevant documents found for query, fetching all user data directly`);
      return await buildFullContextFromDatabase(userId);
    }

    // Agrupar documentos por tipo
    const transactionIds = relevantDocs
      .filter(d => d.documentType === 'transaction')
      .map(d => d.documentId);
    const accountIds = relevantDocs
      .filter(d => d.documentType === 'account')
      .map(d => d.documentId);
    const budgetIds = relevantDocs
      .filter(d => d.documentType === 'budget')
      .map(d => d.documentId);
    const goalIds = relevantDocs
      .filter(d => d.documentType === 'goal')
      .map(d => d.documentId);

    const client = getSupabaseClient();

    // Obtener datos completos de las entidades recuperadas
    const [accountsData, transactionsData, budgetsData, goalsData] = await Promise.all([
      // Cuentas
      accountIds.length > 0
        ? client
            .from('accounts')
            .select('id, name, type, balance, currency_code')
            .in('id', accountIds)
            .eq('user_id', userId)
            .eq('active', true)
        : Promise.resolve({ data: [], error: null }),
      
      // Transacciones
      transactionIds.length > 0
        ? client
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
            .in('id', transactionIds)
            .eq('accounts.user_id', userId)
        : Promise.resolve({ data: [], error: null }),
      
      // Presupuestos
      budgetIds.length > 0
        ? client
            .from('budgets')
            .select(`
              id,
              amount_base_minor,
              spent_base_minor,
              categories(name),
              month_year
            `)
            .in('id', budgetIds)
            .eq('active', true)
        : Promise.resolve({ data: [], error: null }),
      
      // Metas
      goalIds.length > 0
        ? client
            .from('goals')
            .select('id, name, target_base_minor, current_base_minor, target_date, active')
            .in('id', goalIds)
            .eq('active', true)
            .eq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Procesar cuentas
    const accounts = (accountsData.data || []).map((acc: any) => ({
      name: acc.name,
      type: acc.type,
      balance: fromMinorUnits(acc.balance, acc.currency_code),
      currency: acc.currency_code,
    }));

    // Calcular totales por moneda
    const totalBalanceByCurrency: Record<string, number> = {};
    accounts.forEach((acc) => {
      totalBalanceByCurrency[acc.currency] = (totalBalanceByCurrency[acc.currency] || 0) + acc.balance;
    });

    // Procesar transacciones
    const recentTxs = (transactionsData.data || []).map((tx: any) => ({
      date: tx.date,
      type: tx.type,
      amount: fromMinorUnits(tx.amount_base_minor, 'USD'),
      category: tx.categories?.name || 'Sin categoría',
      description: tx.description ? tx.description.substring(0, 50) : undefined,
    }));

    // Calcular estadísticas básicas de transacciones recuperadas
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthTxs = recentTxs.filter((tx: any) => 
      new Date(tx.date) >= currentMonthStart
    );

    const incomeThisMonth = currentMonthTxs
      .filter((tx: any) => tx.type === 'INCOME')
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);

    const expensesThisMonth = currentMonthTxs
      .filter((tx: any) => tx.type === 'EXPENSE')
      .reduce((sum: number, tx: any) => sum + tx.amount, 0);

    // Top categorías de gastos
    const categoryMap = new Map<string, { amount: number; count: number }>();
    currentMonthTxs
      .filter((tx: any) => tx.type === 'EXPENSE')
      .forEach((tx: any) => {
        const catName = tx.category || 'Sin categoría';
        const existing = categoryMap.get(catName) || { amount: 0, count: 0 };
        categoryMap.set(catName, {
          amount: existing.amount + tx.amount,
          count: existing.count + 1,
        });
      });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Procesar presupuestos
    const budgets = (budgetsData.data || []).map((budget: any) => {
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
    const goals = (goalsData.data || []).map((goal: any) => {
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

    const context: WalletContext = {
      accounts: {
        total: accounts.length,
        summary: accounts,
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
        active: budgets,
      },
      goals: {
        active: goals,
      },
    };

    const duration = Date.now() - startTime;
    logger.info(`[buildWalletContext] RAG context built successfully in ${duration}ms for user ${userId}:`, {
      accountsCount: context.accounts.total,
      transactionsCount: context.transactions.recent.length,
      budgetsCount: context.budgets.active.length,
      goalsCount: context.goals.active.length,
      relevantDocsCount: relevantDocs.length,
    });

    return context;
  } catch (error) {
    // En caso de error, intentar obtener todos los datos directamente
    const duration = Date.now() - startTime;
    logger.error(`[buildWalletContext] Error building RAG context after ${duration}ms for user ${userId}, falling back to full database fetch:`, error);
    try {
      return await buildFullContextFromDatabase(userId);
    } catch (fallbackError) {
      logger.error(`[buildWalletContext] Fallback also failed:`, fallbackError);
      return {
        accounts: { total: 0, summary: [], totalBalance: {} },
        transactions: { recent: [], summary: { incomeThisMonth: 0, expensesThisMonth: 0, netThisMonth: 0, topCategories: [] } },
        budgets: { active: [] },
        goals: { active: [] },
      };
    }
  }
}

/**
 * Construye contexto completo obteniendo TODOS los datos del usuario directamente de la base de datos
 * Se usa como fallback cuando RAG no encuentra documentos relevantes
 */
async function buildFullContextFromDatabase(userId: string): Promise<WalletContext> {
  logger.info(`[buildFullContextFromDatabase] Fetching all data for user ${userId}`);
  const startTime = Date.now();
  
  try {
    const client = getSupabaseClient();
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Obtener TODOS los datos del usuario
    const [accountsData, transactionsData, budgetsData, goalsData] = await Promise.all([
      // Todas las cuentas activas
      client
        .from('accounts')
        .select('id, name, type, balance, currency_code')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false }),
      
      // Transacciones de últimos 30 días (limitado para optimizar)
      client
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
        .limit(100),
      
      // Presupuestos del mes actual
      client
        .from('budgets')
        .select(`
          id,
          amount_base_minor,
          spent_base_minor,
          categories(name),
          month_year
        `)
        .eq('month_year', currentMonthYear)
        .eq('active', true),
      
      // Todas las metas activas
      client
        .from('goals')
        .select('id, name, target_base_minor, current_base_minor, target_date, active')
        .eq('active', true)
        .eq('user_id', userId),
    ]);

    // Procesar cuentas
    const accounts = ((accountsData.data || []) as any[]).map((acc: any) => ({
      name: acc.name,
      type: acc.type,
      balance: fromMinorUnits(acc.balance, acc.currency_code),
      currency: acc.currency_code,
    }));

    const totalBalanceByCurrency: Record<string, number> = {};
    accounts.forEach((acc) => {
      totalBalanceByCurrency[acc.currency] = (totalBalanceByCurrency[acc.currency] || 0) + acc.balance;
    });

    // Procesar transacciones
    const recentTxs = ((transactionsData.data || []) as any[])
      .slice(0, 20)
      .map((tx: any) => ({
        date: tx.date,
        type: tx.type,
        amount: fromMinorUnits(tx.amount_base_minor, 'USD'),
        category: tx.categories?.name || 'Sin categoría',
        description: tx.description ? tx.description.substring(0, 50) : undefined,
      }));

    // Calcular estadísticas del mes actual
    const currentMonthTxs = ((transactionsData.data || []) as any[]).filter((tx: any) => 
      new Date(tx.date) >= currentMonthStart
    );

    const incomeThisMonth = currentMonthTxs
      .filter((tx: any) => tx.type === 'INCOME')
      .reduce((sum: number, tx: any) => sum + fromMinorUnits(tx.amount_base_minor, 'USD'), 0);

    const expensesThisMonth = currentMonthTxs
      .filter((tx: any) => tx.type === 'EXPENSE')
      .reduce((sum: number, tx: any) => sum + fromMinorUnits(tx.amount_base_minor, 'USD'), 0);

    // Top categorías
    const categoryMap = new Map<string, { amount: number; count: number }>();
    currentMonthTxs
      .filter((tx: any) => tx.type === 'EXPENSE')
      .forEach((tx: any) => {
        const catName = (tx.categories?.name || 'Sin categoría');
        const existing = categoryMap.get(catName) || { amount: 0, count: 0 };
        categoryMap.set(catName, {
          amount: existing.amount + fromMinorUnits(tx.amount_base_minor, 'USD'),
          count: existing.count + 1,
        });
      });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Procesar presupuestos
    const budgets = ((budgetsData.data || []) as any[]).map((budget: any) => {
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
    const goals = ((goalsData.data || []) as any[]).map((goal: any) => {
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

    const context: WalletContext = {
      accounts: {
        total: accounts.length,
        summary: accounts,
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
        active: budgets,
      },
      goals: {
        active: goals,
      },
    };

    const duration = Date.now() - startTime;
    logger.info(`[buildFullContextFromDatabase] Full context built successfully in ${duration}ms for user ${userId}:`, {
      accountsCount: context.accounts.total,
      transactionsCount: context.transactions.recent.length,
      budgetsCount: context.budgets.active.length,
      goalsCount: context.goals.active.length,
    });

    return context;
  } catch (error) {
    logger.error(`[buildFullContextFromDatabase] Error building full context:`, error);
    throw error;
  }
}

