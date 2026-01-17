export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number; // ms
    maxDelay: number; // ms
    backoff: 'linear' | 'exponential';
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoff: 'exponential'
};

export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    shouldRetry: (error: any) => boolean = () => true
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Check if we should retry
            if (!shouldRetry(error) || attempt === config.maxAttempts - 1) {
                throw error;
            }

            // Calculate delay
            const delay = config.backoff === 'exponential'
                ? Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay)
                : Math.min(config.baseDelay * (attempt + 1), config.maxDelay);

            console.warn(
                `[Retry] Attempt ${attempt + 1}/${config.maxAttempts} failed. ` +
                `Retrying in ${delay}ms...`,
                { error: lastError.message }
            );

            await sleep(delay);
        }
    }

    throw lastError || new Error('Retry failed after all attempts');
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
