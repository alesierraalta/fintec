/**
 * Paddle-specific logging utility
 * 
 * Encapsulates the centralized logger with Paddle-specific context.
 * All logs are in English for technical standards, while user-facing
 * error messages are handled separately in errors.ts (Spanish).
 * 
 * Usage:
 *   import { paddleLogger } from '@/lib/paddle/logger';
 *   paddleLogger.info('Hook', 'Initializing Paddle', { vendorId: '...' });
 *   paddleLogger.error('Checkout API', 'Validation failed', error);
 */

import { logger } from '@/lib/utils/logger';

/**
 * Context types for Paddle logging
 * Helps categorize logs by component
 */
export type PaddleLogContext = 
  | 'Hook'
  | 'Checkout API'
  | 'Checkout Page'
  | 'Price Validation'
  | 'Config'
  | 'Webhook';

/**
 * Structured logger for Paddle components
 * 
 * Provides consistent logging format across all Paddle-related code:
 * Format: [Paddle {context}] {message}
 * 
 * All logs are in English for international technical standards.
 * User-facing messages (Spanish) are handled in errors.ts
 */
export const paddleLogger = {
  /**
   * Log informational messages
   * 
   * @param context - Component/context name (e.g., 'Hook', 'Checkout API')
   * @param message - Log message in English
   * @param data - Optional additional data to log
   * 
   * @example
   * paddleLogger.info('Hook', 'Initializing Paddle', { environment: 'production' });
   */
  info: (context: PaddleLogContext, message: string, data?: unknown): void => {
    logger.info(`[Paddle ${context}] ${message}`, data);
  },

  /**
   * Log error messages
   * 
   * @param context - Component/context name
   * @param message - Error message in English
   * @param error - Optional error object or additional data
   * 
   * @example
   * paddleLogger.error('Checkout API', 'Price validation failed', { priceId: '...', status: 404 });
   */
  error: (context: PaddleLogContext, message: string, error?: unknown): void => {
    logger.error(`[Paddle ${context}] ${message}`, error);
  },

  /**
   * Log warning messages
   * 
   * @param context - Component/context name
   * @param message - Warning message in English
   * @param data - Optional additional data to log
   * 
   * @example
   * paddleLogger.warn('Checkout API', 'Invalid customData types detected', { invalidKeys: ['...'] });
   */
  warn: (context: PaddleLogContext, message: string, data?: unknown): void => {
    logger.warn(`[Paddle ${context}] ${message}`, data);
  },

  /**
   * Log debug messages
   * 
   * @param context - Component/context name
   * @param message - Debug message in English
   * @param data - Optional additional data to log
   * 
   * @example
   * paddleLogger.debug('Hook', 'Paddle script loaded', { hasVendorId: true });
   */
  debug: (context: PaddleLogContext, message: string, data?: unknown): void => {
    logger.debug(`[Paddle ${context}] ${message}`, data);
  },
};

