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
  | 'QUERY_RATES'
  | 'QUERY_CATEGORIES'
  | 'QUERY_RECURRING'
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
  'quiero crear', 'necesito crear', 'deseo crear',
  'add', 'create', 'new', 'register'
];

// "hazme" y "haz" solo son acciones cuando NO van seguidos de palabras de consulta
// También incluir verbos de acción como "gaste", "spent", etc.
const ACTION_COMMAND_KEYWORDS = [
  'hazme', 'haz', 'haz que', 'make me', 'make',
  'gaste', 'gasté', 'gasté', 'spent', 'gastar', 'gastar',
  'compré', 'compre', 'bought', 'comprar',
  'pagué', 'pague', 'paid', 'pagar'
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
  
  // Detectar palabras clave de consulta primero (prioridad)
  const hasQueryKeywords = QUERY_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasListingKeywords = /listado|listar|lista\s|muéstrame|mostrar|muestra|ver|show|display|dame|give me/i.test(message);
  
  // Detectar palabras clave de acción
  const hasCreateKeywords = CREATE_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasUpdateKeywords = UPDATE_KEYWORDS.some(kw => lowerMessage.includes(kw));
  const hasActionCommands = ACTION_COMMAND_KEYWORDS.some(kw => lowerMessage.includes(kw));
  
  // Si hay palabras de consulta/listado, priorizar como QUERY
  // Especialmente si hay "lista", "mostrar", "dame", etc.
  if (hasQueryKeywords || hasListingKeywords) {
    // Verificar si realmente es una acción de creación
    // Si tiene "hazme" o "haz" pero también tiene "lista" o palabras de consulta, es una consulta
    if (hasActionCommands && hasListingKeywords) {
      // "hazme la lista" es una consulta, no una acción
      return detectQueryIntention(lowerMessage, message);
    }
    // Si tiene palabras de creación explícitas sin palabras de consulta, es acción
    if (hasCreateKeywords && !hasListingKeywords) {
      return detectActionIntention(lowerMessage, message);
    }
    // Por defecto, si hay palabras de consulta, es una consulta
    return detectQueryIntention(lowerMessage, message);
  }
  
  // Si no hay palabras de consulta, verificar si es acción
  // Detectar verbos de acción directos (gaste, compré, pagué) como acciones
  const hasActionVerbs = /gaste|gasté|spent|compré|compre|bought|pagué|pague|paid/i.test(message);
  const isAction = hasCreateKeywords || hasUpdateKeywords || 
                  (hasActionCommands && !hasListingKeywords) ||
                  (hasActionVerbs && !hasListingKeywords);
  
  if (isAction) {
    return detectActionIntention(lowerMessage, message);
  }
  
  // Por defecto, tratar como consulta
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
  // Detectar verbos de acción directos primero (gaste, compré, pagué) como indicadores fuertes de transacción
  const hasActionVerb = /gaste|gasté|spent|compré|compre|bought|pagué|pague|paid/i.test(originalMessage);
  const hasTransaction = TRANSACTION_KEYWORDS.some(kw => lowerMessage.includes(kw)) || hasActionVerb;
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
    // Aumentar confianza si hay verbo de acción directo (gaste, compré, etc.)
    confidence = hasActionVerb ? 0.9 : 0.8;
    
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
 * Extrae límite numérico del mensaje (ej: "5", "últimas 5", "primeros 10", "solo 5")
 * Mejorado para capturar más variantes de frases en español e inglés
 */
function extractLimit(message: string): number | null {
  const lowerMessage = message.toLowerCase();
  
  // Patrones mejorados para capturar límites en diferentes contextos
  const patterns = [
    // Patrones con palabras clave antes del número
    /(?:últimas?|ultimas?|last|primeras?|primeros?|first|solo|only|únicamente|unicamente|just|exactamente|exactly)\s+(\d+)/i,
    // Patrones con número antes de palabras clave
    /(\d+)\s+(?:últimas?|ultimas?|last|primeras?|primeros?|first|transacciones?|transactions?|gastos?|expenses?|ingresos?|income)/i,
    // Patrones con "dame/muestra/lista" + número
    /(?:dame|muestra|muéstrame|listar|lista|listado|show|give|tell)\s+(?:me|una|un)?\s*(?:lista\s+de\s+)?(?:mis|las|los|the)?\s*(?:últimas?|ultimas?|last)?\s*(\d+)/i,
    // Patrones con "solo X" o "solo quiero X"
    /(?:solo|only|just)\s+(?:quiero|want|necesito|need)?\s*(\d+)/i,
    // Patrones con "X transacciones/gastos/ingresos"
    /(\d+)\s+(?:transacciones?|transactions?|gastos?|expenses?|ingresos?|income|items?|elementos?)/i,
    // Patrón simple: cualquier número (último recurso, más restrictivo)
    /\b(\d{1,2})\b/ // Solo números de 1-2 dígitos para evitar falsos positivos
  ];
  
  // Intentar cada patrón en orden de prioridad
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const limit = parseInt(match[1], 10);
      // Validar que el límite sea razonable (1-100)
      if (!isNaN(limit) && limit > 0 && limit <= 100) {
        // Si el patrón es el último (fallback), ser más estricto
        // Solo aceptar si está cerca de palabras clave de consulta
        if (pattern === patterns[patterns.length - 1]) {
          const hasQueryContext = /(?:transacciones?|gastos?|ingresos?|lista|muestra|dame|show|list)/i.test(message);
          if (!hasQueryContext) {
            continue; // Ignorar números que no están en contexto de consulta
          }
        }
        return limit;
      }
    }
  }
  
  return null;
}

