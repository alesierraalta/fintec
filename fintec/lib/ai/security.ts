/**
 * Security Utilities for AI Chat
 * 
 * Sanitización de datos sensibles en logs, validación de payload,
 * validación de estructura de mensajes.
 */

import { logger } from '@/lib/utils/logger';

export const AI_SECURITY_CONFIG = {
  MAX_PAYLOAD_SIZE_KB: 100,
  MAX_MESSAGE_LENGTH: 10000,
  MAX_MESSAGES_PER_REQUEST: 50,
};

/**
 * Sanitiza datos sensibles para logging
 * Remueve balances, descripciones de transacciones, información personal
 */
export function sanitizeForLogging(data: any): any {
  if (!data) return data;

  // Si es un objeto, crear una copia y sanitizar
  if (typeof data === 'object') {
    try {
      const sanitized = JSON.parse(JSON.stringify(data));
      
      // Sanitizar tipos de datos comunes
      sanitizeObject(sanitized);
      
      return sanitized;
    } catch {
      return '[Complex object - not serializable]';
    }
  }

  return data;
}

/**
 * Sanitiza recursivamente un objeto
 */
function sanitizeObject(obj: any, depth = 0): void {
  if (depth > 10) return; // Prevenir recursión infinita
  if (!obj || typeof obj !== 'object') return;

  const sensitiveFields = [
    'balance', 'amount', 'amountMinor', 'amountBaseMinor',
    'spent', 'spentMinor', 'spentBaseMinor',
    'apiKey', 'key', 'password', 'token',
    'email', 'phone', 'ssn', 'cardNumber',
    'description', 'note', 'message', 'content',
    'context', 'accounts', 'transactions', 'budgets', 'goals',
    'userId', 'user_id', 'accountId', 'account_id'
  ];

  for (const field of sensitiveFields) {
    if (field in obj) {
      if (typeof obj[field] === 'string') {
        obj[field] = '[REDACTED]';
      } else if (typeof obj[field] === 'number') {
        obj[field] = 0;
      } else if (Array.isArray(obj[field])) {
        obj[field] = `[${obj[field].length} items]`;
      } else if (typeof obj[field] === 'object') {
        obj[field] = '[REDACTED_OBJECT]';
      }
    }
  }

  // Sanitizar recursivamente propiedades restantes
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !sensitiveFields.includes(key)) {
      sanitizeObject(obj[key], depth + 1);
    }
  }
}

/**
 * Valida el tamaño del payload
 */
export function validatePayloadSize(payload: any, maxSizeKB = AI_SECURITY_CONFIG.MAX_PAYLOAD_SIZE_KB): {
  valid: boolean;
  sizeKB: number;
  error?: string;
} {
  try {
    const serialized = JSON.stringify(payload);
    const sizeKB = new TextEncoder().encode(serialized).length / 1024;

    if (sizeKB > maxSizeKB) {
      return {
        valid: false,
        sizeKB,
        error: `Payload size ${sizeKB.toFixed(2)}KB exceeds limit of ${maxSizeKB}KB`,
      };
    }

    return { valid: true, sizeKB };
  } catch (error) {
    return {
      valid: false,
      sizeKB: 0,
      error: `Failed to calculate payload size: ${(error as any).message}`,
    };
  }
}

/**
 * Estructura esperada para los mensajes
 */
interface MessageForValidation {
  role?: any;
  content?: any;
}

/**
 * Valida la estructura de los mensajes
 */
export function validateMessageStructure(messages: any[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(messages)) {
    errors.push('Messages must be an array');
    return { valid: false, errors };
  }

  if (messages.length === 0) {
    errors.push('Messages array cannot be empty');
    return { valid: false, errors };
  }

  if (messages.length > AI_SECURITY_CONFIG.MAX_MESSAGES_PER_REQUEST) {
    errors.push(`Too many messages (${messages.length}). Max: ${AI_SECURITY_CONFIG.MAX_MESSAGES_PER_REQUEST}`);
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i] as MessageForValidation;

    // Verificar estructura básica
    if (typeof msg !== 'object' || msg === null) {
      errors.push(`Message ${i}: Must be an object`);
      continue;
    }

    // Validar role
    if (!msg.role || (msg.role !== 'user' && msg.role !== 'assistant')) {
      errors.push(`Message ${i}: Invalid role. Must be 'user' or 'assistant'`);
    }

    // Validar content
    if (typeof msg.content !== 'string') {
      errors.push(`Message ${i}: Content must be a string`);
    } else if (msg.content.trim().length === 0) {
      errors.push(`Message ${i}: Content cannot be empty`);
    } else if (msg.content.length > AI_SECURITY_CONFIG.MAX_MESSAGE_LENGTH) {
      errors.push(`Message ${i}: Content exceeds max length (${msg.content.length} > ${AI_SECURITY_CONFIG.MAX_MESSAGE_LENGTH})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida la solicitud completa
 */
export function validateChatRequest(body: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validar userId
  if (!body.userId || typeof body.userId !== 'string') {
    errors.push('Missing or invalid userId');
  }

  // Validar messages
  if (!body.messages) {
    errors.push('Missing messages');
  } else {
    const messageValidation = validateMessageStructure(body.messages);
    if (!messageValidation.valid) {
      errors.push(...messageValidation.errors);
    }
  }

  // Validar tamaño total
  const sizeValidation = validatePayloadSize(body);
  if (!sizeValidation.valid) {
    errors.push(sizeValidation.error || 'Invalid payload size');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper para logging seguro de errores
 */
export function logSafeError(message: string, error: any): void {
  const sanitized = sanitizeForLogging(error);
  logger.error(message, sanitized);
}
