/**
 * Centralized configuration for all scrapers
 * Single source of truth for timeouts, retries, rate limits, and circuit breaker settings
 */

import { ScraperConfig } from './types';

// * Environment detection for serverless optimization
const IS_VERCEL = !!(process.env.VERCEL || process.env.VERCEL_ENV);
// * Check for Edge Runtime safely (Edge Runtime sets this global)
const IS_EDGE = typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis;
const IS_SERVERLESS = IS_VERCEL || IS_EDGE;

/**
 * Binance scraper configuration
 * Optimized for Vercel serverless with strict timeouts
 * ! Serverless functions have execution limits (10s hobby, 60s pro)
 */
export const BINANCE_CONFIG: ScraperConfig = {
  name: 'binance',
  // * Adapt timeout based on environment
  timeout: IS_SERVERLESS ? 8000 : 12000, // 8s serverless, 12s local
  maxRetries: IS_SERVERLESS ? 1 : 2,      // Fewer retries in serverless
  baseDelay: 500,                          // 500ms base delay (reduced from 1s)
  maxDelay: IS_SERVERLESS ? 3000 : 10000, // Cap delay for serverless
  // * Rate limit delay between API pages - shorter for serverless
  rateLimitDelay: IS_SERVERLESS ? 1500 : 5000, // 1.5s serverless, 5s local
  circuitBreaker: {
    failureThreshold: 5, // Open after 5 consecutive failures
    timeout: 60000,      // Wait 60 seconds before attempting HALF_OPEN
    successThreshold: 1, // Close after 1 success in HALF_OPEN
    name: 'binance-circuit-breaker',
  },
};

/**
 * BCV scraper configuration
 * Faster timeout since it's a simpler request (single HTML page)
 */
export const BCV_CONFIG: ScraperConfig = {
  name: 'bcv',
  timeout: IS_SERVERLESS ? 4000 : 5000, // 4s serverless, 5s local
  maxRetries: IS_SERVERLESS ? 1 : 2,
  baseDelay: 500,  // 500ms base delay
  maxDelay: 3000,  // 3 seconds max delay
  circuitBreaker: {
    failureThreshold: 3, // Open after 3 consecutive failures (more lenient)
    timeout: 30000,      // Wait 30 seconds before attempting HALF_OPEN
    successThreshold: 1, // Close after 1 success in HALF_OPEN
    name: 'bcv-circuit-breaker',
  },
};

/**
 * Get configuration for a scraper by name
 */
export function getScraperConfig(name: string): ScraperConfig {
  switch (name) {
    case 'binance':
      return BINANCE_CONFIG;
    case 'bcv':
      return BCV_CONFIG;
    default:
      throw new Error(`Unknown scraper: ${name}`);
  }
}

// * Export environment flags for use in other modules
export const SCRAPER_ENV = {
  isVercel: IS_VERCEL,
  isEdge: IS_EDGE,
  isServerless: IS_SERVERLESS,
} as const;
