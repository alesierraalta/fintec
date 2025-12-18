export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeoutMs?: number; // Timeout for the actual operation
  useJitter?: boolean; // Enable jitter (default: true)
}

/**
 * Retry handler with exponential backoff and full jitter
 * Follows AWS best practices to prevent thundering herd problem
 * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelay ?? 100; // ms
  const maxDelay = options.maxDelay ?? 1000; // ms
  const timeoutMs = options.timeoutMs;
  const useJitter = options.useJitter ?? true; // * Default to using jitter

  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (timeoutMs) {
        // Implement timeout for the promise
        return await Promise.race([
          fn(),
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
          ),
        ]);
      } else {
        return await fn();
      }
    } catch (error: any) {
      if (i === maxRetries) {
        throw error; // Rethrow after max retries
      }

      // * Exponential backoff with optional Full Jitter (AWS recommended)
      // * Full jitter: delay = random(0, min(maxDelay, baseDelay * 2^i))
      const exponentialDelay = Math.min(maxDelay, baseDelay * Math.pow(2, i));
      const delay = useJitter
        ? Math.random() * exponentialDelay  // Full jitter
        : exponentialDelay;                  // No jitter

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // Should not be reached
  throw new Error('withRetry failed unexpectedly');
}
