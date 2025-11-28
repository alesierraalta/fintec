/**
 * Message Processor - Procesador de Mensajes
 * 
 * Procesa mensajes del usuario antes de enviarlos al agente.
 * Extrae información relevante y prepara el contexto.
 */

import { logger } from '@/lib/utils/logger';
import { WalletContext } from '../context-builder';

export interface ProcessedMessage {
  originalMessage: string;
  normalizedMessage: string;
  intent: string;
  entities: Record<string, any>;
  requiresContext: boolean;
}

/**
 * Procesa un mensaje del usuario
 */
export function processMessage(
  message: string,
  context: WalletContext
): ProcessedMessage {
  logger.info(`[message-processor] Processing message: "${message.substring(0, 50)}..."`);

  const normalizedMessage = normalizeMessage(message);
  const intent = detectIntent(normalizedMessage);
  const entities = extractEntities(normalizedMessage, context);
  const requiresContext = shouldLoadContext(intent, entities);

  return {
    originalMessage: message,
    normalizedMessage,
    intent,
    entities,
    requiresContext,
  };
}

/**
 * Normaliza el mensaje (limpieza básica)
 */
function normalizeMessage(message: string): string {
  return message
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ.,!?¿¡$€£¥]/g, '');
}

/**
 * Detecta la intención básica del mensaje
 */
function detectIntent(message: string): string {
  const lower = message.toLowerCase();

  if (/promedio|average|media/i.test(lower) && /gasto|expense|spending/i.test(lower)) {
    return 'CALCULATE_AVERAGE';
  }
  if (/analizar|analyze|análisis/i.test(lower)) {
    return 'ANALYZE';
  }
  if (/comparar|compare/i.test(lower)) {
    return 'COMPARE';
  }
  if (/resumen|summary/i.test(lower)) {
    return 'SUMMARY';
  }
  if (/crear|create|agregar|add/i.test(lower)) {
    return 'CREATE';
  }
  if (/cuánto|cuanto|cuál|tengo|saldo|balance/i.test(lower)) {
    return 'QUERY';
  }

  return 'UNKNOWN';
}

/**
 * Extrae entidades del mensaje
 */
function extractEntities(
  message: string,
  context: WalletContext
): Record<string, any> {
  const entities: Record<string, any> = {};

  // Extraer montos
  const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(usd|dólar|dolares|ves|bolívar|bolivares|eur|euro)/i);
  if (amountMatch) {
    entities.amount = parseFloat(amountMatch[1]);
    entities.currency = amountMatch[2].toUpperCase().replace('DÓLAR', 'USD').replace('BOLÍVAR', 'VES');
  }

  // Extraer períodos
  if (/mes|month/i.test(message)) {
    entities.period = 'month';
  } else if (/semana|week/i.test(message)) {
    entities.period = 'week';
  } else if (/año|year/i.test(message)) {
    entities.period = 'year';
  } else if (/hoy|today/i.test(message)) {
    entities.period = 'today';
  }

  // Extraer categorías (comparar con categorías disponibles en el contexto)
  const topCategories = context.transactions.summary.topCategories.map(c => c.category.toLowerCase());
  for (const category of topCategories) {
    if (message.toLowerCase().includes(category)) {
      entities.category = category;
      break;
    }
  }

  // Extraer nombres de cuentas (comparar con cuentas disponibles)
  const accountNames = context.accounts.summary.map(a => a.name.toLowerCase());
  for (const accountName of accountNames) {
    if (message.toLowerCase().includes(accountName)) {
      entities.accountName = accountName;
      break;
    }
  }

  return entities;
}

/**
 * Determina si se debe cargar contexto adicional
 */
function shouldLoadContext(intent: string, entities: Record<string, any>): boolean {
  // Las consultas de análisis siempre requieren contexto
  if (intent === 'ANALYZE' || intent === 'COMPARE' || intent === 'SUMMARY') {
    return true;
  }

  // Las consultas con entidades específicas pueden requerir contexto
  if (entities.category || entities.accountName) {
    return true;
  }

  return false;
}

