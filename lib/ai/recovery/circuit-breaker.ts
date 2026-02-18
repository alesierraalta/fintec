import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { createServerAIInfraRepository } from '@/repositories/factory';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // ms
  halfOpenAttempts: number;
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenAttempts: 1,
};

export class CircuitBreaker {
  constructor(
    private id: string,
    private config: CircuitBreakerConfig = DEFAULT_CIRCUIT_CONFIG
  ) {}

  private async getRepository() {
    const supabase = await createClient();
    let serviceSupabase: any;

    try {
      serviceSupabase = createServiceClient() as any;
    } catch {
      serviceSupabase = undefined;
    }

    return createServerAIInfraRepository({
      supabase,
      serviceSupabase,
    });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = await this.getState();

    if (state.state === 'OPEN') {
      // Check if we should transition to HALF_OPEN
      if (this.shouldAttemptReset(state)) {
        await this.setState('HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.id}`);
      }
    }

    try {
      const result = await fn();
      await this.onSuccess();
      return result;
    } catch (error) {
      // Only trip circuit for transient errors
      if (this.shouldTripCircuit(error as Error)) {
        await this.onFailure();
      } else {
        console.log(
          `[Circuit Breaker] Skipping trip for persistent error: ${(error as Error).message}`
        );
      }
      throw error;
    }
  }

  private async getState() {
    const repository = await this.getRepository();
    const data = await repository.getCircuitBreakerState(this.id);

    if (!data) {
      // Initialize if checking for the first time or if missing
      await repository.initializeCircuitBreakerState(this.id);
      return { state: 'CLOSED' as CircuitState, failure_count: 0 };
    }

    return {
      state: data.state,
      failure_count: data.failureCount,
      last_failure_at: data.lastFailureAt,
      last_success_at: data.lastSuccessAt,
      updated_at: data.updatedAt,
    };
  }

  private async setState(newState: CircuitState) {
    const repository = await this.getRepository();
    await repository.updateCircuitBreakerState(this.id, {
      state: newState,
      updatedAt: new Date().toISOString(),
    });
  }

  private async onSuccess() {
    // Optimization: only update if previously open or half-open or has failure count
    // For now, always update to be safe and reset failure count
    const repository = await this.getRepository();
    await repository.updateCircuitBreakerState(this.id, {
      state: 'CLOSED',
      failureCount: 0,
      lastSuccessAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  private async onFailure() {
    const repository = await this.getRepository();
    const state = await this.getState();

    const newCount = (state.failure_count || 0) + 1;
    const newState =
      newCount >= this.config.failureThreshold ? 'OPEN' : 'CLOSED';

    await repository.updateCircuitBreakerState(this.id, {
      state: newState,
      failureCount: newCount,
      lastFailureAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  private shouldAttemptReset(state: any): boolean {
    if (!state.last_failure_at) return false;

    const elapsed = Date.now() - new Date(state.last_failure_at).getTime();
    return elapsed >= this.config.resetTimeout;
  }

  /**
   * Determines if an error should trip the circuit breaker.
   * Based on 2026 best practices for error classification:
   * - Transient errors (network, 5xx, timeouts) → SHOULD trip
   * - Persistent errors (4xx except 429, validation, auth) → SHOULD NOT trip
   */
  private shouldTripCircuit(error: Error): boolean {
    const message = error.message.toLowerCase();
    const name = error.name;

    // Don't trip for validation errors
    if (
      name === 'ValidationError' ||
      name === 'ZodError' ||
      message.includes('validation')
    ) {
      return false;
    }

    // Don't trip for auth errors (fix the credentials instead)
    if (
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('403')
    ) {
      return false;
    }

    // Don't trip for client errors (4xx except 429 rate limit)
    if (
      message.includes('400') ||
      message.includes('404') ||
      message.includes('bad request')
    ) {
      return false;
    }

    // DO trip for rate limits (429) - this is transient
    if (
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('quota')
    ) {
      return true;
    }

    // DO trip for server errors (5xx)
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return true;
    }

    // DO trip for network/timeout errors
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return true;
    }

    // Default: trip the circuit for unknown errors (conservative approach)
    return true;
  }
}
