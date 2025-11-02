/**
 * Redis Client Configuration with Upstash Support
 * 
 * Configuración de cliente Redis con soporte para Upstash (serverless),
 * singleton pattern, connection pooling y fallback graceful si Redis no está disponible.
 * 
 * Ambiente: Vercel/serverless compatible
 */

import Redis, { RedisOptions } from 'ioredis';
import { logger } from '@/lib/utils/logger';

// Singleton instance
let redisInstance: Redis | null = null;
let redisError: Error | null = null;
let isRedisAvailable = false;

/**
 * Obtiene la instancia singleton de Redis
 * Conecta lazily en el primer acceso
 * Retorna null si Redis no está disponible (fallback mode)
 */
export function getRedisClient(): Redis | null {
  // Si ya sabemos que falló, retornar null
  if (redisError && !isRedisAvailable) {
    return null;
  }

  // Si ya tenemos una instancia, retornarla
  if (redisInstance) {
    return redisInstance;
  }

  // Intentar crear nueva conexión
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger.warn('Redis: REDIS_URL not configured, using fallback mode');
      redisError = new Error('REDIS_URL not configured');
      return null;
    }

    // Configuración para Upstash Redis (serverless)
    const redisOptions: RedisOptions = {
      // Upstash requiere TLS en serverless
      enableReadyCheck: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        // No reintentar si falla, mejor fallback rápido
        return null;
      },
      // Timeouts cortos para serverless
      connectTimeout: 5000,
      commandTimeout: 5000,
      // Connection pooling para serverless
      lazyConnect: false,
    };

    redisInstance = new Redis(redisUrl, redisOptions);

    // Event listeners
    redisInstance.on('connect', () => {
      logger.info('Redis: Successfully connected');
      isRedisAvailable = true;
      redisError = null;
    });

    redisInstance.on('error', (error) => {
      logger.error('Redis: Connection error', error);
      redisError = error;
      isRedisAvailable = false;
    });

    redisInstance.on('close', () => {
      logger.info('Redis: Connection closed');
      isRedisAvailable = false;
    });

    return redisInstance;
  } catch (error: any) {
    logger.error('Redis: Failed to create client', error);
    redisError = error;
    return null;
  }
}

/**
 * Verifica si Redis está disponible
 */
export function isRedisConnected(): boolean {
  const client = getRedisClient();
  return client !== null && isRedisAvailable;
}

/**
 * Cierra la conexión Redis (cleanup)
 * Llamar al shutdown de la aplicación
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
      redisInstance = null;
      logger.info('Redis: Connection closed gracefully');
    } catch (error) {
      logger.error('Redis: Error closing connection', error);
      redisInstance = null;
    }
  }
}

// Graceful shutdown on process termination
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => closeRedisConnection());
  process.on('SIGINT', () => closeRedisConnection());
}
