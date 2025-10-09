import { NextRequest, NextResponse } from 'next/server';
import { predictSpending } from '@/lib/ai/predictions';
import { canUseAI, useResource } from '@/lib/subscriptions/feature-gate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Check if user can use AI
    const check = await canUseAI(userId);
    if (!check.allowed) {
      return NextResponse.json(
        { 
          error: check.reason,
          upgradeRequired: check.upgradeRequired 
        },
        { status: 403 }
      );
    }

    const prediction = await predictSpending(userId);
    
    if (!prediction) {
      return NextResponse.json(
        { error: 'Not enough data to generate predictions' },
        { status: 400 }
      );
    }

    // Increment usage
    await useResource(userId, 'aiRequests');

    return NextResponse.json({ prediction });
  } catch (error: any) {
    console.error('Error in AI predictions:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate predictions' },
      { status: 500 }
    );
  }
}

