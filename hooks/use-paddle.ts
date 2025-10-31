'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Paddle.js instance type
 * Based on Paddle.js SDK documentation
 */
declare global {
  interface Window {
    Paddle?: {
      Initialize: (config: {
        token: string;
        environment?: 'sandbox' | 'production';
      }) => void;
      Checkout: {
        open: (options: {
          items: Array<{ priceId: string; quantity: number }>;
          customer?: {
            email: string;
            name?: string;
          };
          customData?: Record<string, string | number | boolean>;
          settings?: {
            successUrl?: string;
            cancelUrl?: string;
            allowDisplayNameOverwrite?: boolean;
            allowMarketingConsent?: boolean;
          };
        }) => void;
        close: () => void;
      };
      Spinner: {
        hide: () => void;
        show: () => void;
      };
    };
  }
}

/**
 * Paddle Checkout error types
 */
export interface PaddleCheckoutError {
  code?: string;
  message: string;
  type?: 'validation' | 'network' | 'api' | 'unknown';
}

interface UsePaddleReturn {
  paddle: typeof window.Paddle | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para inicializar y usar Paddle.js
 * 
 * Maneja la carga del script de Paddle.js y su inicialización.
 * Retorna el estado de carga y la instancia de Paddle cuando está lista.
 */
export function usePaddle(): UsePaddleReturn {
  const [paddle, setPaddle] = useState<typeof window.Paddle | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') {
      return;
    }

    // Si Paddle ya está listo, no hacer nada
    if (isReady && paddle) {
      return;
    }

    const vendorId = process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID;
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';

    if (!vendorId) {
      setError('PADDLE_VENDOR_ID no está configurado');
      setIsLoading(false);
      return;
    }

    // Función para inicializar Paddle
    const initPaddle = () => {
      if (!window.Paddle) {
        return false;
      }

      try {
        window.Paddle.Initialize({
          token: vendorId,
          environment: environment === 'production' ? 'production' : 'sandbox',
        });

        setPaddle(window.Paddle);
        setIsReady(true);
        setIsLoading(false);
        setError(null);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al inicializar Paddle';
        setError(errorMessage);
        setIsLoading(false);
        return false;
      }
    };

    // Verificar si Paddle ya está disponible inmediatamente
    if (window.Paddle) {
      initPaddle();
      return;
    }

    // Si Paddle no está disponible, intentar verificar periódicamente
    // con un timeout máximo de 10 segundos
    const maxAttempts = 20; // 20 intentos de 500ms = 10 segundos
    let attempts = 0;

    const checkInterval = setInterval(() => {
      attempts++;

      if (window.Paddle) {
        if (initPaddle()) {
          clearInterval(checkInterval);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        setError('Paddle.js no se cargó. Verifica que el script esté incluido en el layout.');
        setIsLoading(false);
      }
    }, 500);

    // Cleanup del intervalo
    return () => {
      clearInterval(checkInterval);
    };
  }, [isReady, paddle]);

  return {
    paddle,
    isReady,
    isLoading,
    error,
  };
}

