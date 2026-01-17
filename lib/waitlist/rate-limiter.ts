import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiter for Waitlist API endpoint.
 * 
 * Limits: 5 messages per minute per IP
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
            limiter: Ratelimit.slidingWindow(5, '1 m'),
            analytics: true,
            prefix: 'fintec:waitlist',
        });
    } catch (error) {
        console.warn('Failed to initialize Waitlist Rate Limiter:', error);
    }
}

/**
 * Check if a user has exceeded their rate limit for the waitlist.
 * 
 * @param identifier - Identifier to check (usually IP address)
 * @returns Object with success status, limit, and remaining requests
 */
export async function checkWaitlistRateLimit(identifier: string) {
    if (!rateLimiter) {
        // Fail open (allow request) if monitoring is disabled/unconfigured
        console.warn('Waitlist rate limiting disabled: Redis not configured');
        return {
            success: true,
            limit: 100,
            remaining: 99,
            reset: new Date(Date.now() + 60000),
        };
    }

    try {
        const { success, limit, remaining, reset } = await rateLimiter.limit(identifier);
        return {
            success,
            limit,
            remaining,
            reset: new Date(reset),
        };
    } catch (error) {
        console.error('Waitlist rate limit check failed:', error);
        // Fail open on error
        return {
            success: true,
            limit: 5,
            remaining: 1,
            reset: new Date(Date.now() + 60000),
        };
    }
}
