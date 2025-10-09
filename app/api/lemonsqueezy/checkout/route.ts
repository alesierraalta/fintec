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

    // Obtener email del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generar URL de checkout
    const checkoutUrl = tier === 'base'
      ? getBaseCheckoutUrl(userData.email, userId)
      : getPremiumCheckoutUrl(userData.email, userId);

    return NextResponse.json({
      url: checkoutUrl,
    });
  } catch (error: any) {
    
    return NextResponse.json(
      { error: error?.message || 'Failed to create checkout' },
      { status: 500 }
    );
  }
}


