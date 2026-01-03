import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { BinanceRates } from '@/types/rates';

// Throttle interval in milliseconds (10 seconds)
const THROTTLE_MS = 10000;

export function useBinanceRates() {
  const [rates, setRates] = useState<BinanceRates>({
    usd_ves: 300.00,
    usdt_ves: 300.00,
    busd_ves: 300.00,
    sell_rate: {
      min: 300.00,
      avg: 302.00,
      max: 304.00
    },
    buy_rate: {
      min: 296.00,
      avg: 298.00,
      max: 300.00
    },
    spread: 4.00,
    sell_prices_used: 0,
    buy_prices_used: 0,
    prices_used: 0,
    price_range: {
      sell_min: 300.00, sell_max: 304.00,
      buy_min: 296.00, buy_max: 300.00,
      min: 296.00, max: 304.00
    },
    lastUpdated: new Date().toISOString()
  });

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
      const response = await fetch('/api/binance-rates');
      const data = await response.json();

      if (data.success && data.data) {
        const sellRate = data.data.sell_rate;
        const buyRate = data.data.buy_rate;

        throttledSetRates({
          usd_ves: data.data.usd_ves || 300.00,
          usdt_ves: data.data.usdt_ves || 300.00,
          busd_ves: data.data.busd_ves || 300.00,
          sell_rate: typeof sellRate === 'object' ? sellRate : {
            min: data.data.sell_min || sellRate || 300.00,
            avg: sellRate || 302.00,
            max: data.data.sell_max || sellRate || 304.00
          },
          buy_rate: typeof buyRate === 'object' ? buyRate : {
            min: data.data.buy_min || buyRate || 296.00,
            avg: buyRate || 298.00,
            max: data.data.buy_max || buyRate || 300.00
          },
          spread: data.data.spread || 4.00,
          sell_prices_used: data.data.sell_prices_used || 0,
          buy_prices_used: data.data.buy_prices_used || 0,
          prices_used: data.data.prices_used || 0,
          price_range: data.data.price_range || {
            sell_min: 300.00, sell_max: 304.00,
            buy_min: 296.00, buy_max: 300.00,
            min: 296.00, max: 304.00
          },
          lastUpdated: data.data.lastUpdated || new Date().toISOString()
        });
      } else if (data.fallback && data.data) {
        const sellRate = data.data.sell_rate;
        const buyRate = data.data.buy_rate;

        throttledSetRates({
          usd_ves: data.data.usd_ves || 300.00,
          usdt_ves: data.data.usdt_ves || 300.00,
          busd_ves: data.data.busd_ves || 300.00,
          sell_rate: typeof sellRate === 'object' ? sellRate : {
            min: data.data.sell_min || sellRate || 300.00,
            avg: sellRate || 302.00,
            max: data.data.sell_max || sellRate || 304.00
          },
          buy_rate: typeof buyRate === 'object' ? buyRate : {
            min: data.data.buy_min || buyRate || 296.00,
            avg: buyRate || 298.00,
            max: data.data.buy_max || buyRate || 300.00
          },
          spread: data.data.spread || 4.00,
          sell_prices_used: data.data.sell_prices_used || 0,
          buy_prices_used: data.data.buy_prices_used || 0,
          prices_used: data.data.prices_used || 0,
          price_range: data.data.price_range || {
            sell_min: 300.00, sell_max: 304.00,
            buy_min: 296.00, buy_max: 300.00,
            min: 296.00, max: 304.00
          },
          lastUpdated: data.data.lastUpdated || new Date().toISOString()
        });
        setError('Usando datos de fallback');
      }
    } catch (err) {
      setError('Error al obtener datos de Binance');
    } finally {
      setLoading(false);
    }
  }, [throttledSetRates]);

  useEffect(() => {
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
  }, [fetchRates]);

  // Memoize the returned object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    rates,
    loading,
    error,
    refetch: fetchRates
  }), [rates, loading, error, fetchRates]);

  return returnValue;
}
