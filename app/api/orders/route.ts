import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import {
  createOrder,
  listUserOrders,
  validateExactAmount,
} from '@/lib/orders/order-service';
import { logger } from '@/lib/utils/logger';
import type { OrderStatus } from '@/types/order';

function parseStatus(value: string | null): OrderStatus | undefined {
  if (value === 'pending' || value === 'paid') {
    return value;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const status = parseStatus(searchParams.get('status'));
    const orders = await listUserOrders(userId, status);

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    logger.error('[Orders API] Error in GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orders' },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    const body = await request.json();

    if (!body.serviceName || typeof body.serviceName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'serviceName is required' },
        { status: 400 }
      );
    }

    if (!body.senderReference || typeof body.senderReference !== 'string') {
      return NextResponse.json(
        { success: false, error: 'senderReference is required' },
        { status: 400 }
      );
    }

    try {
      validateExactAmount(body.amount);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    const order = await createOrder(userId, {
      serviceName: body.serviceName,
      amount: body.amount,
      senderReference: body.senderReference,
    });

    return NextResponse.json(
      {
        success: true,
        data: order,
        message: 'Order created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error('[Orders API] Error in POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}
