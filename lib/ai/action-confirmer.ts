/**
 * Action Confirmer for AI Assistant
 * 
 * Valida parámetros de acciones y determina si requieren confirmación del usuario.
 * Genera mensajes de confirmación claros y maneja respuestas de confirmación.
 */

import { ActionType } from './intention-detector';
import { logger } from '@/lib/utils/logger';

export interface ConfirmationRequired {
  required: boolean;
  reason?: string;
  confirmationMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Determina si una acción requiere confirmación
 * 
 * Regla: Solo acciones críticas requieren confirmación
 * - Todas las herramientas de análisis NO requieren confirmación
 * - Consultas y queries NO requieren confirmación
 */
export function requiresConfirmation(
  actionType: ActionType,
  parameters: Record<string, any>
): ConfirmationRequired {
  // Herramientas de análisis NUNCA requieren confirmación
  const analysisActions: ActionType[] = [
    'ANALYZE_SPENDING',
    'CALCULATE_PERCENTAGES',
    'GET_FINANCIAL_SUMMARY',
    'COMPARE_PERIODS',
    'ANALYZE_BY_CATEGORY',
    'GET_SPENDING_TRENDS',
  ];
  
  if (analysisActions.includes(actionType)) {
    return { required: false };
  }

  // Queries NO requieren confirmación
  if (actionType.startsWith('QUERY_')) {
    return { required: false };
  }

  // Transferencias siempre requieren confirmación (acción crítica)
  if (actionType === 'CREATE_TRANSFER') {
    return {
      required: true,
      reason: 'Las transferencias afectan múltiples cuentas',
      confirmationMessage: generateConfirmationMessage(actionType, parameters),
    };
  }

  // Transacciones grandes requieren confirmación (>= $100 USD)
  if (actionType === 'CREATE_TRANSACTION' && parameters.amount) {
    const amountValue = parameters.amount;
    const currency = parameters.currency || 'USD';
    const threshold = currency === 'USD' ? 100 : 1000; // $100 USD o equivalente
    
    if (amountValue >= threshold) {
      return {
        required: true,
        reason: `El monto (${amountValue.toFixed(2)} ${currency}) es mayor al umbral de confirmación`,
        confirmationMessage: generateConfirmationMessage(actionType, parameters),
      };
    }
  }

  // Actualizaciones requieren confirmación
  if (actionType === 'UPDATE_BUDGET' || actionType === 'UPDATE_GOAL') {
    return {
      required: true,
      reason: 'Las actualizaciones modifican datos existentes',
      confirmationMessage: generateConfirmationMessage(actionType, parameters),
    };
  }

  // Crear cuentas con balance inicial grande requiere confirmación (> $1000)
  if (actionType === 'CREATE_ACCOUNT' && parameters.initialBalance && parameters.initialBalance > 1000) {
    return {
      required: true,
      reason: 'Crear cuenta con balance inicial grande requiere confirmación',
      confirmationMessage: generateConfirmationMessage(actionType, parameters),
    };
  }

  // Crear cuentas sin balance inicial NO requiere confirmación
  if (actionType === 'CREATE_ACCOUNT') {
    return { required: false };
  }

  // Crear presupuestos y metas NO requieren confirmación
  if (actionType === 'CREATE_BUDGET' || actionType === 'CREATE_GOAL') {
    return { required: false };
  }

  // Otras acciones no requieren confirmación por defecto
  return { required: false };
}

/**
 * Valida parámetros de una acción
 */
export function validateActionParameters(
  actionType: ActionType,
  parameters: Record<string, any>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (actionType) {
    case 'CREATE_TRANSACTION':
      if (!parameters.amount || parameters.amount <= 0) {
        errors.push('El monto debe ser mayor a 0');
      }
      if (!parameters.type) {
        errors.push('El tipo de transacción es requerido (EXPENSE o INCOME)');
      }
      if (!parameters.description) {
        errors.push('La descripción es requerida');
      }
      if (parameters.amount && parameters.amount > 1000000) {
        warnings.push('El monto es muy grande. ¿Estás seguro?');
      }
      break;

    case 'CREATE_BUDGET':
      if (!parameters.category) {
        errors.push('La categoría es requerida');
      }
      if (!parameters.amount || parameters.amount <= 0) {
        errors.push('El monto del presupuesto debe ser mayor a 0');
      }
      break;

    case 'CREATE_GOAL':
      if (!parameters.name) {
        errors.push('El nombre de la meta es requerido');
      }
      if (!parameters.target || parameters.target <= 0) {
        errors.push('El objetivo debe ser mayor a 0');
      }
      break;

    case 'CREATE_ACCOUNT':
      if (!parameters.name) {
        errors.push('El nombre de la cuenta es requerido');
      }
      if (!parameters.type) {
        errors.push('El tipo de cuenta es requerido');
      }
      if (!parameters.currency) {
        errors.push('La moneda es requerida');
      }
      break;

    case 'CREATE_TRANSFER':
      if (!parameters.amount || parameters.amount <= 0) {
        errors.push('El monto debe ser mayor a 0');
      }
      if (!parameters.fromAccountName) {
        errors.push('La cuenta de origen es requerida');
      }
      if (!parameters.toAccountName) {
        errors.push('La cuenta de destino es requerida');
      }
      if (parameters.fromAccountName === parameters.toAccountName) {
        errors.push('No se puede transferir a la misma cuenta');
      }
      break;

    default:
      warnings.push(`Tipo de acción ${actionType} no tiene validación específica`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Genera mensaje de confirmación para una acción
 */
/**
 * Genera un mensaje de confirmación claro y descriptivo para una acción
 * Incluye todos los detalles relevantes para que el usuario pueda tomar una decisión informada
 */
function generateConfirmationMessage(
  actionType: ActionType,
  parameters: Record<string, any>
): string {
  switch (actionType) {
    case 'CREATE_TRANSACTION': {
      const typeLabel = parameters.type === 'EXPENSE' ? 'gasto' : 'ingreso';
      const amount = parameters.amount?.toFixed(2) || '0.00';
      const currency = parameters.currency || 'USD';
      const description = parameters.description || 'Sin descripción';
      const account = parameters.accountName ? ` en la cuenta "${parameters.accountName}"` : '';
      const category = parameters.category ? ` en la categoría "${parameters.category}"` : '';
      const date = parameters.date ? ` para la fecha ${parameters.date}` : '';
      
      return `¿Confirmas crear un ${typeLabel} de ${amount} ${currency}${account}${category} por "${description}"${date}?`;
    }

    case 'CREATE_BUDGET': {
      const amount = parameters.amount?.toFixed(2) || '0.00';
      const currency = parameters.currency || 'USD';
      const category = parameters.category || 'Sin categoría';
      const monthYear = parameters.monthYear ? ` para ${parameters.monthYear}` : ' para este mes';
      
      return `¿Confirmas crear un presupuesto de ${amount} ${currency} para la categoría "${category}"${monthYear}?`;
    }

    case 'CREATE_GOAL': {
      const name = parameters.name || 'Sin nombre';
      const target = parameters.target?.toFixed(2) || '0.00';
      const currency = parameters.currency || 'USD';
      const targetDate = parameters.targetDate ? ` con fecha objetivo ${parameters.targetDate}` : '';
      const account = parameters.accountName ? ` asociada a la cuenta "${parameters.accountName}"` : '';
      
      return `¿Confirmas crear una meta de ahorro "${name}" con objetivo de ${target} ${currency}${targetDate}${account}?`;
    }

    case 'CREATE_ACCOUNT': {
      const name = parameters.name || 'Sin nombre';
      const type = parameters.type || 'BANK';
      const typeLabels: Record<string, string> = {
        'BANK': 'cuenta bancaria',
        'CARD': 'tarjeta',
        'CASH': 'efectivo',
        'SAVINGS': 'cuenta de ahorros',
        'INVESTMENT': 'cuenta de inversión',
      };
      const typeLabel = typeLabels[type] || type.toLowerCase();
      const currency = parameters.currency || 'USD';
      const balanceText = parameters.initialBalance && parameters.initialBalance > 0
        ? ` con balance inicial de ${parameters.initialBalance.toFixed(2)} ${currency}`
        : '';
      
      return `¿Confirmas crear una ${typeLabel} llamada "${name}" en ${currency}${balanceText}?`;
    }

    case 'CREATE_TRANSFER': {
      const amount = parameters.amount?.toFixed(2) || '0.00';
      const currency = parameters.currency || 'USD';
      const fromAccount = parameters.fromAccountName || 'cuenta origen';
      const toAccount = parameters.toAccountName || 'cuenta destino';
      const description = parameters.description ? ` (${parameters.description})` : '';
      const date = parameters.date ? ` para la fecha ${parameters.date}` : '';
      
      return `¿Confirmas transferir ${amount} ${currency} de "${fromAccount}" a "${toAccount}"${description}${date}?`;
    }

    default:
      return `¿Confirmas ejecutar esta acción?`;
  }
}

/**
 * Genera mensaje de error para parámetros faltantes
 */
export function generateMissingParametersMessage(
  actionType: ActionType,
  missingParameters: string[]
): string {
  if (missingParameters.length === 0) {
    return '';
  }

  const paramNames: Record<string, string> = {
    'amount': 'monto',
    'description': 'descripción',
    'type': 'tipo',
    'category': 'categoría',
    'name': 'nombre',
    'target': 'objetivo',
    'currency': 'moneda',
    'fromAccount': 'cuenta de origen',
    'toAccount': 'cuenta de destino',
  };

  const missingNames = missingParameters
    .map(p => paramNames[p] || p)
    .join(', ');

  return `Para ${getActionDescription(actionType)}, necesito que especifiques: ${missingNames}.`;
}

/**
 * Obtiene descripción de acción en español
 */
function getActionDescription(actionType: ActionType): string {
  const descriptions: Record<ActionType, string> = {
    'CREATE_TRANSACTION': 'crear esta transacción',
    'CREATE_BUDGET': 'crear este presupuesto',
    'CREATE_GOAL': 'crear esta meta',
    'CREATE_ACCOUNT': 'crear esta cuenta',
    'CREATE_TRANSFER': 'realizar esta transferencia',
    'UPDATE_BUDGET': 'actualizar este presupuesto',
    'UPDATE_GOAL': 'actualizar esta meta',
    'QUERY_BALANCE': 'consultar el saldo',
    'QUERY_TRANSACTIONS': 'consultar las transacciones',
    'QUERY_BUDGETS': 'consultar los presupuestos',
    'QUERY_GOALS': 'consultar las metas',
    'QUERY_ACCOUNTS': 'consultar las cuentas',
    'QUERY_RATES': 'consultar las tasas de cambio',
    'QUERY_CATEGORIES': 'consultar las categorías',
    'QUERY_RECURRING': 'consultar las transacciones recurrentes',
    'ANALYZE_SPENDING': 'analizar gastos',
    'CALCULATE_PERCENTAGES': 'calcular porcentajes',
    'GET_FINANCIAL_SUMMARY': 'obtener resumen financiero',
    'COMPARE_PERIODS': 'comparar períodos',
    'ANALYZE_BY_CATEGORY': 'analizar por categoría',
    'GET_SPENDING_TRENDS': 'obtener tendencias de gasto',
    'UNKNOWN': 'realizar esta acción',
  };

  return descriptions[actionType] || 'realizar esta acción';
}

/**
 * Verifica si una respuesta del usuario es una confirmación
 */
export function isConfirmationResponse(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  const confirmations = [
    'sí', 'si', 'yes', 'ok', 'okay', 'confirmo', 'confirmar',
    'correcto', 'correct', 'de acuerdo', 'está bien', 'esta bien',
    'adelante', 'procede', 'hazlo', 'hacerlo', 'ejecuta', 'ejecutar',
    'claro', 'por supuesto', 'por supuesto que sí', 'seguro',
    'vamos', 'vamos a hacerlo', 'hazlo', 'haz lo', 'hazlo ahora',
  ];

  return confirmations.some(conf => lowerMessage.includes(conf));
}

/**
 * Verifica si una respuesta del usuario es una negación
 */
export function isRejectionResponse(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  const rejections = [
    'no', 'nope', 'cancelar', 'cancel', 'no quiero', 'no quiero hacerlo',
    'no hacerlo', 'no lo hagas', 'no lo haga', 'no ejecutes', 'no ejecutar',
    'no confirmo', 'no confirmar', 'mejor no', 'no gracias', 'no, gracias',
    'espera', 'wait', 'para', 'detente', 'stop', 'no ahora',
  ];

  return rejections.some(rej => lowerMessage.includes(rej));
}

