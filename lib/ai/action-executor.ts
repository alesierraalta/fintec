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
import { ActionType } from './intention-detector';
import {
  analyzeSpending,
  calculatePercentages,
  getFinancialSummary,
  comparePeriods,
  analyzeByCategory,
  getSpendingTrends,
} from './analysis-handlers';

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
  actionType: ActionType,
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

    // Preparar datos de transacción
    const transactionData = {
      accountId,
      amount: amountMinor,
      type: params.type,
      categoryId,
      description: params.description,
      currencyCode: currency,
      date: params.date || new Date().toISOString().split('T')[0],
      userId, // Para validación de límites
    };

    // Llamar a la API
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Error al crear la transacción',
        error: result.error,
      };
    }

    return {
      success: true,
      message: `✓ Transacción creada exitosamente: ${params.description} - ${params.amount.toFixed(2)} ${currency}`,
      data: result.data,
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

    // Llamar a la API
    const response = await fetch('/api/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.name,
        type: params.type,
        currencyCode: params.currency,
        balance: initialBalanceMinor,
        active: true,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Error al crear la cuenta',
        error: result.error,
      };
    }

    return {
      success: true,
      message: `✓ Cuenta creada exitosamente: ${params.name} (${params.type}) - ${params.currency}`,
      data: result.data,
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

    // Llamar a la API
    const response = await fetch('/api/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAccountId,
        toAccountId,
        amount: params.amount,
        description: params.description || 'Transferencia',
        date: params.date || new Date().toISOString().split('T')[0],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Error al crear la transferencia',
        error: result.error,
      };
    }

    return {
      success: true,
      message: `✓ Transferencia realizada exitosamente: ${params.amount.toFixed(2)} ${params.currency || 'USD'} de ${params.fromAccountName} a ${params.toAccountName}`,
      data: result.data,
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

