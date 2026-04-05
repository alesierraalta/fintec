'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { CheckoutBinance } from '@/components/payment-orders/CheckoutBinance';
import { PricingCards } from '@/components/subscription/pricing-cards';
import { useSubscription } from '@/hooks/use-subscription';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  TIER_FEATURES,
  type SubscriptionStatusPayload,
  type SubscriptionTier,
} from '@/types/subscription';

interface PricingPageClientProps {
  initialSubscription: SubscriptionStatusPayload | null;
}

export default function PricingPageClient({
  initialSubscription,
}: PricingPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedManualTier, setSelectedManualTier] = useState<Exclude<
    SubscriptionTier,
    'free'
  > | null>(null);
  const { tier, loading: subscriptionLoading } =
    useSubscription(initialSubscription);

  const handleSelectTier = async (selectedTier: 'base' | 'premium') => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setSelectedManualTier(selectedTier);
  };

  const selectedTierInfo = useMemo(
    () => (selectedManualTier ? TIER_FEATURES[selectedManualTier] : null),
    [selectedManualTier]
  );

  if (subscriptionLoading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto max-w-7xl px-4 pb-32 pt-8">
        {/* Header */}
        <div className="mb-12 space-y-4 text-center">
          <h1 className="text-4xl font-bold">Elige tu plan</h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Selecciona el plan perfecto para tus necesidades financieras
          </p>
        </div>

        {/* Pricing Cards */}
        <PricingCards
          currentTier={tier}
          onSelectTier={handleSelectTier}
          loading={false}
        />

        {selectedTierInfo && (
          <section className="mx-auto mt-10 max-w-4xl space-y-4 rounded-3xl border border-emerald-500/20 bg-card p-6 shadow-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Checkout manual disponible
                </p>
                <h2 className="text-2xl font-bold">
                  Pagá {selectedTierInfo.name} con Binance Pay
                </h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Este flujo manual preserva el monto exacto solicitado para tu
                  plan y confirma la orden apenas detectamos la conciliación en
                  tiempo real.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedManualTier(null)}
              >
                Cancelar checkout
              </Button>
            </div>

            <CheckoutBinance
              amount={(selectedTierInfo.price / 100).toFixed(2)}
              serviceName={`${selectedTierInfo.name} mensual`}
            />
          </section>
        )}

        {/* FAQ Section */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Preguntas Frecuentes
          </h2>

          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">
                ¿Puedo cambiar de plan en cualquier momento?
              </h3>
              <p className="text-sm text-muted-foreground">
                Sí, puedes actualizar o cambiar tu plan en cualquier momento.
                Los cambios se aplican inmediatamente y se prorratean según el
                tiempo restante de tu ciclo de facturación.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">
                ¿Qué sucede si cancelo mi suscripción?
              </h3>
              <p className="text-sm text-muted-foreground">
                Si cancelas, mantendrás acceso a las funciones premium hasta el
                final de tu período de facturación. Después, serás
                automáticamente cambiado al plan gratuito. No perderás tus
                datos.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">
                ¿Los datos del plan gratuito están seguros?
              </h3>
              <p className="text-sm text-muted-foreground">
                Absolutamente. Todos los datos están encriptados y protegidos,
                independientemente del plan. El plan gratuito mantiene 6 meses
                de historial, mientras que los planes pagos tienen historial
                ilimitado.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">
                ¿Cómo funcionan las funciones de IA en Premium?
              </h3>
              <p className="text-sm text-muted-foreground">
                Las funciones de IA analizan tus patrones de gasto para
                categorizar automáticamente transacciones, predecir gastos
                futuros, detectar anomalías y ofrecer consejos personalizados
                para optimizar tus finanzas.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Tienes más preguntas?{' '}
            <a
              href="mailto:support@fintec.com"
              className="text-primary hover:underline"
            >
              Contáctanos
            </a>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
