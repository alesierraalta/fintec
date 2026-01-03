import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { BCVRates } from '@/types/rates';

// Throttle interval in milliseconds (10 seconds)
const THROTTLE_MS = 10000;

export function useBCVRates() {
  const [rates, setRates] = useState<BCVRates>({
    usd: 139.00,
    eur: 162.53,
    lastUpdated: new Date().toISOString()
  });

  const lastUpdateRef = useRef<number>(0);
  const pendingRatesRef = useRef<BCVRates | null>(null);

  // Throttled setter - only updates state if enough time has passed
  const throttledSetRates = useCallback((newRates: BCVRates) => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= THROTTLE_MS) {
      lastUpdateRef.current = now;
      setRates(newRates);
    } else {
      // Store pending rates for next update cycle
      pendingRatesRef.current = newRates;
    }
  }, []);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/bcv-rates');
        const data = await response.json();
        if (data.success && data.data) {
          throttledSetRates({
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
  }, [throttledSetRates]);

  // Memoize return value to prevent unnecessary re-renders in consumers
  return useMemo(() => rates, [rates]);
}

