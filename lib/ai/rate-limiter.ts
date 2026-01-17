import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiter for AI chat endpoint.
 * 
 * Limits: 20 messages per hour per user
 * Storage: Upstash Redis
 * Analytics: Enabled for monitoring
 */
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const isRedisConfigured = !!redisUrl && !!redisToken;

let rateLimiter: Ratelimit | null = null;

if (isRedisConfigured) {
    try {
        rateLimiter = new Ratelimit({
            redis: new Redis({
                url: redisUrl!,
                token: redisToken!,
            }),
            limiter: Ratelimit.slidingWindow(20, '1 h'),
            analytics: true,
            prefix: 'fintec:ai',
        });
    } catch (error) {
        console.warn('Failed to initialize Rate Limiter:', error);
    }
}

/**
 * Check if a user has exceeded their rate limit.
 * 
 * @param userId - User ID to check
 * @returns Object with success status, limit, and remaining requests
 */
export async function checkRateLimit(userId: string) {
    if (!rateLimiter) {
        // Fail open (allow request) if monitoring is disabled/unconfigured
        console.warn('Rate limiting disabled: Redis not configured');
        return {
            success: true,
            limit: 100,
            remaining: 99,
            reset: new Date(Date.now() + 3600000),
        };
    }

    try {
        const { success, limit, remaining, reset } = await rateLimiter.limit(userId);
        return {
            success,
            limit,
            remaining,
            reset: new Date(reset),
        };
    } catch (error) {
        console.error('Rate limit check failed:', error);
        // Fail open on error
        return {
            success: true,
            limit: 20,
            remaining: 1,
            reset: new Date(Date.now() + 3600000),
        };
    }
}
