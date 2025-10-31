import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutDataForTier } from '@/lib/paddle/checkout';
import { validatePriceId } from '@/lib/paddle/validate-prices';
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

    // Validate Price ID before returning checkout data
    // eslint-disable-next-line no-console
    console.log('[Paddle Checkout API] Validating price ID:', {
      priceId: checkoutData.priceId,
      tier,
      userId,
      environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
    });

    const priceValidation = await validatePriceId(checkoutData.priceId);
    
    if (!priceValidation.isValid) {
      // eslint-disable-next-line no-console
      console.error('[Paddle Checkout API] Price ID validation failed:', {
        priceId: checkoutData.priceId,
        error: priceValidation.error,
        exists: priceValidation.exists,
        active: priceValidation.active,
        priceData: priceValidation.priceData,
        tier,
        userId,
      });

      return NextResponse.json(
        {
          error: priceValidation.error || 'Price ID is not valid or active',
          details: `Price ID ${checkoutData.priceId} validation failed. ${priceValidation.exists ? 'Price exists but is not active.' : 'Price not found.'}`,
          priceId: checkoutData.priceId,
        },
        { status: 400 }
      );
    }

    // eslint-disable-next-line no-console
    console.log('[Paddle Checkout API] Price ID validated successfully:', {
      priceId: checkoutData.priceId,
      productId: priceValidation.priceData?.productId,
      status: priceValidation.priceData?.status,
      unitPrice: priceValidation.priceData?.unitPrice,
      tier,
      userId,
    });

    // Validate customData format (Paddle expects flat objects with string/number/boolean values)
    if (checkoutData.customData) {
      const customDataKeys = Object.keys(checkoutData.customData);
      const invalidKeys = customDataKeys.filter(key => {
        const value = checkoutData.customData![key];
        return !['string', 'number', 'boolean'].includes(typeof value);
      });

      if (invalidKeys.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('[Paddle Checkout API] Invalid customData types:', {
          invalidKeys,
          customData: checkoutData.customData,
        });
        // Don't fail, but log warning - Paddle will reject if truly invalid
      }

      // eslint-disable-next-line no-console
      console.log('[Paddle Checkout API] customData structure:', {
        keys: customDataKeys,
        hasUserId: 'user_id' in checkoutData.customData,
      });
    }

    // eslint-disable-next-line no-console
    console.log('[Paddle Checkout API] Returning checkout data:', {
      priceId: checkoutData.priceId,
      hasCustomData: !!checkoutData.customData,
      hasCustomer: !!email,
      successUrl: checkoutData.successUrl,
      cancelUrl: checkoutData.cancelUrl,
    });

    return NextResponse.json({
      ...checkoutData,
      // Include user info for prefill (if Paddle.js supports it)
      customer: email ? { email, name } : undefined,
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[Paddle Checkout API] Unexpected error:', {
      error: error?.message,
      stack: error?.stack,
      body: error?.body,
    });

    return NextResponse.json(
      { 
        error: error?.message || 'Failed to get checkout data',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
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

