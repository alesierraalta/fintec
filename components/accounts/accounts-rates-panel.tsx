'use client';

import Link from 'next/link';
import { memo } from 'react';
import { ChevronDown, DollarSign, History } from 'lucide-react';
import { BCVRates } from '@/components/currency/bcv-rates';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';
import {
  getRateName,
  getExchangeRate,
  type RateSource,
} from '@/lib/rate-display';

export interface AccountsRatesPanelProps {
  bcv: { usd: number; eur: number };
  binance: BinanceRatesSnapshot;
  selectedSource: RateSource;
  onOpenHistory?: () => void;
}

function AccountsRatesPanelImpl({
  bcv,
  binance,
  selectedSource,
  onOpenHistory,
}: AccountsRatesPanelProps) {
  const usdVes = binance?.rates?.usd_ves ?? 0;
  const selectedValue = getExchangeRate(selectedSource, bcv, {
    usd_ves: usdVes,
  });
  const rateAvailable = selectedValue > 0;

  return (
    <section aria-labelledby="rates-title" data-testid="accounts-rates-panel">
      <details open className="group">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <span
              id="rates-title"
              className="text-base font-semibold text-foreground"
            >
              Tasas de Cambio
            </span>
            <span
              data-testid="selected-rate-strip"
              className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success-600"
            >
              <DollarSign className="h-3 w-3" />
              {rateAvailable
                ? `${getRateName(selectedSource)}: ${selectedValue.toFixed(2)} VES`
                : 'Tasa no disponible'}
            </span>
          </span>
          <ChevronDown
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="mt-3 space-y-4">
          <BCVRates />
          <BinanceRatesComponent snapshot={binance} />

          <div className="flex justify-center">
            <Link
              href="/calculator"
              data-testid="rates-history-button"
              onClick={onOpenHistory}
              className="flex min-h-[44px] w-full items-center justify-center space-x-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-500 transition-all duration-200 hover:scale-105 hover:bg-blue-500/20 sm:px-6 sm:text-base md:w-auto"
            >
              <History className="h-4 w-4" />
              <span className="font-medium">Ver Historial y Calculadora</span>
            </Link>
          </div>

          <div className="px-1 text-center text-xs text-muted-foreground">
            <p className="leading-relaxed">
              <strong>BCV:</strong> Tasa oficial del gobierno
              <span> · </span>
              <strong>Binance:</strong> Precio real del mercado digital
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}

export const AccountsRatesPanel = memo(AccountsRatesPanelImpl);
