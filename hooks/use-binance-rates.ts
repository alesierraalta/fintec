import { useState, useEffect, useMemo, useCallback } from 'react';

interface BinanceRates {
  usd_ves: number;
  usdt_ves: number;
  sell_rate: {
    min: number;
    avg: number;
    max: number;
  };
  buy_rate: {
    min: number;
    avg: number;
    max: number;
  };
  spread: number;
  sell_prices_used: number;
  buy_prices_used: number;
  prices_used: number;
  price_range: {
    sell_min: number;
    sell_max: number;
    buy_min: number;
    buy_max: number;
    min: number;
    max: number;
  };
  lastUpdated: string;
}

export function useBinanceRates() {
  const [rates, setRates] = useState<BinanceRates>({ 
    usd_ves: 300.00,
    usdt_ves: 300.00,
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

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/binance-rates');
      const data = await response.json();
      
      if (data.success && data.data) {
        // Handle both new structure (with min/avg/max) and old structure (single values)
        const sellRate = data.data.sell_rate;
        const buyRate = data.data.buy_rate;
        
        setRates({
          usd_ves: data.data.usd_ves || 300.00,
          usdt_ves: data.data.usdt_ves || 300.00,
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
        // Use fallback data
        const sellRate = data.data.sell_rate;
        const buyRate = data.data.buy_rate;
        
        setRates({
          usd_ves: data.data.usd_ves || 300.00,
          usdt_ves: data.data.usdt_ves || 300.00,
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
      // Use fallback rates on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
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
