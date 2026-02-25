import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { BinanceRates } from '@/types/rates';
import { currencyService } from '@/lib/services/currency-service';

// Throttle interval in milliseconds (10 seconds)
const THROTTLE_MS = 10000;

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

export function useBinanceRates(options: UseBinanceRatesOptions = {}) {
  const { enabled = true } = options;

  const [rates, setRates] = useState<BinanceRates>(
    () => currencyService.getBinanceRates() ?? DEFAULT_BINANCE_RATES
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Throttle refs
  const lastUpdateRef = useRef<number>(0);
  const pendingRatesRef = useRef<BinanceRates | null>(null);

  // Throttled setter - only updates state if enough time has passed
  const throttledSetRates = useCallback((newRates: BinanceRates) => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= THROTTLE_MS) {
      lastUpdateRef.current = now;
      setRates(newRates);
    } else {
      pendingRatesRef.current = newRates;
    }
  }, []);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await currencyService.fetchBinanceRates();

      throttledSetRates({
        usd_ves: data.usd_ves || 300.0,
        usdt_ves: data.usdt_ves || 300.0,
        busd_ves: data.busd_ves || 300.0,
        sell_rate: data.sell_rate || {
          min: 300.0,
          avg: 302.0,
          max: 304.0,
        },
        buy_rate: data.buy_rate || {
          min: 296.0,
          avg: 298.0,
          max: 300.0,
        },
        spread: data.spread || 4.0,
        sell_prices_used: data.sell_prices_used || 0,
        buy_prices_used: data.buy_prices_used || 0,
        prices_used: data.prices_used || 0,
        price_range: data.price_range || {
          sell_min: 300.0,
          sell_max: 304.0,
          buy_min: 296.0,
          buy_max: 300.0,
          min: 296.0,
          max: 304.0,
        },
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      });

      if (data.fallback) {
        setError('Usando datos de fallback');
      }
    } catch (err) {
      setError('Error al obtener datos de Binance');
    } finally {
      setLoading(false);
    }
  }, [throttledSetRates]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchRates();

    // Process pending updates periodically
    const interval = setInterval(() => {
      if (pendingRatesRef.current) {
        const now = Date.now();
        if (now - lastUpdateRef.current >= THROTTLE_MS) {
          lastUpdateRef.current = now;
          setRates(pendingRatesRef.current);
          pendingRatesRef.current = null;
        }
      }
    }, THROTTLE_MS);

    return () => clearInterval(interval);
  }, [enabled, fetchRates]);

  // Memoize the returned object to prevent unnecessary re-renders
  const returnValue = useMemo(
    () => ({
      rates,
      loading,
      error,
      refetch: fetchRates,
    }),
    [rates, loading, error, fetchRates]
  );

  return returnValue;
}
