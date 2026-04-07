'use client';

import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useBinanceRates } from '@/hooks/use-binance-rates';

function RatesCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl">
      <div className="mb-4 h-4 w-36 rounded bg-muted/30" />
      <div className="h-8 w-28 rounded bg-muted/30" />
    </div>
  );
}

// Lazy-load rate components to reduce initial bundle
const BCVRates = lazy(() =>
  import('@/components/currency/bcv-rates').then((mod) => ({
    default: mod.BCVRates,
  }))
);

const BinanceRatesComponent = lazy(() =>
  import('@/components/currency/binance-rates').then((mod) => ({
    default: mod.BinanceRatesComponent,
  }))
);

/**
 * Live rates section with lazy loading via IntersectionObserver.
 * Rate components are only loaded when the section scrolls into view.
 */
export function LiveRatesSection() {
  const [shouldLoadLiveRates, setShouldLoadLiveRates] = useState(false);
  const liveRatesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldLoadLiveRates) return;

    const section = liveRatesRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      setShouldLoadLiveRates(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setShouldLoadLiveRates(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '300px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [shouldLoadLiveRates]);

  return (
    <section id="tasas-en-vivo" className="px-4 pb-16 sm:px-6 lg:px-8">
      <div ref={liveRatesRef} className="mx-auto max-w-7xl scroll-mt-28">
        <div className="rounded-3xl border border-border/20 bg-card/50 p-6 shadow-2xl backdrop-blur-sm sm:p-8 lg:p-10">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              Tasas en Vivo
            </h2>
            <p className="text-muted-foreground">
              Datos actualizados en tiempo real
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 xl:gap-10">
            {shouldLoadLiveRates ? (
              <Suspense
                fallback={
                  <>
                    <RatesCardSkeleton />
                    <RatesCardSkeleton />
                  </>
                }
              >
                <BCVRates />
                <BinanceRatesComponentWrapper />
              </Suspense>
            ) : (
              <>
                <RatesCardSkeleton />
                <RatesCardSkeleton />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Wrapper that fetches Binance rates and passes them to the lazy-loaded component.
 */
function BinanceRatesComponentWrapper() {
  const binanceRatesState = useBinanceRates({ enabled: true });

  if (binanceRatesState.loading) {
    return <RatesCardSkeleton />;
  }

  return <BinanceRatesComponent snapshot={binanceRatesState} />;
}
