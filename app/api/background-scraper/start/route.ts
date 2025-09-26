import { NextRequest, NextResponse } from 'next/server';
import { createServer } from 'http';
import BackgroundScraperManager from '@/lib/services/background-scraper-manager';

let scraperManager: BackgroundScraperManager | null = null;
let httpServer: any = null;

export async function POST(request: NextRequest) {
  try {
    if (scraperManager && scraperManager['isRunning']) {
      return NextResponse.json({ 
        success: true, 
        message: 'Background scraper already running' 
      });
    }

    // Create HTTP server for WebSocket
    if (!httpServer) {
      httpServer = createServer();
      httpServer.listen(3001, () => {
        console.log('WebSocket server listening on port 3001');
      });
    }

    // Create and start scraper manager
    scraperManager = new BackgroundScraperManager(httpServer);
    await scraperManager.start();

    return NextResponse.json({ 
      success: true, 
      message: 'Background scraper started successfully' 
    });
  } catch (error) {
    console.error('Error starting background scraper:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
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
    console.error('Error getting latest rates:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
