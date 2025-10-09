import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, handleLemonSqueezyWebhook } from '@/lib/lemonsqueezy/webhooks';

/**
 * Webhook endpoint para LemonSqueezy
 * 
 * LemonSqueezy envía webhooks a este endpoint cuando ocurren eventos
 * como creación/actualización/cancelación de suscripciones
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener el raw body y la firma
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature');

    if (!signature) {
      console.error('[LemonSqueezy Webhook] Missing signature');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Verificar la firma
    const isValid = verifyWebhookSignature(rawBody, signature);
    
    if (!isValid) {
      console.error('[LemonSqueezy Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    // Parsear el payload
    const payload = JSON.parse(rawBody);

    // Procesar el evento
    await handleLemonSqueezyWebhook(payload);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[LemonSqueezy Webhook] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Configuración de Next.js para manejar raw body
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


