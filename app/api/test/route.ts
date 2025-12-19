import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // ! Security: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: 'Test API working' });
}

export async function POST(request: NextRequest) {
  // ! Security: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  const body = await request.json();
  return NextResponse.json({ message: 'Test POST working', body });
}

