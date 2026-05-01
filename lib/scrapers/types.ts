/**
 * Common types for all scrapers
 * Shared interfaces and types for scraper architecture
 */

/**
 * Scraper error categories for granular diagnostics
 */
export enum ScraperErrorCategory {
  TIMEOUT = 'TIMEOUT',
  CONNECTIVITY = 'CONNECTIVITY',
  PARSING = 'PARSING',
  RATE_LIMIT = 'RATE_LIMIT',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Generic scraper result interface
 */
export interface ScraperResult<T> {
  success: boolean;
  data: T;
  error?: string;
  executionTime?: number;
  cached?: boolean;
  circuitBreakerState?: CircuitBreakerState;
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Too many failures, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  timeout: number; // Time in ms before attempting HALF_OPEN
  successThreshold: number; // Number of successes in HALF_OPEN to close
  name: string; // Identifier for logging
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  name: string;
  timeout: number;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  circuitBreaker: CircuitBreakerConfig;
  rateLimitDelay?: number; // Delay between requests
}

/**
 * Health status for a scraper
 */
export interface HealthStatus {
  name: string;
  healthy: boolean;
  circuitBreakerState: CircuitBreakerState;
  lastSuccessTime: number | null;
  lastFailureTime: number | null;
  lastErrorCategory?: ScraperErrorCategory; // Category of the last failure
  successRate: number; // 0-1
  averageResponseTime: number; // ms
  totalRequests: number;
  totalFailures: number;
  consecutiveFailures: number;
}

/**
 * Scraper error class
 */
export class ScraperError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public readonly category: ScraperErrorCategory = ScraperErrorCategory.UNKNOWN
  ) {
    super(message);
    this.name = 'ScraperError';
  }
}
