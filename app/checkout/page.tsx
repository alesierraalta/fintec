'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, ArrowLeft, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { TIER_FEATURES, type SubscriptionTier } from '@/types/subscription';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
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
      
      const response = await fetch('/api/lemonsqueezy/checkout', {
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
          throw new Error(errorData.error || 'No se pudo crear la sesión de pago');
      }

      const { url } = await response.json();

      if (url) {
        // Redirect to Lemon Squeezy checkout
        window.location.href = url;
      } else {
        throw new Error('No se recibió URL de pago');
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

                {error && (
                  <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg">
                    <p className="text-sm font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleProceedToPayment}
                  disabled={loading}
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
                  Serás redirigido a Lemon Squeezy para completar el pago de forma segura
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
                Procesado por Lemon Squeezy, un procesador de pagos certificado
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
