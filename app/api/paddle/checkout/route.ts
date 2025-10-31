import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutDataForTier } from '@/lib/paddle/checkout';
import { validatePriceId } from '@/lib/paddle/validate-prices';
import { supabase } from '@/repositories/supabase/client';
import { paddleLogger } from '@/lib/paddle/logger';
import {
  getUserErrorMessage,
  getLogMessage,
  getErrorCodeFromStatus,
  PaddleErrorCode,
} from '@/lib/paddle/errors';

/**
 * POST /api/paddle/checkout
 * 
 * API endpoint to get checkout data for Paddle subscription checkout.
 * 
 * With Paddle, checkout is opened client-side using Paddle.js:
 * - Server provides validated price ID and metadata
 * - Client calls Paddle.Checkout.open() with this data
 * 
 * Flow:
 * 1. Validates request body (userId, tier)
 * 2. Fetches user data from Supabase (with fallback to client-provided data)
 * 3. Gets checkout data for the selected tier
 * 4. Validates Price ID exists and is active in Paddle
 * 5. Validates customData format
 * 6. Returns checkout data with metadata
 * 
 * @param request - Next.js request object with JSON body
 * @returns NextResponse with checkout data or error
 * 
 * @example
 * POST /api/paddle/checkout
 * Body: { userId: '...', tier: 'base', userEmail: '...', userName: '...' }
 * Returns: { priceId: '...', customData: {...}, successUrl: '...', ... }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, tier, userEmail, userName } = body;

    // Validate required fields
    if (!userId || !tier) {
      paddleLogger.warn('Checkout API', 'Missing required fields', {
        hasUserId: !!userId,
        hasTier: !!tier,
      });
      
      const errorMessage = getUserErrorMessage(PaddleErrorCode.USER_ID_MISSING);
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Validate tier value
    if (tier !== 'base' && tier !== 'premium') {
      paddleLogger.warn('Checkout API', 'Invalid tier provided', { tier });
      
      const errorMessage = getUserErrorMessage(PaddleErrorCode.TIER_INVALID);
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    /**
     * Initialize user data with fallback strategy:
     * 1. Try Supabase users table
     * 2. Try Supabase Auth (fallback)
     * 3. Use client-provided data (final fallback)
     */
    let email = userEmail || '';
    let name = userName || '';

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (userData && !userError) {
        email = (userData as { email?: string; name?: string }).email || email;
        name = (userData as { email?: string; name?: string }).name || name;
        paddleLogger.debug('Checkout API', 'User data fetched from users table', {
          userId,
          hasEmail: !!email,
          hasName: !!name,
        });
      } else {
        // Try Supabase Auth as fallback
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
        
        if (authData?.user && !authError) {
          email = authData.user.email || email;
          name = authData.user.user_metadata?.name || authData.user.user_metadata?.full_name || name;
          paddleLogger.debug('Checkout API', 'User data fetched from Auth', {
            userId,
            hasEmail: !!email,
            hasName: !!name,
          });
        }
      }
    } catch (dbError: unknown) {
      // Continue with client-provided data if database fetch fails
      paddleLogger.warn('Checkout API', 'Failed to fetch user data from database, using client-provided data', {
        userId,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    // Get checkout data for the tier
    const checkoutData = getCheckoutDataForTier(tier, email, userId);

    // Validate environment consistency and API configuration
    const serverEnvironment = process.env.PADDLE_ENVIRONMENT || 'sandbox';
    const paddleApiKey = process.env.PADDLE_API_KEY || '';
    
    paddleLogger.debug('Checkout API', 'Environment configuration check', {
      serverEnvironment,
      hasApiKey: !!paddleApiKey && paddleApiKey.length > 0,
      apiKeyPrefix: paddleApiKey.length > 10 ? `${paddleApiKey.substring(0, 10)}...` : 'not set',
      priceId: checkoutData.priceId,
      tier,
      userId,
    });

    // Validate Price ID before returning checkout data
    // This prevents E-403 errors from invalid or inactive price IDs
    paddleLogger.debug('Checkout API', 'Starting price ID validation', {
      priceId: checkoutData.priceId,
      tier,
      userId,
      environment: serverEnvironment,
    });

    const priceValidation = await validatePriceId(checkoutData.priceId);
    
    if (!priceValidation.isValid) {
      const errorCode = priceValidation.exists
        ? PaddleErrorCode.PRICE_NOT_ACTIVE
        : PaddleErrorCode.PRICE_NOT_FOUND;
      
      const logMessage = getLogMessage(errorCode, {
        priceId: checkoutData.priceId,
        exists: priceValidation.exists,
        active: priceValidation.active,
        status: priceValidation.priceData?.status,
      });
      
      paddleLogger.error('Checkout API', logMessage, {
        priceId: checkoutData.priceId,
        error: priceValidation.error,
        exists: priceValidation.exists,
        active: priceValidation.active,
        priceData: priceValidation.priceData,
        tier,
        userId,
      });

      const userErrorMessage = getUserErrorMessage(errorCode);
      return NextResponse.json(
        {
          error: userErrorMessage,
          details: `Price ID ${checkoutData.priceId} validation failed. ${priceValidation.exists ? 'Price exists but is not active.' : 'Price not found.'}`,
          priceId: checkoutData.priceId,
        },
        { status: 400 }
      );
    }

    paddleLogger.info('Checkout API', 'Price ID validated successfully', {
      priceId: checkoutData.priceId,
      productId: priceValidation.priceData?.productId,
      status: priceValidation.priceData?.status,
      unitPrice: priceValidation.priceData?.unitPrice,
      tier,
      userId,
    });

    /**
     * Validate customData format
     * 
     * Paddle expects flat objects with primitive values only:
     * - string, number, or boolean
     * - No nested objects or arrays
     * 
     * We validate and warn but don't fail, as Paddle will reject if truly invalid.
     */
    if (checkoutData.customData) {
      const customDataKeys = Object.keys(checkoutData.customData);
      const invalidKeys = customDataKeys.filter(key => {
        const value = checkoutData.customData![key];
        return !['string', 'number', 'boolean'].includes(typeof value);
      });

      if (invalidKeys.length > 0) {
        paddleLogger.warn('Checkout API', 'Invalid customData types detected', {
          invalidKeys,
          customData: checkoutData.customData,
        });
        // Don't fail, but log warning - Paddle will reject if truly invalid
      }

      paddleLogger.debug('Checkout API', 'customData structure validated', {
        keys: customDataKeys,
        hasUserId: 'user_id' in checkoutData.customData,
      });
    }

    paddleLogger.info('Checkout API', 'Returning checkout data', {
      priceId: checkoutData.priceId,
      hasCustomData: !!checkoutData.customData,
      hasCustomer: !!email,
      successUrl: checkoutData.successUrl,
      cancelUrl: checkoutData.cancelUrl,
      environment: serverEnvironment,
    });

    return NextResponse.json({
      ...checkoutData,
      // Include user info for prefill (if Paddle.js supports it)
      customer: email ? { email, name } : undefined,
      // Include environment so client can validate it matches
      _metadata: {
        environment: serverEnvironment,
        validatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    paddleLogger.error('Checkout API', 'Unexpected error processing checkout request', {
      error: errorMessage,
      stack: errorStack,
    });

    const userErrorMessage = getUserErrorMessage(PaddleErrorCode.UNKNOWN_ERROR);
    return NextResponse.json(
      { 
        error: userErrorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/paddle/checkout
 * 
 * Health check endpoint for the checkout API.
 * 
 * @param request - Next.js request object
 * @returns NextResponse with health status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'Paddle checkout endpoint is accessible',
    timestamp: new Date().toISOString(),
  });
}

