export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeoutMs?: number; // Timeout for the actual operation
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelay ?? 100; // ms
  const maxDelay = options.maxDelay ?? 1000; // ms
  const timeoutMs = options.timeoutMs;

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

      // Exponential backoff
      const delay = Math.min(maxDelay, baseDelay * Math.pow(2, i));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // Should not be reached
  throw new Error('withRetry failed unexpectedly');
}
