import { NextRequest, NextResponse } from 'next/server';
import ScraperInstanceManager from '@/lib/services/scraper-instance-manager';

import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const instanceManager = ScraperInstanceManager.getInstance();
    const scraperManager = instanceManager.getScraperManager();
    const httpServer = instanceManager.getHttpServer();
    
    if (!scraperManager) {
      return NextResponse.json({ 
        success: false, 
        message: 'Background scraper not running' 
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
      message: 'Background scraper stopped successfully' 
    });
  } catch (error) {
    logger.error('Error stopping background scraper:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
