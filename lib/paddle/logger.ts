/**
 * Paddle-specific logging utility
 * 
 * Encapsulates the centralized logger with Paddle-specific context.
 * All logs are in English for technical standards, while user-facing
 * error messages are handled separately in errors.ts (Spanish).
 * 
 * CRITICAL: Errors are ALWAYS logged to console, even in production,
 * to help diagnose Paddle integration issues (especially E-403 errors).
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
 * Check if Paddle logging should be forced (always show errors)
 * 
 * This can be enabled via environment variable for debugging in production.
 * By default, errors are always shown for critical Paddle debugging.
 */
const shouldForcePaddleLogs = (): boolean => {
  // Always show errors in browser (client-side) - they're critical for debugging Paddle
  if (typeof window !== 'undefined') {
    return true;
  }
  // On server, check environment variable
  return process.env.ENABLE_PADDLE_LOGS === 'true' || process.env.NODE_ENV === 'development';
};

/**
 * Structured logger for Paddle components
 * 
 * Provides consistent logging format across all Paddle-related code:
 * Format: [Paddle {context}] {message}
 * 
 * All logs are in English for international technical standards.
 * User-facing messages (Spanish) are handled in errors.ts
 * 
 * CRITICAL: Error logs are ALWAYS shown to help diagnose Paddle issues.
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
   * CRITICAL: Errors are ALWAYS logged to console, even in production,
   * to help diagnose Paddle integration issues (especially E-403 errors).
   * 
   * @param context - Component/context name
   * @param message - Error message in English
   * @param error - Optional error object or additional data
   * 
   * @example
   * paddleLogger.error('Checkout API', 'Price validation failed', { priceId: '...', status: 404 });
   */
  error: (context: PaddleLogContext, message: string, error?: unknown): void => {
    // Always show errors - critical for debugging Paddle E-403 and other issues
    if (shouldForcePaddleLogs()) {
      const errorMessage = `[Paddle ${context}] ${message}`;
      if (error !== undefined) {
        // eslint-disable-next-line no-console
        console.error(errorMessage, error);
      } else {
        // eslint-disable-next-line no-console
        console.error(errorMessage);
      }
    }
    // Also use the standard logger for consistency
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

