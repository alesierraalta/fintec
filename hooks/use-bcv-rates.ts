import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { BCVRates } from '@/types/rates';
import { currencyService } from '@/lib/services/currency-service';

// Throttle interval in milliseconds (10 seconds)
const THROTTLE_MS = 10000;

const DEFAULT_BCV_RATES: BCVRates = {
  usd: 139.0,
  eur: 162.53,
  lastUpdated: new Date().toISOString(),
};

interface UseBCVRatesOptions {
  enabled?: boolean;
}

export function useBCVRates(options: UseBCVRatesOptions = {}) {
  const { enabled = true } = options;

  const [rates, setRates] = useState<BCVRates>(
    () => currencyService.getBCVRates() ?? DEFAULT_BCV_RATES
  );

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
    if (!enabled) {
      return;
    }

    const fetchRates = async () => {
      try {
        const data = await currencyService.fetchBCVRates();
        throttledSetRates({
          usd: data.usd || 139.0,
          eur: data.eur || 162.53,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        });
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
  }, [enabled, throttledSetRates]);

  // Memoize return value to prevent unnecessary re-renders in consumers
  return useMemo(() => rates, [rates]);
}
