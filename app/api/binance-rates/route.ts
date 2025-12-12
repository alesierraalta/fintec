import { NextResponse } from 'next/server';
import { scrapeBinanceRates } from '@/lib/scrapers/binance-scraper';
import { logger } from '@/lib/utils/logger';

// Cache optimizado para datos de Binance - ANTI RATE LIMITING
let lastFallbackTime = 0;
let lastSuccessfulData: any = null;
let lastSuccessfulTime = 0;
let consecutiveFailures = 0; // Track failures for exponential backoff
let lastRequestTime = 0; // Track last request to enforce minimum delay

// INCREASED CACHE DURATIONS TO AVOID RATE LIMITING
const FALLBACK_CACHE_DURATION = 60 * 1000; // 1 minuto (evitar spam)
const SUCCESS_CACHE_DURATION = 180 * 1000; // 3 minutos (reducir peticiones)
const BACKGROUND_REFRESH_INTERVAL = 180 * 1000; // 3 minutos para background refresh
const MIN_REQUEST_INTERVAL = 30 * 1000; // Mínimo 30 segundos entre peticiones
const MAX_CONSECUTIVE_FAILURES = 3; // Después de 3 fallos, esperar más tiempo

// Force reset all cache variables on module load
logger.info('🔄 Binance API module loaded - all cache variables reset');
logger.info('✅ Using native TypeScript scraper (Vercel-compatible)');

export async function GET() {
  try {
    const now = Date.now();
    
    // 1. ALWAYS return cached data if available and recent (ANTI RATE LIMITING)
    if (lastSuccessfulData && (now - lastSuccessfulTime) < SUCCESS_CACHE_DURATION) {
      // Trigger background refresh only if cache is aging
      const cacheAge = now - lastSuccessfulTime;
      if (cacheAge > BACKGROUND_REFRESH_INTERVAL) {
        triggerBackgroundRefresh();
      }
      return NextResponse.json({
        ...lastSuccessfulData,
        cached: true,
        cacheAge: Math.round(cacheAge / 1000)
      });
    }
    
    // 2. Enforce minimum interval between requests (ANTI RATE LIMITING)
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      logger.info(`Rate limiting protection: ${timeSinceLastRequest}ms since last request`);
      if (lastSuccessfulData) {
        return NextResponse.json({
          ...lastSuccessfulData,
          cached: true,
          rateLimited: true,
          cacheAge: Math.round((now - lastSuccessfulTime) / 1000)
        });
      }
      return NextResponse.json(getFallbackData('Too many requests - rate limiting protection'));
    }
    
    // 3. Si tenemos muchos fallos consecutivos, usar exponential backoff
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const backoffTime = Math.min(consecutiveFailures * 60 * 1000, 300 * 1000); // Max 5 minutos
      if ((now - lastFallbackTime) < backoffTime) {
        logger.info(`Exponential backoff: waiting ${backoffTime}ms after ${consecutiveFailures} failures`);
        if (lastSuccessfulData) {
          return NextResponse.json({
            ...lastSuccessfulData,
            cached: true,
            backoff: true,
            cacheAge: Math.round((now - lastSuccessfulTime) / 1000)
          });
        }
        return NextResponse.json(getFallbackData('Multiple failures - exponential backoff'));
      }
    }
    
    // 4. Intentar ejecutar el scraper TypeScript con protecciones
    lastRequestTime = now;
    const result = await scrapeBinanceRates();
    
    if (result.success) {
      lastSuccessfulData = result;
      lastSuccessfulTime = now;
      consecutiveFailures = 0; // Reset failure counter
      logger.info(`✅ Binance scraper successful: ${result.data.prices_used} prices`);
      return NextResponse.json(result);
    } else {
      // Incrementar contador de fallos
      consecutiveFailures++;
      lastFallbackTime = now;
      
      // Detectar rate limiting específicamente
      const isRateLimited = result.error && (
        result.error.includes('429') || 
        result.error.includes('Too Many Requests') ||
        result.error.includes('No valid prices found')
      );
      
      if (isRateLimited) {
        logger.warn(`Rate limiting detected! Consecutive failures: ${consecutiveFailures}`);
      }
      
      // Si tenemos datos exitosos antiguos, usarlos como fallback mejorado
      if (lastSuccessfulData) {
        return NextResponse.json({
          ...lastSuccessfulData,
          fallback: true,
          fallbackReason: result.error || 'Binance scraper failed',
          rateLimited: isRateLimited,
          dataAge: Math.round((now - lastSuccessfulTime) / 1000),
          consecutiveFailures
        });
      }
      
      return NextResponse.json(getFallbackData(result.error || 'Binance scraper failed'));
    }
  } catch (error) {
    consecutiveFailures++;
    lastFallbackTime = Date.now();
    
    // Si tenemos datos exitosos antiguos, usarlos
    if (lastSuccessfulData) {
      return NextResponse.json({
        ...lastSuccessfulData,
        fallback: true,
        fallbackReason: 'Failed to run Binance scraper',
        dataAge: Math.round((Date.now() - lastSuccessfulTime) / 1000)
      });
    }
    
    return NextResponse.json(getFallbackData('Failed to run Binance scraper'));
  }
}

function getFallbackData(reason: string) {
  return {
    success: false,
    error: reason,
    data: {
      usd_ves: 300.00,
      usdt_ves: 300.00,
      busd_ves: 300.00,
      sell_rate: 302.00,
      buy_rate: 298.00,
      sell_min: 300.00,
      sell_avg: 302.00,
      sell_max: 304.00,
      buy_min: 296.00,
      buy_avg: 298.00,
      buy_max: 300.00,
      overall_min: 296.00,
      overall_max: 304.00,
      spread: 4.00,
      sell_prices_used: 0,
      buy_prices_used: 0,
      prices_used: 0,
      price_range: {
        sell_min: 300.00,
        sell_max: 304.00,
        buy_min: 296.00,
        buy_max: 300.00,
        min: 296.00,
        max: 304.00
      },
      lastUpdated: new Date().toISOString(),
      source: 'Binance P2P (fallback - rate limiting protection)'
    },
    fallback: true,
    consecutiveFailures
  };
}

// Background refresh with TypeScript scraper
let backgroundRefreshPromise: Promise<any> | null = null;

function triggerBackgroundRefresh() {
  // Solo hacer background refresh si no hay uno en progreso
  if (!backgroundRefreshPromise && lastSuccessfulData) {
    const cacheAge = Date.now() - lastSuccessfulTime;
    // Solo hacer background refresh si el cache tiene más de BACKGROUND_REFRESH_INTERVAL
    if (cacheAge > BACKGROUND_REFRESH_INTERVAL) {
      backgroundRefreshPromise = scrapeBinanceRates()
        .then((result) => {
          if (result.success) {
            lastSuccessfulData = result;
            lastSuccessfulTime = Date.now();
            logger.info('✅ Background refresh successful');
          }
          backgroundRefreshPromise = null;
        })
        .catch(() => {
          logger.warn('❌ Background refresh failed');
          backgroundRefreshPromise = null;
        });
    }
  }
}

// Alternative endpoint for CORS-enabled requests
export async function POST() {
  return GET();
}
