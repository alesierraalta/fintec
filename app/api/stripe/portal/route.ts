import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe/checkout';
import { supabase } from '@/repositories/supabase/client';

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

    // Get user's Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !userData || !userData.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this user' },
        { status: 404 }
      );
    }

    // Create portal session
    const session = await createPortalSession(userData.stripe_customer_id);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error: any) {
    
    return NextResponse.json(
      { error: error?.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

