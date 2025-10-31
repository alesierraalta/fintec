/**
 * Price ID Validation
 * 
 * Validates Price IDs against Paddle API to ensure they exist and are active
 * before attempting to open checkout.
 * 
 * Uses direct API calls via fetch as the Paddle SDK v3 doesn't expose prices
 * directly. This validation prevents E-403 errors from invalid or inactive price IDs.
 * 
 * @module lib/paddle/validate-prices
 */

import { paddleConfig, getPaddleHeaders } from './config';
import { paddleLogger } from './logger';
import {
  getErrorCodeFromStatus,
  getLogMessage,
  PaddleErrorCode,
} from './errors';

/**
 * Result of Price ID validation
 */
export interface PriceValidationResult {
  /** Whether the price ID is valid and active */
  isValid: boolean;
  /** The price ID that was validated */
  priceId: string;
  /** Whether the price ID exists in Paddle */
  exists: boolean;
  /** Whether the price ID is active */
  active: boolean;
  /** Error message if validation failed (technical, in English) */
  error?: string;
  /** Price data from Paddle API if found */
  priceData?: {
    id: string;
    status: string;
    productId: string;
    unitPrice?: {
      amount: string;
      currencyCode: string;
    };
  };
}

/**
 * Validate a single Price ID against Paddle API
 * 
 * Validates that a Price ID:
 * - Is not empty or invalid format
 * - Exists in the Paddle API
 * - Is in 'active' status
 * 
 * This validation prevents E-403 errors when opening checkout with invalid price IDs.
 * 
 * @param priceId - The Price ID to validate (e.g., 'pri_01...')
 * @returns Promise with validation result containing status and price data
 * 
 * @example
 * const result = await validatePriceId('pri_01k8x7fz95gfheftb3tqg704ck');
 * if (result.isValid) {
 *   // Price is valid and active, proceed with checkout
 * }
 */
