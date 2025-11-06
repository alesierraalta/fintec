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
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';

/**
 * Construye la URL base para llamadas API internas
 * 
 * Principio aplicado: Single Responsibility
 * - Función dedicada solo a construcción de URL
 * - Facilita testing y mantenimiento
 * 
 * Estrategia:
 * 1. Verificar variables de entorno (producción)
 * 2. Fallback a localhost solo en desarrollo
 * 3. Validar que la URL sea válida
 * 
 * @returns URL base válida para llamadas API internas
 * @throws Error si no se puede determinar una URL válida
 */
function getBaseUrlForInternalAPIs(): string {
  let baseUrl: string;
  
  // Prioridad 1: Vercel URL (producción)
  if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  }
  // Prioridad 2: NEXT_PUBLIC_APP_URL configurado
  else if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  }
  // Prioridad 3: NEXT_PUBLIC_SITE_URL (alternativa)
  else if (process.env.NEXT_PUBLIC_SITE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  }
  // Prioridad 4: Solo en desarrollo, usar localhost
  else if (process.env.NODE_ENV === 'development') {
    baseUrl = 'http://localhost:3000';
  }
  // Prioridad 5: Fallback: intentar detectar desde window si está disponible
  else if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  }
  // Último recurso: lanzar error para que sea visible
  else {
    throw new Error(
      'Cannot determine base URL for internal API calls. ' +
      'Please set NEXT_PUBLIC_APP_URL or VERCEL_URL environment variable.'
    );
  }
  
  // Validar que la URL sea válida
  try {
    const url = new URL(baseUrl);
    if (!url.protocol || !url.hostname) {
      throw new Error(`Invalid base URL: ${baseUrl}`);
    }
    return baseUrl;
  } catch (error) {
    logger.error(`[getBaseUrlForInternalAPIs] Invalid URL constructed: ${baseUrl}`, error);
    throw new Error(
      `Cannot construct valid base URL for internal API calls. ` +
      `Got: ${baseUrl}. Please check environment variables.`
    );
  }
}

export interface QueryResult {
  message: string;
  canHandle: boolean;
}

/**
 * Tipo para función de logging que puede ser inyectada
 * Permite usar collectLog de chat-assistant o logger estándar
 * 
 * Principio aplicado: Dependency Inversion (SOLID - D)
 * - Abstracción que permite diferentes implementaciones de logging
 */
