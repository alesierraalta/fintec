/**
 * Context Cache - Caché de Contexto del Usuario
 * 
 * Cachea el contexto del usuario para evitar reconstruirlo en cada request.
 * TTL: 5 minutos
 * Reduce latencia y carga en la base de datos.
 */

import { WalletContext } from './context-builder';
import { logger } from '@/lib/utils/logger';

interface CachedContext {
    context: WalletContext;
    timestamp: number;
    userId: string;
}

// Caché en memoria (simple Map)
// En producción, esto debería usar Redis para compartir entre instancias
const contextCache = new Map<string, CachedContext>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene el contexto cacheado si existe y no ha expirado
 */
export function getCachedContext(userId: string): WalletContext | null {
    const cached = contextCache.get(userId);

    if (!cached) {
        return null;
    }

    const age = Date.now() - cached.timestamp;

    if (age > CACHE_TTL_MS) {
        // Expirado, eliminar
        contextCache.delete(userId);
        logger.debug(`[ContextCache] Cache expired for user ${userId} (age: ${Math.round(age / 1000)}s)`);
        return null;
    }

    logger.debug(`[ContextCache] Cache hit for user ${userId} (age: ${Math.round(age / 1000)}s)`);
    return cached.context;
}

/**
 * Guarda el contexto en caché
 */
export function setCachedContext(userId: string, context: WalletContext): void {
    contextCache.set(userId, {
        context,
        timestamp: Date.now(),
        userId,
    });

    logger.debug(`[ContextCache] Cached context for user ${userId}`);
}

/**
 * Invalida el caché de un usuario específico
 */
export function invalidateCachedContext(userId: string): void {
    const deleted = contextCache.delete(userId);
    if (deleted) {
        logger.debug(`[ContextCache] Invalidated cache for user ${userId}`);
    }
}

/**
 * Invalida todo el caché (útil para testing o mantenimiento)
 */
export function clearAllCache(): void {
    const size = contextCache.size;
    contextCache.clear();
    logger.info(`[ContextCache] Cleared all cache (${size} entries)`);
}

/**
 * Limpia entradas expiradas del caché
 * Debería ejecutarse periódicamente (ej: cada 10 minutos)
 */
export function cleanExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, cached] of contextCache.entries()) {
        const age = now - cached.timestamp;
        if (age > CACHE_TTL_MS) {
            contextCache.delete(userId);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        logger.info(`[ContextCache] Cleaned ${cleaned} expired entries`);
    }
}

/**
 * Obtiene estadísticas del caché
 */
export function getCacheStats() {
    return {
        size: contextCache.size,
        ttlMs: CACHE_TTL_MS,
        entries: Array.from(contextCache.entries()).map(([userId, cached]) => ({
            userId,
            age: Date.now() - cached.timestamp,
            expired: Date.now() - cached.timestamp > CACHE_TTL_MS,
        })),
    };
}

// Limpiar caché expirado cada 10 minutos
if (typeof setInterval !== 'undefined') {
    setInterval(cleanExpiredCache, 10 * 60 * 1000);
}
