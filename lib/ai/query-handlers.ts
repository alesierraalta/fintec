/**
 * Query Handlers for AI Assistant
 * 
 * Maneja respuestas directas para consultas de balance, transacciones, presupuestos y metas
 * sin necesidad de invocar el LLM.
 */

import { WalletContext } from './context-builder';
import { logger } from '@/lib/utils/logger';
import { SupabaseAppRepository } from '@/repositories/supabase';
import { fromMinorUnits } from '@/lib/money';

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

/**
 * Maneja consulta de tasas de cambio
 */
export async function handleQueryRates(
  context: WalletContext,
  params?: Record<string, any>
): Promise<QueryResult> {
  try {
    // Construir URL base para fetch en servidor
    let baseUrl = 'http://localhost:3000';
    if (typeof window === 'undefined') {
      // Estamos en servidor
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.NEXT_PUBLIC_SITE_URL) {
        baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
      }
    } else {
      // Estamos en cliente
      baseUrl = window.location.origin;
    }

    // Obtener tasas desde las APIs
    const [bcvResponse, binanceResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/bcv-rates`, { 
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store' 
      }),
      fetch(`${baseUrl}/api/binance-rates`, { 
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store' 
      }),
    ]);

    let message = 'Tasas de cambio disponibles:\n\n';

    // BCV Rates
    if (bcvResponse.status === 'fulfilled' && bcvResponse.value.ok) {
      const bcvData = await bcvResponse.value.json();
      if (bcvData.success && bcvData.data) {
        message += `🏦 BCV (Banco Central de Venezuela):\n`;
        message += `  • USD: ${bcvData.data.usd?.toFixed(2) || 'N/A'} VES\n`;
        message += `  • EUR: ${bcvData.data.eur?.toFixed(2) || 'N/A'} VES\n`;
        if (bcvData.data.lastUpdated) {
          const updated = new Date(bcvData.data.lastUpdated);
          message += `  • Actualizado: ${updated.toLocaleDateString('es-VE')} ${updated.toLocaleTimeString('es-VE')}\n`;
        }
        message += '\n';
      }
    }

    // Binance Rates
    if (binanceResponse.status === 'fulfilled' && binanceResponse.value.ok) {
      const binanceData = await binanceResponse.value.json();
      if (binanceData.success && binanceData.data) {
        message += `💱 Binance P2P:\n`;
        if (binanceData.data.usd_ves) {
          message += `  • USD/VES: ${binanceData.data.usd_ves.toFixed(2)} VES\n`;
        }
        if (binanceData.data.sell_rate) {
          const sellRate = typeof binanceData.data.sell_rate === 'object' 
            ? binanceData.data.sell_rate.avg 
            : binanceData.data.sell_rate;
          message += `  • Venta (avg): ${sellRate.toFixed(2)} VES\n`;
        }
        if (binanceData.data.buy_rate) {
          const buyRate = typeof binanceData.data.buy_rate === 'object'
            ? binanceData.data.buy_rate.avg
            : binanceData.data.buy_rate;
          message += `  • Compra (avg): ${buyRate.toFixed(2)} VES\n`;
        }
        if (binanceData.data.lastUpdated) {
          const updated = new Date(binanceData.data.lastUpdated);
          message += `  • Actualizado: ${updated.toLocaleDateString('es-VE')} ${updated.toLocaleTimeString('es-VE')}\n`;
        }
      }
    }

    // Si no se pudo obtener ninguna tasa
    if (message === 'Tasas de cambio disponibles:\n\n') {
      return {
        message: 'No pude obtener las tasas de cambio en este momento. Por favor intenta más tarde.',
        canHandle: true,
      };
    }

    message += '\n💡 Nota: Las tasas se usan para calcular equivalentes en USD cuando muestro saldos en VES.';

    logger.info('[handleQueryRates] Handled rates query');
    return { message, canHandle: true };
  } catch (error: any) {
    logger.error('[handleQueryRates] Error:', error);
    return {
      message: 'No pude obtener las tasas de cambio en este momento. Por favor intenta más tarde.',
      canHandle: true,
    };
  }
}

/**
 * Maneja consulta de categorías
 */
export async function handleQueryCategories(
  context: WalletContext,
  userId: string,
  params?: Record<string, any>
): Promise<QueryResult> {
  try {
    const repository = new SupabaseAppRepository();
    
    // Obtener categorías desde el repositorio
    let categories;
    if (params?.kind) {
      categories = await repository.categories.findByKind(params.kind);
    } else {
      categories = await repository.categories.findActive();
    }
    
    if (!categories || categories.length === 0) {
      return {
        message: 'No tienes categorías registradas. ¿Te gustaría crear una?',
        canHandle: true,
      };
    }
    
    // Separar por tipo
    const incomeCategories = categories.filter((cat) => cat.kind === 'INCOME');
    const expenseCategories = categories.filter((cat) => cat.kind === 'EXPENSE');

    let message = 'Tus categorías:\n\n';
    
    if (expenseCategories.length > 0) {
      message += '📉 Gastos:\n';
      expenseCategories.slice(0, 15).forEach((cat) => {
        message += `  • ${cat.name}${cat.icon ? ` ${cat.icon}` : ''}\n`;
      });
      if (expenseCategories.length > 15) {
        message += `  ... y ${expenseCategories.length - 15} más\n`;
      }
      message += '\n';
    }

    if (incomeCategories.length > 0) {
      message += '📈 Ingresos:\n';
      incomeCategories.slice(0, 15).forEach((cat) => {
        message += `  • ${cat.name}${cat.icon ? ` ${cat.icon}` : ''}\n`;
      });
      if (incomeCategories.length > 15) {
        message += `  ... y ${incomeCategories.length - 15} más\n`;
      }
    }

    logger.info('[handleQueryCategories] Handled categories query');
    return { message, canHandle: true };
  } catch (error: any) {
    logger.error('[handleQueryCategories] Error:', error);
    return {
      message: 'No pude obtener las categorías en este momento. Por favor intenta más tarde.',
      canHandle: true,
    };
  }
}

/**
 * Maneja consulta de transacciones recurrentes
 */
export async function handleQueryRecurring(
  context: WalletContext,
  userId: string,
  params?: Record<string, any>
): Promise<QueryResult> {
  try {
    const repository = new SupabaseAppRepository();
    
    // Obtener transacciones recurrentes desde el repositorio
    const recurringTransactions = await repository.recurringTransactions.findByUserId(userId);
    
    if (!recurringTransactions || recurringTransactions.length === 0) {
      return {
        message: 'No tienes transacciones recurrentes configuradas. ¿Te gustaría crear una?',
        canHandle: true,
      };
    }
    
    // Filtrar solo activas si no se especifica lo contrario
    const activeTransactions = recurringTransactions.filter((t) => t.isActive);
    
    if (activeTransactions.length === 0) {
      return {
        message: 'No tienes transacciones recurrentes activas.',
        canHandle: true,
      };
    }

    let message = `Tus transacciones recurrentes (${activeTransactions.length} activas):\n\n`;

    activeTransactions.slice(0, 10).forEach((tx) => {
      const amount = fromMinorUnits(tx.amountMinor, tx.currencyCode);
      const icon = tx.type === 'INCOME' ? '📈' : '📉';
      const frequencyMap: Record<string, string> = {
        daily: 'diaria',
        weekly: 'semanal',
        monthly: 'mensual',
        yearly: 'anual'
      };
      const frequency = frequencyMap[tx.frequency] || tx.frequency;
      const nextDate = new Date(tx.nextExecutionDate).toLocaleDateString('es-VE');
      message += `${icon} ${tx.name}: ${amount.toFixed(2)} ${tx.currencyCode} - ${frequency} - Próxima: ${nextDate}\n`;
    });

    if (activeTransactions.length > 10) {
      message += `\n... y ${activeTransactions.length - 10} transacciones recurrentes más`;
    }

    const inactiveCount = recurringTransactions.length - activeTransactions.length;
    if (inactiveCount > 0) {
      message += `\n\nResumen: ${activeTransactions.length} activas, ${inactiveCount} inactivas`;
    }

    logger.info('[handleQueryRecurring] Handled recurring transactions query');
    return { message, canHandle: true };
  } catch (error: any) {
    logger.error('[handleQueryRecurring] Error:', error);
    return {
      message: 'No pude obtener las transacciones recurrentes en este momento. Por favor intenta más tarde.',
      canHandle: true,
    };
  }
}

