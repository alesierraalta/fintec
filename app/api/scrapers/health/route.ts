/**
 * Scrapers Health Endpoint
 * Returns health status of all scrapers
 */

import { NextResponse } from 'next/server';
import { healthMonitor } from '@/lib/scrapers/health-monitor';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const allStatuses = healthMonitor.getAllHealthStatuses();
    const areAllHealthy = healthMonitor.areAllHealthy();
    const scraperCount = allStatuses.size;

    // Convert Map to object for JSON serialization
    const statusesObject: Record<string, any> = {};
    for (const [name, status] of allStatuses.entries()) {
      statusesObject[name] = {
        ...status,
        lastSuccessTime: status.lastSuccessTime
          ? new Date(status.lastSuccessTime).toISOString()
          : null,
        lastFailureTime: status.lastFailureTime
          ? new Date(status.lastFailureTime).toISOString()
          : null,
      };
    }

    return NextResponse.json({
      healthy: scraperCount > 0 && areAllHealthy,
      timestamp: new Date().toISOString(),
      scraperCount,
      scrapers: statusesObject,
    });
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

