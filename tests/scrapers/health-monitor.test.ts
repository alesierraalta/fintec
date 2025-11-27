/**
 * Health Monitor Tests
 * Tests for health monitoring functionality
 */

import { HealthMonitor } from '@/lib/scrapers/health-monitor';
import { CircuitBreaker } from '@/lib/scrapers/circuit-breaker';
import { CircuitBreakerState, CircuitBreakerConfig } from '@/lib/scrapers/types';

describe('Health Monitor', () => {
  let healthMonitor: HealthMonitor;
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    healthMonitor = new HealthMonitor();
    const config: CircuitBreakerConfig = {
      failureThreshold: 3,
      timeout: 1000,
      successThreshold: 1,
      name: 'test-scraper',
    };
    circuitBreaker = new CircuitBreaker(config);
    healthMonitor.registerScraper('test-scraper', circuitBreaker);
  });

  it('should register a scraper', () => {
    const status = healthMonitor.getHealthStatus('test-scraper');
    expect(status).not.toBeNull();
    expect(status?.name).toBe('test-scraper');
  });

  it('should record success', () => {
    healthMonitor.recordSuccess('test-scraper', 100);
    const status = healthMonitor.getHealthStatus('test-scraper');
    expect(status?.totalRequests).toBe(1);
    expect(status?.totalFailures).toBe(0);
    expect(status?.consecutiveFailures).toBe(0);
    expect(status?.successRate).toBeGreaterThan(0);
  });

  it('should record failure', () => {
    healthMonitor.recordFailure('test-scraper', 200);
    const status = healthMonitor.getHealthStatus('test-scraper');
    expect(status?.totalRequests).toBe(1);
    expect(status?.totalFailures).toBe(1);
    expect(status?.consecutiveFailures).toBe(1);
    expect(status?.successRate).toBeLessThan(1);
  });

  it('should calculate success rate', () => {
    healthMonitor.recordSuccess('test-scraper', 100);
    healthMonitor.recordSuccess('test-scraper', 150);
    healthMonitor.recordFailure('test-scraper', 200);

    const status = healthMonitor.getHealthStatus('test-scraper');
    expect(status?.successRate).toBeCloseTo(2 / 3, 1);
    expect(status?.totalRequests).toBe(3);
  });

  it('should track average response time', () => {
    healthMonitor.recordSuccess('test-scraper', 100);
    healthMonitor.recordSuccess('test-scraper', 200);
    healthMonitor.recordSuccess('test-scraper', 300);

    const status = healthMonitor.getHealthStatus('test-scraper');
    expect(status?.averageResponseTime).toBe(200);
  });

  it('should determine health status', () => {
    // Healthy: CLOSED state, good success rate
    healthMonitor.recordSuccess('test-scraper', 100);
    let status = healthMonitor.getHealthStatus('test-scraper');
    expect(status?.healthy).toBe(true);

    // Unhealthy: too many consecutive failures
    for (let i = 0; i < 5; i++) {
      healthMonitor.recordFailure('test-scraper', 200);
    }
    status = healthMonitor.getHealthStatus('test-scraper');
    expect(status?.healthy).toBe(false);
  });

  it('should get all health statuses', () => {
    healthMonitor.recordSuccess('test-scraper', 100);
    const allStatuses = healthMonitor.getAllHealthStatuses();
    expect(allStatuses.size).toBe(1);
    expect(allStatuses.has('test-scraper')).toBe(true);
  });

  it('should check if all scrapers are healthy', () => {
    healthMonitor.recordSuccess('test-scraper', 100);
    expect(healthMonitor.areAllHealthy()).toBe(true);

    for (let i = 0; i < 5; i++) {
      healthMonitor.recordFailure('test-scraper', 200);
    }
    expect(healthMonitor.areAllHealthy()).toBe(false);
  });
});

