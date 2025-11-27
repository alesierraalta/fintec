/**
 * Base Scraper Abstract Class
 * Provides common functionality: circuit breaker, retry, logging, metrics
 * Each scraper extends this and implements abstract methods
 */

import { ScraperResult, ScraperConfig, ScraperError } from './types';
import { CircuitBreaker } from './circuit-breaker';
import { healthMonitor } from './health-monitor';
import { withRetry, RetryOptions } from '@/lib/ai/retry-handler';
import { logger } from '@/lib/utils/logger';

/**
 * Abstract base class for all scrapers
 */
export abstract class BaseScraper<T> {
  protected config: ScraperConfig;
  protected circuitBreaker: CircuitBreaker;
  protected name: string;

  constructor(config: ScraperConfig) {
    this.config = config;
    this.name = config.name;
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);

    // Register with health monitor
    healthMonitor.registerScraper(this.name, this.circuitBreaker);
  }

  /**
   * Main scrape method with circuit breaker and retry
   */
  async scrape(): Promise<ScraperResult<T>> {
    const startTime = Date.now();

    try {
      // Check circuit breaker
      if (!this.circuitBreaker.canAttempt()) {
        const error = new ScraperError(
          `Circuit breaker is OPEN for ${this.name}`,
          'CIRCUIT_BREAKER_OPEN',
          undefined,
          false
        );
        logger.warn(`[${this.name}] Request rejected by circuit breaker`);
        return this.createErrorResult(error, startTime);
      }

      // Execute with retry
      const retryOptions: RetryOptions = {
        maxRetries: this.config.maxRetries,
        baseDelay: this.config.baseDelay,
        maxDelay: this.config.maxDelay,
        timeoutMs: this.config.timeout,
      };

      const data = await withRetry(async () => {
        return await this._fetchData();
      }, retryOptions);

      // Parse data
      const parsedData = await this._parseData(data);

      // Validate data
      const validationError = this._validateData(parsedData);
      if (validationError) {
        throw validationError;
      }

      // Transform data
      const transformedData = this._transformData(parsedData);

      const responseTime = Date.now() - startTime;

      // Record success
      this.circuitBreaker.recordSuccess();
      healthMonitor.recordSuccess(this.name, responseTime);

      logger.info(
        `[${this.name}] Scrape successful in ${responseTime}ms`
      );

      return {
        success: true,
        data: transformedData,
        executionTime: responseTime,
        circuitBreakerState: this.circuitBreaker.getState(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Record failure
      this.circuitBreaker.recordFailure();
      healthMonitor.recordFailure(this.name, responseTime);

      const scraperError =
        error instanceof ScraperError
          ? error
          : new ScraperError(
              error instanceof Error ? error.message : 'Unknown error',
              'SCRAPER_ERROR',
              undefined,
              this.isRetryableError(error)
            );

      logger.error(`[${this.name}] Scrape failed: ${scraperError.message}`);

      return this.createErrorResult(scraperError, startTime);
    }
  }

  /**
   * Create error result with fallback data
   */
  protected abstract createErrorResult(
    error: ScraperError,
    startTime: number
  ): ScraperResult<T>;

  /**
   * Fetch raw data from source
   * Must be implemented by each scraper
   */
  protected abstract _fetchData(): Promise<unknown>;

  /**
   * Parse raw data into structured format
   * Must be implemented by each scraper
   */
  protected abstract _parseData(data: unknown): Promise<unknown>;

  /**
   * Validate parsed data
   * Returns error if validation fails, null if valid
   */
  protected abstract _validateData(data: unknown): ScraperError | null;

  /**
   * Transform parsed data into final format
   * Must be implemented by each scraper
   */
  protected abstract _transformData(data: unknown): T;

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: unknown): boolean {
    if (error instanceof ScraperError) {
      return error.retryable;
    }

    // Check for HTTP status codes
    if (typeof error === 'object' && error !== null) {
      const err = error as { status?: number; statusCode?: number };
      const status = err.status || err.statusCode;
      if (status) {
        return [429, 500, 502, 503, 504].includes(status);
      }
    }

    // Check for timeout/connection errors
    if (error instanceof Error) {
      return (
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT')
      );
    }

    return false;
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}


