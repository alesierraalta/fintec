'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { DollarSign, History } from 'lucide-react';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { BCVRates } from '@/components/currency/bcv-rates';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';
import {
  getRateName,
  getExchangeRate,
  type RateSource,
} from '@/lib/rate-display';
import { useAppStore } from '@/lib/store';

export interface AccountsRatesPanelProps {
  bcv: { usd: number; eur: number };
  binance: BinanceRatesSnapshot;
  selectedSource: RateSource;
  onOpenHistory: () => void;
}

// Resolves the user's "auto" preference to either "simple" or "full" based on
// viewport width. 640px is the Tailwind `sm` breakpoint.
const AUTO_BREAKPOINT = 640;
const BINANCE_MODE_STORAGE_KEY = 'accounts-binance-mode';

function resolveMode(
  stored: 'auto' | 'simple' | 'full',
  isMobile: boolean
): 'simple' | 'full' {
  if (stored === 'auto') return isMobile ? 'simple' : 'full';
  return stored;
}

function AccountsRatesPanelImpl({
  bcv,
  binance,
  selectedSource,
  onOpenHistory,
}: AccountsRatesPanelProps) {
  const stored = useAppStore((s) => s.binanceRateMode);
  const setStored = useAppStore((s) => s.setBinanceRateMode);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setViewportWidth(window.innerWidth);
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = viewportWidth !== null && viewportWidth < AUTO_BREAKPOINT;
  const resolved = resolveMode(stored, isMobile);
  const handleModeChange = useCallback(
    (next: 'simple' | 'full') => {
      setStored(next);
      try {
        window.localStorage.setItem(BINANCE_MODE_STORAGE_KEY, next);
      } catch {
        // localStorage may be disabled; the zustand store still survives the session.
      }
    },
    [setStored]
  );

  const usdVes = binance?.rates?.usd_ves ?? 0;
  const selectedValue = getExchangeRate(selectedSource, bcv, {
    usd_ves: usdVes,
  });
  const rateAvailable = selectedValue > 0;

  return (
    <div data-testid="accounts-rates-panel">
      <CollapsibleSection
        title="💱 Tasas de Cambio"
        storageKey="accounts-exchange-rates"
        collapseOnMobile={true}
        defaultExpanded={true}
        badge={
          <span
            data-testid="selected-rate-strip"
            className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success-600"
          >
            <DollarSign className="h-3 w-3" />
            {rateAvailable
              ? `${getRateName(selectedSource)}: ${selectedValue.toFixed(2)} VES`
              : 'Tasa no disponible'}
          </span>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BCVRates />
            <BinanceRatesComponent
              snapshot={binance}
              mode={resolved}
              onModeChange={handleModeChange}
            />
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={onOpenHistory}
              data-testid="rates-history-button"
              className="flex min-h-[44px] w-full items-center justify-center space-x-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-500 transition-all duration-200 hover:scale-105 hover:bg-blue-500/20 sm:px-6 sm:text-base md:w-auto"
            >
              <History className="h-4 w-4" />
              <span className="font-medium">Ver Historial y Calculadora</span>
            </button>
          </div>

          <div className="rounded-2xl border border-border/20 bg-muted/5 p-3 backdrop-blur-sm sm:p-4">
            <div className="text-center text-xs text-muted-foreground sm:text-ios-caption">
              <p className="mb-1 leading-relaxed">
                💡 <strong>BCV:</strong> Tasa oficial del gobierno
                <span className="hidden sm:inline"> · </span>
                <br className="sm:hidden" />
                <strong className="sm:ml-1">Binance:</strong> Precio real del
                mercado digital
              </p>
              <p className="text-ios-footnote">
                ℹ️ Estas tasas te ayudan a ver tus cuentas en diferentes monedas
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

export const AccountsRatesPanel = memo(AccountsRatesPanelImpl);
