import { NextRequest, NextResponse } from 'next/server';
import ScraperInstanceManager from '@/lib/services/scraper-instance-manager';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isAdmin } from '@/lib/payment-orders/admin-utils';

import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);

    if (!isAdmin(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Admin access required',
        },
        { status: 403 }
      );
    }

    const instanceManager = ScraperInstanceManager.getInstance();
    const scraperManager = instanceManager.getScraperManager();
    const httpServer = instanceManager.getHttpServer();

    if (!scraperManager) {
      return NextResponse.json({
        success: false,
        message: 'Background scraper not running',
      });
    }

    await scraperManager.stop();

    // Close HTTP server if exists
    if (httpServer) {
      httpServer.close();
    }

    // Clear from singleton
    instanceManager.clearScraperManager();

    return NextResponse.json({
      success: true,
      message: 'Background scraper stopped successfully',
    });
  } catch (error) {
    logger.error('Error stopping background scraper:', error);
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
