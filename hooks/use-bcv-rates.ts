import { useState, useEffect } from 'react';
import type { BCVRates } from '@/types/rates';

export function useBCVRates() {
  const [rates, setRates] = useState<BCVRates>({
    usd: 139.00,
    eur: 162.53,
    lastUpdated: new Date().toISOString()
  });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/bcv-rates');
        const data = await response.json();
        if (data.success && data.data) {
          setRates({
            usd: data.data.usd || 139.00,
            eur: data.data.eur || 162.53,
            lastUpdated: data.data.lastUpdated || new Date().toISOString()
          });
        }
      } catch (error) {
        // Use fallback rates on error
      }
    };

    fetchRates();
  }, []);

  return rates;
}


