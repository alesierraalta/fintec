/**
 * Query Handlers for AI Assistant
 * 
 * Maneja respuestas directas para consultas de balance, transacciones, presupuestos y metas
 * sin necesidad de invocar el LLM.
 */

import { WalletContext } from './context-builder';
import { logger } from '@/lib/utils/logger';

export interface QueryResult {
  message: string;
  canHandle: boolean;
}

/**
 * Maneja consulta de balance
 */
export function handleQueryBalance(
  context: WalletContext,
  params?: Record<string, any>
): QueryResult {
  try {
    if (context.accounts.total === 0) {
      return {
        message: 'No tienes cuentas registradas aún. ¿Te gustaría crear una?',
        canHandle: true,
      };
    }

    // Si hay parámetros de filtro específicos, usar LLM
    if (params?.currency || params?.dateRange) {
      return { message: '', canHandle: false };
    }

    const totalsByMoney = Object.entries(context.accounts.totalBalance)
      .map(([currency, total]) => `${total.toFixed(2)} ${currency}`)
      .join(', ');

    const accountDetails = context.accounts.summary
      .map(acc => `  • ${acc.name}: ${acc.balance.toFixed(2)} ${acc.currency}`)
      .join('\n');

    const message = `Tu saldo total es: ${totalsByMoney}\n\nDetalles por cuenta:\n${accountDetails}`;

    logger.info('[handleQueryBalance] Handled balance query directly from context');
    return { message, canHandle: true };
  } catch (error: any) {
    logger.error('[handleQueryBalance] Error:', error);
    return { message: '', canHandle: false };
  }
}

/**
 * Maneja consulta de transacciones
 */
export function handleQueryTransactions(
  context: WalletContext,
  params?: Record<string, any>
): QueryResult {
  try {
    if (context.transactions.recent.length === 0) {
      return {
        message: 'No tienes transacciones registradas.',
        canHandle: true,
      };
    }

    let transactions = [...context.transactions.recent];

    // Filtrar por fecha si se especifica
    if (params?.dateRange) {
      const { from, to } = params.dateRange;
      transactions = transactions.filter((tx: any) => {
        const txDate = tx.date;
        return txDate >= from && txDate <= to;
      });
    }

    // Filtrar por categoría si se especifica
    if (params?.category) {
      transactions = transactions.filter((tx: any) =>
        tx.category?.toLowerCase().includes(params.category.toLowerCase())
      );
    }

    // Filtrar por tipo si se especifica
    if (params?.type) {
      transactions = transactions.filter((tx: any) => tx.type === params.type);
    }

    if (transactions.length === 0) {
      return {
        message: 'No hay transacciones que coincidan con los criterios especificados.',
        canHandle: true,
      };
    }

    // Formatear respuesta
    let message = '';
    const dateRangeText = params?.dateRange
      ? ` (${params.dateRange.from} a ${params.dateRange.to})`
      : '';
    const typeText = params?.type === 'INCOME' ? 'Ingresos' : params?.type === 'EXPENSE' ? 'Gastos' : 'Transacciones';
    const categoryText = params?.category ? ` de ${params.category}` : '';

    message = `${typeText}${categoryText}${dateRangeText}:\n\n`;

    transactions.slice(0, 10).forEach((tx: any) => {
      const sign = tx.type === 'INCOME' ? '+' : '-';
      const icon = tx.type === 'INCOME' ? '📈' : '📉';
      message += `${icon} ${tx.date} | ${sign}${tx.amount.toFixed(2)} | ${tx.category || 'Sin categoría'} | ${tx.description || 'Sin descripción'}\n`;
    });

    if (transactions.length > 10) {
      message += `\n... y ${transactions.length - 10} transacciones más`;
    }

    logger.info('[handleQueryTransactions] Handled transactions query with filters:', params);
    return { message, canHandle: true };
  } catch (error: any) {
    logger.error('[handleQueryTransactions] Error:', error);
    return { message: '', canHandle: false };
  }
}

