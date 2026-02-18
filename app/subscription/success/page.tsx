'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

function SubscriptionSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isVerifyingDelayActive, setIsVerifyingDelayActive] = useState(() =>
    Boolean(sessionId)
  );
  const error = sessionId ? null : 'Sesión de pago no encontrada';
  const verifying = Boolean(sessionId) && isVerifyingDelayActive;

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    // Give Lemon Squeezy webhook time to process
    const timer = setTimeout(() => {
      setIsVerifyingDelayActive(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Card className="p-8 text-center">
            <div className="mb-4 text-5xl text-destructive">⚠️</div>
            <h1 className="mb-4 text-2xl font-bold">Error</h1>
            <p className="mb-6 text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/pricing')}>
              Volver a Planes
            </Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (verifying) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Card className="p-8 text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <h1 className="mb-2 text-2xl font-bold">Verificando pago...</h1>
            <p className="text-muted-foreground">
              Estamos confirmando tu suscripción
            </p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card className="p-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />

          <h1 className="mb-4 text-3xl font-bold">¡Suscripción Exitosa!</h1>

          <p className="mb-8 text-lg text-muted-foreground">
            Tu pago ha sido procesado exitosamente. Ahora tienes acceso a todas
            las funciones premium.
          </p>

          <div className="space-y-3">
            <Button
              size="lg"
              onClick={() => router.push('/')}
              className="w-full"
            >
              Ir al Dashboard
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/subscription')}
              className="w-full"
            >
              Ver Mi Suscripción
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Recibirás un correo de confirmación con los detalles de tu
            suscripción
          </p>
        </Card>
      </div>
    </MainLayout>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="container mx-auto max-w-2xl px-4 py-16">
            <Card className="p-8 text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
              <h1 className="mb-2 text-2xl font-bold">Cargando...</h1>
            </Card>
          </div>
        </MainLayout>
      }
    >
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
