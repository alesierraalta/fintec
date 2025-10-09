import { NextRequest, NextResponse } from 'next/server';
import { getBaseCheckoutUrl, getPremiumCheckoutUrl } from '@/lib/lemonsqueezy/checkout';
import { supabase } from '@/repositories/supabase/client';

/**
 * API Route para obtener la URL de checkout de LemonSqueezy
 * 
 * Con LemonSqueezy es súper simple:
 * - No necesitas crear sesión server-side
 * - Solo generas una URL y rediriges al usuario
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[LemonSqueezy Checkout] POST request received');
    
    const body = await request.json();
    const { userId, tier } = body;

    console.log('[LemonSqueezy Checkout] Request body:', { userId, tier });

    if (!userId || !tier) {
      console.error('[LemonSqueezy Checkout] Missing userId or tier');
      return NextResponse.json(
        { error: 'Missing userId or tier' },
        { status: 400 }
      );
    }

    if (tier !== 'base' && tier !== 'premium') {
      console.error('[LemonSqueezy Checkout] Invalid tier:', tier);
      return NextResponse.json(
        { error: 'Invalid tier. Must be "base" or "premium"' },
        { status: 400 }
      );
    }

    // Obtener email del usuario
    console.log('[LemonSqueezy Checkout] Fetching user data from Supabase...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[LemonSqueezy Checkout] Supabase error:', userError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch user data',
          details: userError.message 
        },
        { status: 500 }
      );
    }

    if (!userData) {
      console.error('[LemonSqueezy Checkout] User not found:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[LemonSqueezy Checkout] User data fetched:', { email: userData.email });

    // Generar URL de checkout
    console.log('[LemonSqueezy Checkout] Generating checkout URL for tier:', tier);
    const checkoutUrl = tier === 'base'
      ? getBaseCheckoutUrl(userData.email, userId)
      : getPremiumCheckoutUrl(userData.email, userId);

    console.log('[LemonSqueezy Checkout] Checkout URL generated successfully');

    return NextResponse.json({
      url: checkoutUrl,
    });
  } catch (error: any) {
    console.error('[LemonSqueezy Checkout] Unexpected error:', {
      message: error?.message,
      stack: error?.stack,
      error
    });
    
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to create checkout',
        details: error?.stack
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'LemonSqueezy checkout endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
}