/**
 * Interfaz para corrección detectada
 */
export interface DetectedCorrection {
  isCorrection: boolean;
  correctedParameter?: string; // Nombre del parámetro corregido (ej: "limit")
  correctedValue?: any; // Valor corregido
  confidence: number; // 0-1
}

/**
 * Detecta si el mensaje es una corrección de una consulta anterior
 * Patrones como "pero te pedí solo 5", "solo quiero 5", "corrige a 5", etc.
 * @param message - Mensaje del usuario
 * @returns Información sobre la corrección detectada
 */
export function detectCorrection(message: string): DetectedCorrection {
  const lowerMessage = message.toLowerCase();
  
  // Patrones para detectar correcciones
  const correctionPatterns = [
    // "me mostraste X" / "you showed me X" / "me diste X" / "you gave me X"
    /(?:me|you)\s+(?:mostraste|mostraste|mostraron|diste|dieron|gave|showed|shows)\s+(\d+)/i,
    // "pero te pedí" / "but I asked for"
    /(?:pero|but)\s+(?:te|you|me)\s+(?:pedí|pediste|asked|asked for|dije|dijiste|said)\s+(?:solo|only|just|exactamente|exactly)?\s*(\d+)/i,
    // "solo pedí" / "only asked for"
    /(?:solo|only|just)\s+(?:pedí|pediste|asked|asked for|quiero|want|necesito|need)\s*(\d+)/i,
    // "corrige a X" / "correct to X"
    /(?:corrige|correct|corrección|correction|corregir)\s+(?:a|to)?\s*(\d+)/i,
    // "solo X" después de "pero" o al inicio
    /(?:^|pero|but)\s+(?:solo|only|just|exactamente|exactly)\s+(\d+)/i,
    // "solo quiero X" / "only want X"
    /(?:solo|only|just)\s+(?:quiero|want|necesito|need)\s+(\d+)/i,
  ];

  // Intentar detectar un número en contexto de corrección
  for (const pattern of correctionPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const value = parseInt(match[1], 10);
      if (!isNaN(value) && value > 0 && value <= 100) {
        logger.debug(`[detectCorrection] Detected correction with value: ${value}`);
        return {
          isCorrection: true,
          correctedParameter: 'limit', // Por ahora solo detectamos correcciones de límite
          correctedValue: value,
          confidence: 0.9,
        };
      }
    }
  }

  // Verificar si hay palabras de corrección sin número específico
  const hasCorrectionKeywords = /(?:pero|but|corrige|correct|corrección|correction|solo|only|just|exactamente|exactly)/i.test(message);
  const hasNumbers = /\d+/.test(message);
  
  if (hasCorrectionKeywords && hasNumbers) {
    // Intentar extraer cualquier número
    const numberMatch = message.match(/\b(\d{1,2})\b/);
    if (numberMatch && numberMatch[1]) {
      const value = parseInt(numberMatch[1], 10);
      if (!isNaN(value) && value > 0 && value <= 100) {
        logger.debug(`[detectCorrection] Detected correction with value: ${value} (lower confidence)`);
        return {
          isCorrection: true,
          correctedParameter: 'limit',
          correctedValue: value,
          confidence: 0.7, // Menor confianza porque el patrón es más débil
        };
      }
    }
  }

  return {
    isCorrection: false,
    confidence: 0,
  };
}

