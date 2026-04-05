import { NextRequest, NextResponse } from 'next/server';
import { reconcileOrderAsPaid } from '@/lib/orders/order-service';
import { logger } from '@/lib/utils/logger';

function getReconciliationSecret() {
  const secret = process.env.ORDER_RECONCILIATION_SECRET;

  if (!secret) {
    throw new Error('ORDER_RECONCILIATION_SECRET is not configured');
  }

  return secret;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const expectedSecret = getReconciliationSecret();
    const providedSecret = request.headers.get('x-order-reconciliation-secret');

    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized reconciliation request' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const order = await reconcileOrderAsPaid(id);

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order reconciled successfully',
    });
  } catch (error: any) {
    logger.error('[Orders API] Error in POST reconcile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reconcile order' },
      {
        status: error.message?.includes('not found')
          ? 404
          : error.message?.includes('not configured')
            ? 500
            : 500,
      }
    );
  }
}
