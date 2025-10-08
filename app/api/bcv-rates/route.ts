import { NextResponse } from 'next/server';
import { scrapeBCVRates } from '@/lib/scrapers/bcv-scraper';

// Cache optimizado para datos exitosos y errores
let lastSuccessfulData: any = null;
let lastSuccessfulTime = 0;
let lastFallbackTime = 0;
const SUCCESS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutos para datos exitosos
const FALLBACK_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function GET() {
  try {
    const now = Date.now();
    
    // 1. Si tenemos datos exitosos recientes, devolverlos inmediatamente
    if (lastSuccessfulData && (now - lastSuccessfulTime) < SUCCESS_CACHE_DURATION) {
      return NextResponse.json({
        ...lastSuccessfulData,
        cached: true,
        cacheAge: Math.round((now - lastSuccessfulTime) / 1000)
      });
    }
    
    // 2. Intentar ejecutar el scraper TypeScript
    const result = await scrapeBCVRates();
    
    if (result.success) {
      lastSuccessfulData = result;
      lastSuccessfulTime = now;
      return NextResponse.json(result);
    } else {
      // Usar fallback
      lastFallbackTime = now;
      
      // Si tenemos datos exitosos antiguos, usarlos como fallback mejorado
      if (lastSuccessfulData) {
        return NextResponse.json({
          ...lastSuccessfulData,
          fallback: true,
          fallbackReason: result.error || 'BCV scraper failed',
          dataAge: Math.round((now - lastSuccessfulTime) / 1000)
        });
      }
      
      return NextResponse.json(result);
    }
  } catch (error) {
    lastFallbackTime = Date.now();
    
    // Si tenemos datos exitosos antiguos, usarlos
    if (lastSuccessfulData) {
      return NextResponse.json({
        ...lastSuccessfulData,
        fallback: true,
        fallbackReason: 'Failed to run BCV scraper',
        dataAge: Math.round((Date.now() - lastSuccessfulTime) / 1000)
      });
    }
    
    // Fallback final
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        usd: 50.0,
        eur: 58.0,
        lastUpdated: new Date().toISOString(),
        source: 'BCV (fallback)'
      },
      fallback: true
    });
  }
}

// Alternative endpoint for CORS-enabled requests
export async function POST() {
  return GET();
}
