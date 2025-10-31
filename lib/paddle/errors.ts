/**
 * Paddle Error Handling
 * 
 * Centralized error types and message management for Paddle integration.
 * 
 * Key principles:
 * - User-facing messages: Spanish (shown to end users)
 * - Technical logs: English (for debugging and logs)
 * - Structured error types for better error handling
 * 
 * Usage:
 *   import { getUserErrorMessage, getLogMessage, PaddleErrorCode } from '@/lib/paddle/errors';
 *   const userMsg = getUserErrorMessage(PaddleErrorCode.PRICE_NOT_FOUND);
 *   const logMsg = getLogMessage(PaddleErrorCode.PRICE_NOT_FOUND, { priceId: '...' });
 */

/**
 * Paddle error codes
 * 
 * Standardized error codes for consistent error handling across the application.
 * These codes help identify error types programmatically.
 */
export enum PaddleErrorCode {
  // Configuration errors
  VENDOR_ID_NOT_CONFIGURED = 'VENDOR_ID_NOT_CONFIGURED',
  API_KEY_NOT_CONFIGURED = 'API_KEY_NOT_CONFIGURED',
  ENVIRONMENT_MISMATCH = 'ENVIRONMENT_MISMATCH',
  
  // Validation errors
  PRICE_ID_INVALID = 'PRICE_ID_INVALID',
  PRICE_NOT_FOUND = 'PRICE_NOT_FOUND',
  PRICE_NOT_ACTIVE = 'PRICE_NOT_ACTIVE',
  TIER_INVALID = 'TIER_INVALID',
  USER_ID_MISSING = 'USER_ID_MISSING',
  CUSTOM_DATA_INVALID = 'CUSTOM_DATA_INVALID',
  
  // API errors
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  FORBIDDEN_ERROR = 'FORBIDDEN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  CHECKOUT_OPEN_FAILED = 'CHECKOUT_OPEN_FAILED',
  CHECKOUT_E403 = 'CHECKOUT_E403',
  
