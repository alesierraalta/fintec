'use client';

import { Check, Zap, AlertCircle } from 'lucide-react';
import { TIER_FEATURES, SubscriptionTier } from '@/types/subscription';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePaddleProducts } from '@/hooks/use-paddle-products';
import { Loading } from '@/components/ui/loading';

interface PricingCardsProps {
  currentTier?: SubscriptionTier;
  onSelectTier: (tier: 'base' | 'premium') => void;
  loading?: boolean;
}

export function PricingCards({ currentTier = 'free', onSelectTier, loading }: PricingCardsProps) {
  const { products, loading: productsLoading, error } = usePaddleProducts();

  // Map Paddle products to tiers
  const getTierData = (tier: SubscriptionTier) => {
    // For free tier, always use static data
    if (tier === 'free') {
      return TIER_FEATURES.free;
    }

    // Find matching product from Paddle
    const product = products.find((p) => {
      const name = p.name.toLowerCase();
      if (tier === 'base') {
        return name.includes('base') || name.includes('full');
      }
      if (tier === 'premium') {
        return name.includes('premium') || name.includes('ia');
      }
      return false;
    });

    // If we have a product from Paddle, merge with static features
    if (product && product.prices && product.prices.length > 0) {
      const price = product.prices[0]; // Use first price
      const staticData = TIER_FEATURES[tier];
      const priceAmount = price.unit_price?.amount ? parseInt(price.unit_price.amount) : staticData.price;

      return {
        ...staticData,
        name: product.name,
        price: priceAmount,
        interval: (price.billing_cycle?.interval === 'year' ? 'year' : 'month') as 'month' | 'year',
        // Keep the static features as they are more detailed
        features: staticData.features,
      };
    }

    // Fallback to static data if Paddle data not available
    return TIER_FEATURES[tier];
  };

  const tiers: Array<{ key: SubscriptionTier; data: ReturnType<typeof getTierData> }> = [
    { key: 'free', data: getTierData('free') },
    { key: 'base', data: getTierData('base') },
    { key: 'premium', data: getTierData('premium') },
  ];

  // Show loading state while fetching products
  if (productsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  // Show error state if fetching failed
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Error al cargar los planes. Por favor, intenta de nuevo más tarde.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {tiers.map(({ key, data }) => {
        const isCurrent = currentTier === key;
        const isUpgrade = (
          (currentTier === 'free' && (key === 'base' || key === 'premium')) ||
          (currentTier === 'base' && key === 'premium')
        );

        return (
          <Card
            key={key}
            className={`relative overflow-hidden transition-all ${
              data.highlighted
                ? 'border-primary shadow-lg scale-105'
                : 'border-border'
            }`}
          >
            {data.highlighted && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
                Más Popular
              </div>
            )}

            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{data.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${(data.price / 100).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">/{data.interval === 'month' ? 'mes' : 'año'}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {data.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {key === 'free' ? (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isCurrent}
                >
                  {isCurrent ? 'Plan Actual' : 'Gratis'}
                </Button>
              ) : (
                <Button
                  className={`w-full ${data.highlighted ? 'bg-primary' : ''}`}
                  variant={data.highlighted ? 'primary' : 'outline'}
                  onClick={() => onSelectTier(key as 'base' | 'premium')}
                  disabled={isCurrent || loading}
                >
                  {loading ? (
                    'Procesando...'
                  ) : isCurrent ? (
                    'Plan Actual'
                  ) : isUpgrade ? (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Actualizar
                    </>
                  ) : (
                    'Seleccionar'
                  )}
                </Button>
              )}

              {isCurrent && key !== 'free' && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Administra tu suscripción desde ajustes
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

