import { NextRequest, NextResponse } from 'next/server';
import { createServer } from 'http';
import BackgroundScraperManager from '@/lib/services/background-scraper-manager';
import ScraperInstanceManager from '@/lib/services/scraper-instance-manager';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import { isBackendUnifiedScraperEnabled } from '@/lib/backend/feature-flags';

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

    if (instanceManager.isRunning()) {
      return NextResponse.json({
        success: true,
        message: 'Background scraper already running',
      });
    }

    if (!isBackendUnifiedScraperEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Background scraper rollout is disabled by BACKEND_UNIFIED_SCRAPER',
        },
        { status: 503 }
      );
    }

    // Create HTTP server for WebSocket
    const httpServer = createServer();
    httpServer.listen(3001, () => {
      logger.info('WebSocket server listening on port 3001');
    });

    // Create and start scraper manager
    const scraperManager = new BackgroundScraperManager(httpServer);
    await scraperManager.start();

    // Store in singleton
    instanceManager.setScraperManager(scraperManager, httpServer);

    return NextResponse.json({
      success: true,
      message: 'Background scraper started successfully',
    });
  } catch (error) {
    logger.error('Error starting background scraper:', error);
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

export async function GET() {
  try {
    const instanceManager = ScraperInstanceManager.getInstance();
    const scraperManager = instanceManager.getScraperManager();

    if (!scraperManager) {
      return NextResponse.json({
        success: false,
        message: 'Background scraper not initialized',
      });
    }

    const latestRates = await scraperManager.getLatestRates();

    return NextResponse.json({
      success: true,
      data: latestRates,
    });
  } catch (error) {
    logger.error('Error getting latest rates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
