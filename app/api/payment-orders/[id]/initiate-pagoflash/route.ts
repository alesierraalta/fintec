import { NextRequest, NextResponse } from 'next/server';
import { createPagoFlashOrder } from '@/lib/payment-orders/providers/pagoflash';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { logger } from '@/lib/utils/logger';
import { createClient } from '@/lib/supabase/server';
import { PaymentOrderService } from '@/lib/payment-orders/order-service';

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

    const userId = await getAuthenticatedUser(req);

    // Use user-scoped client from request context
    const client = await createClient();
    const userService = new PaymentOrderService(client);
    const order = await userService.getOrderById(orderId, userId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Initiate PagoFlash
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const pagoflashResult = await createPagoFlashOrder({
      amount: order.amountMinor / 100,
      description:
        order.description || `Pago de orden ${orderId.substring(0, 8)}`,
      orderId: order.id,
      payerEmail: (order as any).userEmail || 'unknown@example.com',
      payerName: (order as any).userName || 'User',
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
