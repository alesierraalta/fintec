/**
 * Paddle Checkout
 * 
 * Paddle uses Paddle.js for client-side checkout.
 * - Server provides price IDs and metadata
 * - Client opens checkout using Paddle.Checkout.open()
 * - Supports custom data for webhook identification
 */

import { paddleConfig } from './config';

export interface CheckoutOptions {
  priceId: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
  customData?: Record<string, any>;
}

export interface CheckoutResponse {
  priceId: string;
  customData?: Record<string, any>;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Get checkout data for Base plan
 * Returns price ID and metadata for client-side checkout
 */
export function getBaseCheckoutData(userEmail?: string, userId?: string): CheckoutResponse {
  return {
    priceId: paddleConfig.prices.base,
    customData: userId ? { userId } : undefined,
    successUrl: paddleConfig.urls.success,
    cancelUrl: paddleConfig.urls.cancel,
  };
}

/**
 * Get checkout data for Premium plan
 * Returns price ID and metadata for client-side checkout
 */
export function getPremiumCheckoutData(userEmail?: string, userId?: string): CheckoutResponse {
  return {
    priceId: paddleConfig.prices.premium,
    customData: userId ? { userId } : undefined,
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

