import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, handleStripeWebhook } from '@/lib/stripe/webhooks';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    // Construct and verify the event
    const event = constructWebhookEvent(body, signature);

    // Handle the event
    await handleStripeWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: `Webhook Error: ${error?.message}` },
      { status: 400 }
    );
  }
}

// Disable body parsing for raw body access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

