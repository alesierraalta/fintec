import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { currencyService } from '@/lib/services/currency-service';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await getAuthenticatedUser(request);

    const trends = await currencyService.getBinanceTrends();

    return NextResponse.json({
      success: true,
      data: trends || {},
    });
  } catch (error) {
    logger.error('[Trends API] Error in GET:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isAuthError =
      message.includes('No authorization token provided') ||
      message.includes('Authentication failed');

    return NextResponse.json(
      {
        success: false,
        error: isAuthError ? 'Unauthorized: Authentication required' : message,
      },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
