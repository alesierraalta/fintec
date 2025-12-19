import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import {
  createOrder,
  listUserOrders,
  listAllOrders,
} from '@/lib/payment-orders/order-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/payment-orders
 * List orders for the authenticated user, or all orders if admin
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const isAdminUser = isAdmin(userId);

    let orders;

    if (isAdminUser) {
      // Admin can see all orders
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');
      orders = await listAllOrders(status, limit, offset);
    } else {
      // Regular users see only their orders
      orders = await listUserOrders(userId, status || undefined);
    }

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    logger.error('[PaymentOrders API] Error in GET:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch orders',
      },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}

/**
 * POST /api/payment-orders
 * Create a new payment order
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const body = await request.json();

    // Validate required fields
    if (!body.amountMinor || body.amountMinor <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'amountMinor is required and must be greater than 0',
        },
        { status: 400 }
      );
    }

    const order = await createOrder(userId, {
      amountMinor: body.amountMinor,
      currencyCode: body.currencyCode,
      description: body.description,
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order created successfully',
    }, { status: 201 });
  } catch (error: any) {
    logger.error('[PaymentOrders API] Error in POST:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create order',
      },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}



