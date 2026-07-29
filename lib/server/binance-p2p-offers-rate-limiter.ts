import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let rateLimiter: Ratelimit | null = null;

if (redisUrl && redisToken) {
  try {
    rateLimiter = new Ratelimit({
      redis: new Redis({ url: redisUrl, token: redisToken }),
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
      prefix: 'fintec:binance-p2p-offers',
    });
  } catch {
    rateLimiter = null;
  }
}

export async function checkBinanceP2POffersRateLimit(identifier: string) {
  if (!rateLimiter) {
    return {
      success: true,
      limit: 20,
      remaining: 19,
      resetAt: Date.now() + 60_000,
    };
  }

  try {
    const result = await rateLimiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch {
    return {
      success: true,
      limit: 20,
      remaining: 1,
      resetAt: Date.now() + 60_000,
    };
  }
}
