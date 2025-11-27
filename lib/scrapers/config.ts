/**
 * Centralized configuration for all scrapers
 * Single source of truth for timeouts, retries, rate limits, and circuit breaker settings
 */

import { ScraperConfig } from './types';

/**
 * Binance scraper configuration
 * Optimized for Vercel serverless with strict timeouts
 */
export const BINANCE_CONFIG: ScraperConfig = {
  name: 'binance',
  timeout: 12000, // 12 seconds
  maxRetries: 2,
  baseDelay: 1000, // 1 second base delay
  maxDelay: 10000, // 10 seconds max delay
  rateLimitDelay: 5000, // 5 seconds between pages
  circuitBreaker: {
    failureThreshold: 5, // Open after 5 consecutive failures
    timeout: 60000, // Wait 60 seconds before attempting HALF_OPEN
    successThreshold: 1, // Close after 1 success in HALF_OPEN
    name: 'binance-circuit-breaker',
  },
};

/**
 * BCV scraper configuration
 * Faster timeout since it's a simpler request
 */
export const BCV_CONFIG: ScraperConfig = {
  name: 'bcv',
  timeout: 5000, // 5 seconds
  maxRetries: 2,
  baseDelay: 1000, // 1 second base delay
  maxDelay: 5000, // 5 seconds max delay
  circuitBreaker: {
    failureThreshold: 3, // Open after 3 consecutive failures (more lenient)
    timeout: 30000, // Wait 30 seconds before attempting HALF_OPEN
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


