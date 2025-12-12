import { NextResponse } from 'next/server';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';
import { buildBCVFallbackData } from '@/lib/services/rates-fallback';

export const runtime = 'nodejs';

// Cache optimizado para datos exitosos y errores
let lastSuccessfulData: any = null;
let lastSuccessfulTime = 0;
const SUCCESS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutos para datos exitosos

export async function GET() {
  try {
    const now = Date.now();
    
    // 1. Si tenemos datos exitosos recientes, devolverlos inmediatamente
    if (lastSuccessfulData && (now - lastSuccessfulTime) < SUCCESS_CACHE_DURATION) {
      return NextResponse.json({
        ...lastSuccessfulData,
        cached: true,
        cacheAge: Math.round((now - lastSuccessfulTime) / 1000),
        fallback: false,
      });
    }
    
    // 2. Intentar ejecutar el scraper TypeScript
    const result = await scrapeBCVRates();
    
    if (result.success) {
      lastSuccessfulData = result;
      lastSuccessfulTime = now;
      return NextResponse.json({ ...result, fallback: false });
    }

    // 3. Fallback: last known good (módulo) o fallback estático
    if (lastSuccessfulData?.data) {
      return NextResponse.json({
        success: false,
        data: {
          ...lastSuccessfulData.data,
          source: 'BCV (fallback - last-known-good)',
        },
        error: result.error || 'BCV scraper failed',
        fallback: true,
        fallbackReason: result.error || 'BCV scraper failed',
        dataAge: Math.round((now - lastSuccessfulTime) / 1000),
        circuitBreakerState: result.circuitBreakerState,
      });
    }

    return NextResponse.json({
      ...result,
      fallback: true,
      fallbackReason: result.error || 'BCV scraper failed',
    });
  } catch (error) {
    // Si tenemos datos exitosos antiguos, usarlos
    if (lastSuccessfulData) {
      return NextResponse.json({
        success: false,
        data: {
          ...lastSuccessfulData.data,
          source: 'BCV (fallback - last-known-good)',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true,
        fallbackReason: 'Failed to run BCV scraper',
        dataAge: Math.round((Date.now() - lastSuccessfulTime) / 1000),
        circuitBreakerState: lastSuccessfulData.circuitBreakerState,
      });
    }
    
    // Fallback final
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: buildBCVFallbackData('static-default'),
      fallback: true,
      fallbackReason: 'Unhandled error',
    });
  }
}

// Alternative endpoint for CORS-enabled requests
export async function POST() {
  return GET();
}
