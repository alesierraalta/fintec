import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { BinanceRates } from '@/types/rates';
import { currencyService } from '@/lib/services/currency-service';

const THROTTLE_MS = 10000;
const AUTO_REFRESH_MS = 120000;
const STALE_MS = 5 * 60 * 1000;

const DEFAULT_BINANCE_RATES: BinanceRates = {
  usd_ves: 300.0,
  usdt_ves: 300.0,
  busd_ves: 300.0,
  sell_rate: {
    min: 300.0,
    avg: 302.0,
    max: 304.0,
  },
  buy_rate: {
    min: 296.0,
    avg: 298.0,
    max: 300.0,
  },
  spread: 4.0,
  sell_prices_used: 0,
  buy_prices_used: 0,
  prices_used: 0,
  price_range: {
    sell_min: 300.0,
    sell_max: 304.0,
    buy_min: 296.0,
    buy_max: 300.0,
    min: 296.0,
    max: 304.0,
  },
  lastUpdated: new Date().toISOString(),
};

interface UseBinanceRatesOptions {
  enabled?: boolean;
}

export type BinanceRatesStatus = 'loading' | 'live' | 'fallback' | 'stale';

export interface BinanceRatesSnapshot {
  rates: BinanceRates;
  status: BinanceRatesStatus;
  message: string | null;
  error: string | null;
  isFallback: boolean;
  isStale: boolean;
  lastUpdatedLabel: string;
  loading: boolean;
  refetch: () => Promise<void>;
}

function getSnapshotStatus(rates: BinanceRates, forceFallback = false) {
  const isFallback =
    forceFallback ||
    rates.fallback === true ||
    rates.prices_used === 0 ||
    (rates.sell_prices_used === 0 && rates.buy_prices_used === 0);

  const lastUpdatedAt = new Date(rates.lastUpdated).getTime();
  const isStale =
    Number.isFinite(lastUpdatedAt) && Date.now() - lastUpdatedAt > STALE_MS;

  const status: BinanceRatesStatus = isFallback
    ? 'fallback'
    : isStale
      ? 'stale'
      : 'live';

  const message = isFallback
    ? 'Mostrando datos de referencia de Binance P2P.'
    : isStale
      ? 'Los precios de Binance pueden estar desactualizados.'
      : null;

  return {
    status,
    message,
    error: message,
    isFallback,
    isStale,
  };
}

export function useBinanceRates(
  options: UseBinanceRatesOptions = {}
): BinanceRatesSnapshot {
  const { enabled = true } = options;
  const initialRates = useMemo(
    () => currencyService.getBinanceRates() ?? DEFAULT_BINANCE_RATES,
    []
  );
  const initialMeta = useMemo(
    () =>
      getSnapshotStatus(initialRates, initialRates === DEFAULT_BINANCE_RATES),
    [initialRates]
  );

  const [rates, setRates] = useState<BinanceRates>(initialRates);
  const [loading, setLoading] = useState(enabled);
  const [status, setStatus] = useState<BinanceRatesStatus>(initialMeta.status);
  const [message, setMessage] = useState<string | null>(initialMeta.message);

  const lastAppliedRef = useRef<number>(0);
  const lastFetchStartedRef = useRef<number>(0);

  const applySnapshot = useCallback(
    (nextRates: BinanceRates, forceFallback = false) => {
      const now = Date.now();
      if (now - lastAppliedRef.current < THROTTLE_MS) {
        return;
      }

      lastAppliedRef.current = now;
      const nextMeta = getSnapshotStatus(nextRates, forceFallback);
      setRates(nextRates);
      setStatus(nextMeta.status);
      setMessage(nextMeta.message);
    },
    []
  );

  const fetchRates = useCallback(
    async (force = false) => {
      if (!enabled) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastFetchStartedRef.current < THROTTLE_MS) {
        return;
      }

      lastFetchStartedRef.current = now;
      setLoading(true);

      try {
        const nextRates = await currencyService.fetchBinanceRates();
        applySnapshot(nextRates);
      } catch (error) {
        applySnapshot(rates ?? DEFAULT_BINANCE_RATES, true);
      } finally {
        setLoading(false);
      }
    },
    [applySnapshot, enabled, rates]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void fetchRates();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchRates();
      }
    };

    const interval = window.setInterval(refreshWhenVisible, AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [enabled, fetchRates]);

  const lastUpdatedLabel = useMemo(() => {
    const value = new Date(rates.lastUpdated);
    return Number.isNaN(value.getTime()) ? '' : value.toLocaleString('es-VE');
  }, [rates.lastUpdated]);

  return useMemo(() => {
    const meta = getSnapshotStatus(rates, status === 'fallback');

    return {
      rates,
      status,
      message,
      error: message,
      isFallback: meta.isFallback,
      isStale: meta.isStale,
      lastUpdatedLabel,
      loading,
      refetch: () => fetchRates(true),
    };
  }, [fetchRates, lastUpdatedLabel, loading, message, rates, status]);
}
