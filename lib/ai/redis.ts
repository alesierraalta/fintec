import Redis from 'ioredis';
import { logger } from '@/lib/utils/logger';
import { AI_CONFIG } from './config';

const getRedisUrl = () => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  if (process.env.KV_URL) return process.env.KV_URL; // Vercel KV fallback
  return 'redis://localhost:6379';
};

const redis = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 50, 2000);
  },
});

redis.on('error', (err) => {
  logger.warn('Redis connection error:', err);
});

export class RateLimiter {
  static async check(userId: string): Promise<{ success: boolean; remaining: number }> {
    const key = `rate_limit:ai:${userId}`;
    const window = AI_CONFIG.rateLimit.windowSeconds;
    const limit = AI_CONFIG.rateLimit.maxRequests;

    try {
      const requests = await redis.incr(key);
      if (requests === 1) {
        await redis.expire(key, window);
      }

      return {
        success: requests <= limit,
        remaining: Math.max(0, limit - requests),
      };
    } catch (error) {
      logger.error('RateLimiter error:', error);
      return { success: true, remaining: 1 }; // Fail open
    }
  }
}

export class ChatHistoryManager {
  static async saveHistory(sessionId: string, messages: any[]) {
    const key = `chat_history:${sessionId}`;
    try {
      // Store last N messages to save space
      const recentMessages = messages.slice(-AI_CONFIG.context.maxHistoryMessages);
      await redis.set(key, JSON.stringify(recentMessages), 'EX', 60 * 60 * 24 * 7); // 7 days
    } catch (error) {
      logger.error('ChatHistoryManager save error:', error);
    }
  }

  static async getHistory(sessionId: string): Promise<any[]> {
    const key = `chat_history:${sessionId}`;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('ChatHistoryManager get error:', error);
      return [];
    }
  }
}

export { redis };
