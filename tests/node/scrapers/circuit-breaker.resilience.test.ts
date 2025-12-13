import { CircuitBreaker } from '@/lib/scrapers/circuit-breaker';
import { CircuitBreakerState, CircuitBreakerConfig } from '@/lib/scrapers/types';

describe('Circuit Breaker Resilience', () => {
  let circuitBreaker: CircuitBreaker;
  const config: CircuitBreakerConfig = {
    name: 'TestBreaker',
    failureThreshold: 3,
    timeout: 5000,
    successThreshold: 2,
  };

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(config);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(circuitBreaker.canAttempt()).toBe(true);
  });

  it('should transition from CLOSED to OPEN after failure threshold is reached', () => {
    // 1st failure
    circuitBreaker.recordFailure();
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(circuitBreaker.getFailureCount()).toBe(1);

    // 2nd failure
    circuitBreaker.recordFailure();
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(circuitBreaker.getFailureCount()).toBe(2);

    // 3rd failure (Threshold)
    circuitBreaker.recordFailure();
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    expect(circuitBreaker.getFailureCount()).toBe(3);
    expect(circuitBreaker.canAttempt()).toBe(false);
  });

  it('should stay OPEN before timeout', () => {
    // Trigger OPEN
    for (let i = 0; i < config.failureThreshold; i++) {
      circuitBreaker.recordFailure();
    }
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

    // Advance time partially
    jest.advanceTimersByTime(config.timeout - 100);
    expect(circuitBreaker.canAttempt()).toBe(false);
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('should transition from OPEN to HALF_OPEN after timeout when canAttempt is called', () => {
    // Trigger OPEN
    for (let i = 0; i < config.failureThreshold; i++) {
      circuitBreaker.recordFailure();
    }

    // Advance time past timeout
    jest.advanceTimersByTime(config.timeout + 100);
    
    // State transition happens inside canAttempt()
    expect(circuitBreaker.canAttempt()).toBe(true);
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
  });

  it('should transition from HALF_OPEN back to OPEN on single failure', () => {
    // Trigger OPEN
    for (let i = 0; i < config.failureThreshold; i++) {
      circuitBreaker.recordFailure();
    }
    jest.advanceTimersByTime(config.timeout + 100);
    circuitBreaker.canAttempt(); // Enters HALF_OPEN

    // Fail once in HALF_OPEN
    circuitBreaker.recordFailure();
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    expect(circuitBreaker.canAttempt()).toBe(false);
  });

  it('should transition from HALF_OPEN to CLOSED after success threshold is reached', () => {
    // Trigger OPEN
    for (let i = 0; i < config.failureThreshold; i++) {
      circuitBreaker.recordFailure();
    }
    jest.advanceTimersByTime(config.timeout + 100);
    circuitBreaker.canAttempt(); // Enters HALF_OPEN

    // 1st Success
    circuitBreaker.recordSuccess();
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

    // 2nd Success (Threshold)
    circuitBreaker.recordSuccess();
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    expect(circuitBreaker.canAttempt()).toBe(true);
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });

  it('should reset failure count on success in CLOSED state', () => {
    // 1 failure
    circuitBreaker.recordFailure();
    expect(circuitBreaker.getFailureCount()).toBe(1);

    // Success
    circuitBreaker.recordSuccess();
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });
  
  it('should allow consecutive successes in HALF_OPEN without premature closing', () => {
     const highSuccessConfig = { ...config, successThreshold: 5 };
     const breaker = new CircuitBreaker(highSuccessConfig);
     
     // Trigger OPEN
     for(let i=0; i<highSuccessConfig.failureThreshold; i++) breaker.recordFailure();
     jest.advanceTimersByTime(highSuccessConfig.timeout + 100);
     breaker.canAttempt(); // HALF_OPEN
     
     for(let i=0; i<4; i++) {
         breaker.recordSuccess();
         expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
     }
     
     breaker.recordSuccess(); // 5th
     expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });
});
