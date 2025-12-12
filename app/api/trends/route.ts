import { NextResponse } from 'next/server';
import { currencyService } from '@/lib/services/currency-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const trends = await currencyService.getBinanceTrends();
  return NextResponse.json(trends || {});
}