/**
 * Maneja consulta de presupuestos
 */
export function handleQueryBudgets(
  context: WalletContext,
  params?: Record<string, any>
): QueryResult {
  try {
    if (context.budgets.active.length === 0) {
      return {
        message: 'No tienes presupuestos activos. ¿Te gustaría crear uno?',
        canHandle: true,
      };
    }

    let budgets = [...context.budgets.active];

    // Filtrar por categoría si se especifica
    if (params?.category) {
      budgets = budgets.filter((b: any) =>
        b.category.toLowerCase().includes(params.category.toLowerCase())
      );
    }

    if (budgets.length === 0) {
      return {
        message: 'No hay presupuestos que coincidan con la categoría especificada.',
        canHandle: true,
      };
    }

    let message = 'Tus presupuestos activos:\n\n';

    budgets.forEach((b: any) => {
      const icon = b.percentage > 100 ? '⚠️' : b.percentage >= 80 ? '⚡' : '✅';
      const remaining = b.remaining > 0 ? `Restante: ${b.remaining.toFixed(2)}` : 'EXCEDIDO';
      message += `${icon} ${b.category}: ${b.spent.toFixed(2)} / ${b.budget.toFixed(2)} (${b.percentage}%) - ${remaining}\n`;
    });

    logger.info('[handleQueryBudgets] Handled budgets query');
    return { message, canHandle: true };
  } catch (error: any) {
    logger.error('[handleQueryBudgets] Error:', error);
    return { message: '', canHandle: false };
  }
}

/**
 * Maneja consulta de metas
 */
export function handleQueryGoals(
  context: WalletContext,
  params?: Record<string, any>
): QueryResult {
  try {
    if (context.goals.active.length === 0) {
      return {
        message: 'No tienes metas de ahorro activas. ¿Te gustaría crear una?',
        canHandle: true,
      };
    }

    const goals = context.goals.active;

    let message = 'Tus metas de ahorro:\n\n';

    goals.forEach((g: any) => {
      const icon = g.progress >= 100 ? '🎉' : g.progress >= 75 ? '🔥' : g.progress >= 50 ? '💪' : '🎯';
      const remaining = g.target - g.current;
      const timeInfo = g.targetDate ? ` - Objetivo: ${g.targetDate}` : '';
      message += `${icon} ${g.name}: ${g.current.toFixed(2)} / ${g.target.toFixed(2)} (${g.progress.toFixed(0)}%) - Falta: ${remaining.toFixed(2)}${timeInfo}\n`;
    });

    logger.info('[handleQueryGoals] Handled goals query');
    return { message, canHandle: true };
  } catch (error: any) {
    logger.error('[handleQueryGoals] Error:', error);
    return { message: '', canHandle: false };
  }
}

/**
 * Maneja consulta de cuentas (por consistencia)
 */
export function handleQueryAccounts(
  context: WalletContext,
  params?: Record<string, any>
): QueryResult {
  try {
    if (context.accounts.total === 0) {
      return {
        message: 'No tienes cuentas registradas aún. ¿Te gustaría crear una?',
        canHandle: true,
      };
    }

    const accountList = context.accounts.summary
      .map(acc => `• ${acc.name} (${acc.type}): ${acc.balance.toFixed(2)} ${acc.currency}`)
      .join('\n');

    const totalsByMoney = Object.entries(context.accounts.totalBalance)
      .map(([currency, total]) => `${total.toFixed(2)} ${currency}`)
      .join(', ');

    const message = `Aquí están tus cuentas:\n\n${accountList}\n\nTotal: ${totalsByMoney}`;

    logger.info('[handleQueryAccounts] Handled accounts query directly from context');
    return { message, canHandle: true };
  } catch (error: any) {
    logger.error('[handleQueryAccounts] Error:', error);
    return { message: '', canHandle: false };
  }
}