export type LogFunction = (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void;

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

    // Logging detallado de parámetros recibidos
    logger.debug(`[handleQueryTransactions] Received params:`, {
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      dateRange: params?.dateRange,
      category: params?.category,
      transactionType: params?.transactionType || params?.type,
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
      limit: params?.limit,
      totalTransactions: transactions.length
    });

    // Aplicar filtros de fecha si están presentes
    if (params?.dateFrom && params?.dateTo) {
      transactions = transactions.filter((tx: any) => {
        const txDate = new Date(tx.date);
        const fromDate = new Date(params.dateFrom);
        const toDate = new Date(params.dateTo);
        return txDate >= fromDate && txDate <= toDate;
      });
    } else if (params?.dateFrom) {
      transactions = transactions.filter((tx: any) => tx.date === params.dateFrom);
    } else if (params?.dateRange) {
      // Compatibilidad con formato antiguo
      const { from, to } = params.dateRange;
      transactions = transactions.filter((tx: any) => {
        const txDate = tx.date;
        return txDate >= from && txDate <= to;
      });
    }
    logger.debug(`[handleQueryTransactions] After date filter: ${transactions.length} transactions`);

    // Filtrar por categoría si se especifica
    if (params?.category) {
      transactions = transactions.filter((tx: any) =>
        tx.category?.toLowerCase().includes(params.category.toLowerCase())
      );
    }
    logger.debug(`[handleQueryTransactions] After category filter: ${transactions.length} transactions`);

    // Filtrar por tipo de transacción si está presente (priorizar transactionType sobre type)
    const transactionType = params?.transactionType || params?.type;
    if (transactionType) {
      transactions = transactions.filter((tx: any) => tx.type === transactionType);
    }
    logger.debug(`[handleQueryTransactions] After type filter: ${transactions.length} transactions`);

    if (transactions.length === 0) {
      return {
        message: 'No hay transacciones que coincidan con los criterios especificados.',
        canHandle: true,
      };
    }

    // Aplicar ordenamiento si se especifica
    if (params?.sortBy === 'amount') {
      const sortOrder = params?.sortOrder || 'desc';
      transactions.sort((a: any, b: any) => {
        const amountA = Math.abs(a.amount || 0);
        const amountB = Math.abs(b.amount || 0);
        return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
      });
    }

    // Determinar límite: usar el especificado o default de 10
    // Verificar que limit sea un número válido y esté en rango razonable
    const hasExplicitLimit = params?.limit !== undefined && params?.limit !== null;
    const rawLimit = hasExplicitLimit ? Number(params.limit) : null;
    const limit = rawLimit && !isNaN(rawLimit) && rawLimit > 0 
      ? Math.min(Math.max(Math.floor(rawLimit), 1), 100) // Entre 1 y 100
      : 10; // Default de 10 si no se especifica o es inválido

    // Logging mejorado para debugging
    logger.debug(`[handleQueryTransactions] Limit handling: explicit=${hasExplicitLimit}, rawLimit=${rawLimit}, finalLimit=${limit}, totalTransactions=${transactions.length}, willShow=${Math.min(transactions.length, limit)}`);

    // Formatear respuesta
    let message = '';
    const dateRangeText = params?.dateFrom && params?.dateTo
      ? ` (${params.dateFrom} a ${params.dateTo})`
      : params?.dateFrom
      ? ` (${params.dateFrom})`
      : '';
    const typeText = transactionType === 'INCOME' ? 'Ingresos' : transactionType === 'EXPENSE' ? 'Gastos' : 'Transacciones';
    const categoryText = params?.category ? ` de ${params.category}` : '';

    message = `${typeText}${categoryText}${dateRangeText}:\n\n`;

    // Aplicar límite y mostrar solo las transacciones solicitadas
    const transactionsToShow = transactions.slice(0, limit);
    transactionsToShow.forEach((tx: any) => {
      const sign = tx.type === 'INCOME' ? '+' : '-';
      const icon = tx.type === 'INCOME' ? '📈' : '📉';
      const currency = tx.currencyCode || 'USD';
      message += `${icon} ${tx.date} | ${sign}${tx.amount.toFixed(2)} ${currency} | ${tx.category || 'Sin categoría'} | ${tx.description || 'Sin descripción'}\n`;
    });

    // NO mostrar mensaje de "más transacciones" si el usuario especificó un límite exacto
    // Solo mostrar el mensaje si NO hay límite explícito Y hay más transacciones que el límite por defecto
    if (!hasExplicitLimit && transactions.length > limit) {
      message += `\n... y ${transactions.length - limit} transacciones más`;
    }

    logger.info(`[handleQueryTransactions] Handled transactions query: showing ${transactionsToShow.length} of ${transactions.length}, explicitLimit=${hasExplicitLimit}, params=`, params);
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
 * 
 * @param context - Contexto de billetera
 * @param params - Parámetros opcionales de la consulta
 * @param logFn - Función de logging opcional (si no se provee, usa logger estándar)
 * 
 * Principio aplicado: Dependency Inversion (SOLID - D)
 * - Depende de abstracción (LogFunction) no de implementación concreta
 * - Permite inyectar collectLog para logs en navegador
 */
export async function handleQueryRates(
  context: WalletContext,
  params?: Record<string, any>,
  logFn?: LogFunction
): Promise<QueryResult> {
  // Usar logFn si está disponible, sino usar logger estándar
  const isDev = process.env.NODE_ENV === 'development';
  const debugLog: LogFunction = logFn || ((level, msg) => {
    if (isDev) {
      switch (level) {
        case 'debug': logger.debug(`[handleQueryRates] ${msg}`); break;
        case 'info': logger.info(`[handleQueryRates] ${msg}`); break;
        case 'warn': logger.warn(`[handleQueryRates] ${msg}`); break;
        case 'error': logger.error(`[handleQueryRates] ${msg}`); break;
    }
    }
  });
  
  try {
    debugLog('info', 'Starting to fetch exchange rates');
    
    // Llamar directamente a las funciones de scraping en lugar de hacer fetch HTTP
    // Esto evita problemas de autenticación 401 en Vercel y es más eficiente
    debugLog('debug', 'Calling BCV and Binance scrapers directly (no HTTP fetch)');

    let message = 'Tasas de cambio disponibles:\n\n';

    // BCV Rates - llamar directamente a la función
    try {
      debugLog('debug', 'Calling scrapeBCVRates() directly');
      const bcvResult = await scrapeBCVRates();
      debugLog('debug', `BCV result: success=${bcvResult.success}, hasData=${!!bcvResult.data}`);
      
      if (bcvResult.data && bcvResult.success) {
        debugLog('info', `BCV data accepted: USD=${bcvResult.data.usd}, EUR=${bcvResult.data.eur}`);
        message += `🏦 BCV (Banco Central de Venezuela):\n`;
        message += `  • USD: ${bcvResult.data.usd?.toFixed(2) || 'N/A'} VES\n`;
        message += `  • EUR: ${bcvResult.data.eur?.toFixed(2) || 'N/A'} VES\n`;
        if (bcvResult.data.lastUpdated) {
          const updated = new Date(bcvResult.data.lastUpdated);
          message += `  • Actualizado: ${updated.toLocaleDateString('es-VE')} ${updated.toLocaleTimeString('es-VE')}\n`;
        }
        message += '\n';
      } else {
        debugLog('warn', `BCV scraper returned no data: success=${bcvResult.success}, hasData=${!!bcvResult.data}, error=${bcvResult.error || 'none'}`);
        logger.warn(`[handleQueryRates] BCV scraper returned no data: success=${bcvResult.success}, error=${bcvResult.error || 'none'}`);
      }
    } catch (bcvError: any) {
      debugLog('error', `BCV scraper failed: ${bcvError.message || bcvError}`);
      logger.error(`[handleQueryRates] BCV scraper failed: ${bcvError.message || bcvError}`);
    }

    // Binance Rates - llamar directamente a la función
    try {
      debugLog('debug', 'Calling scrapeBinanceRates() directly');
      const binanceResult = await scrapeBinanceRates();
      debugLog('debug', `Binance result: success=${binanceResult.success}, hasData=${!!binanceResult.data}`);
      
      if (binanceResult.data && binanceResult.success) {
        debugLog('info', `Binance data accepted: USD/VES=${binanceResult.data.usd_ves}`);
        message += `💱 Binance P2P:\n`;
        if (binanceResult.data.usd_ves) {
          message += `  • USD/VES: ${binanceResult.data.usd_ves.toFixed(2)} VES\n`;
        }
        if (binanceResult.data.sell_rate) {
          message += `  • Venta: ${binanceResult.data.sell_rate.toFixed(2)} VES\n`;
        }
        if (binanceResult.data.buy_rate) {
          message += `  • Compra: ${binanceResult.data.buy_rate.toFixed(2)} VES\n`;
        }
        if (binanceResult.data.sell_avg) {
          message += `  • Venta (avg): ${binanceResult.data.sell_avg.toFixed(2)} VES\n`;
        }
        if (binanceResult.data.buy_avg) {
          message += `  • Compra (avg): ${binanceResult.data.buy_avg.toFixed(2)} VES\n`;
        }
        if (binanceResult.data.lastUpdated) {
          const updated = new Date(binanceResult.data.lastUpdated);
          message += `  • Actualizado: ${updated.toLocaleDateString('es-VE')} ${updated.toLocaleTimeString('es-VE')}\n`;
        }
      } else {
        debugLog('warn', `Binance scraper returned no data: success=${binanceResult.success}, hasData=${!!binanceResult.data}, error=${binanceResult.error || 'none'}`);
        logger.warn(`[handleQueryRates] Binance scraper returned no data: success=${binanceResult.success}, error=${binanceResult.error || 'none'}`);
      }
    } catch (binanceError: any) {
      debugLog('error', `Binance scraper failed: ${binanceError.message || binanceError}`);
      logger.error(`[handleQueryRates] Binance scraper failed: ${binanceError.message || binanceError}`);
    }

    // Si no se pudo obtener ninguna tasa
    if (message === 'Tasas de cambio disponibles:\n\n') {
      debugLog('warn', 'No rates data collected from either scraper');
      logger.warn('[handleQueryRates] No rates data collected from either scraper');
      
      return {
        message: 'No pude obtener las tasas de cambio en este momento. Por favor intenta más tarde.',
        canHandle: true,
      };
    }

    message += '\n💡 Nota: Las tasas se usan para calcular equivalentes en USD cuando muestro saldos en VES.';

    debugLog('info', `Successfully collected rates, message length: ${message.length}`);
    logger.info('[handleQueryRates] Handled rates query');
    return { message, canHandle: true };
  } catch (error: any) {
    debugLog('error', `Exception caught: ${error.message || error}`);
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

