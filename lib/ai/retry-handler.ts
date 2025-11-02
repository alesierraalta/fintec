/**
 * Retry Handler for AI Chat API
 * 
 * Implementa lógica de retry con backoff exponencial.
 * Máximo 2 intentos para errores retryables (429, 5xx).
 * Timeout por intento individual.
 */

import { logger } from '@/lib/utils/logger';

export interface RetryOptions {
  maxRetries?: number; // Default: 2
  baseDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 10000ms
  timeoutMs?: number; // Timeout per attempt
}

interface RetryableError extends Error {
  statusCode?: number;
  isRetryable?: boolean;
}

/**
 * Determina si un error es retryable
 */
function isRetryableError(error: any): boolean {
  // Errores HTTP retryables: 429 (rate limit), 500, 502, 503, 504
  const retryableStatusCodes = [429, 500, 502, 503, 504];
  
  if (error?.status !== undefined) {
    return retryableStatusCodes.includes(error.status);
  }
  
  if (error?.statusCode !== undefined) {
    return retryableStatusCodes.includes(error.statusCode);
  }
  
  // Errores de timeout y conexión
  if (error?.code === 'ECONNRESET' || error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
    return true;
  }
  
  // Errores de OpenAI API
  if (error?.error?.type === 'server_error' || error?.error?.type === 'rate_limit_error') {
    return true;
  }
  
  return false;
}

/**
 * Calcula el delay para el siguiente intento usando backoff exponencial
 */
function calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Formula: baseDelay * (2 ^ attempt) con jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const delayWithJitter = exponentialDelay * (0.5 + Math.random() * 0.5); // ±50% jitter
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Ejecuta una función con retry automático
 * 
 * @example
 * const result = await withRetry(
 *   () => openai.chat.completions.create(...),
 *   { maxRetries: 2, baseDelay: 1000, timeoutMs: 8000 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelay = 1000,
    maxDelay = 10000,
    timeoutMs = 8000,
  } = options;

  let lastError: RetryableError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Ejecutar función con timeout
      return await executeWithTimeout(fn, timeoutMs);
    } catch (error: any) {
      lastError = error;
      
      // Si es el último intento o no es retryable, lanzar error
      if (attempt === maxRetries || !isRetryableError(error)) {
        logger.error(
          `Retry handler: Giving up after ${attempt} attempts. Error: ${error?.message}`,
          { statusCode: error?.status || error?.statusCode, attempt }
        );
        throw error;
      }

      // Calcular delay para siguiente intento
      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
      
      logger.warn(
        `Retry handler: Attempt ${attempt + 1} failed, retrying in ${delay}ms. Error: ${error?.message}`,
        { statusCode: error?.status || error?.statusCode, delay }
      );

      // Esperar antes de reintentar
      await sleep(delay);
    }
  }

  // Nunca debería llegar aquí, pero por si acaso
  throw lastError || new Error('Retry handler: Unknown error');
}

/**
 * Ejecuta una función con timeout
 */
async function executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Helper para dormir
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Predicate para detectar errores retryables por nombre
 */
export function detectRetryableError(error: any): boolean {
  return isRetryableError(error);
}
