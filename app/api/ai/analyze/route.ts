import { NextRequest, NextResponse } from 'next/server';
import { detectAnomalies } from '@/lib/ai/anomaly-detection';
import { optimizeBudgets } from '@/lib/ai/budget-optimizer';
import { canUseAI } from '@/lib/subscriptions/feature-gate';
import { incrementUsage } from '@/lib/stripe/subscriptions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'Missing userId or type' },
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

    let result: any = null;

    if (type === 'anomalies') {
      result = await detectAnomalies(userId);
    } else if (type === 'budget-optimization') {
      result = await optimizeBudgets(userId);
    } else {
      return NextResponse.json(
        { error: 'Invalid analysis type. Use "anomalies" or "budget-optimization"' },
        { status: 400 }
      );
    }

    // Increment usage
    await incrementUsage(userId, 'aiRequests');

    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to perform analysis' },
      { status: 500 }
    );
  }
}

