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
    const { userId, tier, userEmail, userName } = body;

    console.log('[LemonSqueezy Checkout] Request body:', { userId, tier, userEmail, userName });

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

    // Initialize user data with fallback from client
    let email = userEmail || '';
    let name = userName || '';

    // Try to get user data from Supabase users table (if it exists)
    console.log('[LemonSqueezy Checkout] Attempting to fetch user data from Supabase users table...');
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (userData && !userError) {
        console.log('[LemonSqueezy Checkout] User data found in users table');
        email = userData.email || email;
        name = userData.name || name;
      } else {
        console.log('[LemonSqueezy Checkout] User not in users table, trying Supabase Auth...');
        
        // Try Supabase Auth as fallback
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
        
        if (authData?.user && !authError) {
          console.log('[LemonSqueezy Checkout] User data found in Supabase Auth');
          email = authData.user.email || email;
          name = authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || name;
        } else {
          console.log('[LemonSqueezy Checkout] User not found in Supabase Auth, using client data');
        }
      }
    } catch (dbError: any) {
      console.warn('[LemonSqueezy Checkout] Database query failed, using client data:', dbError.message);
      // Continue with client-provided data
    }

    // Validate we have at least an email
    if (!email) {
      console.error('[LemonSqueezy Checkout] No email available for user');
      return NextResponse.json(
        { 
          error: 'User email is required',
          details: 'Could not retrieve user email from database or client'
        },
        { status: 400 }
      );
    }

    console.log('[LemonSqueezy Checkout] Using email:', email);

    // Generar URL de checkout
    console.log('[LemonSqueezy Checkout] Generating checkout URL for tier:', tier);
    const checkoutUrl = tier === 'base'
      ? getBaseCheckoutUrl(email, userId)
      : getPremiumCheckoutUrl(email, userId);

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


