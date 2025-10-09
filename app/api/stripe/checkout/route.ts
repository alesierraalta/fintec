import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession } from '@/lib/stripe/checkout';
import { supabase } from '@/repositories/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tier } = body;

    if (!userId || !tier) {
      return NextResponse.json(
        { error: 'Missing userId or tier' },
        { status: 400 }
      );
    }

    if (tier !== 'base' && tier !== 'premium') {
      return NextResponse.json(
        { error: 'Invalid tier. Must be "base" or "premium"' },
        { status: 400 }
      );
    }

    // Get user email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create checkout session
    const session = await createCheckoutSession({
      userId,
      userEmail: userData.email,
      tier,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

