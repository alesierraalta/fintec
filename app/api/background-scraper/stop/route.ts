import { NextRequest, NextResponse } from 'next/server';

// This would need to be imported from a shared location
// For now, we'll use a simple approach
let scraperManager: any = null;

export async function POST(request: NextRequest) {
  try {
    if (!scraperManager) {
      return NextResponse.json({ 
        success: false, 
        message: 'Background scraper not running' 
      });
    }

    await scraperManager.stop();
    scraperManager = null;

    return NextResponse.json({ 
      success: true, 
      message: 'Background scraper stopped successfully' 
    });
  } catch (error) {
    console.error('Error stopping background scraper:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