/**
 * Extrae parámetros de consulta del mensaje
 */
function extractQueryParameters(message: string): Record<string, any> {
  const parameters: Record<string, any> = {};
  const lowerMessage = message.toLowerCase();

  // Extraer límite numérico
  const limit = extractLimit(message);
  if (limit) {
    parameters.limit = limit;
  }

  // Extraer rango de fechas
  const dateRange = extractDateRange(message);
  if (dateRange) {
    parameters.dateFrom = dateRange.from;
    parameters.dateTo = dateRange.to;
  } else {
    // Si no hay rango, intentar fecha única
    const singleDate = extractDate(message);
    if (singleDate) {
      parameters.dateFrom = singleDate;
      parameters.dateTo = singleDate;
    }
  }

  // Extraer categoría
  const category = extractCategory(message, ['expense', 'income']);
  if (category) {
    parameters.category = category;
  }

  // Extraer tipo de transacción
  if (/(gastos?|expenses?)/i.test(lowerMessage)) {
    parameters.transactionType = 'EXPENSE';
  } else if (/(ingresos?|income)/i.test(lowerMessage)) {
    parameters.transactionType = 'INCOME';
  }

  // Extraer moneda
  const currency = extractCurrency(message);
  if (currency) {
    parameters.currency = currency;
  }

  // Rango de montos
  const amountGreaterThanMatch = message.match(/(mayor(?:es)?\s+a|más\s+de)\s*(\d+(?:\.\d+)?)/i);
  if (amountGreaterThanMatch) {
    parameters.amountMin = parseFloat(amountGreaterThanMatch[2]);
  }

  const amountLessThanMatch = message.match(/(menor(?:es)?\s+a|menos\s+de)\s*(\d+(?:\.\d+)?)/i);
  if (amountLessThanMatch) {
    parameters.amountMax = parseFloat(amountLessThanMatch[2]);
  }

  const amountBetweenMatch = message.match(/entre\s*(\d+(?:\.\d+)?)\s*y\s*(\d+(?:\.\d+)?)/i);
  if (amountBetweenMatch) {
    parameters.amountMin = parseFloat(amountBetweenMatch[1]);
    parameters.amountMax = parseFloat(amountBetweenMatch[2]);
  }

  return parameters;
}

/**
 * Detecta intención de consulta específica
 */
