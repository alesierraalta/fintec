/**
 * Intention Detector for AI Assistant
 * 
 * Detecta intenciones de acción vs. consulta y extrae parámetros de comandos en lenguaje natural.
 * Soporta acciones como crear transacciones, presupuestos, metas, cuentas y transferencias.
 */

import { logger } from '@/lib/utils/logger';

export type ActionType = 
  | 'CREATE_TRANSACTION'
  | 'CREATE_BUDGET'
  | 'CREATE_GOAL'
  | 'CREATE_ACCOUNT'
  | 'CREATE_TRANSFER'
  | 'UPDATE_BUDGET'
  | 'UPDATE_GOAL'
  | 'QUERY_BALANCE'
  | 'QUERY_TRANSACTIONS'
  | 'QUERY_BUDGETS'
  | 'QUERY_GOALS'
  | 'QUERY_ACCOUNTS'
  | 'UNKNOWN';

export type IntentionType = 'ACTION' | 'QUERY';

export interface DetectedIntention {
  type: IntentionType;
  actionType?: ActionType;
  confidence: number; // 0-1
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  missingParameters: string[];
}

/**
 * Palabras clave para detectar intenciones de creación
 */
const CREATE_KEYWORDS = [
  'crear', 'crea', 'agregar', 'agrega', 'añadir', 'añade', 
  'nuevo', 'nueva', 'registrar', 'registra', 'agreguemos',
  'quiero crear', 'necesito crear', 'deseo crear', 'hazme', 'haz',
  'add', 'create', 'new', 'register'
];

/**
 * Palabras clave para detectar intenciones de actualización
 */
const UPDATE_KEYWORDS = [
  'actualizar', 'actualiza', 'modificar', 'modifica', 'cambiar', 'cambia',
  'editar', 'edita', 'aumentar', 'aumenta', 'disminuir', 'disminuye',
  'update', 'modify', 'change', 'edit', 'increase', 'decrease'
];

/**
 * Palabras clave para detectar transacciones
 */
const TRANSACTION_KEYWORDS = [
  'transacción', 'transaccion', 'gasto', 'gastos', 'ingreso', 'ingresos',
  'pago', 'pagos', 'cobro', 'cobros', 'compra', 'compras',
  'transaction', 'expense', 'income', 'payment', 'purchase'
];

/**
 * Palabras clave para detectar presupuestos
 */
const BUDGET_KEYWORDS = [
  'presupuesto', 'presupuestos', 'límite', 'limite', 'tope', 'topes',
  'budget', 'limit', 'quota'
];

/**
 * Palabras clave para detectar metas
 */
const GOAL_KEYWORDS = [
  'meta', 'metas', 'objetivo', 'objetivos', 'ahorro', 'ahorros',
  'goal', 'target', 'savings'
];

/**
 * Palabras clave para detectar cuentas
 */
const ACCOUNT_KEYWORDS = [
  'cuenta', 'cuentas', 'banco', 'bancos', 'tarjeta', 'tarjetas',
  'account', 'bank', 'card'
];

/**
 * Palabras clave para detectar transferencias
 */
const TRANSFER_KEYWORDS = [
  'transferir', 'transferencia', 'transferencias', 'mover', 'movimiento',
  'transfer', 'move', 'send', 'enviar'
];

/**
 * Palabras clave para detectar consultas
 */
const QUERY_KEYWORDS = [
  'cuánto', 'cuanto', 'cuánta', 'cuanta', 'cuántos', 'cuantos',
  'cuántas', 'cuantas', 'cuál', 'cual', 'cuáles', 'cuales',
  'dónde', 'donde', 'cuándo', 'cuando', 'qué', 'que', 'quién', 'quien',
  'mostrar', 'muestra', 'listar', 'lista', 'ver', 'verme', 'dime', 'dame',
  'how much', 'how many', 'what', 'which', 'where', 'when', 'who',
  'show', 'list', 'tell me', 'give me'
];

/**
 * Expresiones regulares para extraer parámetros
 */
const AMOUNT_PATTERNS = [
  /\b(\d+(?:\.\d+)?)\s*(?:usd|dólar|dolares|dollar|dollars|ves|bolívar|bolivares|eur|euro|euros)\b/gi,
  /\b(\d+(?:\.\d+)?)\s*(?:pesos?|dollars?)\b/gi,
  /\$\s*(\d+(?:\.\d+)?)/gi,
  /\b(\d+(?:\.\d+)?)\b/gi, // Fallback: cualquier número
];

const DATE_PATTERNS = [
  /\b(?:hoy|today|ayer|yesterday|mañana|tomorrow)\b/gi,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/gi, // DD/MM/YYYY
  /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/gi, // YYYY-MM-DD
];

/**
 * Detecta la intención del mensaje del usuario
 */
