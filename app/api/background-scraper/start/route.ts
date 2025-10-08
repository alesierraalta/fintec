import { NextRequest, NextResponse } from 'next/server';
import { createServer } from 'http';
import BackgroundScraperManager from '@/lib/services/background-scraper-manager';
import ScraperInstanceManager from '@/lib/services/scraper-instance-manager';

import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const instanceManager = ScraperInstanceManager.getInstance();
    
    if (instanceManager.isRunning()) {
      return NextResponse.json({ 
        success: true, 
        message: 'Background scraper already running' 
      });
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
      message: 'Background scraper started successfully' 
    });
  } catch (error) {
    logger.error('Error starting background scraper:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const instanceManager = ScraperInstanceManager.getInstance();
    const scraperManager = instanceManager.getScraperManager();
    
    if (!scraperManager) {
      return NextResponse.json({ 
        success: false, 
        message: 'Background scraper not initialized' 
      });
    }

    const latestRates = await scraperManager.getLatestRates();
    
    return NextResponse.json({ 
      success: true, 
      data: latestRates 
    });
  } catch (error) {
    logger.error('Error getting latest rates:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
