/**
 * Circuit Breaker Tests
 * Tests for circuit breaker functionality
 */

import { CircuitBreaker } from '@/lib/scrapers/circuit-breaker';
import { CircuitBreakerState, CircuitBreakerConfig } from '@/lib/scrapers/types';

describe('Circuit Breaker', () => {
  const config: CircuitBreakerConfig = {
    failureThreshold: 3,
    timeout: 1000, // 1 second for testing
    successThreshold: 1,
    name: 'test-circuit-breaker',
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start in CLOSED state', () => {
    const cb = new CircuitBreaker(config);
    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(cb.canAttempt()).toBe(true);
  });

  it('should open after failure threshold', () => {
    const cb = new CircuitBreaker(config);

    // Record failures up to threshold
    for (let i = 0; i < config.failureThreshold; i++) {
      cb.recordFailure();
    }

    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
    expect(cb.canAttempt()).toBe(false);
  });

  it('should transition to HALF_OPEN after timeout', () => {
    const cb = new CircuitBreaker(config);

    // Open the circuit
    for (let i = 0; i < config.failureThreshold; i++) {
      cb.recordFailure();
    }
    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);

    // Advance time past timeout
    jest.advanceTimersByTime(config.timeout + 100);

    // Should transition to HALF_OPEN
    expect(cb.canAttempt()).toBe(true);
    // State will be HALF_OPEN after canAttempt() is called
  });

  it('should close after success in HALF_OPEN', () => {
    const cb = new CircuitBreaker(config);

    // Open circuit
    for (let i = 0; i < config.failureThreshold; i++) {
      cb.recordFailure();
    }

    // Advance time
    jest.advanceTimersByTime(config.timeout + 100);
    cb.canAttempt(); // Transition to HALF_OPEN

    // Record success
    cb.recordSuccess();

    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should reopen on failure in HALF_OPEN', () => {
    const cb = new CircuitBreaker(config);

    // Open circuit
    for (let i = 0; i < config.failureThreshold; i++) {
      cb.recordFailure();
    }

    // Advance time
    jest.advanceTimersByTime(config.timeout + 100);
    cb.canAttempt(); // Transition to HALF_OPEN

    // Record failure in HALF_OPEN
    cb.recordFailure();

    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('should reset manually', () => {
    const cb = new CircuitBreaker(config);

    // Open circuit
    for (let i = 0; i < config.failureThreshold; i++) {
      cb.recordFailure();
    }

    expect(cb.getState()).toBe(CircuitBreakerState.OPEN);

    // Reset
    cb.reset();

    expect(cb.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(cb.getFailureCount()).toBe(0);
  });
});


