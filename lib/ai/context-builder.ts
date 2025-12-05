/**
 * Context Builder for Agentic AI System
 * 
 * Construye contexto usando RAG (Retrieval-Augmented Generation).
 * Solo recupera documentos relevantes según la query del usuario, reduciendo tokens significativamente.
 * 
 * MEJORAS IMPLEMENTADAS:
 * - Caché de contexto con TTL de 5 minutos
 * - RAG optimizado (20 transacciones de 14 días vs 100 de 30 días)
 * - Fallback inteligente cuando RAG no encuentra documentos
 */

import { supabase, createSupabaseServiceClient } from '@/repositories/supabase/client';
import { fromMinorUnits } from '@/lib/money';
import { logger } from '@/lib/utils/logger';
import { retrieveRelevantDocuments } from './rag/retriever';
import { getCachedContext, setCachedContext } from './context-cache';

// Helper to get authenticated Supabase client
function getSupabaseClient() {
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
    totalBalance: Record<string, number>;
  };
  transactions: {
    recent: Array<{
      date: string;
      type: string;
      amount: number;
      currencyCode?: string;
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
 * Construye contexto usando RAG con caché
 */
export async function buildWalletContext(
  userId: string,
  userQuery: string,
  useCache: boolean = true
): Promise<WalletContext> {
  logger.info(`[buildWalletContext] Building context for user ${userId}, query: "${userQuery.substring(0, 50)}..."`);
  const startTime = Date.now();

  // Verificar caché primero
  if (useCache) {
    const cached = getCachedContext(userId);
    if (cached) {
      const duration = Date.now() - startTime;
      logger.info(`[buildWalletContext] ✓ Cache hit! Returned in ${duration}ms`);
      return cached;
    }
  }

  try {
    // Recuperar documentos relevantes usando RAG
    const relevantDocs = await retrieveRelevantDocuments(
      userId,
      userQuery,
      ['transaction', 'account', 'budget', 'goal']
    );

    // Si no hay documentos relevantes, usar fallback optimizado
    if (relevantDocs.length === 0) {
      logger.warn(`[buildWalletContext] No relevant documents found, using optimized fallback`);
      const context = await buildFullContextFromDatabase(userId);

      // Cachear el resultado
      if (useCache) {
        setCachedContext(userId, context);
      }

      return context;
    }

    // Agrupar documentos por tipo
    const transactionIds = relevantDocs.filter(d => d.documentType === 'transaction').map(d => d.documentId);
    const accountIds = relevantDocs.filter(d => d.documentType === 'account').map(d => d.documentId);
    const budgetIds = relevantDocs.filter(d => d.documentType === 'budget').map(d => d.documentId);
    const goalIds = relevantDocs.filter(d => d.documentType === 'goal').map(d => d.documentId);

    const client = getSupabaseClient();

    // Obtener datos completos
    const [accountsData, transactionsData, budgetsData, goalsData] = await Promise.all([
      accountIds.length > 0
        ? client.from('accounts').select('id, name, type, balance, currency_code').in('id', accountIds).eq('user_id', userId).eq('active', true)
        : Promise.resolve({ data: [], error: null }),

      transactionIds.length > 0
        ? client.from('transactions').select('id, type, amount_base_minor, currency_code, date, description, categories(name), accounts!inner(user_id)').in('id', transactionIds).eq('accounts.user_id', userId)
        : Promise.resolve({ data: [], error: null }),

      budgetIds.length > 0
        ? client.from('budgets').select('id, amount_base_minor, spent_base_minor, categories(name), month_year').in('id', budgetIds).eq('active', true)
        : Promise.resolve({ data: [], error: null }),

      goalIds.length > 0
        ? client.from('goals').select('id, name, target_base_minor, current_base_minor, target_date, active').in('id', goalIds).eq('active', true).eq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const context = processContextData(accountsData.data, transactionsData.data, budgetsData.data, goalsData.data);

    const duration = Date.now() - startTime;
    logger.info(`[buildWalletContext] ✓ RAG context built in ${duration}ms (${relevantDocs.length} docs)`);

    // Cachear el resultado
    if (useCache) {
      setCachedContext(userId, context);
    }

    return context;
  } catch (error: any) {
    logger.error('[buildWalletContext] Error:', error);
    const duration = Date.now() - startTime;
    logger.warn(`[buildWalletContext] Falling back to full context after ${duration}ms`);
    return await buildFullContextFromDatabase(userId);
  }
}

/**
 * Construye contexto completo desde la base de datos (fallback optimizado)
 * OPTIMIZADO: 20 transacciones de 14 días (vs 100 de 30 días)
 */
async function buildFullContextFromDatabase(userId: string): Promise<WalletContext> {
  const client = getSupabaseClient();
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [accountsData, transactionsData, budgetsData, goalsData] = await Promise.all([
    client.from('accounts').select('id, name, type, balance, currency_code').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }),

    client.from('transactions').select('id, type, amount_base_minor, currency_code, date, description, categories(name), accounts!inner(user_id)').eq('accounts.user_id', userId).gte('date', fourteenDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false }).limit(20),

    client.from('budgets').select('id, amount_base_minor, spent_base_minor, categories(name), month_year').eq('month_year', currentMonthYear).eq('active', true),

    client.from('goals').select('id, name, target_base_minor, current_base_minor, target_date, active').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }),
  ]);

  return processContextData(accountsData.data, transactionsData.data, budgetsData.data, goalsData.data);
}

/**
 * Procesa los datos crudos y los convierte en WalletContext
 */
function processContextData(
  accountsData: any[] | null,
  transactionsData: any[] | null,
  budgetsData: any[] | null,
  goalsData: any[] | null
): WalletContext {
  // Procesar cuentas
  const accounts = (accountsData || []).map((acc: any) => ({
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
  const recentTxs = (transactionsData || []).map((tx: any) => ({
    date: tx.date,
    type: tx.type,
    amount: fromMinorUnits(tx.amount_base_minor, 'USD'),
    currencyCode: tx.currency_code || 'USD',
    category: tx.categories?.name || 'Sin categoría',
    description: tx.description ? tx.description.substring(0, 50) : undefined,
  }));

  // Calcular estadísticas
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthTxs = recentTxs.filter((tx: any) => new Date(tx.date) >= currentMonthStart);

  const incomeThisMonth = currentMonthTxs.filter((tx: any) => tx.type === 'INCOME').reduce((sum: number, tx: any) => sum + tx.amount, 0);
  const expensesThisMonth = currentMonthTxs.filter((tx: any) => tx.type === 'EXPENSE').reduce((sum: number, tx: any) => sum + tx.amount, 0);

  // Top categorías
  const categoryMap = new Map<string, { amount: number; count: number }>();
  currentMonthTxs.filter((tx: any) => tx.type === 'EXPENSE').forEach((tx: any) => {
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
  const budgets = (budgetsData || []).map((budget: any) => {
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
  const goals = (goalsData || []).map((goal: any) => {
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
}
