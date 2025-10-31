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

    // Log configuration for debugging
    // eslint-disable-next-line no-console
    console.log('[Paddle Hook] Initializing with config:', {
      hasVendorId: !!vendorId && vendorId.length > 0,
      vendorIdPrefix: vendorId.substring(0, 10) + '...',
      environment,
      hasScriptAttribute: document.querySelector('script[data-paddle-vendor-id]') !== null,
    });

    // Función para inicializar Paddle
    const initPaddle = () => {
      if (!window.Paddle) {
        return false;
      }

      try {
        // Check if Paddle is already initialized by script attribute
        // If script has data-paddle-vendor-id, Paddle might auto-initialize
        // We should still call Initialize to ensure correct config
        const scriptElement = document.querySelector('script[data-paddle-vendor-id]');
        const scriptVendorId = scriptElement?.getAttribute('data-paddle-vendor-id');
        
        // Warn if there's a mismatch between script attribute and env var
        if (scriptVendorId && scriptVendorId !== vendorId) {
          // eslint-disable-next-line no-console
          console.warn('[Paddle Hook] Vendor ID mismatch:', {
            scriptVendorId: scriptVendorId.substring(0, 10) + '...',
            envVendorId: vendorId.substring(0, 10) + '...',
          });
        }

        window.Paddle.Initialize({
          token: vendorId,
          environment: environment === 'production' ? 'production' : 'sandbox',
        });

        // eslint-disable-next-line no-console
        console.log('[Paddle Hook] Paddle initialized successfully:', {
          environment: environment === 'production' ? 'production' : 'sandbox',
          vendorIdPrefix: vendorId.substring(0, 10) + '...',
        });

        setPaddle(window.Paddle);
        setIsReady(true);
        setIsLoading(false);
        setError(null);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al inicializar Paddle';
        // eslint-disable-next-line no-console
        console.error('[Paddle Hook] Initialization error:', {
          error: errorMessage,
          vendorIdPrefix: vendorId.substring(0, 10) + '...',
          environment,
        });
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

