/**
 * Agentic Tools for OpenAI Function Calling
 * 
 * Define las herramientas (funciones) disponibles para el agente agéntico.
 * Estas herramientas serán usadas por el agente para razonar, planificar y ejecutar tareas.
 * Simplificado para la nueva arquitectura agéntica.
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
  {
    type: 'function',
    function: {
      name: 'analyze_spending',
      description: 'Analiza gastos por período con porcentajes, estadísticas y desglose por categoría. USA ESTO cuando el usuario pregunte por porcentajes de gasto, análisis de gastos, o estadísticas financieras. Ejecuta automáticamente sin preguntar.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'week', 'month', 'year', 'custom'],
            description: 'Período de tiempo para el análisis',
            default: 'month',
          },
          dateFrom: {
            type: 'string',
            format: 'date',
            description: 'Fecha de inicio (solo si period es "custom")',
          },
          dateTo: {
            type: 'string',
            format: 'date',
            description: 'Fecha de fin (solo si period es "custom")',
          },
          currency: {
            type: 'string',
            enum: ['USD', 'VES', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'],
            description: 'Moneda para el análisis (opcional)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_percentages',
      description: 'Calcula porcentajes financieros específicos (gasto, ahorro, por categoría). USA ESTO cuando el usuario pregunte por porcentajes específicos. Ejecuta automáticamente sin preguntar.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'week', 'month', 'year'],
            description: 'Período de tiempo',
            default: 'month',
          },
          metric: {
            type: 'string',
            enum: ['expense', 'savings', 'category', 'all'],
            description: 'Tipo de porcentaje a calcular',
            default: 'all',
          },
          category: {
            type: 'string',
            description: 'Categoría específica (solo si metric es "category")',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_financial_summary',
      description: 'Obtiene un resumen financiero completo con todas las métricas clave (ingresos, gastos, ahorros, presupuestos, metas). USA ESTO cuando el usuario pida un resumen general o visión completa de sus finanzas. Ejecuta automáticamente sin preguntar.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['month', 'year'],
            description: 'Período para el resumen',
            default: 'month',
          },
          includeTrends: {
            type: 'boolean',
            description: 'Incluir comparación con período anterior',
            default: false,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_periods',
      description: 'Compara dos períodos para detectar tendencias y cambios. USA ESTO cuando el usuario quiera comparar períodos (ej: "este mes vs el anterior", "comparar trimestres"). Ejecuta automáticamente sin preguntar.',
      parameters: {
        type: 'object',
        properties: {
          currentPeriod: {
            type: 'string',
            enum: ['month', 'year'],
            description: 'Período actual a comparar',
            default: 'month',
          },
          previousPeriod: {
            type: 'string',
            enum: ['month', 'year'],
            description: 'Período anterior a comparar (opcional, se calcula automáticamente)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_by_category',
      description: 'Analiza gastos por categoría con porcentajes y estadísticas. USA ESTO cuando el usuario pregunte por gastos por categoría, distribución de gastos, o qué categoría gasta más. Ejecuta automáticamente sin preguntar.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'week', 'month', 'year'],
            description: 'Período de tiempo',
            default: 'month',
          },
          limit: {
            type: 'number',
            description: 'Número máximo de categorías a mostrar',
            default: 10,
          },
          currency: {
            type: 'string',
            enum: ['USD', 'VES', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'],
            description: 'Moneda para el análisis (opcional)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_spending_trends',
      description: 'Obtiene tendencias de gasto a lo largo del tiempo (múltiples períodos). USA ESTO cuando el usuario pregunte por tendencias, evolución de gastos, o análisis histórico. Ejecuta automáticamente sin preguntar.',
      parameters: {
        type: 'object',
        properties: {
          periods: {
            type: 'number',
            description: 'Número de períodos a analizar (ej: 3 para últimos 3 meses)',
            default: 3,
          },
          periodType: {
            type: 'string',
            enum: ['month', 'week'],
            description: 'Tipo de período (mes o semana)',
            default: 'month',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_financial_data',
      description: 'Consulta datos financieros históricos de manera flexible. Permite filtrar por tipo (income/expense), período (hoy, mes, año, rango), categoría, moneda, y calcular agregaciones (suma, promedio, conteo, etc.). USA ESTO cuando el usuario pregunte por gastos/ingresos de hoy, datos históricos, promedios, estadísticas, o cualquier análisis que requiera consultar transacciones. El Agent debe razonar sobre qué datos necesita y cómo calcularlos.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['income', 'expense', 'both'],
            description: 'Tipo de transacción a consultar',
          },
          period: {
            type: 'string',
            enum: ['today', 'month', 'year', 'custom', 'all'],
            description: 'Período de tiempo. Usa "today" para consultas del día actual.',
          },
          months: {
            type: 'number',
            description: 'Número de meses a considerar (para cálculos de promedio)',
            minimum: 1,
            maximum: 24,
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Fecha de inicio (si period es custom)',
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'Fecha de fin (si period es custom)',
          },
          category: {
            type: 'string',
            description: 'Filtrar por categoría específica',
          },
          currency: {
            type: 'string',
            enum: ['USD', 'VES', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN', 'BRL'],
            description: 'Filtrar por moneda',
          },
          aggregation: {
            type: 'string',
            enum: ['sum', 'average', 'count', 'min', 'max', 'raw'],
            description: 'Tipo de agregación a calcular. "raw" retorna datos sin agregar para que el Agent calcule lo necesario',
            default: 'raw',
          },
          groupBy: {
            type: 'string',
            enum: ['month', 'category', 'account', 'none'],
            description: 'Agrupar resultados por',
            default: 'none',
          },
        },
        required: ['type'],
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
  'query_financial_data': 'QUERY_FINANCIAL_DATA',
  'analyze_spending': 'ANALYZE_SPENDING',
  'calculate_percentages': 'CALCULATE_PERCENTAGES',
  'get_financial_summary': 'GET_FINANCIAL_SUMMARY',
  'compare_periods': 'COMPARE_PERIODS',
  'analyze_by_category': 'ANALYZE_BY_CATEGORY',
  'get_spending_trends': 'GET_SPENDING_TRENDS',
};

/**
 * Obtiene la definición de una herramienta por nombre
 */