  // Initialization errors
  PADDLE_NOT_INITIALIZED = 'PADDLE_NOT_INITIALIZED',
  PADDLE_SCRIPT_NOT_LOADED = 'PADDLE_SCRIPT_NOT_LOADED',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Paddle error interface
 * 
 * Structured error format for consistent error handling
 */
export interface PaddleError {
  code: PaddleErrorCode;
  message: string;
  details?: Record<string, unknown>;
  originalError?: unknown;
}

/**
 * Error message mappings - User-facing (Spanish)
 * 
 * Messages shown to end users in the UI
 */
const USER_ERROR_MESSAGES: Record<PaddleErrorCode, string> = {
  [PaddleErrorCode.VENDOR_ID_NOT_CONFIGURED]: 'Error de configuración: Vendor ID de Paddle no está configurado.',
  [PaddleErrorCode.API_KEY_NOT_CONFIGURED]: 'Error de configuración: API Key de Paddle no está configurada.',
  [PaddleErrorCode.ENVIRONMENT_MISMATCH]: 'Error de configuración: El entorno del cliente no coincide con el del servidor. Esto puede causar errores E-403. Por favor contacta al soporte.',
  [PaddleErrorCode.PRICE_ID_INVALID]: 'Error: Price ID inválido. Por favor contacta al soporte.',
  [PaddleErrorCode.PRICE_NOT_FOUND]: 'Error: El precio seleccionado no fue encontrado. Por favor intenta de nuevo o contacta al soporte.',
  [PaddleErrorCode.PRICE_NOT_ACTIVE]: 'Error: El precio seleccionado no está activo. Por favor contacta al soporte.',
  [PaddleErrorCode.TIER_INVALID]: 'Plan no válido',
  [PaddleErrorCode.USER_ID_MISSING]: 'Usuario o plan no válido',
  [PaddleErrorCode.CUSTOM_DATA_INVALID]: 'Error: Datos personalizados inválidos. Por favor intenta de nuevo.',
  [PaddleErrorCode.AUTHENTICATION_ERROR]: 'Error de autenticación. Por favor verifica la configuración o contacta al soporte.',
  [PaddleErrorCode.FORBIDDEN_ERROR]: 'Error: No tienes permisos para realizar esta acción. Por favor contacta al soporte.',
  [PaddleErrorCode.NETWORK_ERROR]: 'Error de conexión. Por favor verifica tu conexión a internet e intenta de nuevo.',
  [PaddleErrorCode.API_ERROR]: 'Error al comunicarse con el servicio de pagos. Por favor intenta de nuevo más tarde.',
  [PaddleErrorCode.CHECKOUT_OPEN_FAILED]: 'Error al abrir el checkout. Por favor verifica la configuración o intenta de nuevo.',
  [PaddleErrorCode.CHECKOUT_E403]: 'Error de autenticación (E-403). Esto generalmente ocurre cuando:\n1. El Price ID no pertenece al Vendor ID configurado\n2. Hay un mismatch entre los entornos sandbox y production\n3. El Vendor ID no tiene permisos para acceder al Price ID\n\nPor favor verifica la configuración o contacta al soporte.',
  [PaddleErrorCode.PADDLE_NOT_INITIALIZED]: 'Paddle.js no está inicializado. Por favor espera un momento y vuelve a intentar.',
  [PaddleErrorCode.PADDLE_SCRIPT_NOT_LOADED]: 'Paddle.js no se cargó. Verifica que el script esté incluido en el layout.',
  [PaddleErrorCode.UNKNOWN_ERROR]: 'Error desconocido. Por favor intenta de nuevo o contacta al soporte.',
};

/**
 * Error message mappings - Technical logs (English)
 * 
 * Messages for technical logging and debugging
 */
const LOG_ERROR_MESSAGES: Record<PaddleErrorCode, string> = {
  [PaddleErrorCode.VENDOR_ID_NOT_CONFIGURED]: 'Paddle Vendor ID not configured in environment variables',
  [PaddleErrorCode.API_KEY_NOT_CONFIGURED]: 'Paddle API key not configured in environment variables',
  [PaddleErrorCode.ENVIRONMENT_MISMATCH]: 'Environment mismatch between client and server',
  [PaddleErrorCode.PRICE_ID_INVALID]: 'Invalid Price ID format or empty',
  [PaddleErrorCode.PRICE_NOT_FOUND]: 'Price ID not found in Paddle',
  [PaddleErrorCode.PRICE_NOT_ACTIVE]: 'Price ID exists but is not active',
  [PaddleErrorCode.TIER_INVALID]: 'Invalid subscription tier provided',
  [PaddleErrorCode.USER_ID_MISSING]: 'User ID or tier missing from request',
  [PaddleErrorCode.CUSTOM_DATA_INVALID]: 'Custom data contains invalid types (must be string, number, or boolean)',
  [PaddleErrorCode.AUTHENTICATION_ERROR]: 'Paddle API authentication error - check API key configuration',
  [PaddleErrorCode.FORBIDDEN_ERROR]: 'Paddle API forbidden error - check API key permissions',
  [PaddleErrorCode.NETWORK_ERROR]: 'Network error - cannot reach Paddle API',
  [PaddleErrorCode.API_ERROR]: 'Paddle API returned an error',
  [PaddleErrorCode.CHECKOUT_OPEN_FAILED]: 'Failed to open Paddle checkout',
  [PaddleErrorCode.CHECKOUT_E403]: 'Paddle checkout returned E-403 error (authentication/authorization)',
  [PaddleErrorCode.PADDLE_NOT_INITIALIZED]: 'Paddle.js instance not initialized',
  [PaddleErrorCode.PADDLE_SCRIPT_NOT_LOADED]: 'Paddle.js script failed to load',
  [PaddleErrorCode.UNKNOWN_ERROR]: 'Unknown error occurred',
};

/**
 * Get user-facing error message (Spanish)
 * 
 * Returns a user-friendly error message in Spanish for display in the UI.
 * 
 * @param code - Error code
 * @param details - Optional details to include in message (for dynamic messages)
 * @returns User-friendly error message in Spanish
 * 
 * @example
 * getUserErrorMessage(PaddleErrorCode.ENVIRONMENT_MISMATCH, { client: 'sandbox', server: 'production' })
 */
export function getUserErrorMessage(
  code: PaddleErrorCode,
  details?: Record<string, unknown>
): string {
  let message = USER_ERROR_MESSAGES[code];

  // Add dynamic details if provided
  if (details) {
    if (details.clientEnvironment && details.serverEnvironment) {
      message = message.replace(
        'el del servidor',
        `el del servidor (${details.clientEnvironment} vs ${details.serverEnvironment})`
      );
    }
  }

  return message;
}

/**
 * Get technical log message (English)
 * 
 * Returns a technical error message in English for logging and debugging.
 * 
 * @param code - Error code
 * @param details - Optional details to include in message
 * @returns Technical error message in English
 * 
 * @example
 * getLogMessage(PaddleErrorCode.PRICE_NOT_FOUND, { priceId: 'pri_123', environment: 'production' })
 */
export function getLogMessage(
  code: PaddleErrorCode,
  details?: Record<string, unknown>
): string {
  let message = LOG_ERROR_MESSAGES[code];

  // Add dynamic details if provided
  if (details) {
    const detailParts: string[] = [];
    
    if (details.priceId) {
      detailParts.push(`priceId: ${details.priceId}`);
    }
    if (details.environment) {
      detailParts.push(`environment: ${details.environment}`);
    }
    if (details.status) {
      detailParts.push(`status: ${details.status}`);
    }
    if (details.tier) {
      detailParts.push(`tier: ${details.tier}`);
    }

    if (detailParts.length > 0) {
      message = `${message} - ${detailParts.join(', ')}`;
    }
  }

  return message;
}

/**
 * Create a structured Paddle error
 * 
 * Helper to create consistent error objects
 * 
 * @param code - Error code
 * @param originalError - Original error object (if any)
 * @param details - Additional error details
 * @returns Structured Paddle error
 */
export function createPaddleError(
  code: PaddleErrorCode,
  originalError?: unknown,
  details?: Record<string, unknown>
): PaddleError {
  return {
    code,
    message: getUserErrorMessage(code, details),
    details,
    originalError,
  };
}

/**
 * Determine error code from HTTP status
 * 
 * Maps HTTP status codes to Paddle error codes
 * 
 * @param status - HTTP status code
 * @returns Corresponding Paddle error code
 */
export function getErrorCodeFromStatus(status: number): PaddleErrorCode {
  switch (status) {
    case 401:
      return PaddleErrorCode.AUTHENTICATION_ERROR;
    case 403:
      return PaddleErrorCode.FORBIDDEN_ERROR;
    case 404:
      return PaddleErrorCode.PRICE_NOT_FOUND;
    default:
      if (status >= 500) {
        return PaddleErrorCode.API_ERROR;
      }
      return PaddleErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * Determine error code from Paddle error
 * 
 * Maps Paddle.js errors to error codes
 * 
 * @param error - Paddle error object or message
 * @returns Corresponding Paddle error code
 */
export function getErrorCodeFromPaddleError(error: unknown): PaddleErrorCode {
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string };
    
    if (err.code === 'E-403' || err.message?.includes('E-403') || err.message?.includes('403')) {
      return PaddleErrorCode.CHECKOUT_E403;
    }
    
    if (err.message?.includes('price')) {
      return PaddleErrorCode.PRICE_ID_INVALID;
    }
    
    if (err.code === 'NETWORK_ERROR' || err.message?.includes('network')) {
      return PaddleErrorCode.NETWORK_ERROR;
    }
  }
  
  return PaddleErrorCode.UNKNOWN_ERROR;
}

