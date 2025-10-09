'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { PricingCards } from '@/components/subscription/pricing-cards';
import { useSubscription, useUpgrade } from '@/hooks/use-subscription';
import { Loading } from '@/components/ui/loading';
import { useAuth } from '@/hooks/use-auth';

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { tier, loading: subscriptionLoading } = useSubscription();
  const { upgrade, loading: upgradeLoading } = useUpgrade();

  const handleSelectTier = async (selectedTier: 'base' | 'premium') => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    await upgrade(selectedTier);
  };

  if (subscriptionLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold">Elige tu plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Selecciona el plan perfecto para tus necesidades financieras
          </p>
        </div>

        {/* Pricing Cards */}
        <PricingCards
          currentTier={tier}
          onSelectTier={handleSelectTier}
          loading={upgradeLoading}
        />

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Preguntas Frecuentes</h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">¿Puedo cambiar de plan en cualquier momento?</h3>
              <p className="text-sm text-muted-foreground">
                Sí, puedes actualizar o cambiar tu plan en cualquier momento. Los cambios se aplican inmediatamente
                y se prorratean según el tiempo restante de tu ciclo de facturación.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">¿Qué sucede si cancelo mi suscripción?</h3>
              <p className="text-sm text-muted-foreground">
                Si cancelas, mantendrás acceso a las funciones premium hasta el final de tu período de facturación.
                Después, serás automáticamente cambiado al plan gratuito. No perderás tus datos.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">¿Los datos del plan gratuito están seguros?</h3>
              <p className="text-sm text-muted-foreground">
                Absolutamente. Todos los datos están encriptados y protegidos, independientemente del plan. El plan
                gratuito mantiene 6 meses de historial, mientras que los planes pagos tienen historial ilimitado.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">¿Cómo funcionan las funciones de IA en Premium?</h3>
              <p className="text-sm text-muted-foreground">
                Las funciones de IA analizan tus patrones de gasto para categorizar automáticamente transacciones,
                predecir gastos futuros, detectar anomalías y ofrecer consejos personalizados para optimizar tus finanzas.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Tienes más preguntas? <a href="mailto:support@fintec.com" className="text-primary hover:underline">Contáctanos</a>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

