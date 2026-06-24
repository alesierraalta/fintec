'use client';

import { memo } from 'react';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';
import { BinanceRateCard, type RateMode } from './binance-rate-card';
import { BinanceRateAdvanced } from './binance-rate-advanced';

export interface BinanceRatesCardProps {
  snapshot: BinanceRatesSnapshot;
  mode?: RateMode;
  onModeChange?: (next: RateMode) => void;
}

function BinanceRatesComponentImpl({
  snapshot,
  mode = 'simple',
  onModeChange,
}: BinanceRatesCardProps) {
  const handle = onModeChange ?? (() => {});

  if (mode === 'full') {
    return (
      <BinanceRateAdvanced
        snapshot={snapshot}
        mode={mode}
        onModeChange={handle}
      />
    );
  }

  return (
    <BinanceRateCard snapshot={snapshot} mode={mode} onModeChange={handle} />
  );
}

export const BinanceRatesComponent = memo(BinanceRatesComponentImpl);