export function detectIntention(message: string): DetectedIntention {
  const lowerMessage = message.toLowerCase().trim();
  
  // Detectar si es una acción o consulta
  const isAction = CREATE_KEYWORDS.some(kw => lowerMessage.includes(kw)) ||
                   UPDATE_KEYWORDS.some(kw => lowerMessage.includes(kw));
  
  const isQuery = !isAction && QUERY_KEYWORDS.some(kw => lowerMessage.includes(kw));
  
  const intentionType: IntentionType = isAction ? 'ACTION' : 'QUERY';
  
  // Si es acción, detectar el tipo específico
  if (intentionType === 'ACTION') {
    return detectActionIntention(lowerMessage, message);
  }
  
  // Si es consulta, detectar el tipo de consulta
  return detectQueryIntention(lowerMessage, message);
}

/**
 * Detecta intención de acción específica
 */
function detectActionIntention(lowerMessage: string, originalMessage: string): DetectedIntention {
  let actionType: ActionType = 'UNKNOWN';
  let confidence = 0.5;
  const parameters: Record<string, any> = {};
  const missingParameters: string[] = [];
  
  // Detectar tipo de acción
  const hasTransaction = TRANSACTION_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasBudget = BUDGET_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasGoal = GOAL_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasAccount = ACCOUNT_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasTransfer = TRANSFER_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasUpdate = UPDATE_KEYWORDS.some(kw => lowerMessage.includes(kw));
  
  // Extraer parámetros comunes
  const amount = extractAmount(originalMessage);
  const date = extractDate(originalMessage);
  const description = extractDescription(originalMessage, amount);
  
  if (hasTransaction) {
    actionType = 'CREATE_TRANSACTION';
    confidence = 0.8;
    
    if (amount) {
      parameters.amount = amount.value;
      parameters.currency = amount.currency || 'USD';
    } else {
      missingParameters.push('amount');
    }
    
    if (description) {
      parameters.description = description;
    } else {
      missingParameters.push('description');
    }
    
    if (date) {
      parameters.date = date;
    }
    
    // Detectar tipo de transacción (gasto vs ingreso)
    const isExpense = /gasto|gastos|expense|pago|pagos|compra|compras/i.test(originalMessage);
    const isIncome = /ingreso|ingresos|income|cobro|cobros|salario|salary/i.test(originalMessage);
    
    if (isExpense) {
      parameters.type = 'EXPENSE';
    } else if (isIncome) {
      parameters.type = 'INCOME';
    } else {
      // Por defecto, si no se especifica, asumir gasto
      parameters.type = 'EXPENSE';
    }
    
  } else if (hasBudget) {
    if (hasUpdate) {
      actionType = 'UPDATE_BUDGET';
      confidence = 0.7;
    } else {
      actionType = 'CREATE_BUDGET';
      confidence = 0.8;
    }
    
    if (amount) {
      parameters.amount = amount.value;
      parameters.currency = amount.currency || 'USD';
    } else {
      missingParameters.push('amount');
    }
    
    // Extraer categoría del presupuesto
    const category = extractCategory(originalMessage, ['expense']);
    if (category) {
      parameters.category = category;
    } else {
      missingParameters.push('category');
    }
    
  } else if (hasGoal) {
    actionType = 'CREATE_GOAL';
    confidence = 0.8;
    
    if (amount) {
      parameters.target = amount.value;
      parameters.currency = amount.currency || 'USD';
    } else {
      missingParameters.push('target');
    }
    
    // Extraer nombre de la meta
    const goalName = extractGoalName(originalMessage);
    if (goalName) {
      parameters.name = goalName;
    }
    
    // Extraer fecha objetivo
    const targetDate = extractTargetDate(originalMessage);
    if (targetDate) {
      parameters.targetDate = targetDate;
    }
    
  } else if (hasAccount) {
    actionType = 'CREATE_ACCOUNT';
    confidence = 0.8;
    
    // Extraer nombre de la cuenta
    const accountName = extractAccountName(originalMessage);
    if (accountName) {
      parameters.name = accountName;
    } else {
      missingParameters.push('name');
    }
    
    // Extraer tipo de cuenta
    const accountType = extractAccountType(originalMessage);
    if (accountType) {
      parameters.type = accountType;
    } else {
      missingParameters.push('type');
    }
    
    // Extraer moneda
    const currency = extractCurrency(originalMessage);
    if (currency) {
      parameters.currency = currency;
    } else {
      missingParameters.push('currency');
    }
    
    // Extraer balance inicial
    if (amount) {
      parameters.initialBalance = amount.value;
    }
    
  } else if (hasTransfer) {
    actionType = 'CREATE_TRANSFER';
    confidence = 0.7;
    
    if (amount) {
      parameters.amount = amount.value;
      parameters.currency = amount.currency || 'USD';
    } else {
      missingParameters.push('amount');
    }
    
    // Extraer cuentas de origen y destino (requiere más contexto)
    // Por ahora, marcamos como faltantes
    missingParameters.push('fromAccount');
    missingParameters.push('toAccount');
    
  } else {
    // Acción no reconocida
    confidence = 0.3;
  }
  
  // Determinar si requiere confirmación
  const requiresConfirmation = determineConfirmationRequired(actionType, parameters);
  
  return {
    type: 'ACTION',
    actionType,
    confidence,
    parameters,
    requiresConfirmation,
    missingParameters,
  };
}

