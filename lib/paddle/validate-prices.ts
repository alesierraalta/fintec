/**
 * Price ID Validation
 * 
 * Validates Price IDs against Paddle API to ensure they exist and are active
 * before attempting to open checkout.
 * 
 * Uses direct API calls via fetch as the Paddle SDK doesn't expose prices directly.
 */

import { paddleConfig, getPaddleHeaders } from './config';

export interface PriceValidationResult {
  isValid: boolean;
  priceId: string;
  exists: boolean;
  active: boolean;
  error?: string;
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
 * @param priceId - The Price ID to validate
 * @returns Promise with validation result
 */
export async function validatePriceId(priceId: string): Promise<PriceValidationResult> {
  if (!priceId || priceId.trim().length === 0) {
    return {
      isValid: false,
      priceId,
      exists: false,
      active: false,
      error: 'Price ID is empty or invalid',
    };
  }

  try {
    // Validate API key is configured
    if (!paddleConfig.apiKey || paddleConfig.apiKey.length === 0) {
      return {
        isValid: false,
        priceId,
        exists: false,
        active: false,
        error: 'Paddle API key not configured',
      };
    }

    // Use Paddle API REST to fetch price details
    // Note: Paddle SDK v3 doesn't expose prices.get() directly, so we use fetch
    // The API endpoint is: https://api.paddle.com/prices/{price_id}
    const apiBaseUrl = paddleConfig.environment === 'production' 
      ? 'https://api.paddle.com'
      : 'https://sandbox-api.paddle.com';
    
    const headers = getPaddleHeaders();
    const priceResponse = await fetch(
      `${apiBaseUrl}/prices/${encodeURIComponent(priceId)}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!priceResponse.ok) {
      if (priceResponse.status === 404) {
        return {
          isValid: false,
          priceId,
          exists: false,
          active: false,
          error: `Price ID "${priceId}" not found in Paddle ${paddleConfig.environment} environment`,
        };
      }
      
      if (priceResponse.status === 401) {
        return {
          isValid: false,
          priceId,
          exists: false,
          active: false,
          error: 'Authentication error - check PADDLE_API_KEY configuration',
        };
      }

      const errorText = await priceResponse.text();
      // eslint-disable-next-line no-console
      console.error('[Paddle Price Validation] API error:', {
        priceId,
        status: priceResponse.status,
        error: errorText,
      });
      
      throw new Error(`Paddle API error: ${priceResponse.status} - ${errorText}`);
    }

    const priceData = await priceResponse.json();
    const price = priceData.data;

    if (!price) {
      // eslint-disable-next-line no-console
      console.error('[Paddle Price Validation] Invalid response structure:', {
        priceId,
        response: priceData,
      });
      
      return {
        isValid: false,
        priceId,
        exists: false,
        active: false,
        error: 'Invalid response from Paddle API - price data not found',
      };
    }

    // Check if price is active
    const isActive = price.status === 'active';

    // eslint-disable-next-line no-console
    console.log('[Paddle Price Validation] Price validated:', {
      priceId,
      exists: true,
      active: isActive,
      status: price.status,
      productId: price.product_id,
    });

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
  } catch (error: any) {
    // Handle API errors with detailed logging
    let errorMessage = 'Unknown error validating price ID';

    if (error?.status === 404 || error?.response?.status === 404) {
      errorMessage = `Price ID "${priceId}" not found`;
    } else if (error?.status === 401 || error?.response?.status === 401) {
      errorMessage = 'Authentication error - check PADDLE_API_KEY';
    } else if (error?.status === 403 || error?.response?.status === 403) {
      errorMessage = 'Forbidden - check API key permissions';
    } else if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
      errorMessage = 'Network error - cannot reach Paddle API';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    // eslint-disable-next-line no-console
    console.error('[Paddle Price Validation] Error:', {
      priceId,
      error: errorMessage,
      details: error,
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
 * Validate multiple Price IDs
 * 
 * @param priceIds - Array of Price IDs to validate
 * @returns Promise with array of validation results
 */
export async function validatePriceIds(priceIds: string[]): Promise<PriceValidationResult[]> {
  const validationPromises = priceIds.map(priceId => validatePriceId(priceId));
  return Promise.all(validationPromises);
}

