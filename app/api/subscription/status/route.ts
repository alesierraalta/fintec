import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionByUserId, getUserTier, getUserUsage } from '@/lib/paddle/subscriptions';
import { TIER_LIMITS } from '@/types/subscription';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Get subscription info
    const subscription = await getSubscriptionByUserId(userId);
    const tier = await getUserTier(userId);
    const usage = await getUserUsage(userId);

    // Calculate usage percentages
    const limits = TIER_LIMITS[tier];
    const usageStatus = {
      transactions: {
        current: usage?.transactionCount || 0,
        limit: limits.transactions,
        percentage: limits.transactions === 'unlimited' 
          ? 0 
          : Math.round(((usage?.transactionCount || 0) / limits.transactions) * 100),
      },
      backups: {
        current: usage?.backupCount || 0,
        limit: limits.backups,
        percentage: limits.backups === 'unlimited' 
          ? 0 
          : Math.round(((usage?.backupCount || 0) / limits.backups) * 100),
      },
      exports: {
        current: usage?.exportCount || 0,
        limit: limits.exports,
        percentage: limits.exports === 'unlimited'
          ? 0
          : Math.round(((usage?.exportCount || 0) / limits.exports) * 100),
      },
      aiRequests: {
        current: usage?.aiRequests || 0,
        limit: limits.aiRequests,
        percentage: limits.aiRequests === 'unlimited'
          ? 0
          : Math.round(((usage?.aiRequests || 0) / limits.aiRequests) * 100),
      },
    };

    return NextResponse.json({
      subscription,
      tier,
      usage,
      usageStatus,
      limits,
    });
  } catch (error: any) {
    
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}

