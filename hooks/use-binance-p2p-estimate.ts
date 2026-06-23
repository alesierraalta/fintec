'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  AMOUNT_TIER_THRESHOLDS,
  estimateP2PRate,
  type AmountTier,
  type P2PEstimateResult,
  type P2PSide,
  type PaymentMethod,
} from '@/lib/services/binance-p2p-estimator';

export interface UseBinanceP2PEstimateInput {
  /** Base rate in fixed-point hundredths (e.g. 79000 = 790.00 VES/USDT). */
  baseRateRaw: number;
  /** Optional initial amount tier. Defaults to 'low' (0 USD cents). */
  defaultAmountTier?: AmountTier;
}

export interface UseBinanceP2PEstimateState {
  side: P2PSide;
  paymentMethod: PaymentMethod;
  amountUsdCents: number;
  amountTier: AmountTier;
}

export interface UseBinanceP2PEstimate {
  state: UseBinanceP2PEstimateState;
  estimate: P2PEstimateResult;
  setSide: (side: P2PSide) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setAmountUsdCents: (cents: number) => void;
  setAmountTier: (tier: AmountTier) => void;
}

function defaultCentsForTier(tier: AmountTier): number {
  if (tier === 'high') {
    return AMOUNT_TIER_THRESHOLDS.high + 20000; // $1,200 representative
  }
  if (tier === 'medium') {
    return 50000; // $500 (within [$100, $1,000) USD range)
  }
  return 0;
}

function tierForCents(cents: number): AmountTier {
  if (cents >= AMOUNT_TIER_THRESHOLDS.high) {
    return 'high';
  }
  if (cents >= AMOUNT_TIER_THRESHOLDS.medium) {
    return 'medium';
  }
  return 'low';
}

export function useBinanceP2PEstimate(
  input: UseBinanceP2PEstimateInput
): UseBinanceP2PEstimate {
  const initialTier: AmountTier = input.defaultAmountTier ?? 'low';
  const [side, setSideState] = useState<P2PSide>('SELL');
  const [paymentMethod, setPaymentMethodState] = useState<PaymentMethod>('all');
  const [amountUsdCents, setAmountUsdCentsState] = useState<number>(
    defaultCentsForTier(initialTier)
  );

  const amountTier = useMemo<AmountTier>(
    () => tierForCents(amountUsdCents),
    [amountUsdCents]
  );

  const estimate = useMemo<P2PEstimateResult>(
    () =>
      estimateP2PRate({
        baseRateRaw: input.baseRateRaw,
        side,
        paymentMethod,
        amountUsdCents,
      }),
    [input.baseRateRaw, side, paymentMethod, amountUsdCents]
  );

  const setSide = useCallback((next: P2PSide) => setSideState(next), []);
  const setPaymentMethod = useCallback(
    (next: PaymentMethod) => setPaymentMethodState(next),
    []
  );
  const setAmountUsdCents = useCallback(
    (next: number) => setAmountUsdCentsState(next),
    []
  );
  const setAmountTier = useCallback((next: AmountTier) => {
    setAmountUsdCentsState(defaultCentsForTier(next));
  }, []);

  return {
    state: { side, paymentMethod, amountUsdCents, amountTier },
    estimate,
    setSide,
    setPaymentMethod,
    setAmountUsdCents,
    setAmountTier,
  };
}
