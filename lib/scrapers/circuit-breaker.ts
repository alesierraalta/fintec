/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by opening circuit after too many failures
 * States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */

import { CircuitBreakerState, CircuitBreakerConfig } from './types';
import { logger } from '@/lib/utils/logger';

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private lastStateChangeTime: number = Date.now();
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Check if request can be attempted
   */
  canAttempt(): boolean {
    const now = Date.now();

    // If CLOSED, always allow
    if (this.state === CircuitBreakerState.CLOSED) {
      return true;
    }

    // If OPEN, check if timeout has passed
    if (this.state === CircuitBreakerState.OPEN) {
      const timeSinceLastFailure = this.lastFailureTime
        ? now - this.lastFailureTime
        : Infinity;

      if (timeSinceLastFailure >= this.config.timeout) {
        // Transition to HALF_OPEN
        this.state = CircuitBreakerState.HALF_OPEN;
        this.lastStateChangeTime = now;
        this.successCount = 0;
        logger.info(
          `[${this.config.name}] Circuit breaker transitioning to HALF_OPEN`
        );
        return true;
      }

      return false;
    }

    // If HALF_OPEN, allow one attempt
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      return true;
    }

    return false;
  }

  /**
   * Record a success
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        // Transition to CLOSED
        this.state = CircuitBreakerState.CLOSED;
        this.lastStateChangeTime = Date.now();
        this.successCount = 0;
        logger.info(
          `[${this.config.name}] Circuit breaker closed after successful recovery`
        );
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0;
    }
  }

  /**
   * Record a failure
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in HALF_OPEN goes back to OPEN
      this.state = CircuitBreakerState.OPEN;
      this.lastStateChangeTime = Date.now();
      this.successCount = 0;
      logger.warn(
        `[${this.config.name}] Circuit breaker opened after HALF_OPEN failure`
      );
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      // Too many failures, open circuit
      this.state = CircuitBreakerState.OPEN;
      this.lastStateChangeTime = Date.now();
      logger.error(
        `[${this.config.name}] Circuit breaker opened after ${this.failureCount} failures`
      );
    }
  }

  /**
   * Reset circuit breaker manually
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.lastStateChangeTime = Date.now();
    logger.info(`[${this.config.name}] Circuit breaker manually reset`);
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChangeTime: this.lastStateChangeTime,
      timeSinceLastFailure: this.lastFailureTime
        ? Date.now() - this.lastFailureTime
        : null,
    };
  }
}


