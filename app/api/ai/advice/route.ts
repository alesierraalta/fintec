import { NextRequest, NextResponse } from 'next/server';
import { getFinancialAdvice } from '@/lib/ai/advisor';
import { canUseAI } from '@/lib/subscriptions/feature-gate';
import { incrementUsage } from '@/lib/lemonsqueezy/subscriptions';

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

    const advice = await getFinancialAdvice(userId);
    
    if (!advice) {
      return NextResponse.json(
        { error: 'Not enough data to generate advice' },
        { status: 400 }
      );
    }

    // Increment usage
    await incrementUsage(userId, 'aiRequests');

    return NextResponse.json({ advice });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate advice' },
      { status: 500 }
    );
  }
}

