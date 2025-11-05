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

    // Filtrar por categoría si se especifica
    if (params?.category) {
      transactions = transactions.filter((tx: any) =>
        tx.category?.toLowerCase().includes(params.category.toLowerCase())
      );
    }

    // Filtrar por tipo de transacción si está presente (priorizar transactionType sobre type)
    const transactionType = params?.transactionType || params?.type;
    if (transactionType) {
      transactions = transactions.filter((tx: any) => tx.type === transactionType);
    }

    if (transactions.length === 0) {
      return {
        message: 'No hay transacciones que coincidan con los criterios especificados.',
        canHandle: true,
      };
    }

    // Determinar límite: usar el especificado o default de 10
    // Verificar que limit sea un número válido y esté en rango razonable
    const hasExplicitLimit = params?.limit !== undefined && params?.limit !== null;
    const rawLimit = hasExplicitLimit ? Number(params.limit) : null;
    const limit = rawLimit && !isNaN(rawLimit) && rawLimit > 0 
      ? Math.min(Math.max(Math.floor(rawLimit), 1), 100) // Entre 1 y 100
      : 10; // Default de 10 si no se especifica o es inválido

    // Logging mejorado para debugging
    logger.debug(`[handleQueryTransactions] Limit handling: explicit=${hasExplicitLimit}, rawLimit=${rawLimit}, finalLimit=${limit}, totalTransactions=${transactions.length}`);

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
      message += `${icon} ${tx.date} | ${sign}${tx.amount.toFixed(2)} | ${tx.category || 'Sin categoría'} | ${tx.description || 'Sin descripción'}\n`;
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
    
    // Construir URL base para fetch usando función dedicada
    const baseUrl = getBaseUrlForInternalAPIs();
    debugLog('debug', `Using baseUrl: ${baseUrl}`);
    
    const bcvUrl = `${baseUrl}/api/bcv-rates`;
    const binanceUrl = `${baseUrl}/api/binance-rates`;
    debugLog('debug', `BCV URL: ${bcvUrl}, Binance URL: ${binanceUrl}`);
    
    // Validate URLs before attempting fetch
    try {
      new URL(bcvUrl);
      new URL(binanceUrl);
      debugLog('debug', 'URLs validated successfully');
    } catch (urlError: any) {
      debugLog('error', `Invalid URL constructed: ${urlError.message}`);
      logger.error(`[handleQueryRates] Invalid URL: ${urlError.message}`);
      return {
        message: `Error de configuración: URL inválida para las APIs de tasas. Por favor contacta al soporte.`,
        canHandle: true,
      };
    }

    // Obtener tasas desde las APIs con timeout de 5 segundos
    debugLog('debug', 'Fetching BCV and Binance rates in parallel');
    const fetchWithTimeout = (url: string, timeoutMs: number = 5000) => {
      return Promise.race([
        fetch(url, { 
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store' 
        }),
        new Promise<Response>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    };
    
    const [bcvResponse, binanceResponse] = await Promise.allSettled([
      fetchWithTimeout(bcvUrl, 5000),
      fetchWithTimeout(binanceUrl, 5000),
    ]);
    
    debugLog('debug', `BCV fetch status: ${bcvResponse.status}, Binance fetch status: ${binanceResponse.status}`);
    
    // Log detailed error information for rejected fetches
    if (bcvResponse.status === 'rejected') {
      const errorReason = bcvResponse.reason;
      const errorMessage = errorReason instanceof Error ? errorReason.message : String(errorReason);
      const errorStack = errorReason instanceof Error ? errorReason.stack : undefined;
      debugLog('error', `BCV fetch rejected: ${errorMessage}`);
      debugLog('error', `BCV URL attempted: ${bcvUrl}`);
      if (errorStack) {
        debugLog('debug', `BCV error stack: ${errorStack}`);
      }
    }
    
    if (binanceResponse.status === 'rejected') {
      const errorReason = binanceResponse.reason;
      const errorMessage = errorReason instanceof Error ? errorReason.message : String(errorReason);
      const errorStack = errorReason instanceof Error ? errorReason.stack : undefined;
      debugLog('error', `Binance fetch rejected: ${errorMessage}`);
      debugLog('error', `Binance URL attempted: ${binanceUrl}`);
      if (errorStack) {
        debugLog('debug', `Binance error stack: ${errorStack}`);
      }
    }
    
    // Check if both APIs failed completely
    if (bcvResponse.status === 'rejected' && binanceResponse.status === 'rejected') {
      debugLog('error', `Both rate APIs failed completely. BCV: ${bcvResponse.reason}, Binance: ${binanceResponse.reason}`);
      debugLog('error', `Attempted URLs - BCV: ${bcvUrl}, Binance: ${binanceUrl}`);
    }

    let message = 'Tasas de cambio disponibles:\n\n';

    // BCV Rates
    if (bcvResponse.status === 'fulfilled') {
      // Intentar parsear incluso si el status HTTP no es OK, ya que las APIs pueden retornar fallback
      try {
        const bcvData = await bcvResponse.value.json();
        debugLog('debug', `BCV data parsed: success=${bcvData?.success}, fallback=${bcvData?.fallback}, hasData=${!!bcvData?.data}, httpStatus=${bcvResponse.value.status}`);
        
        // Aceptar datos si success: true O si hay fallback: true con data presente
        // Incluso si el HTTP status no es 200, las APIs pueden retornar datos de fallback
        if (bcvData.data && (bcvData.success || bcvData.fallback)) {
          debugLog('info', `BCV data accepted: USD=${bcvData.data.usd}, EUR=${bcvData.data.eur}, fallback=${bcvData.fallback}`);
          message += `🏦 BCV (Banco Central de Venezuela):\n`;
          message += `  • USD: ${bcvData.data.usd?.toFixed(2) || 'N/A'} VES\n`;
          message += `  • EUR: ${bcvData.data.eur?.toFixed(2) || 'N/A'} VES\n`;
          if (bcvData.data.lastUpdated) {
            const updated = new Date(bcvData.data.lastUpdated);
            message += `  • Actualizado: ${updated.toLocaleDateString('es-VE')} ${updated.toLocaleTimeString('es-VE')}\n`;
          }
          if (bcvData.fallback) {
            message += `  • ⚠️ Nota: Tasas aproximadas (fallback)\n`;
          }
          message += '\n';
        } else {
          debugLog('warn', `BCV API response missing data or not successful: success=${bcvData?.success}, fallback=${bcvData?.fallback}, hasData=${!!bcvData?.data}, httpStatus=${bcvResponse.value.status}`);
          logger.warn(`[handleQueryRates] BCV API response missing data or not successful: success=${bcvData?.success}, fallback=${bcvData?.fallback}, hasData=${!!bcvData?.data}, httpStatus=${bcvResponse.value.status}`);
        }
      } catch (parseError: any) {
        debugLog('error', `Failed to parse BCV API JSON: ${parseError.message}, httpStatus=${bcvResponse.value.status}`);
        logger.error(`[handleQueryRates] Failed to parse BCV API JSON response: ${parseError.message}, httpStatus=${bcvResponse.value.status}`);
      }
    } else {
      debugLog('error', `BCV API fetch failed: ${bcvResponse.reason?.message || bcvResponse.reason}`);
      logger.error(`[handleQueryRates] BCV API fetch failed: ${bcvResponse.reason?.message || bcvResponse.reason}`);
    }

    // Binance Rates
    if (binanceResponse.status === 'fulfilled') {
      // Intentar parsear incluso si el status HTTP no es OK, ya que las APIs pueden retornar fallback
      try {
        const binanceData = await binanceResponse.value.json();
        debugLog('debug', `Binance data parsed: success=${binanceData?.success}, fallback=${binanceData?.fallback}, hasData=${!!binanceData?.data}, httpStatus=${binanceResponse.value.status}`);
        
        // Aceptar datos si success: true O si hay fallback: true con data presente
        // Incluso si el HTTP status no es 200, las APIs pueden retornar datos de fallback
        if (binanceData.data && (binanceData.success || binanceData.fallback)) {
          debugLog('info', `Binance data accepted: USD/VES=${binanceData.data.usd_ves}, fallback=${binanceData.fallback}`);
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
          if (binanceData.fallback) {
            message += `  • ⚠️ Nota: Tasas aproximadas (fallback)\n`;
          }
        } else {
          debugLog('warn', `Binance API response missing data or not successful: success=${binanceData?.success}, fallback=${binanceData?.fallback}, hasData=${!!binanceData?.data}, httpStatus=${binanceResponse.value.status}`);
          logger.warn(`[handleQueryRates] Binance API response missing data or not successful: success=${binanceData?.success}, fallback=${binanceData?.fallback}, hasData=${!!binanceData?.data}, httpStatus=${binanceResponse.value.status}`);
        }
      } catch (parseError: any) {
        debugLog('error', `Failed to parse Binance API JSON: ${parseError.message}, httpStatus=${binanceResponse.value.status}`);
        logger.error(`[handleQueryRates] Failed to parse Binance API JSON response: ${parseError.message}, httpStatus=${binanceResponse.value.status}`);
      }
    } else {
      debugLog('error', `Binance API fetch failed: ${binanceResponse.reason?.message || binanceResponse.reason}`);
      logger.error(`[handleQueryRates] Binance API fetch failed: ${binanceResponse.reason?.message || binanceResponse.reason}`);
    }

    // Si no se pudo obtener ninguna tasa
    if (message === 'Tasas de cambio disponibles:\n\n') {
      debugLog('warn', 'No rates data collected from either API');
      logger.warn('[handleQueryRates] No rates data collected from either API');
      
      // Build detailed error message with diagnostic info
      let errorMessage = 'No pude obtener las tasas de cambio en este momento. Por favor intenta más tarde.';
      
      // Add diagnostic info in development or if both APIs failed
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev || (bcvResponse.status === 'rejected' && binanceResponse.status === 'rejected')) {
        const bcvError = bcvResponse.status === 'rejected' 
          ? (bcvResponse.reason instanceof Error ? bcvResponse.reason.message : String(bcvResponse.reason))
          : 'unknown';
        const binanceError = binanceResponse.status === 'rejected'
          ? (binanceResponse.reason instanceof Error ? binanceResponse.reason.message : String(binanceResponse.reason))
          : 'unknown';
        
        errorMessage += `\n\n🔍 Diagnóstico:\n`;
        errorMessage += `• BCV API: ${bcvResponse.status === 'rejected' ? 'Error' : 'OK'} - ${bcvError}\n`;
        errorMessage += `• Binance API: ${binanceResponse.status === 'rejected' ? 'Error' : 'OK'} - ${binanceError}\n`;
        errorMessage += `• URLs intentadas: ${bcvUrl}, ${binanceUrl}`;
      }
      
      return {
        message: errorMessage,
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

