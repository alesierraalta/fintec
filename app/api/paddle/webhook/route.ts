import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, handlePaddleWebhook } from '@/lib/paddle/webhooks';

/**
 * Webhook endpoint para Paddle
 * 
 * Paddle envía webhooks a este endpoint cuando ocurren eventos
 * como creación/actualización/cancelación de suscripciones
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener el raw body y la firma
    // Paddle sends signature in the 'paddle-signature' header
    const rawBody = await request.text();
    const signature = request.headers.get('paddle-signature') || request.headers.get('x-paddle-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Verificar la firma
    const isValid = verifyWebhookSignature(rawBody, signature);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    // Parsear el payload
    const payload = JSON.parse(rawBody);

    // Procesar el evento
    await handlePaddleWebhook(payload);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Configuración de Next.js para manejar raw body
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

