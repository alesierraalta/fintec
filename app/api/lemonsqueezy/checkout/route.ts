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
        } else {
              }
      }
    } catch (dbError: any) {
        // Continue with client-provided data
    }

    // Validate we have at least an email
    if (!email) {
        return NextResponse.json(
        { 
          error: 'User email is required',
          details: 'Could not retrieve user email from database or client'
        },
        { status: 400 }
      );
    }


    // Generar URL de checkout
    const checkoutUrl = tier === 'base'
      ? getBaseCheckoutUrl(email, userId)
      : getPremiumCheckoutUrl(email, userId);


    return NextResponse.json({
      url: checkoutUrl,
    });
  } catch (error: any) {
    
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


