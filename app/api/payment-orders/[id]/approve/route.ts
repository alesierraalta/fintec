import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import {
  approveOrder,
} from '@/lib/payment-orders/order-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/payment-orders/[id]/approve
 * Approve a payment order (admin only)
 * Creates transaction automatically
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser(request);
    const { id } = await params;
    const orderId = id;

    // Check if user is admin
    if (!isAdmin(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Admin access required',
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const order = await approveOrder(orderId, userId, {
      accountId: body.accountId,
      adminNotes: body.adminNotes,
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order approved and transaction created successfully',
    });
  } catch (error: any) {
    logger.error('[PaymentOrders API] Error in POST approve:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to approve order',
      },
      {
        status: error.message?.includes('Authentication') ? 401 :
          error.message?.includes('Unauthorized') ? 403 :
            error.message?.includes('not found') ? 404 :
              error.message?.includes('must be in pending_review') ? 400 :
                error.message?.includes('must have a receipt') ? 400 : 500
      }
    );
  }
}

