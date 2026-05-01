import { APIProfiler } from '@/lib/server/perf/api-profiler';

/**
 * RequestContext encapsulates per-request state: memoization cache, profiler, and user context.
 * This enables request-scoped deduplication and performance tracking without global state.
 */
export class RequestContext {
  /** User ID making the request */
  readonly userId: string;

  /** Per-request memoization cache: Map<key, value> */
  readonly memoCache: Map<string, unknown>;

  /** Optional profiler for tracking request metrics */
  readonly profiler: APIProfiler;

  constructor(userId: string, samplingRate: number = 0.1) {
    this.userId = userId;
    this.memoCache = new Map();
    this.profiler = new APIProfiler(samplingRate);
  }

  /**
   * Helper: get memoized value or compute and cache it
   */
  memoizeOrCompute<T>(key: string, computeFn: () => T): T {
    if (this.memoCache.has(key)) {
      return this.memoCache.get(key) as T;
    }

    const value = computeFn();
    this.memoCache.set(key, value);
    return value;
  }

  /**
   * Helper: async version of memoizeOrCompute.
   * Stores the in-flight promise first so concurrent callers inside the same
   * request share one lookup instead of issuing duplicate reads.
   */
  async memoizeOrComputeAsync<T>(
    key: string,
    computeFn: () => Promise<T>
  ): Promise<T> {
    const cached = this.memoCache.get(key);
    if (cached !== undefined || this.memoCache.has(key)) {
      return Promise.resolve(cached as T | Promise<T>);
    }

    const pendingValue = computeFn()
      .then((value) => {
        this.memoCache.set(key, value);
        return value;
      })
      .catch((error) => {
        this.memoCache.delete(key);
        throw error;
      });

    this.memoCache.set(key, pendingValue);
    return pendingValue;
  }

  deleteMemoKey(key: string): void {
    this.memoCache.delete(key);
  }

  /**
   * Clear all memoized entries (useful for testing or explicit cache clearing)
   */
  clearMemo(): void {
    this.memoCache.clear();
  }

  /**
   * Get metrics summary from profiler
   */
  getMetrics() {
    return this.profiler.getMetrics();
  }
}
