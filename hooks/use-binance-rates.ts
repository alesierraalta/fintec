import { useState, useEffect } from 'react';

interface BinanceRates {
  usd_ves: number;
  usdt_ves: number;
  prices_used: number;
  price_range: {
    min: number;
    max: number;
  };
  lastUpdated: string;
}

export function useBinanceRates() {
  const [rates, setRates] = useState<BinanceRates>({ 
    usd_ves: 228.50,
    usdt_ves: 228.50,
    prices_used: 0,
    price_range: { min: 228.50, max: 228.50 },
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
          usd_ves: data.data.usd_ves || 228.50,
          usdt_ves: data.data.usdt_ves || 228.50,
          prices_used: data.data.prices_used || 0,
          price_range: data.data.price_range || { min: 228.50, max: 228.50 },
          lastUpdated: data.data.lastUpdated || new Date().toISOString()
        });
      } else if (data.fallback && data.data) {
        // Use fallback data
        setRates({
          usd_ves: data.data.usd_ves || 228.50,
          usdt_ves: data.data.usdt_ves || 228.50,
          prices_used: data.data.prices_used || 0,
          price_range: data.data.price_range || { min: 228.50, max: 228.50 },
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