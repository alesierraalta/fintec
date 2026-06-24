'use client';

import { memo, useCallback } from 'react';
import { Zap, Activity, Clock, AlertTriangle, Maximize2 } from 'lucide-react';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';
import { withSafeFallback, type RateMode } from '@/lib/binance-adjustment';

export interface BinanceRateCardProps {
  snapshot: BinanceRatesSnapshot;
  mode: RateMode;
  onModeChange: (next: RateMode) => void;
}

const STATUS_CHIP = {
  live: {
    label: 'VIVO',
    className:
      'border-green-400 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    Icon: Activity,
  },
  fallback: {
    label: 'REFERENCIA',
    className:
      'border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    Icon: AlertTriangle,
  },
  stale: {
    label: 'DESACT.',
    className:
      'border-warning-400 bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
    Icon: Clock,
  },
} as const;

function BinanceRateCardImpl({
  snapshot,
  mode,
  onModeChange,
}: BinanceRateCardProps) {
  const status = snapshot.status;
  const chip =
    STATUS_CHIP[status as keyof typeof STATUS_CHIP] ?? STATUS_CHIP.live;
  const ChipIcon = chip.Icon;

  // Centralized safe-fallback: lib handles stale + out-of-range detection.
  // sellAvg is in major units; convert to rate hundredths for the helper.
  const sellAvgMajor = snapshot.rates.sell_rate.avg;
  const sellAvgMinor = Math.round(sellAvgMajor * 100);
  const safeMinor = withSafeFallback(sellAvgMinor, snapshot.isStale ?? false);
  const useFallback = safeMinor !== sellAvgMinor;
  const displayMajor = (safeMinor / 100).toFixed(2);

  const handleToggle = useCallback(() => {
    onModeChange(mode === 'simple' ? 'full' : 'simple');
  }, [mode, onModeChange]);

  return (
    <div
      data-testid="binance-rate-card"
      className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-yellow-500/5 p-4 backdrop-blur-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-semibold text-foreground">Binance</span>
        </div>
        <div
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${chip.className}`}
        >
          <ChipIcon className="mr-1 h-3 w-3" />
          <span>{chip.label}</span>
        </div>
      </div>

      <div className="mb-3 text-center">
        <p className="text-3xl font-bold text-orange-600 sm:text-4xl">
          Bs. <span>{displayMajor}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {useFallback ? 'Fallback seguro (770.00)' : 'Precio SELL promedio'}
        </p>
      </div>

      <button
        type="button"
        data-testid="binance-rate-mode-toggle"
        onClick={handleToggle}
        className="flex min-h-[44px] w-full items-center justify-center space-x-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-500/20 dark:text-orange-300"
      >
        <Maximize2 className="h-3 w-3" />
        <span>Ver detalles completos</span>
      </button>
    </div>
  );
}

export const BinanceRateCard = memo(BinanceRateCardImpl);
