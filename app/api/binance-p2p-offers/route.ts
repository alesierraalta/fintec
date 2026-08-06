import { NextResponse } from 'next/server';
import { z } from 'zod';
import { binanceP2POffersService } from '@/lib/server/binance-p2p-offers';
import { checkBinanceP2POffersRateLimit } from '@/lib/server/binance-p2p-offers-rate-limiter';
import {
  BINANCE_P2P_MAX_AMOUNT_MINOR,
  BINANCE_P2P_MIN_AMOUNT_MINOR,
  BINANCE_P2P_AMOUNT_UNITS,
  BINANCE_P2P_PAYMENT_IDENTIFIERS,
  BINANCE_P2P_SIDES,
} from '@/types/binance-p2p-offers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const searchSchema = z
  .strictObject({
    side: z.enum(BINANCE_P2P_SIDES),
    amountMinor: z.int().min(1).max(BINANCE_P2P_MAX_AMOUNT_MINOR),
    amountUnit: z.enum(BINANCE_P2P_AMOUNT_UNITS).optional(),
    paymentMethod: z.enum(BINANCE_P2P_PAYMENT_IDENTIFIERS),
    minCompletionRateBps: z.number().int().min(0).max(10_000).optional(),
    minOrderCount: z.number().int().min(0).max(1_000_000_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.amountUnit ?? 'VES') === 'VES' &&
      value.amountMinor < BINANCE_P2P_MIN_AMOUNT_MINOR
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: BINANCE_P2P_MIN_AMOUNT_MINOR,
        origin: 'number',
        inclusive: true,
        path: ['amountMinor'],
        message: 'VES amount is below the Binance minimum',
      });
    }
  });

export async function POST(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp =
    forwardedFor?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const rateLimit = await checkBinanceP2POffersRateLimit(clientIp);

  if (!rateLimit.success) {
    const retryAfter = Math.max(
      1,
      Math.ceil((rateLimit.resetAt - Date.now()) / 1_000)
    );
    return NextResponse.json(
      { error: 'Demasiadas búsquedas. Intente nuevamente más tarde.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Solicitud inválida.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const validation = searchSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Los filtros de búsqueda no son válidos.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const result = await binanceP2POffersService.search(validation.data);
  return NextResponse.json(result, {
    status: result.status === 'unavailable' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
