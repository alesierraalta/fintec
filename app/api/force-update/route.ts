import { NextResponse } from 'next/server';
import { currencyService } from '@/lib/services/currency-service';

export async function POST() {
  try {
    console.log('Forcing currency update...');
    
    // Update BCV and Binance rates
    await Promise.all([
      currencyService.fetchBCVRates(),
      currencyService.fetchBinanceRates()
    ]);
    
    return NextResponse.json({ success: true, message: 'Rates updated successfully' });
  } catch (error) {
    console.error('Error updating rates:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}