'use client';

import { useEffect, useState } from 'react';
import { paddleLogger } from '@/lib/paddle/logger';
import { getUserErrorMessage, PaddleErrorCode } from '@/lib/paddle/errors';

/**
 * Paddle.js instance type definitions
 * 
 * Based on Paddle.js v2 SDK documentation.
 * 
 * Note: In Paddle.js v2, environment is controlled by the script URL:
 * - paddle.sandbox.js for sandbox environment
 * - paddle.js for production environment
 * Initialize() only accepts token, not environment parameter.
 */
declare global {
  interface Window {
    Paddle?: {
      // Paddle.js v2 Initialize - only accepts token
      // Environment is controlled by script URL (paddle.js vs paddle.sandbox.js)
      Initialize: (config: {
        token: string;
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
 * 
 * @deprecated Use PaddleErrorCode and getUserErrorMessage from '@/lib/paddle/errors' instead
 */
export interface PaddleCheckoutError {
  code?: string;
  message: string;
  type?: 'validation' | 'network' | 'api' | 'unknown';
}

/**
 * Return type for usePaddle hook
 */
interface UsePaddleReturn {
  /** Paddle.js instance when initialized */
  paddle: typeof window.Paddle | null;
  /** Whether Paddle is ready to use */
  isReady: boolean;
  /** Whether Paddle is currently loading */
  isLoading: boolean;
  /** Error message (in Spanish for user display) or null if no error */
  error: string | null;
}

/**
 * Hook to initialize and use Paddle.js
 * 
 * Manages the loading of Paddle.js script and its initialization.
 * Handles automatic initialization via script data-paddle-vendor-id attribute
 * and manual initialization via Paddle.Initialize().
 * 
 * Features:
 * - Automatic script loading detection
 * - Retry mechanism (up to 10 seconds)
 * - Vendor ID validation
 * - Error handling with user-friendly messages
 * 
 * @returns UsePaddleReturn object with Paddle instance and state
 * 
 * @example
 * const { paddle, isReady, isLoading, error } = usePaddle();
 * 
 * if (isReady && paddle) {
 *   paddle.Checkout.open({ items: [{ priceId: '...', quantity: 1 }] });
 * }
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
      const errorMessage = getUserErrorMessage(PaddleErrorCode.VENDOR_ID_NOT_CONFIGURED);
      setError(errorMessage);
      setIsLoading(false);
      paddleLogger.error('Hook', 'Vendor ID not configured');
      return;
    }

    // Log configuration for debugging
    paddleLogger.debug('Hook', 'Initializing with config', {
      hasVendorId: !!vendorId && vendorId.length > 0,
      vendorIdPrefix: `${vendorId.substring(0, 10)}...`,
      environment,
      hasScriptAttribute: document.querySelector('script[data-paddle-vendor-id]') !== null,
    });

    /**
     * Initialize Paddle.js instance
     * 
     * Handles initialization of Paddle.js, checking for:
     * - Script with data-paddle-vendor-id attribute (auto-initialization)
     * - Manual initialization via Paddle.Initialize()
     * - Vendor ID validation and mismatch detection
     * 
     * @returns true if initialization succeeded, false otherwise
     */
    const initPaddle = (): boolean => {
      if (!window.Paddle) {
        return false;
      }

      try {
        // Check if Paddle is already initialized by script attribute
        // Paddle.js v2 with data-paddle-vendor-id auto-initializes
        const scriptElement = document.querySelector('script[data-paddle-vendor-id]');
        const scriptVendorId = scriptElement?.getAttribute('data-paddle-vendor-id');
        
        // Warn if there's a mismatch between script attribute and env var
        if (scriptVendorId && scriptVendorId !== vendorId) {
          paddleLogger.warn('Hook', 'Vendor ID mismatch detected', {
            scriptVendorId: `${scriptVendorId.substring(0, 10)}...`,
            envVendorId: `${vendorId.substring(0, 10)}...`,
          });
        }

        // In Paddle.js v2, environment is controlled by the script URL:
        // - paddle.sandbox.js for sandbox environment
        // - paddle.js for production environment
        // Initialize() only accepts token, not environment parameter.
        // If script has data-paddle-vendor-id, Paddle auto-initializes,
        // but we call Initialize() anyway to ensure our token is used correctly.
        window.Paddle.Initialize({
          token: vendorId,
        });

        paddleLogger.info('Hook', 'Paddle initialized successfully', {
          environment,
          vendorIdPrefix: `${vendorId.substring(0, 10)}...`,
          scriptLoaded: !!scriptElement,
          autoInitialized: !!scriptVendorId,
        });

        setPaddle(window.Paddle);
        setIsReady(true);
        setIsLoading(false);
        setError(null);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : getUserErrorMessage(PaddleErrorCode.UNKNOWN_ERROR);
        paddleLogger.error('Hook', 'Initialization failed', {
          error: err instanceof Error ? err.message : String(err),
          vendorIdPrefix: `${vendorId.substring(0, 10)}...`,
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
        const errorMessage = getUserErrorMessage(PaddleErrorCode.PADDLE_SCRIPT_NOT_LOADED);
        setError(errorMessage);
        paddleLogger.error('Hook', 'Paddle script failed to load after max attempts', {
          maxAttempts,
          timeout: maxAttempts * 500,
        });
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

