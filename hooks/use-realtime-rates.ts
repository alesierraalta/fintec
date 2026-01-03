import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ExchangeRateData } from '@/types/rates';
import { logger } from '@/lib/utils/logger';

// Debounce interval in milliseconds (5 seconds)
const DEBOUNCE_MS = 5000;

interface UseRealtimeRatesReturn {
  rates: ExchangeRateData | null;
  isConnected: boolean;
  error: string | null;
  requestLatestRates: () => void;
}

export function useRealtimeRates(): UseRealtimeRatesReturn {
  const [rates, setRates] = useState<ExchangeRateData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Debounce refs
  const lastUpdateRef = useRef<number>(0);
  const pendingRatesRef = useRef<ExchangeRateData | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced setter - batches rapid updates
  const debouncedSetRates = useCallback((data: ExchangeRateData) => {
    const now = Date.now();

    if (now - lastUpdateRef.current >= DEBOUNCE_MS) {
      // Enough time has passed, update immediately
      lastUpdateRef.current = now;
      setRates(data);
    } else {
      // Too soon, store for later
      pendingRatesRef.current = data;

      // Set a timer to apply pending update
      if (!debounceTimerRef.current) {
        debounceTimerRef.current = setTimeout(() => {
          if (pendingRatesRef.current) {
            lastUpdateRef.current = Date.now();
            setRates(pendingRatesRef.current);
            pendingRatesRef.current = null;
          }
          debounceTimerRef.current = null;
        }, DEBOUNCE_MS);
      }
    }
  }, []);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001');

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      logger.info('Connected to WebSocket server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      logger.info('Disconnected from WebSocket server');
    });

    newSocket.on('exchange-rate-update', (data: ExchangeRateData) => {
      debouncedSetRates(data);
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debouncedSetRates]);

  const requestLatestRates = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('request-latest-rates');
    }
  }, [socket, isConnected]);

  // Memoize return value
  return useMemo(() => ({
    rates,
    isConnected,
    error,
    requestLatestRates
  }), [rates, isConnected, error, requestLatestRates]);
}
