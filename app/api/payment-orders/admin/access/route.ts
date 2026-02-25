import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isAdmin } from '@/lib/payment-orders/admin-utils';

/**
 * GET /api/payment-orders/admin/access
 * Returns admin access for authenticated users
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);

    return NextResponse.json({
      success: true,
      data: {
        isAdmin: isAdmin(userId),
      },
    });
  } catch (error: any) {
    logger.error('[PaymentOrders API] Error in admin access GET:', error);

    const message = error?.message || 'Failed to check admin access';
    const isAuthError =
      message.includes('Authentication') ||
      message.includes('authorization token') ||
      message.includes('No authorization token');

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