export async function validatePriceId(priceId: string): Promise<PriceValidationResult> {
  // Validate input
  if (!priceId || priceId.trim().length === 0) {
    paddleLogger.warn('Price Validation', 'Empty or invalid Price ID provided');
    return {
      isValid: false,
      priceId,
      exists: false,
      active: false,
      error: getLogMessage(PaddleErrorCode.PRICE_ID_INVALID),
    };
  }

  try {
    // Validate API key is configured
    if (!paddleConfig.apiKey || paddleConfig.apiKey.length === 0) {
      paddleLogger.error('Price Validation', 'Paddle API key not configured');
      return {
        isValid: false,
        priceId,
        exists: false,
        active: false,
        error: getLogMessage(PaddleErrorCode.API_KEY_NOT_CONFIGURED),
      };
    }

    // Use Paddle API REST to fetch price details
    // Note: Paddle SDK v3 doesn't expose prices.get() directly, so we use fetch
    // API endpoint: https://api.paddle.com/prices/{price_id} (production)
    //              https://sandbox-api.paddle.com/prices/{price_id} (sandbox)
    const apiBaseUrl = paddleConfig.environment === 'production' 
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';
    
    paddleLogger.debug('Price Validation', 'Fetching price from Paddle API', {
      priceId,
      environment: paddleConfig.environment,
      apiBaseUrl,
    });
    
    const headers = getPaddleHeaders();
    const priceResponse = await fetch(
      `${apiBaseUrl}/prices/${encodeURIComponent(priceId)}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!priceResponse.ok) {
      const errorCode = getErrorCodeFromStatus(priceResponse.status);
      const errorText = await priceResponse.text();
      
      if (priceResponse.status === 404) {
        const logMessage = getLogMessage(PaddleErrorCode.PRICE_NOT_FOUND, {
          priceId,
          environment: paddleConfig.environment,
        });
        paddleLogger.error('Price Validation', logMessage);
        
        return {
          isValid: false,
          priceId,
          exists: false,
          active: false,
          error: logMessage,
        };
      }
      
      if (priceResponse.status === 401) {
        const logMessage = getLogMessage(PaddleErrorCode.AUTHENTICATION_ERROR);
        paddleLogger.error('Price Validation', logMessage, {
          priceId,
          status: priceResponse.status,
        });
        
        return {
          isValid: false,
          priceId,
          exists: false,
          active: false,
          error: logMessage,
        };
      }

      const logMessage = getLogMessage(errorCode, {
        priceId,
        status: priceResponse.status,
      });
      paddleLogger.error('Price Validation', logMessage, {
        priceId,
        status: priceResponse.status,
        error: errorText,
      });
      
      throw new Error(`Paddle API error: ${priceResponse.status} - ${errorText}`);
    }

    const priceData = await priceResponse.json();
    const price = priceData.data;

    // Validate response structure
    if (!price) {
      paddleLogger.error('Price Validation', 'Invalid response structure from Paddle API', {
        priceId,
        response: priceData,
      });
      
      return {
        isValid: false,
        priceId,
        exists: false,
        active: false,
        error: getLogMessage(PaddleErrorCode.API_ERROR, { priceId }),
      };
    }

    // Check if price is active (only active prices can be used for checkout)
    const isActive = price.status === 'active';

    if (isActive) {
      paddleLogger.info('Price Validation', 'Price validated successfully', {
        priceId,
        exists: true,
        active: isActive,
        status: price.status,
        productId: price.product_id,
      });
    } else {
      paddleLogger.warn('Price Validation', 'Price exists but is not active', {
        priceId,
        status: price.status,
        productId: price.product_id,
      });
    }

    return {
      isValid: isActive,
      priceId,
      exists: true,
      active: isActive,
      priceData: {
        id: price.id || priceId,
        status: price.status || 'unknown',
        productId: price.product_id || '',
        unitPrice: price.unit_price ? {
          amount: price.unit_price.amount || '0',
          currencyCode: price.unit_price.currency_code || 'USD',
        } : undefined,
      },
    };
  } catch (error: unknown) {
    // Handle API errors with detailed logging
    let errorCode = PaddleErrorCode.UNKNOWN_ERROR;
    let errorMessage = getLogMessage(PaddleErrorCode.UNKNOWN_ERROR);

    if (error && typeof error === 'object') {
      const err = error as { status?: number; response?: { status?: number }; code?: string; message?: string };
      
      if (err.status === 404 || err.response?.status === 404) {
        errorCode = PaddleErrorCode.PRICE_NOT_FOUND;
        errorMessage = getLogMessage(errorCode, { priceId });
      } else if (err.status === 401 || err.response?.status === 401) {
        errorCode = PaddleErrorCode.AUTHENTICATION_ERROR;
        errorMessage = getLogMessage(errorCode);
      } else if (err.status === 403 || err.response?.status === 403) {
        errorCode = PaddleErrorCode.FORBIDDEN_ERROR;
        errorMessage = getLogMessage(errorCode);
      } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        errorCode = PaddleErrorCode.NETWORK_ERROR;
        errorMessage = getLogMessage(errorCode);
      } else if (err.message) {
        errorMessage = err.message;
      }
    }

    paddleLogger.error('Price Validation', errorMessage, {
      priceId,
      errorCode,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      isValid: false,
      priceId,
      exists: false,
      active: false,
      error: errorMessage,
    };
  }
}

/**
 * Validate multiple Price IDs in parallel
 * 
 * Validates an array of Price IDs concurrently. Useful for validating
 * multiple tiers or bulk validation scenarios.
 * 
 * @param priceIds - Array of Price IDs to validate
 * @returns Promise with array of validation results (maintains order)
 * 
 * @example
 * const results = await validatePriceIds(['pri_01...', 'pri_02...']);
 * const allValid = results.every(r => r.isValid);
 */
export async function validatePriceIds(priceIds: string[]): Promise<PriceValidationResult[]> {
  if (priceIds.length === 0) {
    paddleLogger.warn('Price Validation', 'Empty array provided to validatePriceIds');
    return [];
  }

  paddleLogger.debug('Price Validation', 'Validating multiple price IDs', {
    count: priceIds.length,
  });

  const validationPromises = priceIds.map(priceId => validatePriceId(priceId));
  return Promise.all(validationPromises);
}

