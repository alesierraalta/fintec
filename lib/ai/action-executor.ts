/**
 * Action Executor for AI Assistant
 * 
 * Ejecuta acciones reales en el sistema llamando a las APIs correspondientes.
 * Mapea nombres de cuentas/categorías a IDs y maneja conversiones de moneda.
 */

import { WalletContext } from './context-builder';
import { toMinorUnits, fromMinorUnits } from '@/lib/money';
import { logger } from '@/lib/utils/logger';
import { createSupabaseServiceClient } from '@/repositories/supabase/client';
import { AgentActionType } from './agent/core/types';
import {
  analyzeSpending,
  calculatePercentages,
  getFinancialSummary,
  comparePeriods,
  analyzeByCategory,
  getSpendingTrends,
} from './analysis-handlers';
import {
  handleQueryBalance,
  handleQueryTransactions,
  handleQueryBudgets,
  handleQueryGoals,
  handleQueryAccounts,
  handleQueryRates,
  handleQueryCategories,
  handleQueryRecurring,
} from './query-handlers';
import { handleQueryFinancialData, QueryFinancialDataParams } from './handlers/query-financial-data-handler';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Ejecuta una acción basada en el tipo y parámetros
 */
export async function executeAction(
  userId: string,
  actionType: AgentActionType,
  parameters: Record<string, any>,
  context: WalletContext
): Promise<ActionResult> {
  try {
    logger.info(`[executeAction] Executing ${actionType} for user ${userId}`, parameters);

    switch (actionType) {
      case 'CREATE_TRANSACTION':
        return await executeCreateTransaction(userId, parameters, context);

      case 'CREATE_BUDGET':
        return await executeCreateBudget(userId, parameters, context);

      case 'CREATE_GOAL':
        return await executeCreateGoal(userId, parameters, context);

      case 'CREATE_ACCOUNT':
        return await executeCreateAccount(userId, parameters, context);

      case 'CREATE_TRANSFER':
        return await executeCreateTransfer(userId, parameters, context);

      // Acciones de análisis (no requieren confirmación)
      case 'ANALYZE_SPENDING':
        return formatAnalysisResult(analyzeSpending(context, parameters));

      case 'CALCULATE_PERCENTAGES':
        return formatAnalysisResult(calculatePercentages(context, parameters));

      case 'GET_FINANCIAL_SUMMARY':
        return formatAnalysisResult(getFinancialSummary(context, parameters));

      case 'COMPARE_PERIODS':
        return formatAnalysisResult(comparePeriods(context, parameters));

      case 'ANALYZE_BY_CATEGORY':
        return formatAnalysisResult(analyzeByCategory(context, parameters));

      case 'GET_SPENDING_TRENDS':
        return formatAnalysisResult(getSpendingTrends(context, parameters));

      // Query handlers
      case 'QUERY_BALANCE':
        return formatQueryResult(handleQueryBalance(context, parameters));

      case 'QUERY_TRANSACTIONS':
        return formatQueryResult(handleQueryTransactions(context, parameters));

      case 'QUERY_BUDGETS':
        return formatQueryResult(handleQueryBudgets(context, parameters));

      case 'QUERY_GOALS':
        return formatQueryResult(handleQueryGoals(context, parameters));

      case 'QUERY_ACCOUNTS':
        return formatQueryResult(handleQueryAccounts(context, parameters));

      case 'QUERY_RATES':
        return formatQueryResult(await handleQueryRates(context, parameters));

      case 'QUERY_CATEGORIES':
        return formatQueryResult(await handleQueryCategories(context, userId, parameters));

      case 'QUERY_RECURRING':
        return formatQueryResult(await handleQueryRecurring(context, userId, parameters));

      case 'QUERY_FINANCIAL_DATA':
        return await handleQueryFinancialData(userId, toQueryFinancialDataParams(parameters), context);

      default:
        return {
          success: false,
          message: `Acción ${actionType} no está implementada aún`,
          error: 'Action not implemented',
        };
    }
  } catch (error: any) {
    logger.error(`[executeAction] Error executing ${actionType}:`, error);
    return {
      success: false,
      message: `Error al ejecutar la acción: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Ejecuta creación de transacción
 */
async function executeCreateTransaction(
  userId: string,
  params: Record<string, any>,
  context: WalletContext
): Promise<ActionResult> {
  try {
    // Validar parámetros requeridos
    if (!params.amount || !params.type || !params.description) {
      return {
        success: false,
        message: 'Faltan parámetros requeridos: amount, type, description',
        error: 'Missing required parameters',
      };
    }

    // Obtener ID de cuenta
    const accountId = await getAccountIdByName(userId, params.accountName || null, context);
    if (!accountId) {
      return {
        success: false,
        message: `No se encontró la cuenta "${params.accountName || 'por defecto'}". Por favor especifica una cuenta válida.`,
        error: 'Account not found',
      };
    }

    // Obtener ID de categoría
    let categoryId: string | undefined;
    if (params.category) {
      const categoryIdResult = await getCategoryIdByName(userId, params.category, params.type, context);
      categoryId = categoryIdResult || undefined;
      // Si no se encuentra la categoría, continuamos sin categoría (será categorizada automáticamente)
    }

    // Convertir monto a minor units
    const currency = params.currency || 'USD';
    const amountMinor = toMinorUnits(params.amount, currency);

    // Llamar directamente a Supabase (sin fetch interno)
    const client = createSupabaseServiceClient();

    const { data, error } = await client
      .from('transactions')
      .insert({
        account_id: accountId,
        amount_base_minor: amountMinor,
        type: params.type,
        category_id: categoryId || null,
        description: params.description,
        currency_code: currency,
        date: params.date || new Date().toISOString().split('T')[0],
      } as any)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        message: error.message || 'Error al crear la transacción',
        error: error.message,
      };
    }

    return {
      success: true,
      message: `✓ Transacción creada exitosamente: ${params.description} - ${params.amount.toFixed(2)} ${currency}`,
      data,
    };
  } catch (error: any) {
    logger.error('[executeCreateTransaction] Error:', error);
    return {
      success: false,
      message: `Error al crear la transacción: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Ejecuta creación de presupuesto
 */
async function executeCreateBudget(
  userId: string,
  params: Record<string, any>,
  context: WalletContext
): Promise<ActionResult> {
  try {
    if (!params.category || !params.amount) {
      return {
        success: false,
        message: 'Faltan parámetros requeridos: category, amount',
        error: 'Missing required parameters',
      };
    }

    // Obtener ID de categoría
    const categoryId = await getCategoryIdByName(userId, params.category, 'EXPENSE', context);
    if (!categoryId) {
      return {
        success: false,
        message: `No se encontró la categoría "${params.category}". Por favor especifica una categoría válida.`,
        error: 'Category not found',
      };
    }

    // Obtener mes/año (por defecto mes actual)
    const now = new Date();
    const monthYear = params.monthYear || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Convertir monto a minor units
    const currency = params.currency || 'USD';
    const amountMinor = toMinorUnits(params.amount, currency);

    // Llamar al repositorio directamente (no hay API endpoint para budgets)
    const client = createSupabaseServiceClient();

    const { data, error } = await client
      .from('budgets')
      .insert({
        category_id: categoryId,
        month_year: monthYear,
        amount_base_minor: amountMinor,
        spent_base_minor: 0,
        active: true,
      } as any)
      .select()
      .single();

    if (error) {
      // Si ya existe un presupuesto para esta categoría y mes
      if (error.code === '23505') {
        return {
          success: false,
          message: `Ya existe un presupuesto para ${params.category} en ${monthYear}. ¿Quieres actualizarlo?`,
          error: 'Budget already exists',
        };
      }
      return {
        success: false,
        message: `Error al crear el presupuesto: ${error.message}`,
        error: error.message,
      };
    }

    return {
      success: true,
      message: `✓ Presupuesto creado exitosamente: ${params.category} - ${params.amount.toFixed(2)} ${currency} para ${monthYear}`,
      data,
    };
  } catch (error: any) {
    logger.error('[executeCreateBudget] Error:', error);
    return {
      success: false,
      message: `Error al crear el presupuesto: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Ejecuta creación de meta
 */
async function executeCreateGoal(
  userId: string,
  params: Record<string, any>,
  context: WalletContext
): Promise<ActionResult> {
  try {
    if (!params.name || !params.target) {
      return {
        success: false,
        message: 'Faltan parámetros requeridos: name, target',
        error: 'Missing required parameters',
      };
    }

    // Obtener ID de cuenta si se especifica
    let accountId: string | null | undefined;
    if (params.accountName) {
      accountId = await getAccountIdByName(userId, params.accountName, context);
      if (!accountId) {
        return {
          success: false,
          message: `No se encontró la cuenta "${params.accountName}". Por favor especifica una cuenta válida.`,
          error: 'Account not found',
        };
      }
    }

    // Convertir monto a minor units
    const currency = params.currency || 'USD';
    const targetMinor = toMinorUnits(params.target, currency);

    // Llamar al repositorio directamente
    const client = createSupabaseServiceClient();

    const { data, error } = await client
      .from('goals')
      .insert({
        name: params.name,
        description: params.description || null,
        target_base_minor: targetMinor,
        current_base_minor: 0,
        target_date: params.targetDate || null,
        account_id: accountId || null,
        active: true,
        user_id: userId,
      } as any)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        message: `Error al crear la meta: ${error.message}`,
        error: error.message,
      };
    }

    return {
      success: true,
      message: `✓ Meta creada exitosamente: ${params.name} - ${params.target.toFixed(2)} ${currency}`,
      data,
    };
  } catch (error: any) {
    logger.error('[executeCreateGoal] Error:', error);
    return {
      success: false,
      message: `Error al crear la meta: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Ejecuta creación de cuenta
 */
async function executeCreateAccount(
  userId: string,
  params: Record<string, any>,
  context: WalletContext
): Promise<ActionResult> {
  try {
    if (!params.name || !params.type || !params.currency) {
      return {
        success: false,
        message: 'Faltan parámetros requeridos: name, type, currency',
        error: 'Missing required parameters',
      };
    }

    // Convertir balance inicial a minor units
    const initialBalanceMinor = params.initialBalance
      ? toMinorUnits(params.initialBalance, params.currency)
      : 0;

    // Llamar directamente a Supabase
    const client = createSupabaseServiceClient();

    const { data, error } = await client
      .from('accounts')
      .insert({
        user_id: userId,
        name: params.name,
        type: params.type,
        currency_code: params.currency,
        balance: initialBalanceMinor,
        active: true,
      } as any)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        message: error.message || 'Error al crear la cuenta',
        error: error.message,
      };
    }

    return {
      success: true,
      message: `✓ Cuenta creada exitosamente: ${params.name} (${params.type}) - ${params.currency}`,
      data,
    };
  } catch (error: any) {
    logger.error('[executeCreateAccount] Error:', error);
    return {
      success: false,
      message: `Error al crear la cuenta: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Ejecuta creación de transferencia
 */
async function executeCreateTransfer(
  userId: string,
  params: Record<string, any>,
  context: WalletContext
): Promise<ActionResult> {
  try {
    if (!params.amount || !params.fromAccountName || !params.toAccountName) {
      return {
        success: false,
        message: 'Faltan parámetros requeridos: amount, fromAccountName, toAccountName',
        error: 'Missing required parameters',
      };
    }

    // Obtener IDs de cuentas
    const fromAccountId = await getAccountIdByName(userId, params.fromAccountName, context);
    const toAccountId = await getAccountIdByName(userId, params.toAccountName, context);

    if (!fromAccountId) {
      return {
        success: false,
        message: `No se encontró la cuenta de origen "${params.fromAccountName}"`,
        error: 'From account not found',
      };
    }

    if (!toAccountId) {
      return {
        success: false,
        message: `No se encontró la cuenta de destino "${params.toAccountName}"`,
        error: 'To account not found',
      };
    }

    if (fromAccountId === toAccountId) {
      return {
        success: false,
        message: 'No se puede transferir a la misma cuenta',
        error: 'Same account',
      };
    }

    // Convertir monto a minor units
    const currency = params.currency || 'USD';
    const amountMinor = toMinorUnits(params.amount, currency);

    // Llamar directamente a Supabase para crear transferencia
    // Una transferencia son 2 transacciones: una salida y una entrada
    const client = createSupabaseServiceClient();
    const date = params.date || new Date().toISOString().split('T')[0];
    const description = params.description || 'Transferencia';

    // Crear transacción de salida
    const { data: outgoingTx, error: outgoingError } = await client
      .from('transactions')
      .insert({
        account_id: fromAccountId,
        amount_base_minor: amountMinor,
        type: 'EXPENSE',
        description: `${description} (a ${params.toAccountName})`,
        currency_code: currency,
        date,
      } as any)
      .select()
      .single();

    if (outgoingError) {
      return {
        success: false,
        message: outgoingError.message || 'Error al crear la transferencia de salida',
        error: outgoingError.message,
      };
    }

    // Crear transacción de entrada
    const { data: incomingTx, error: incomingError } = await client
      .from('transactions')
      .insert({
        account_id: toAccountId,
        amount_base_minor: amountMinor,
        type: 'INCOME',
        description: `${description} (de ${params.fromAccountName})`,
        currency_code: currency,
        date,
      } as any)
      .select()
      .single();

    if (incomingError) {
      // Rollback: eliminar la transacción de salida
      if (outgoingTx && 'id' in outgoingTx) {
        await client.from('transactions').delete().eq('id', (outgoingTx as any).id);
      }
      return {
        success: false,
        message: incomingError.message || 'Error al crear la transferencia de entrada',
        error: incomingError.message,
      };
    }

    return {
      success: true,
      message: `✓ Transferencia realizada exitosamente: ${params.amount.toFixed(2)} ${currency} de ${params.fromAccountName} a ${params.toAccountName}`,
      data: { outgoingTx, incomingTx },
    };
  } catch (error: any) {
    logger.error('[executeCreateTransfer] Error:', error);
    return {
      success: false,
      message: `Error al crear la transferencia: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Obtiene el ID de cuenta por nombre (o primera cuenta si no se especifica)
 */
async function getAccountIdByName(
  userId: string,
  accountName: string | null,
  context: WalletContext
): Promise<string | null> {
  // Si no se especifica nombre, usar la primera cuenta disponible
  if (!accountName) {
    if (context.accounts.summary.length > 0) {
      // Necesitamos obtener el ID real desde la base de datos
      const client = createSupabaseServiceClient();
      const { data } = await client
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return (data as { id: string } | null)?.id || null;
    }
    return null;
  }

  // Buscar por nombre (case-insensitive)
  const client = createSupabaseServiceClient();
  const { data } = await client
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .ilike('name', `%${accountName}%`)
    .limit(1)
    .maybeSingle();

  return (data as { id: string } | null)?.id || null;
}

/**
 * Obtiene el ID de categoría por nombre
 */
async function getCategoryIdByName(
  userId: string,
  categoryName: string,
  kind: 'INCOME' | 'EXPENSE',
  context: WalletContext
): Promise<string | null> {
  const client = createSupabaseServiceClient();

  // Buscar categoría por nombre (case-insensitive) y tipo
  const { data } = await client
    .from('categories')
    .select('id')
    .eq('kind', kind)
    .ilike('name', `%${categoryName}%`)
    .or(`user_id.eq.${userId},is_default.eq.true`)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  return (data as { id: string } | null)?.id || null;
}

/**
 * Formatea el resultado de porcentajes para un mensaje amigable al usuario
 */
function formatPercentageResult(data: any, period: string): string {
  const periodNames: Record<string, string> = {
    'today': 'hoy',
    'week': 'esta semana',
    'month': 'mensual',
    'year': 'anual',
  };
  const periodName = periodNames[period] || 'mensual';

  // Si no hay datos de porcentaje, retornar mensaje genérico
  if (data.expensePercentage === undefined && data.savingsPercentage === undefined) {
    return 'No se pudieron calcular los porcentajes solicitados.';
  }

  const parts: string[] = [];

  // Formatear porcentaje de gasto
  if (data.expensePercentage !== undefined) {
    const expensePct = Math.round(data.expensePercentage * 10) / 10; // Redondear a 1 decimal
    const income = data.income || 0;
    const expenses = data.expenses || 0;

    if (income > 0) {
      parts.push(`Tu porcentaje de gasto ${periodName} es del ${expensePct}%. Gastaste $${expenses.toFixed(2)} de $${income.toFixed(2)} en ingresos.`);
    } else {
      parts.push(`Tus gastos ${periodName} son de $${expenses.toFixed(2)}, pero no tienes ingresos registrados para calcular el porcentaje.`);
    }
  }

  // Formatear porcentaje de ahorro
  if (data.savingsPercentage !== undefined && data.income > 0) {
    const savingsPct = Math.round(data.savingsPercentage * 10) / 10;
    const savings = data.savings || 0;

    if (savingsPct > 0) {
      parts.push(`Tu tasa de ahorro es del ${savingsPct}% ($${savings.toFixed(2)}).`);
    } else if (savingsPct < 0) {
      parts.push(`⚠️ Tus gastos superan tus ingresos en $${Math.abs(savings).toFixed(2)}.`);
    } else {
      // savingsPct === 0: gastos igualan ingresos exactamente
      parts.push(`Tu tasa de ahorro es del 0%. Tus gastos igualan tus ingresos ($${data.expenses?.toFixed(2) || '0.00'}).`);
    }
  }

  // Agregar porcentajes por categoría si están disponibles
  if (data.categoryPercentages && Object.keys(data.categoryPercentages).length > 0) {
    const topCategories = Object.entries(data.categoryPercentages)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([cat, pct]) => `${cat}: ${Math.round((pct as number) * 10) / 10}%`)
      .join(', ');

    if (topCategories) {
      parts.push(`Principales categorías: ${topCategories}.`);
    }
  }

  return parts.join(' ') || 'Análisis completado exitosamente';
}

/**
 * Formatea el resultado de una consulta para el formato ActionResult
 */
function formatQueryResult(queryResult: { message: string; canHandle: boolean }): ActionResult {
  return {
    success: queryResult.canHandle,
    message: queryResult.message,
    data: queryResult,
  };
}

/**
 * Formatea el resultado de un análisis para el formato ActionResult
 */
function formatAnalysisResult(analysisResult: { success: boolean; data: any; message?: string; error?: string }): ActionResult {
  if (analysisResult.success) {
    // Si es un resultado de porcentajes, formatear especialmente
    if (analysisResult.data && (analysisResult.data.expensePercentage !== undefined || analysisResult.data.savingsPercentage !== undefined)) {
      const period = analysisResult.data.period || 'month';
      const formattedMessage = formatPercentageResult(analysisResult.data, period);
      return {
        success: true,
        message: formattedMessage,
        data: analysisResult.data,
      };
    }

    return {
      success: true,
      message: analysisResult.message || 'Análisis completado exitosamente',
      data: analysisResult.data,
    };
  } else {
    return {
      success: false,
      message: analysisResult.message || analysisResult.error || 'Error al realizar el análisis',
      error: analysisResult.error,
    };
  }
}

/**
 * Normaliza los parÇ­metros de QUERY_FINANCIAL_DATA al tipo esperado
 */
function toQueryFinancialDataParams(params: Record<string, any>): QueryFinancialDataParams {
  const typeOptions = ['income', 'expense', 'both'] as const;
  const periodOptions = ['today', 'month', 'year', 'custom', 'all'] as const;
  const aggregationOptions = ['sum', 'average', 'count', 'min', 'max', 'raw'] as const;
  const groupByOptions = ['month', 'category', 'account', 'none'] as const;

  const normalize = <Options extends readonly string[]>(value: any, allowed: Options, fallback: Options[number]) =>
    typeof value === 'string' && allowed.includes(value as Options[number]) ? (value as Options[number]) : fallback;

  return {
    type: normalize(params.type, typeOptions, 'both'),
    period: params.period ? normalize(params.period, periodOptions, 'month') : undefined,
    months: typeof params.months === 'number' ? params.months : undefined,
    startDate: typeof params.startDate === 'string' ? params.startDate : undefined,
    endDate: typeof params.endDate === 'string' ? params.endDate : undefined,
    category: typeof params.category === 'string' ? params.category : undefined,
    currency: typeof params.currency === 'string' ? params.currency : undefined,
    aggregation: params.aggregation ? normalize(params.aggregation, aggregationOptions, 'raw') : undefined,
    groupBy: params.groupBy ? normalize(params.groupBy, groupByOptions, 'none') : undefined,
  };
}