export function getToolByName(name: string): ChatCompletionTool | undefined {
  return AI_ACTION_TOOLS.find(tool => 'function' in tool && tool.function.name === name);
}

/**
 * Verifica si una función requiere confirmación
 * 
 * Regla: Solo acciones críticas requieren confirmación
 * - Todas las herramientas de análisis NO requieren confirmación
 * - Consultas y queries NO requieren confirmación
 */
export function requiresConfirmation(functionName: string, parameters: Record<string, any>): boolean {
  // Herramientas de análisis NUNCA requieren confirmación
  const analysisTools = [
    'query_financial_data',
    'analyze_spending',
    'calculate_percentages',
    'get_financial_summary',
    'compare_periods',
    'analyze_by_category',
    'get_spending_trends',
    'get_account_balance',
    'get_category_spending',
  ];
  
  if (analysisTools.includes(functionName)) {
    return false;
  }
  
  // Transferencias siempre requieren confirmación (acción crítica)
  if (functionName === 'create_transfer') {
    return true;
  }
  
  // Transacciones grandes requieren confirmación (>= $100 USD)
  if (functionName === 'create_transaction' && parameters.amount) {
    const amountValue = parameters.amount;
    const threshold = parameters.currency === 'USD' ? 100 : 1000;
    if (amountValue >= threshold) {
      return true;
    }
  }
  
  // Crear cuentas con balance inicial grande requiere confirmación (> $1000)
  if (functionName === 'create_account' && parameters.initialBalance && parameters.initialBalance > 1000) {
    return true;
  }
  
  // Crear cuentas sin balance inicial NO requiere confirmación
  if (functionName === 'create_account') {
    return false;
  }
  
  // Crear presupuestos y metas NO requieren confirmación
  if (functionName === 'create_budget' || functionName === 'create_goal') {
    return false;
  }
  
  // Otras acciones no requieren confirmación por defecto
  return false;
}






