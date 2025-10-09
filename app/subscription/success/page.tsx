'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setError('Sesión de pago no encontrada');
      setVerifying(false);
      return;
    }

    // Give Stripe webhook time to process
    const timer = setTimeout(() => {
      setVerifying(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="p-8 text-center">
            <div className="text-destructive text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-4">Error</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
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
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">Verificando pago...</h1>
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
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          
          <h1 className="text-3xl font-bold mb-4">¡Suscripción Exitosa!</h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            Tu pago ha sido procesado exitosamente. Ahora tienes acceso a todas las funciones premium.
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

          <p className="text-xs text-muted-foreground mt-6">
            Recibirás un correo de confirmación con los detalles de tu suscripción
          </p>
        </Card>
      </div>
    </MainLayout>
  );
}

