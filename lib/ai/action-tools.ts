/**
 * Action Tools for OpenAI Function Calling
 * 
 * Define las herramientas (funciones) que el modelo de OpenAI puede llamar
 * para realizar acciones en lugar de solo responder con texto.
 */

import { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * Definición de herramientas disponibles para el modelo
 */
export const AI_ACTION_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description: 'Crea una nueva transacción (gasto o ingreso) en una cuenta específica. Usa esto cuando el usuario quiera registrar un gasto o ingreso.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Monto de la transacción en unidades mayores (ej: 50.00 para $50.00)',
          },
          currency: {
            type: 'string',
            enum: ['USD', 'VES', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'],
            description: 'Código de moneda ISO 4217',
            default: 'USD',
          },
          type: {
            type: 'string',
            enum: ['EXPENSE', 'INCOME'],
            description: 'Tipo de transacción: EXPENSE para gastos, INCOME para ingresos',
          },
          description: {
            type: 'string',
            description: 'Descripción breve de la transacción (ej: "Comida en restaurante", "Salario mensual")',
          },
          accountName: {
            type: 'string',
            description: 'Nombre de la cuenta donde se registrará la transacción. Si no se especifica, se usará la cuenta por defecto.',
          },
          category: {
            type: 'string',
            description: 'Categoría de la transacción (ej: "Comida", "Transporte", "Salario"). Si no se especifica, se intentará categorizar automáticamente.',
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Fecha de la transacción en formato YYYY-MM-DD. Si no se especifica, se usará la fecha actual.',
          },
        },
        required: ['amount', 'type', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_budget',
      description: 'Crea un nuevo presupuesto para una categoría específica en el mes actual. Usa esto cuando el usuario quiera establecer un límite de gasto.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Nombre de la categoría para el presupuesto (ej: "Comida", "Transporte")',
          },
          amount: {
            type: 'number',
            description: 'Monto máximo del presupuesto en unidades mayores (ej: 500.00 para $500.00)',
          },
          currency: {
            type: 'string',
            enum: ['USD', 'VES', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'],
            description: 'Código de moneda ISO 4217',
            default: 'USD',
          },
          monthYear: {
            type: 'string',
            description: 'Mes y año en formato YYYY-MM (ej: "2024-01"). Si no se especifica, se usará el mes actual.',
          },
        },
        required: ['category', 'amount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Crea una nueva meta de ahorro. Usa esto cuando el usuario quiera establecer un objetivo de ahorro.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre descriptivo de la meta (ej: "Vacaciones", "Comprar carro", "Fondo de emergencia")',
          },
          target: {
            type: 'number',
            description: 'Monto objetivo a alcanzar en unidades mayores (ej: 5000.00 para $5000.00)',
          },
          currency: {
            type: 'string',
            enum: ['USD', 'VES', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'],
            description: 'Código de moneda ISO 4217',
            default: 'USD',
          },
          targetDate: {
            type: 'string',
            format: 'date',
            description: 'Fecha objetivo para alcanzar la meta en formato YYYY-MM-DD. Opcional.',
          },
          accountName: {
            type: 'string',
            description: 'Nombre de la cuenta asociada a la meta. Si no se especifica, se usará la cuenta por defecto.',
          },
        },
        required: ['name', 'target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_account',
      description: 'Crea una nueva cuenta financiera. Usa esto cuando el usuario quiera agregar una nueva cuenta a su billetera.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre de la cuenta (ej: "Banco Mercantil", "Efectivo", "Tarjeta Visa")',
          },
          type: {
            type: 'string',
            enum: ['BANK', 'CARD', 'CASH', 'SAVINGS', 'INVESTMENT'],
            description: 'Tipo de cuenta: BANK (cuenta bancaria), CARD (tarjeta de crédito/débito), CASH (efectivo), SAVINGS (ahorros), INVESTMENT (inversión)',
          },
          currency: {
            type: 'string',
            enum: ['USD', 'VES', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'],
            description: 'Código de moneda ISO 4217',
            default: 'USD',
          },
          initialBalance: {
            type: 'number',
            description: 'Balance inicial de la cuenta en unidades mayores (ej: 1000.00 para $1000.00). Si no se especifica, será 0.',
            default: 0,
          },
        },
        required: ['name', 'type', 'currency'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_transfer',
      description: 'Transfiere dinero de una cuenta a otra. Usa esto cuando el usuario quiera mover dinero entre cuentas.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Monto a transferir en unidades mayores (ej: 100.00 para $100.00)',
          },
          fromAccountName: {
            type: 'string',
            description: 'Nombre de la cuenta de origen',
          },
          toAccountName: {
            type: 'string',
            description: 'Nombre de la cuenta de destino',
          },
          description: {
            type: 'string',
            description: 'Descripción opcional de la transferencia',
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Fecha de la transferencia en formato YYYY-MM-DD. Si no se especifica, se usará la fecha actual.',
          },
        },
        required: ['amount', 'fromAccountName', 'toAccountName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_account_balance',
      description: 'Obtiene el balance de una cuenta específica. Usa esto cuando el usuario pregunte sobre el saldo de una cuenta.',
      parameters: {
        type: 'object',
        properties: {
          accountName: {
            type: 'string',
            description: 'Nombre de la cuenta. Si no se especifica, se retornará el balance total de todas las cuentas.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_category_spending',
      description: 'Obtiene el gasto total en una categoría específica para un período. Usa esto cuando el usuario pregunte sobre gastos en una categoría.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Nombre de la categoría',
          },
          period: {
            type: 'string',
            enum: ['today', 'week', 'month', 'year'],
            description: 'Período de tiempo para el análisis',
            default: 'month',
          },
        },
        required: ['category'],
      },
    },
  },
];

/**
 * Mapeo de nombres de funciones a tipos de acción
 */
export const FUNCTION_ACTION_MAP: Record<string, string> = {
  'create_transaction': 'CREATE_TRANSACTION',
  'create_budget': 'CREATE_BUDGET',
  'create_goal': 'CREATE_GOAL',
  'create_account': 'CREATE_ACCOUNT',
  'create_transfer': 'CREATE_TRANSFER',
  'get_account_balance': 'QUERY_BALANCE',
  'get_category_spending': 'QUERY_TRANSACTIONS',
};

/**
 * Obtiene la definición de una herramienta por nombre
 */
export function getToolByName(name: string): ChatCompletionTool | undefined {
  return AI_ACTION_TOOLS.find(tool => 'function' in tool && tool.function.name === name);
}

/**
 * Verifica si una función requiere confirmación
 */
export function requiresConfirmation(functionName: string, parameters: Record<string, any>): boolean {
  // Transferencias siempre requieren confirmación
  if (functionName === 'create_transfer') {
    return true;
  }
  
  // Transacciones grandes requieren confirmación
  if (functionName === 'create_transaction' && parameters.amount) {
    const amountValue = parameters.amount;
    const threshold = parameters.currency === 'USD' ? 100 : 1000;
    if (amountValue >= threshold) {
      return true;
    }
  }
  
  // Crear cuentas requiere confirmación
  if (functionName === 'create_account') {
    return true;
  }
  
  // Otras acciones no requieren confirmación por defecto
  return false;
}


