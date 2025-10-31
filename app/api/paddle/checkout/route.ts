import { NextRequest, NextResponse } from 'next/server';
import { getBaseCheckoutData, getPremiumCheckoutData, getCheckoutDataForTier } from '@/lib/paddle/checkout';
import { supabase } from '@/repositories/supabase/client';

/**
 * API Route para obtener datos de checkout de Paddle
 * 
 * Con Paddle, el checkout se abre desde el cliente usando Paddle.js
 * - El servidor proporciona el price ID y metadata
 * - El cliente llama a Paddle.Checkout.open() con estos datos
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tier, userEmail, userName } = body;

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

    // Initialize user data with fallback from client
    let email = userEmail || '';
    let name = userName || '';

    // Try to get user data from Supabase users table (if it exists)
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (userData && !userError) {
        email = (userData as any).email || email;
        name = (userData as any).name || name;
      } else {
        // Try Supabase Auth as fallback
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
        
        if (authData?.user && !authError) {
          email = authData.user.email || email;
          name = authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || name;
        }
      }
    } catch (dbError: any) {
      // Continue with client-provided data
    }

    // Get checkout data for the tier
    const checkoutData = getCheckoutDataForTier(tier, email, userId);

    return NextResponse.json({
      ...checkoutData,
      // Include user info for prefill (if Paddle.js supports it)
      customer: email ? { email, name } : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to get checkout data',
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
    message: 'Paddle checkout endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
}

