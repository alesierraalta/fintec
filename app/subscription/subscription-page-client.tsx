'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UsageIndicator } from '@/components/subscription/usage-indicator';
import {
  useSubscription,
  useManageSubscription,
} from '@/hooks/use-subscription';
import { Loading } from '@/components/ui/loading';
import { Crown, Zap, ArrowRight, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TIER_FEATURES } from '@/types/subscription';
import type { SubscriptionStatusPayload } from '@/types/subscription';

interface SubscriptionPageClientProps {
  initialSubscription: SubscriptionStatusPayload;
}

export default function SubscriptionPageClient({
  initialSubscription,
}: SubscriptionPageClientProps) {
  const router = useRouter();
  const {
    tier,
    subscription,
    usageStatus,
    loading,
    canUpgrade,
    isPremium,
    isBase,
    isFree,
  } = useSubscription(initialSubscription);
  const { openPortal, loading: portalLoading } = useManageSubscription();

  if (loading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  const tierInfo = TIER_FEATURES[tier];
  const TierIcon = isPremium ? Crown : isBase ? Zap : null;

  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="mb-2 text-3xl font-bold">Mi Suscripción</h1>
            <p className="text-muted-foreground">
              Administra tu plan y revisa tu uso mensual
            </p>
          </div>

          {/* Current Plan */}
          <Card>
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {TierIcon && (
                    <div
                      className={`rounded-lg p-3 ${isPremium ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}
                    >
                      <TierIcon
                        className={`h-6 w-6 ${isPremium ? 'text-purple-500' : 'text-blue-500'}`}
                      />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">{tierInfo.name}</h2>
                    <p className="text-muted-foreground">
                      {isFree
                        ? 'Plan gratuito'
                        : `$${(tierInfo.price / 100).toFixed(2)}/mes`}
                    </p>
                  </div>
                </div>

                {subscription?.status && (
                  <Badge
                    variant={
                      subscription.status === 'active' ? 'default' : 'outline'
                    }
                  >
                    {subscription.status === 'active'
                      ? 'Activo'
                      : subscription.status}
                  </Badge>
                )}
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="mb-3 font-semibold">
                  Características incluidas:
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tierInfo.features.slice(0, 6).map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-primary">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {canUpgrade && (
                  <Button
                    onClick={() => router.push('/pricing')}
                    className="gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Actualizar Plan
                  </Button>
                )}

                {!isFree && (
                  <Button
                    variant="outline"
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    {portalLoading ? 'Cargando...' : 'Administrar Suscripción'}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Usage Statistics */}
          {usageStatus && (
            <Card>
              <div className="p-6">
                <h2 className="mb-6 text-xl font-bold">Uso Mensual</h2>

                <div className="space-y-6">
                  <UsageIndicator
                    label="Transacciones"
                    current={usageStatus.transactions.current}
                    limit={usageStatus.transactions.limit}
                  />

                  {!isFree && (
                    <>
                      <UsageIndicator
                        label="Respaldos"
                        current={usageStatus.backups.current}
                        limit={usageStatus.backups.limit}
                      />

                      <UsageIndicator
                        label="Exportaciones"
                        current={usageStatus.exports.current}
                        limit={usageStatus.exports.limit}
                      />
                    </>
                  )}

                  {isPremium && (
                    <UsageIndicator
                      label="Solicitudes de IA"
                      current={usageStatus.aiRequests.current}
                      limit={usageStatus.aiRequests.limit}
                    />
                  )}
                </div>

                <p className="mt-6 text-xs text-muted-foreground">
                  El uso se reinicia el primer día de cada mes
                </p>
              </div>
            </Card>
          )}

          {/* Upgrade CTA for Free Users */}
          {isFree && (
            <Card className="border-2 border-primary/50 bg-primary/5">
              <div className="p-6">
                <h3 className="mb-2 text-xl font-bold">¿Listo para más?</h3>
                <p className="mb-4 text-muted-foreground">
                  Desbloquea transacciones ilimitadas, historial completo, y
                  funciones avanzadas
                </p>
                <Button onClick={() => router.push('/pricing')}>
                  Ver Planes
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
