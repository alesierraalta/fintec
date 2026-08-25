import { NextResponse, type NextRequest } from 'next/server';
import { withErrorHandling } from '@/lib/api-middleware';
import { successResponse } from '@/lib/api-response';
import { requireAdmin } from '@/lib/admin/guard';
import { getPageVisits, parseVisitsRange } from '@/lib/page-visits/aggregation';

export const dynamic = 'force-dynamic';
const handler = withErrorHandling(async (request: NextRequest) => {
  await requireAdmin();
  const { range } = parseVisitsRange(
    new URL(request.url).searchParams.get('range')
  );
  return NextResponse.json(successResponse(await getPageVisits(range)));
});
export async function GET(request: NextRequest) {
  const response = await handler(request);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
