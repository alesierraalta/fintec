/**
 * Health Monitor
 * Tracks health status of all scrapers
 */

import { HealthStatus, CircuitBreakerState } from './types';
import { CircuitBreaker } from './circuit-breaker';
import { ScraperMetrics } from './metrics';

/**
 * Health monitor for tracking scraper health
 */
export class HealthMonitor {
  private metrics: Map<string, ScraperMetrics> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Register a scraper for monitoring
   */
  registerScraper(
    name: string,
    circuitBreaker: CircuitBreaker
  ): void {
    this.metrics.set(name, new ScraperMetrics(name));
    this.circuitBreakers.set(name, circuitBreaker);
  }

  /**
   * Record a successful request
   */
  recordSuccess(name: string, responseTime: number): void {
    const metrics = this.metrics.get(name);
    if (metrics) {
      metrics.recordSuccess(responseTime);
    }

    const circuitBreaker = this.circuitBreakers.get(name);
    if (circuitBreaker) {
      circuitBreaker.recordSuccess();
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(name: string, responseTime: number): void {
    const metrics = this.metrics.get(name);
    if (metrics) {
      metrics.recordFailure(responseTime);
    }

    const circuitBreaker = this.circuitBreakers.get(name);
    if (circuitBreaker) {
      circuitBreaker.recordFailure();
    }
  }

  /**
   * Get health status for a specific scraper
   */
  getHealthStatus(name: string): HealthStatus | null {
    const metrics = this.metrics.get(name);
    const circuitBreaker = this.circuitBreakers.get(name);

    if (!metrics || !circuitBreaker) {
      return null;
    }

    return metrics.getHealthStatus(circuitBreaker.getState());
  }

  /**
   * Get health status for all scrapers
   */
  getAllHealthStatuses(): Map<string, HealthStatus> {
    const statuses = new Map<string, HealthStatus>();

    for (const name of this.metrics.keys()) {
      const status = this.getHealthStatus(name);
      if (status) {
        statuses.set(name, status);
      }
    }

    return statuses;
  }

  /**
   * Check if all scrapers are healthy
   */
  areAllHealthy(): boolean {
    const statuses = this.getAllHealthStatuses();
    for (const status of statuses.values()) {
      if (!status.healthy) {
        return false;
      }
    }
    return true;
  }

  /**
   * Reset metrics for a scraper
   */
  resetMetrics(name: string): void {
    const metrics = this.metrics.get(name);
    if (metrics) {
      metrics.reset();
    }

    const circuitBreaker = this.circuitBreakers.get(name);
    if (circuitBreaker) {
      circuitBreaker.reset();
    }
  }
}

/**
 * Global health monitor instance
 */
export const healthMonitor = new HealthMonitor();


