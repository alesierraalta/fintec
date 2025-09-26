import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface ExchangeRateData {
  usd_ves: number;
  usdt_ves: number;
  sell_rate: number;
  buy_rate: number;
  lastUpdated: string;
  source: string;
}

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

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001');
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Connected to WebSocket server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    });

    newSocket.on('exchange-rate-update', (data: ExchangeRateData) => {
      setRates(data);
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const requestLatestRates = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('request-latest-rates');
    }
  }, [socket, isConnected]);

  return {
    rates,
    isConnected,
    error,
    requestLatestRates
  };
}