function detectQueryIntention(lowerMessage: string, originalMessage: string): DetectedIntention {
  let actionType: ActionType = 'UNKNOWN';
  let confidence = 0.6;
  const parameters: Record<string, any> = {};
  
  // Enhanced patterns with explicit list/show keywords for better detection
  const hasListingKeywords = /listado|listar|lista\s|muéstrame|mostrar|muestra|ver|show|display|dame|give me|hazme|haz la/i.test(originalMessage);
  
  const hasBalance = /saldo|balance|dinero|money|cuánto|cuanto|tengo/i.test(originalMessage);
  const hasTransactions = /transacciones?|transactions?|gastos?|expenses?|ingresos?|income|pago|pagos|payments?|cobro|cobros/i.test(originalMessage);
  const hasBudgets = /presupuestos?|budgets?/i.test(originalMessage);
  const hasGoals = /metas?|goals?|objetivos?|targets?/i.test(originalMessage);
  const hasAccounts = /cuentas?|accounts?/i.test(originalMessage);
  // Mejorar regex para detectar "a que tasa?", "a qué tasa?", "que tasa?", "qué tasa?", "cual es la tasa", "cuál es la tasa de hoy", "la tasa de la moneda", "bolivares", etc.
  const hasRates = /tasa|tasas|cambio|exchange|bcv|binance|dólar|dolar|bolívar|bolivar|bolivares|tipo de cambio|a\s+que\s+tasa|a\s+qué\s+tasa|que\s+tasa|qué\s+tasa|cual\s+es\s+la\s+tasa|cuál\s+es\s+la\s+tasa|cual\s+es\s+la\s+tasa\s+de\s+hoy|cuál\s+es\s+la\s+tasa\s+de\s+hoy|tasa\s+de\s+la\s+moneda|tasa\s+de\s+moneda/i.test(originalMessage);
  const hasCategories = /categorías?|categorias?|categories?/i.test(originalMessage);
  const hasRecurring = /recurrentes?|recurring|automáticas?|automaticas?|periódicas?|periodicas?|programadas?/i.test(originalMessage);
  
  // Extract query parameters for all query types
  const queryParams = extractQueryParameters(originalMessage);
  if (Object.keys(queryParams).length > 0) {
    Object.assign(parameters, queryParams);
  }
  
  // Priorizar consultas de lista cuando hay palabras de lista y el tipo de dato
  // Boost confidence for listing patterns
  if (hasListingKeywords && hasAccounts) {
    actionType = 'QUERY_ACCOUNTS';
    confidence = 0.98; // Muy alta confianza para listas de cuentas
  } else if (hasListingKeywords && hasTransactions) {
    actionType = 'QUERY_TRANSACTIONS';
    confidence = 0.95;
  } else if (hasListingKeywords && hasBudgets) {
    actionType = 'QUERY_BUDGETS';
    confidence = 0.95;
  } else if (hasListingKeywords && hasGoals) {
    actionType = 'QUERY_GOALS';
    confidence = 0.95;
  } else if (hasListingKeywords && hasCategories) {
    actionType = 'QUERY_CATEGORIES';
    confidence = 0.95;
  } else if (hasListingKeywords && hasRecurring) {
    actionType = 'QUERY_RECURRING';
    confidence = 0.95;
  } else if (hasRates) {
    // Detectar tasas con alta prioridad, incluso sin listing keywords
    actionType = 'QUERY_RATES';
    confidence = 0.95; // Aumentar confidence para preguntas directas sobre tasas
  } else if (hasBalance) {
    actionType = 'QUERY_BALANCE';
    confidence = 0.9;
  } else if (hasCategories) {
    actionType = 'QUERY_CATEGORIES';
    confidence = 0.85;
  } else if (hasRecurring) {
    actionType = 'QUERY_RECURRING';
    confidence = 0.85;
  } else if (hasAccounts) {
    // Si hay "cuentas" sin palabras de creación, es consulta
    actionType = 'QUERY_ACCOUNTS';
    confidence = 0.85;
  } else if (hasTransactions) {
    actionType = 'QUERY_TRANSACTIONS';
    confidence = 0.8;
  } else if (hasBudgets) {
    actionType = 'QUERY_BUDGETS';
    confidence = 0.8;
  } else if (hasGoals) {
    actionType = 'QUERY_GOALS';
    confidence = 0.8;
  }
  
  return {
    type: 'QUERY',
    actionType,
    confidence,
    parameters,
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
  
  // Parse DD/MM/YYYY
  let match = message.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [_, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Parse YYYY-MM-DD
  match = message.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [_, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

/**
 * Extrae rango de fechas del mensaje
 */
function extractDateRange(message: string): { from?: string; to?: string } | null {
  const lowerMessage = message.toLowerCase();
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
  const lastWeekEnd = new Date(today);
  lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);

  if (lowerMessage.includes('este mes') || lowerMessage.includes('this month')) {
    return { from: currentMonthStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
  }
  if (lowerMessage.includes('mes pasado') || lowerMessage.includes('last month')) {
    return { from: lastMonthStart.toISOString().split('T')[0], to: lastMonthEnd.toISOString().split('T')[0] };
  }
  if (lowerMessage.includes('esta semana') || lowerMessage.includes('this week')) {
    return { from: currentWeekStart.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
  }
  if (lowerMessage.includes('semana pasada') || lowerMessage.includes('last week')) {
    return { from: lastWeekStart.toISOString().split('T')[0], to: lastWeekEnd.toISOString().split('T')[0] };
  }

  // "hace X días/semanas/meses"
  const agoMatch = lowerMessage.match(/hace\s+(\d+)\s+(días?|semanas?|meses?)/);
  if (agoMatch) {
    const value = parseInt(agoMatch[1]);
    const unit = agoMatch[2];
    const fromDate = new Date();
    if (unit.includes('día')) fromDate.setDate(fromDate.getDate() - value);
    if (unit.includes('semana')) fromDate.setDate(fromDate.getDate() - value * 7);
    if (unit.includes('mes')) fromDate.setMonth(fromDate.getMonth() - value);
    return { from: fromDate.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
  }

  // "desde X hasta Y"
  const rangeMatch = message.match(/desde\s+(.+?)\s+hasta\s+(.+)/i);
  if (rangeMatch) {
    const fromDate = extractDate(rangeMatch[1]);
    const toDate = extractDate(rangeMatch[2]);
    if (fromDate && toDate) return { from: fromDate, to: toDate };
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