/**
 * Detecta intención de consulta específica
 */
function detectQueryIntention(lowerMessage: string, originalMessage: string): DetectedIntention {
  let actionType: ActionType = 'UNKNOWN';
  let confidence = 0.6;
  
  const hasBalance = /saldo|balance|dinero|money|cuánto|cuanto|tengo/i.test(originalMessage);
  const hasTransactions = /transacciones?|transactions?|gastos?|expenses?|ingresos?|income/i.test(originalMessage);
  const hasBudgets = /presupuestos?|budgets?/i.test(originalMessage);
  const hasGoals = /metas?|goals?|objetivos?|targets?/i.test(originalMessage);
  const hasAccounts = /cuentas?|accounts?/i.test(originalMessage);
  
  if (hasBalance) {
    actionType = 'QUERY_BALANCE';
    confidence = 0.9;
  } else if (hasTransactions) {
    actionType = 'QUERY_TRANSACTIONS';
    confidence = 0.8;
  } else if (hasBudgets) {
    actionType = 'QUERY_BUDGETS';
    confidence = 0.8;
  } else if (hasGoals) {
    actionType = 'QUERY_GOALS';
    confidence = 0.8;
  } else if (hasAccounts) {
    actionType = 'QUERY_ACCOUNTS';
    confidence = 0.8;
  }
  
  return {
    type: 'QUERY',
    actionType,
    confidence,
    parameters: {},
    requiresConfirmation: false,
    missingParameters: [],
  };
}

/**
 * Extrae monto y moneda del mensaje
 */
function extractAmount(message: string): { value: number; currency?: string } | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0) {
        // Intentar extraer moneda
        const currencyMatch = message.match(/\b(usd|dólar|dolares|dollar|dollars?|ves|bolívar|bolivares?|eur|euro|euros?|gbp|libra|jpy|yen|cad|dólar\s*canadiense|aud|dólar\s*australiano|mxn|peso\s*mexicano|brl|real)\b/i);
        let currency = 'USD'; // Default
        if (currencyMatch) {
          const currencyStr = currencyMatch[0].toUpperCase();
          if (currencyStr.includes('USD') || currencyStr.includes('DÓLAR') || currencyStr.includes('DOLLAR')) {
            currency = 'USD';
          } else if (currencyStr.includes('VES') || currencyStr.includes('BOLÍVAR') || currencyStr.includes('BOLIVAR')) {
            currency = 'VES';
          } else if (currencyStr.includes('EUR') || currencyStr.includes('EURO')) {
            currency = 'EUR';
          } else if (currencyStr.includes('GBP') || currencyStr.includes('LIBRA')) {
            currency = 'GBP';
          } else if (currencyStr.includes('JPY') || currencyStr.includes('YEN')) {
            currency = 'JPY';
          } else if (currencyStr.includes('CAD')) {
            currency = 'CAD';
          } else if (currencyStr.includes('AUD')) {
            currency = 'AUD';
          } else if (currencyStr.includes('MXN') || currencyStr.includes('PESO')) {
            currency = 'MXN';
          } else if (currencyStr.includes('BRL') || currencyStr.includes('REAL')) {
            currency = 'BRL';
          }
        }
        return { value, currency };
      }
    }
  }
  return null;
}

/**
 * Extrae fecha del mensaje
 */
function extractDate(message: string): string | null {
  const today = new Date();
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hoy') || lowerMessage.includes('today')) {
    return today.toISOString().split('T')[0];
  }
  
  if (lowerMessage.includes('ayer') || lowerMessage.includes('yesterday')) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  
  if (lowerMessage.includes('mañana') || lowerMessage.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  // Intentar parsear formato DD/MM/YYYY o YYYY-MM-DD
  for (const pattern of DATE_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      // Por ahora, retornar null y dejar que el sistema use la fecha actual
      // Una implementación completa parsearía la fecha correctamente
      return null;
    }
  }
  
  return null;
}

/**
 * Extrae descripción del mensaje
 */
