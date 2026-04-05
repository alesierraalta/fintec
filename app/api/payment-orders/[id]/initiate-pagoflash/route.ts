import { NextRequest, NextResponse } from 'next/server';
import { createPagoFlashOrder } from '@/lib/payment-orders/providers/pagoflash';
import { createServiceClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/utils/logger';

const supabase = createServiceClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get order
    const { data: order, error: orderError } = (await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single()) as { data: Record<string, unknown> | null; error: unknown };

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if ((order as Record<string, unknown>).payment_method !== 'pagoflash') {
      return NextResponse.json(
        { success: false, error: 'Order is not configured for PagoFlash' },
        { status: 400 }
      );
    }

    // Initiate PagoFlash
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const pagoflashResult = await createPagoFlashOrder({
      amount: ((order as Record<string, unknown>).amount_minor as number) / 100,
      description:
        ((order as Record<string, unknown>).description as string) ||
        `Pago de orden ${orderId.substring(0, 8)}`,
      orderId: (order as Record<string, unknown>).id as string,
      payerEmail: user.email!,
      payerName: user.user_metadata?.full_name || user.email,
      successRedirectUrl: `${baseUrl}/payment-orders/${orderId}?status=success`,
      errorRedirectUrl: `${baseUrl}/payment-orders/${orderId}?status=error`,
    });

    if (!pagoflashResult.success || !pagoflashResult.result) {
      return NextResponse.json(
        {
          success: false,
          error: pagoflashResult.error || 'Failed to create PagoFlash order',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: pagoflashResult.result.url,
      pagoflashOrderId: pagoflashResult.result.id,
    });
  } catch (error: any) {
    logger.error('[API] Error initiating PagoFlash:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
