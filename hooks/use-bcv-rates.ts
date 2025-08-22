import { useState, useEffect } from 'react';

interface BCVRates {
  usd: number;
  eur: number;
}

export function useBCVRates() {
  const [rates, setRates] = useState<BCVRates>({ usd: 139.00, eur: 162.53 });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/bcv-rates');
        const data = await response.json();
        if (data.success && data.data) {
          setRates({
            usd: data.data.usd || 139.00,
            eur: data.data.eur || 162.53
          });
        }
      } catch (error) {
        // Use fallback rates on error
        console.error('Error fetching BCV rates:', error);
      }
    };

    fetchRates();
  }, []);

  return rates;
}


