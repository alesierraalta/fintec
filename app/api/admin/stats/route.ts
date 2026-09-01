import { NextResponse, type NextRequest } from 'next/server';
import { withErrorHandling } from '@/lib/api-middleware';
import { successResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin/guard';
import { getAdminStats, getAdminStatsDebug } from '@/lib/admin-stats/service';
import { parseStatsWindow } from '@/lib/admin-stats/types';

export const dynamic = 'force-dynamic';

const handler = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin();
  const url = new URL(request.url);
  const { window } = parseStatsWindow(url.searchParams.get('window'));
  const stats = await getAdminStats(window);
  if (url.searchParams.get('raw') === '1') {
    const debug = await getAdminStatsDebug(window);
    return NextResponse.json(successResponse({ ...stats, _debug: debug }));
  }
  return NextResponse.json(successResponse(stats));
});

export async function GET(request: NextRequest) {
  const response = await handler(request);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
