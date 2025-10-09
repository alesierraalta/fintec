import { NextRequest, NextResponse } from 'next/server';
import { categorizeTransaction, batchCategorizeTransactions } from '@/lib/ai/categorization';
import { canUseAI } from '@/lib/subscriptions/feature-gate';
import { incrementUsage } from '@/lib/stripe/subscriptions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, description, amount, merchantInfo, batch } = body;

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

    // Batch processing
    if (batch && Array.isArray(batch)) {
      const results = await batchCategorizeTransactions(userId, batch);
      
      // Increment usage for each transaction
      for (let i = 0; i < batch.length; i++) {
        await incrementUsage(userId, 'aiRequests');
      }

      return NextResponse.json({
        results: Array.from(results.entries()).map(([id, suggestion]) => ({
          transactionId: id,
          ...suggestion,
        })),
      });
    }

    // Single transaction
    if (!description || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing description or amount' },
        { status: 400 }
      );
    }

    const suggestion = await categorizeTransaction(userId, description, amount, merchantInfo);
    
    // Increment usage
    await incrementUsage(userId, 'aiRequests');

    return NextResponse.json({ suggestion });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to categorize transaction' },
      { status: 500 }
    );
  }
}

