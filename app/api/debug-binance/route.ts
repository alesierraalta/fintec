import { NextResponse } from 'next/server';
import { binanceHistoryService } from '@/lib/services/binance-history-service';

export async function GET() {
  try {
    console.log('Fetching recent Binance rates...');
    const rates = await binanceHistoryService.getHistoricalRates(5);
    
    const debugInfo = {
      totalRates: rates.length,
      rates: rates.map(rate => ({
        id: rate.id,
        date: rate.date,
        usd: rate.usd,
        usdType: typeof rate.usd,
        timestamp: rate.timestamp,
        source: rate.source,
        fullObject: rate
      }))
    };
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}