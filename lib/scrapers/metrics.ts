/**
 * Scraper Metrics
 * Tracks success/failure rates, response times, and health status
 */

import { HealthStatus, CircuitBreakerState } from './types';

interface MetricData {
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
  responseTimes: number[];
  lastSuccessTime: number | null;
  lastFailureTime: number | null;
  consecutiveFailures: number;
}

/**
 * Metrics tracker for a single scraper
 */
export class ScraperMetrics {
  private data: MetricData;
  private maxResponseTimes = 100; // Keep last 100 response times

  constructor(private name: string) {
    this.data = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      responseTimes: [],
      lastSuccessTime: null,
      lastFailureTime: null,
      consecutiveFailures: 0,
    };
  }

  /**
   * Record a successful request
   */
  recordSuccess(responseTime: number): void {
    this.data.totalRequests++;
    this.data.totalSuccesses++;
    this.data.consecutiveFailures = 0;
    this.data.lastSuccessTime = Date.now();

    // Track response time
    this.data.responseTimes.push(responseTime);
    if (this.data.responseTimes.length > this.maxResponseTimes) {
      this.data.responseTimes.shift();
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(responseTime: number): void {
    this.data.totalRequests++;
    this.data.totalFailures++;
    this.data.consecutiveFailures++;
    this.data.lastFailureTime = Date.now();

    // Track response time even for failures
    this.data.responseTimes.push(responseTime);
    if (this.data.responseTimes.length > this.maxResponseTimes) {
      this.data.responseTimes.shift();
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(
    circuitBreakerState: CircuitBreakerState
  ): HealthStatus {
    const successRate =
      this.data.totalRequests > 0
        ? this.data.totalSuccesses / this.data.totalRequests
        : 1.0;

    const averageResponseTime =
      this.data.responseTimes.length > 0
        ? this.data.responseTimes.reduce((a, b) => a + b, 0) /
          this.data.responseTimes.length
        : 0;

    return {
      name: this.name,
      healthy:
        circuitBreakerState === CircuitBreakerState.CLOSED &&
        successRate > 0.5 &&
        this.data.consecutiveFailures < 5,
      circuitBreakerState,
      lastSuccessTime: this.data.lastSuccessTime,
      lastFailureTime: this.data.lastFailureTime,
      successRate,
      averageResponseTime: Math.round(averageResponseTime),
      totalRequests: this.data.totalRequests,
      totalFailures: this.data.totalFailures,
      consecutiveFailures: this.data.consecutiveFailures,
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.data = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      responseTimes: [],
      lastSuccessTime: null,
      lastFailureTime: null,
      consecutiveFailures: 0,
    };
  }

  /**
   * Get raw metrics data
   */
  getData(): MetricData {
    return { ...this.data };
  }
}


