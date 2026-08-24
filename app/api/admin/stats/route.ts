import { NextResponse, type NextRequest } from 'next/server';
import { withErrorHandling } from '@/lib/api-middleware';
import { successResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin/guard';
import { getAdminStats } from '@/lib/admin-stats/service';
import { parseStatsWindow } from '@/lib/admin-stats/types';

export const dynamic = 'force-dynamic';

const handler = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin();
  const { window } = parseStatsWindow(new URL(request.url).searchParams.get('window'));
  return NextResponse.json(successResponse(await getAdminStats(window)));
});

export async function GET(request: NextRequest) {
  const response = await handler(request);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
