import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import {
  getOrderById,
  updateOrder,
} from '@/lib/payment-orders/order-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Helper function to extract authenticated user from request
 */
async function getAuthenticatedUser(request: NextRequest): Promise<string> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    throw new Error('No authorization token provided');
  }

  const supabaseWithAuth = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
  
  const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser();
  
  if (authError || !user) {
    throw new Error('Authentication failed');
  }
  
  return user.id;
}

/**
 * GET /api/payment-orders/[id]
 * Get a specific order
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser(request);
    const { id } = await params;
    const orderId = id;
    const isAdminUser = isAdmin(userId);

    const order = await getOrderById(orderId, isAdminUser ? undefined : userId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    logger.error('[PaymentOrders API] Error in GET [id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch order',
      },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}

/**
 * PATCH /api/payment-orders/[id]
 * Update an order (for uploading receipt or updating description)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUser(request);
    const { id } = await params;
    const orderId = id;
    const body = await request.json();

    const order = await updateOrder(orderId, userId, {
      description: body.description,
      receiptUrl: body.receiptUrl,
      receiptFilename: body.receiptFilename,
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order updated successfully',
    });
  } catch (error: any) {
    logger.error('[PaymentOrders API] Error in PATCH [id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update order',
      },
      { status: error.message?.includes('Authentication') ? 401 : 
             error.message?.includes('not found') ? 404 : 
             error.message?.includes('can only be updated') ? 400 : 500 }
    );
  }
}

