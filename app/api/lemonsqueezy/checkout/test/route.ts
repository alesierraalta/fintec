import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify the lemonsqueezy/checkout path is accessible on Vercel
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'LemonSqueezy checkout test endpoint is accessible',
    timestamp: new Date().toISOString(),
    path: '/api/lemonsqueezy/checkout/test',
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'LemonSqueezy checkout POST test endpoint is accessible',
    timestamp: new Date().toISOString(),
    path: '/api/lemonsqueezy/checkout/test',
  });
}


