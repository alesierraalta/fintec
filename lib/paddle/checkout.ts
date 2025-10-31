/**
 * Paddle Checkout
 * 
 * Paddle uses Paddle.js for client-side checkout.
 * - Server provides price IDs and metadata
 * - Client opens checkout using Paddle.Checkout.open()
 * - Supports custom data for webhook identification
 * 
 * Note: Paddle customData must be a flat object with primitive values only:
 * - string, number, or boolean
 * - No nested objects or arrays
 * - Keys should be snake_case (user_id, not userId)
 */

import { paddleConfig } from './config';

export interface CheckoutOptions {
  priceId: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
  customData?: Record<string, string | number | boolean>;
}

export interface CheckoutResponse {
  priceId: string;
  customData?: Record<string, string | number | boolean>;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Get checkout data for Base plan
 * Returns price ID and metadata for client-side checkout
 * 
 * @param userEmail - Optional user email for customer prefill
 * @param userId - User ID to include in customData for webhook identification
 * @returns CheckoutResponse with price ID and metadata
 */
export function getBaseCheckoutData(userEmail?: string, userId?: string): CheckoutResponse {
  return {
    priceId: paddleConfig.prices.base,
    // Paddle expects customData with user_id (snake_case) for webhook identification
    // customData values must be primitive types: string, number, or boolean
    // No nested objects or arrays allowed
    customData: userId ? { user_id: String(userId) } : undefined,
    successUrl: paddleConfig.urls.success,
    cancelUrl: paddleConfig.urls.cancel,
  };
}

/**
 * Get checkout data for Premium plan
 * Returns price ID and metadata for client-side checkout
 * 
 * @param userEmail - Optional user email for customer prefill
 * @param userId - User ID to include in customData for webhook identification
 * @returns CheckoutResponse with price ID and metadata
 */
export function getPremiumCheckoutData(userEmail?: string, userId?: string): CheckoutResponse {
  return {
    priceId: paddleConfig.prices.premium,
    // Paddle expects customData with user_id (snake_case) for webhook identification
    // customData values must be primitive types: string, number, or boolean
    // No nested objects or arrays allowed
    customData: userId ? { user_id: String(userId) } : undefined,
    successUrl: paddleConfig.urls.success,
    cancelUrl: paddleConfig.urls.cancel,
  };
}

/**
 * Get checkout data for a specific tier
 */
export function getCheckoutDataForTier(
  tier: 'base' | 'premium',
  userEmail?: string,
  userId?: string
): CheckoutResponse {
  if (tier === 'base') {
    return getBaseCheckoutData(userEmail, userId);
  }
  return getPremiumCheckoutData(userEmail, userId);
}

