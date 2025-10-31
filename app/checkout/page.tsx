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

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { paddle, isReady: isPaddleReady, isLoading: isPaddleLoading, error: paddleError } = usePaddle();
  const [tier, setTier] = useState<'base' | 'premium' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tierParam = searchParams.get('tier') as 'base' | 'premium' | null;
    
    if (!tierParam || (tierParam !== 'base' && tierParam !== 'premium')) {
      setError('Plan no válido');
      return;
    }

    if (!user?.id) {
      // Redirect to login with return URL
      router.push(`/auth/login?returnTo=/checkout?tier=${tierParam}`);
      return;
    }

    setTier(tierParam);
  }, [searchParams, user, router]);

  const handleProceedToPayment = async () => {
    if (!user?.id || !tier) {
      setError('Usuario o plan no válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      
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
        const errorMessage = errorData.error || 'No se pudo obtener datos de checkout';
        const errorDetails = errorData.details || '';
        
        // Log error for debugging
        console.error('[Paddle Checkout] API error:', {
          status: response.status,
          error: errorMessage,
          details: errorDetails,
        });

        throw new Error(errorMessage + (errorDetails ? `: ${errorDetails}` : ''));
      }

      const checkoutData = await response.json();

      // Verificar que Paddle esté inicializado y listo
      if (!isPaddleReady || !paddle) {
        throw new Error('Paddle.js no está inicializado. Por favor espera un momento y vuelve a intentar.');
      }

      // Validate that we have required data
      if (!checkoutData.priceId) {
        throw new Error('Price ID no está disponible en la respuesta del servidor.');
      }

      // Validate environment match if provided by server
      if (checkoutData._metadata?.environment) {
        const clientEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';
        const serverEnvironment = checkoutData._metadata.environment;
        
        if (clientEnvironment !== serverEnvironment) {
          // eslint-disable-next-line no-console
          console.error('[Paddle Checkout] Environment mismatch:', {
            clientEnvironment,
            serverEnvironment,
            priceId: checkoutData.priceId,
          });
          
          throw new Error(
            `Error de configuración: El entorno del cliente (${clientEnvironment}) no coincide con el del servidor (${serverEnvironment}). ` +
            'Esto puede causar errores E-403. Por favor contacta al soporte.'
          );
        }
        
        // eslint-disable-next-line no-console
        console.log('[Paddle Checkout] Environment validated:', {
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
      console.log('[Paddle Checkout] Opening checkout:', {
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
        throw new Error('No items provided for checkout');
      }

      if (!checkoutPayload.items[0]?.priceId) {
        throw new Error('Price ID is missing from checkout items');
      }

      // Abrir checkout usando la instancia de Paddle del hook
      try {
        paddle.Checkout.open(checkoutPayload);
        
        // Log successful checkout opening
        console.log('[Paddle Checkout] Checkout opened successfully');
        
        // Don't set loading to false here - checkout is a modal that stays open
      } catch (paddleError: any) {
        // Enhanced error logging
        console.error('[Paddle Checkout] Error opening checkout:', {
          error: paddleError,
          message: paddleError?.message,
          stack: paddleError?.stack,
          priceId: checkoutData.priceId,
          payload: {
            itemCount: checkoutPayload.items.length,
            hasCustomer: !!checkoutPayload.customer,
            hasCustomData: !!checkoutPayload.customData,
            hasSettings: !!checkoutPayload.settings,
          },
        });

        // Provide more specific error messages
        let errorMessage = 'Error al abrir el checkout de Paddle.';
        
        // Handle specific Paddle error codes
        if (paddleError?.code === 'E-403' || paddleError?.message?.includes('E-403') || paddleError?.message?.includes('403')) {
          errorMessage = 
            'Error de autenticación (E-403). Esto generalmente ocurre cuando:\n' +
            '1. El Price ID no pertenece al Vendor ID configurado\n' +
            '2. Hay un mismatch entre los entornos sandbox y production\n' +
            '3. El Vendor ID no tiene permisos para acceder al Price ID\n\n' +
            'Por favor verifica la configuración o contacta al soporte.';
          
          // eslint-disable-next-line no-console
          console.error('[Paddle Checkout] E-403 Error details:', {
            priceId: checkoutData.priceId,
            clientEnvironment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox',
            serverEnvironment: checkoutData._metadata?.environment,
            hasVendorId: !!process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID,
            paddleError: paddleError,
          });
        } else if (paddleError?.message?.includes('price')) {
          errorMessage = 'Error: Price ID inválido. Por favor contacta al soporte.';
        } else if (paddleError?.message?.includes('network') || paddleError?.code === 'NETWORK_ERROR') {
          errorMessage = 'Error de conexión. Por favor verifica tu conexión a internet e intenta de nuevo.';
        } else if (paddleError?.message) {
          errorMessage = `Error: ${paddleError.message}`;
        } else {
          errorMessage = 'Error al abrir el checkout. Por favor verifica la configuración o intenta de nuevo.';
        }

        throw new Error(errorMessage);
      }
    } catch (error: any) {
      setError(error.message || 'Error al procesar el pago');
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
