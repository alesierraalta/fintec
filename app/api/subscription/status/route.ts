import { NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { getSubscriptionStatusPayload } from '@/lib/supabase/subscriptions';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  try {
    const payload = await getSubscriptionStatusPayload(userId);

    // Log tier detection for debugging (especially for premium users)
    logger.info(`Subscription status: user ${userId}, tier: ${payload.tier}`, {
      detectedTier: payload.tier,
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    logger.error('Failed to fetch subscription status', { userId, error });
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
