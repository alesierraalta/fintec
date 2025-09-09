import { useState, useEffect } from 'react';

interface BinanceRates {
  usd_ves: number;
  usdt_ves: number;
  sell_rate: number;
  buy_rate: number;
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
    usd_ves: 228.25,
    usdt_ves: 228.25,
    sell_rate: 228.50,
    buy_rate: 228.00,
    spread: 0.50,
    sell_prices_used: 0,
    buy_prices_used: 0,
    prices_used: 0,
    price_range: {
      sell_min: 228.50, sell_max: 228.50,
      buy_min: 228.00, buy_max: 228.00,
      min: 228.00, max: 228.50
    },
    lastUpdated: new Date().toISOString()
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/binance-rates');
      const data = await response.json();
      
      if (data.success && data.data) {
        setRates({
          usd_ves: data.data.usd_ves || 228.25,
          usdt_ves: data.data.usdt_ves || 228.25,
          sell_rate: data.data.sell_rate || 228.50,
          buy_rate: data.data.buy_rate || 228.00,
          spread: data.data.spread || 0.50,
          sell_prices_used: data.data.sell_prices_used || 0,
          buy_prices_used: data.data.buy_prices_used || 0,
          prices_used: data.data.prices_used || 0,
          price_range: data.data.price_range || {
            sell_min: 228.50, sell_max: 228.50,
            buy_min: 228.00, buy_max: 228.00,
            min: 228.00, max: 228.50
          },
          lastUpdated: data.data.lastUpdated || new Date().toISOString()
        });
      } else if (data.fallback && data.data) {
        // Use fallback data
        setRates({
          usd_ves: data.data.usd_ves || 228.25,
          usdt_ves: data.data.usdt_ves || 228.25,
          sell_rate: data.data.sell_rate || 228.50,
          buy_rate: data.data.buy_rate || 228.00,
          spread: data.data.spread || 0.50,
          sell_prices_used: data.data.sell_prices_used || 0,
          buy_prices_used: data.data.buy_prices_used || 0,
          prices_used: data.data.prices_used || 0,
          price_range: data.data.price_range || {
            sell_min: 228.50, sell_max: 228.50,
            buy_min: 228.00, buy_max: 228.00,
            min: 228.00, max: 228.50
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
  };

  useEffect(() => {
    fetchRates();
  }, []);

  return { rates, loading, error, refetch: fetchRates };
}