function extractDescription(message: string, amount: { value: number; currency?: string } | null): string | null {
  // Remover palabras clave y números para obtener la descripción
  let desc = message;
  
  // Remover palabras clave de acción
  desc = desc.replace(/\b(crear|crea|agregar|agrega|nuevo|nueva|gasto|ingreso|transacción|transaccion)\b/gi, '');
  
  // Remover monto si existe
  if (amount) {
    desc = desc.replace(amount.value.toString(), '');
    if (amount.currency) {
      desc = desc.replace(new RegExp(amount.currency, 'gi'), '');
    }
  }
  
  // Remover palabras vacías
  desc = desc.replace(/\b(de|en|para|por|con|el|la|los|las|un|una|unos|unas)\b/gi, '');
  desc = desc.trim();
  
  if (desc.length > 3 && desc.length < 100) {
    return desc;
  }
  
  return null;
}

/**
 * Extrae categoría del mensaje
 */
function extractCategory(message: string, allowedKinds: string[]): string | null {
  // Categorías comunes en español
  const categoryMap: Record<string, string> = {
    'comida': 'Comida',
    'food': 'Comida',
    'restaurante': 'Comida',
    'supermercado': 'Comida',
    'transporte': 'Transporte',
    'transport': 'Transporte',
    'gasolina': 'Transporte',
    'gas': 'Transporte',
    'uber': 'Transporte',
    'taxi': 'Transporte',
    'compras': 'Compras',
    'shopping': 'Compras',
    'entretenimiento': 'Entretenimiento',
    'entertainment': 'Entretenimiento',
    'salud': 'Salud',
    'health': 'Salud',
    'hogar': 'Hogar',
    'home': 'Hogar',
    'educación': 'Educación',
    'education': 'Educación',
    'salario': 'Salario',
    'salary': 'Salario',
    'sueldo': 'Salario',
  };
  
  const lowerMessage = message.toLowerCase();
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (lowerMessage.includes(keyword)) {
      return category;
    }
  }
  
  return null;
}

/**
 * Extrae nombre de meta del mensaje
 */
function extractGoalName(message: string): string | null {
  // Intentar extraer el nombre después de palabras clave de meta
  const patterns = [
    /meta\s+(?:de|para|del|de la)\s+(.+?)(?:\s+de|\s+para|\s+con|$)/i,
    /ahorrar\s+(?:para|para el|para la)\s+(.+?)(?:\s+de|\s+para|\s+con|$)/i,
    /objetivo\s+(?:de|para)\s+(.+?)(?:\s+de|\s+para|\s+con|$)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extrae nombre de cuenta del mensaje
 */
function extractAccountName(message: string): string | null {
  const patterns = [
    /cuenta\s+(?:llamada|nombre|de)\s+(.+?)(?:\s+de|\s+con|\s+tipo|$)/i,
    /cuenta\s+(.+?)(?:\s+de|\s+con|\s+tipo|$)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extrae tipo de cuenta del mensaje
 */
function extractAccountType(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('bancaria') || lowerMessage.includes('banco') || lowerMessage.includes('bank')) {
    return 'BANK';
  }
  if (lowerMessage.includes('tarjeta') || lowerMessage.includes('card') || lowerMessage.includes('crédito') || lowerMessage.includes('credito')) {
    return 'CARD';
  }
  if (lowerMessage.includes('efectivo') || lowerMessage.includes('cash')) {
    return 'CASH';
  }
  if (lowerMessage.includes('ahorro') || lowerMessage.includes('savings')) {
    return 'SAVINGS';
  }
  if (lowerMessage.includes('inversión') || lowerMessage.includes('inversion') || lowerMessage.includes('investment')) {
    return 'INVESTMENT';
  }
  
  return null;
}

/**
 * Extrae moneda del mensaje
 */
function extractCurrency(message: string): string | null {
  const currencyMatch = message.match(/\b(usd|ves|eur|gbp|jpy|cad|aud|mxn|brl)\b/i);
  if (currencyMatch) {
    return currencyMatch[0].toUpperCase();
  }
  return null;
}

/**
 * Extrae fecha objetivo del mensaje
 */
function extractTargetDate(message: string): string | null {
  // Por ahora, retornar null - implementación completa requeriría parsing más sofisticado
  return null;
}

/**
 * Determina si la acción requiere confirmación
 */
function determineConfirmationRequired(actionType: ActionType, parameters: Record<string, any>): boolean {
  // Transferencias siempre requieren confirmación
  if (actionType === 'CREATE_TRANSFER') {
    return true;
  }
  
  // Transacciones grandes requieren confirmación
  if (actionType === 'CREATE_TRANSACTION' && parameters.amount) {
    const amountValue = parameters.amount;
    const threshold = parameters.currency === 'USD' ? 100 : 1000; // $100 USD o equivalente
    if (amountValue >= threshold) {
      return true;
    }
  }
  
  // Actualizaciones requieren confirmación
  if (actionType === 'UPDATE_BUDGET' || actionType === 'UPDATE_GOAL') {
    return true;
  }
  
  // Otras acciones no requieren confirmación por defecto
  return false;
}

