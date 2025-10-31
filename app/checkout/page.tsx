'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, ArrowLeft, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { TIER_FEATURES, type SubscriptionTier } from '@/types/subscription';
import { usePaddle } from '@/hooks/use-paddle';
import { paddleLogger } from '@/lib/paddle/logger';
import {
  getUserErrorMessage,
  getErrorCodeFromPaddleError,
  PaddleErrorCode,
} from '@/lib/paddle/errors';

/**
 * Main checkout page content component
 * 
 * Handles the checkout flow for subscription plans:
 * - Validates tier parameter from URL
 * - Ensures user is authenticated
 * - Fetches checkout data from API
 * - Opens Paddle checkout modal
 * 
 * @component
 */
function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { paddle, isReady: isPaddleReady, isLoading: isPaddleLoading, error: paddleError } = usePaddle();
  const [tier, setTier] = useState<'base' | 'premium' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate tier parameter and user authentication
   * 
   * Validates that:
   * - Tier parameter is valid ('base' or 'premium')
   * - User is authenticated
   * Redirects to login if user is not authenticated.
   */
  useEffect(() => {
    const tierParam = searchParams.get('tier') as 'base' | 'premium' | null;
    
    if (!tierParam || (tierParam !== 'base' && tierParam !== 'premium')) {
      const errorMessage = getUserErrorMessage(PaddleErrorCode.TIER_INVALID);
      setError(errorMessage);
      paddleLogger.warn('Checkout Page', 'Invalid tier parameter', { tierParam });
      return;
    }

    if (!user?.id) {
      // Redirect to login with return URL to preserve tier selection
      const returnUrl = `/checkout?tier=${tierParam}`;
      paddleLogger.debug('Checkout Page', 'User not authenticated, redirecting to login', {
        returnUrl,
        tier: tierParam,
      });
      router.push(`/auth/login?returnTo=${encodeURIComponent(returnUrl)}`);
      return;
    }

    paddleLogger.debug('Checkout Page', 'Checkout initialized', {
      tier: tierParam,
      userId: user.id,
    });
    setTier(tierParam);
  }, [searchParams, user, router]);

  /**
   * Handle checkout initiation
   * 
   * Fetches checkout data from API and opens Paddle checkout modal.
   * Handles errors with user-friendly messages in Spanish.
   * 
   * @throws Error if checkout data cannot be fetched or checkout cannot be opened
   */
  const handleProceedToPayment = async (): Promise<void> => {
    if (!user?.id || !tier) {
      const errorMessage = getUserErrorMessage(PaddleErrorCode.USER_ID_MISSING);
      setError(errorMessage);
      paddleLogger.warn('Checkout Page', 'Missing required data for checkout', {
        hasUserId: !!user?.id,
        hasTier: !!tier,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      paddleLogger.debug('Checkout Page', 'Fetching checkout data', {
        userId: user.id,
        tier,
        userEmail: user.email,
      });

      const response = await fetch('/api/paddle/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          tier,
          userEmail: user.email,
          userName: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || getUserErrorMessage(PaddleErrorCode.API_ERROR);
        const errorDetails = errorData.details || '';
        
        paddleLogger.error('Checkout Page', 'API request failed', {
          status: response.status,
          error: errorMessage,
          details: errorDetails,
          tier,
          userId: user.id,
        });

        throw new Error(errorMessage + (errorDetails ? `: ${errorDetails}` : ''));
      }

      const checkoutData = await response.json();

      // Verify Paddle is initialized and ready
      if (!isPaddleReady || !paddle) {
        const errorMessage = getUserErrorMessage(PaddleErrorCode.PADDLE_NOT_INITIALIZED);
        paddleLogger.error('Checkout Page', 'Paddle not initialized when attempting checkout', {
          isPaddleReady,
          hasPaddle: !!paddle,
        });
        throw new Error(errorMessage);
      }

      // Validate that we have required data
      if (!checkoutData.priceId) {
        const errorMessage = getUserErrorMessage(PaddleErrorCode.PRICE_ID_INVALID);
        paddleLogger.error('Checkout Page', 'Price ID missing from checkout data', {
          checkoutDataKeys: Object.keys(checkoutData),
        });
        throw new Error(errorMessage);
      }

      // Validate environment match if provided by server
      // This prevents E-403 errors from environment mismatches
      if (checkoutData._metadata?.environment) {
        const clientEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';
        const serverEnvironment = checkoutData._metadata.environment;
        
        if (clientEnvironment !== serverEnvironment) {
          paddleLogger.error('Checkout Page', 'Environment mismatch detected', {
            clientEnvironment,
            serverEnvironment,
            priceId: checkoutData.priceId,
          });
          
          const errorMessage = getUserErrorMessage(PaddleErrorCode.ENVIRONMENT_MISMATCH, {
            clientEnvironment,
            serverEnvironment,
          });
          throw new Error(errorMessage);
        }
        
        paddleLogger.debug('Checkout Page', 'Environment validated successfully', {
          environment: clientEnvironment,
          priceId: checkoutData.priceId,
        });
      }

      // Prepare checkout payload
      const checkoutPayload = {
        items: [{ priceId: checkoutData.priceId, quantity: 1 }],
        ...(checkoutData.customer && { customer: checkoutData.customer }),
        ...(checkoutData.customData && { customData: checkoutData.customData }),
        settings: {
          ...(checkoutData.successUrl && { successUrl: checkoutData.successUrl }),
          ...(checkoutData.cancelUrl && { cancelUrl: checkoutData.cancelUrl }),
          allowDisplayNameOverwrite: true,
          allowMarketingConsent: false,
        },
      };

      // Log checkout attempt (without sensitive data)
      paddleLogger.info('Checkout Page', 'Opening checkout', {
        priceId: checkoutData.priceId,
        hasCustomer: !!checkoutData.customer,
        hasCustomData: !!checkoutData.customData,
        customDataKeys: checkoutData.customData ? Object.keys(checkoutData.customData) : [],
        successUrl: checkoutData.successUrl,
        cancelUrl: checkoutData.cancelUrl,
        itemCount: checkoutPayload.items.length,
      });

      // Validate checkout payload structure before opening
      if (!checkoutPayload.items || checkoutPayload.items.length === 0) {
        const errorMessage = getUserErrorMessage(PaddleErrorCode.PRICE_ID_INVALID);
        paddleLogger.error('Checkout Page', 'No items in checkout payload');
        throw new Error(errorMessage);
      }

      if (!checkoutPayload.items[0]?.priceId) {
        const errorMessage = getUserErrorMessage(PaddleErrorCode.PRICE_ID_INVALID);
        paddleLogger.error('Checkout Page', 'Price ID missing from checkout items');
        throw new Error(errorMessage);
      }

      // Open checkout using Paddle instance from hook
      try {
        paddle.Checkout.open(checkoutPayload);
        
        paddleLogger.info('Checkout Page', 'Checkout opened successfully', {
          priceId: checkoutData.priceId,
        });
        
        // Don't set loading to false here - checkout is a modal that stays open
      } catch (paddleError: unknown) {
        // Determine error code from Paddle error
        const errorCode = getErrorCodeFromPaddleError(paddleError);
        
        // Enhanced error logging with structured data
        paddleLogger.error('Checkout Page', 'Failed to open checkout', {
          errorCode,
          error: paddleError,
          message: paddleError && typeof paddleError === 'object' && 'message' in paddleError
            ? String(paddleError.message)
            : String(paddleError),
          priceId: checkoutData.priceId,
          payload: {
            itemCount: checkoutPayload.items.length,
            hasCustomer: !!checkoutPayload.customer,
            hasCustomData: !!checkoutPayload.customData,
            hasSettings: !!checkoutPayload.settings,
          },
          clientEnvironment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox',
          serverEnvironment: checkoutData._metadata?.environment,
        });

        // Get user-friendly error message (Spanish)
        const errorMessage = getUserErrorMessage(errorCode, {
          priceId: checkoutData.priceId,
          clientEnvironment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox',
          serverEnvironment: checkoutData._metadata?.environment,
        });

        throw new Error(errorMessage);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : getUserErrorMessage(PaddleErrorCode.UNKNOWN_ERROR);
      
      paddleLogger.error('Checkout Page', 'Checkout process failed', {
        error: error instanceof Error ? error.message : String(error),
        tier,
        userId: user?.id,
      });
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (error && !tier) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="p-8 text-center">
            <div className="text-destructive text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-4">Error</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push('/pricing')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Planes
            </Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!tier || !user) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">Cargando...</h1>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const tierInfo = TIER_FEATURES[tier];
  const priceFormatted = `$${(tierInfo.price / 100).toFixed(2)}`;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/pricing')}
          className="mb-6"
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Planes
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Details */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-6">Resumen del Plan</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-3xl font-bold">{tierInfo.name}</h3>
                  <div className="text-right">
                    <span className="text-3xl font-bold">{priceFormatted}</span>
                    <span className="text-muted-foreground">/{tierInfo.interval === 'month' ? 'mes' : 'año'}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tierInfo.currency} • Facturación {tierInfo.interval === 'month' ? 'mensual' : 'anual'}
                </p>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4">Características incluidas:</h4>
                <ul className="space-y-3">
                  {tierInfo.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t pt-6">
                <p className="text-xs text-muted-foreground">
                  💡 Puedes cancelar en cualquier momento. No hay compromisos a largo plazo.
                </p>
              </div>
            </div>
          </Card>

          {/* Payment Action */}
          <div className="space-y-6">
            <Card className="p-8">
              <h2 className="text-2xl font-bold mb-6">Información de Pago</h2>
              
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Usuario:</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Total a pagar:</p>
                  <p className="text-2xl font-bold">{priceFormatted} {tierInfo.currency}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se cobrará {tierInfo.interval === 'month' ? 'mensualmente' : 'anualmente'}
                  </p>
                </div>

                {paddleError && (
                  <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg mb-4">
                    <p className="text-sm font-medium">Error de inicialización</p>
                    <p className="text-sm">{paddleError}</p>
                  </div>
                )}

                {error && (
                  <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg mb-4">
                    <p className="text-sm font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {isPaddleLoading && (
                  <div className="bg-muted p-4 rounded-lg mb-4 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Inicializando sistema de pagos...</p>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleProceedToPayment}
                  disabled={loading || !isPaddleReady || isPaddleLoading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Proceder al Pago
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Serás redirigido a Paddle para completar el pago de forma segura
                </p>
              </div>
            </Card>

            {/* Security badges */}
            <Card className="p-6">
              <h3 className="font-semibold mb-3 text-sm">Pago seguro</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <span>SSL Encriptado</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <span>PCI Compliant</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Procesado por Paddle, un procesador de pagos certificado
              </p>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">Cargando checkout...</h1>
          </Card>
        </div>
      </MainLayout>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
