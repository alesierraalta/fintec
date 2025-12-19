import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import {
  uploadReceipt,
  updateOrder,
  getOrderById,
} from '@/lib/payment-orders/order-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/payment-orders/[id]/receipt
 * Upload receipt file for an order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser(request);
    const { id } = await params;
    const orderId = id;

    // Verify order exists and belongs to user
    const order = await getOrderById(orderId, userId);
    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: 'Receipt can only be uploaded for pending orders',
        },
        { status: 400 }
      );
    }

    // Get file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Upload receipt
    const { url, path } = await uploadReceipt(orderId, userId, file);

    // Update order with receipt URL
    const updatedOrder = await updateOrder(orderId, userId, {
      receiptUrl: url,
      receiptFilename: file.name,
    });

    return NextResponse.json({
      success: true,
      data: {
        order: updatedOrder,
        receiptUrl: url,
        receiptPath: path,
      },
      message: 'Receipt uploaded successfully',
    });
  } catch (error: any) {
    logger.error('[PaymentOrders API] Error in POST receipt:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload receipt',
      },
      {
        status: error.message?.includes('Authentication') ? 401 :
          error.message?.includes('File size') ? 400 :
            error.message?.includes('Invalid file type') ? 400 : 500
      }
    );
  }
}

